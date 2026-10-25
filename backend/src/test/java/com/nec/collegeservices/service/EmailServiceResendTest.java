package com.nec.collegeservices.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.model.EmailLog;
import com.nec.collegeservices.model.Notification;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.EmailLogRepository;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.SeminarHallRepository;
import com.nec.collegeservices.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.*;

import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class EmailServiceResendTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private SeminarBookingRepository seminarBookingRepository;

    @Mock
    private SeminarHallRepository seminarHallRepository;

    @Mock
    private HttpClient mockHttpClient;

    @Mock
    private HttpResponse<String> mockHttpResponse;

    @InjectMocks
    private EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "emailProvider", "resend");
        ReflectionTestUtils.setField(emailService, "resendApiKey", "re_test_1234567890abcdef");
        ReflectionTestUtils.setField(emailService, "resendApiUrl", "https://api.resend.com/emails");
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailService, "mailFrom", "onboarding@resend.dev");
        ReflectionTestUtils.setField(emailService, "mailFromName", "NEC Service Management");
        ReflectionTestUtils.setField(emailService, "appUrl", "https://college-service-management.vercel.app");
        ReflectionTestUtils.setField(emailService, "ccEmailsConfig", "global-cc@nrtec.in");
        ReflectionTestUtils.setField(emailService, "ccEventsConfig", "REQUEST_SUBMITTED,REQUEST_APPROVED,REQUEST_REJECTED,REQUEST_CANCELLED,TEST_EVENT");
        ReflectionTestUtils.setField(emailService, "objectMapper", objectMapper);
        emailService.setHttpClient(mockHttpClient);
    }

    @Test
    @DisplayName("1. Resend notification delivery sends valid HTTPS request and marks log SENT")
    void testResendNotificationDeliverySuccess() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"id\":\"msg_resend_101\"}");
        doReturn(mockHttpResponse).when(mockHttpClient).send(any(), any());

        User user = User.builder()
                .userId("usr_001")
                .name("Dr. Smith")
                .email("smith@nrtec.in")
                .active(true)
                .build();
        when(userRepository.findByUserId("usr_001")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-001")
                .recipientUserId("usr_001")
                .title("New Equipment Request")
                .message("Lab equipment requested for ECE department.")
                .service("Lab Equipment")
                .referenceId("REQ-EQ-001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        // Verify HTTP request sent to Resend
        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(mockHttpClient).send(requestCaptor.capture(), any());

        HttpRequest request = requestCaptor.getValue();
        assertEquals("POST", request.method());
        assertEquals("https://api.resend.com/emails", request.uri().toString());
        assertEquals("Bearer re_test_1234567890abcdef", request.headers().firstValue("Authorization").orElse(""));
        assertEquals("application/json", request.headers().firstValue("Content-Type").orElse(""));

        // Verify EmailLog status marked SENT
        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("RESEND", savedLog.getProvider());
        assertEquals("smith@nrtec.in", savedLog.getPrimaryRecipient());
        assertNull(savedLog.getErrorMessage());
    }

    @Test
    @DisplayName("2. Hall-specific CC routing passes hall CCs to Resend without global CC")
    void testHallSpecificCcRoutingToResend() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"id\":\"msg_resend_102\"}");
        doReturn(mockHttpResponse).when(mockHttpClient).send(any(), any());

        User user = User.builder().userId("usr_002").email("faculty@nrtec.in").active(true).build();
        when(userRepository.findByUserId("usr_002")).thenReturn(Optional.of(user));

        SeminarBooking booking = SeminarBooking.builder()
                .bookingId("CSE-SEM-1001")
                .hallId("SH-1")
                .hallName("Main Auditorium")
                .build();
        when(seminarBookingRepository.findByBookingId("CSE-SEM-1001")).thenReturn(Optional.of(booking));

        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Main Auditorium")
                .ccEmails(Arrays.asList("hall-coord@nrtec.in", "dept-cc@nrtec.in"))
                .build();
        when(seminarHallRepository.findByHallId("SH-1")).thenReturn(Optional.of(hall));

        Notification notification = Notification.builder()
                .id("NOTIF-SEM-001")
                .recipientUserId("usr_002")
                .title("New Seminar Request")
                .message("National Conference booking request.")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-1001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        // Verify EmailLog CC recipients
        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("RESEND", savedLog.getProvider());
        assertTrue(savedLog.getCcRecipients().contains("hall-coord@nrtec.in"));
        assertTrue(savedLog.getCcRecipients().contains("dept-cc@nrtec.in"));
        assertFalse(savedLog.getCcRecipients().contains("global-cc@nrtec.in"), "Global CC must NOT be in seminar notification");
    }

    @Test
    @DisplayName("3. Password-reset emails are sent strictly to user with zero CC recipients")
    void testPasswordResetEmailPrivacyResend() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"id\":\"msg_resend_pwd_103\"}");
        doReturn(mockHttpResponse).when(mockHttpClient).send(any(), any());

        String rawToken = "sample-secret-reset-token-xyz-12345";
        emailService.sendPasswordResetEmail("faculty.user@nrtec.in", "Prof. Sharma", rawToken);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("PASSWORD_RESET", savedLog.getEventCategory());
        assertEquals("faculty.user@nrtec.in", savedLog.getPrimaryRecipient());
        assertTrue(savedLog.getCcRecipients().isEmpty(), "Password-reset must have strictly empty CC list");
    }

    @Test
    @DisplayName("4. Provider errors mark status FAILED and sanitize sensitive tokens/keys")
    void testProviderFailureHandlingAndSanitization() throws Exception {
        String sensitiveKey = "re_test_1234567890abcdef";
        String sensitiveToken = "secret-plain-token-abc-9876";

        when(mockHttpResponse.statusCode()).thenReturn(422);
        when(mockHttpResponse.body()).thenReturn(
                "{\"statusCode\":422,\"message\":\"Domain not verified for " + sensitiveKey + " with token " + sensitiveToken + "\"}"
        );
        doReturn(mockHttpResponse).when(mockHttpClient).send(any(), any());

        emailService.sendPasswordResetEmail("error.test@nrtec.in", "User", sensitiveToken);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertNotNull(savedLog.getErrorMessage());
        assertTrue(savedLog.getErrorMessage().contains("422"));

        // Verify sensitive keys and tokens are redacted
        assertFalse(savedLog.getErrorMessage().contains(sensitiveKey), "API key must be redacted");
        assertFalse(savedLog.getErrorMessage().contains(sensitiveToken), "Reset token must be redacted");
        assertTrue(savedLog.getErrorMessage().contains("[REDACTED_API_KEY]"));
        assertTrue(savedLog.getErrorMessage().contains("[REDACTED_TOKEN]"));
    }

    @Test
    @DisplayName("5. Unconfigured Resend API key safely simulates SKIPPED_NO_CREDENTIALS")
    void testMissingCredentialsSimulatedSafely() {
        ReflectionTestUtils.setField(emailService, "resendApiKey", "");

        User user = User.builder().userId("usr_003").email("test@nrtec.in").active(true).build();
        when(userRepository.findByUserId("usr_003")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-003")
                .recipientUserId("usr_003")
                .title("Maintenance Request")
                .message("Lab AC maintenance required.")
                .service("Maintenance")
                .referenceId("REQ-MN-001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SKIPPED_NO_CREDENTIALS", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("RESEND_API_KEY"));
    }

    @Test
    @DisplayName("6. SendTestEmail via Resend returns formatted response")
    void testSendTestEmailViaResend() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"id\":\"msg_resend_test_105\"}");
        doReturn(mockHttpResponse).when(mockHttpClient).send(any(), any());

        Map<String, Object> result = emailService.sendTestEmail("admin_user", "target@nrtec.in");

        assertEquals("SENT", result.get("status"));
        assertEquals("resend", result.get("provider"));
        assertEquals("target@nrtec.in", result.get("primaryRecipient"));
        assertTrue(result.get("message").toString().contains("Resend"));
    }

    @Test
    @DisplayName("7. Gmail sender address falls back to onboarding@resend.dev for Resend authorization")
    void testGmailSenderFallsBackToResendAuthorizedSender() {
        ReflectionTestUtils.setField(emailService, "mailFrom", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailFromName", "NEC Service Management");

        String formatted = emailService.getFormattedFrom();
        assertEquals("NEC Service Management <onboarding@resend.dev>", formatted);
    }

    @Test
    @DisplayName("8. Quoted env values are safely normalized and do not trigger SMTP")
    void testQuotedEnvironmentValuesNormalized() {
        ReflectionTestUtils.setField(emailService, "emailProvider", "\"resend\"");
        ReflectionTestUtils.setField(emailService, "resendApiKey", "\"re_sample_with_quotes_123\"");

        assertEquals("resend", emailService.getActiveProvider());
        assertTrue(emailService.isResendConfigured());
        assertEquals("re_sample_with_quotes_123", emailService.getCleanResendApiKey());
    }

    @Test
    @DisplayName("9. Active provider defaults to Resend when RESEND_API_KEY is present without EMAIL_PROVIDER")
    void testProviderDefaultsToResendWhenApiKeyPresent() {
        ReflectionTestUtils.setField(emailService, "emailProvider", "");
        ReflectionTestUtils.setField(emailService, "resendApiKey", "re_active_key_test");

        assertEquals("resend", emailService.getActiveProvider());
        assertTrue(emailService.isProviderConfigured());
    }
}
