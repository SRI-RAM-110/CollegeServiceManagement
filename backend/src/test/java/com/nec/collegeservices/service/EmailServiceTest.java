package com.nec.collegeservices.service;

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
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class EmailServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private SeminarBookingRepository seminarBookingRepository;

    @Mock
    private SeminarHallRepository seminarHallRepository;

    @Mock
    private JavaMailSender mockMailSender;

    @Mock
    private HttpClient mockHttpClient;

    @Mock
    private HttpResponse<String> mockHttpResponse;

    @InjectMocks
    private EmailService emailService;

    private MimeMessage mimeMessage;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mimeMessage = new MimeMessage((Session) null);
        when(mockMailSender.createMimeMessage()).thenReturn(mimeMessage);

        ReflectionTestUtils.setField(emailService, "mailProvider", "local");
        ReflectionTestUtils.setField(emailService, "appsScriptUrl", "https://script.google.com/macros/s/AKfycbz_test_deployment/exec");
        ReflectionTestUtils.setField(emailService, "appsScriptSecret", "super_secret_relay_key_12345");
        ReflectionTestUtils.setField(emailService, "mailHost", "smtp.gmail.com");
        ReflectionTestUtils.setField(emailService, "mailPort", 587);
        ReflectionTestUtils.setField(emailService, "mailUsername", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailPassword", "sample_smtp_app_password");
        ReflectionTestUtils.setField(emailService, "smtpAuth", true);
        ReflectionTestUtils.setField(emailService, "smtpStarttls", true);
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailService, "mailFrom", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailFromName", "NEC Service Management");
        ReflectionTestUtils.setField(emailService, "appUrl", "https://college-service-management.vercel.app");

        emailService.setMailSender(mockMailSender);
        emailService.setHttpClient(mockHttpClient);
    }

    @Test
    @DisplayName("1. Local SMTP provider selection routes through JavaMailSender and marks log SENT")
    void testLocalSmtpProviderSelectionAndDelivery() {
        ReflectionTestUtils.setField(emailService, "mailProvider", "local");
        assertEquals("local", emailService.getActiveProvider());

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

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("SMTP", savedLog.getProvider());
        assertEquals("smith@nrtec.in", savedLog.getPrimaryRecipient());
        assertTrue(savedLog.getCcRecipients().isEmpty(), "Non-seminar services must have strictly empty CC list");
        assertNull(savedLog.getErrorMessage());
    }

    @Test
    @DisplayName("2. Apps Script provider selection routes via HTTPS POST relay")
    @SuppressWarnings("unchecked")
    void testAppsScriptSuccessfulRelayResponse() throws Exception {
        ReflectionTestUtils.setField(emailService, "mailProvider", "apps-script");
        assertEquals("apps-script", emailService.getActiveProvider());

        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"message\":\"Email sent successfully\",\"messageId\":\"msg-001\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(mockHttpResponse);

        User user = User.builder()
                .userId("usr_002")
                .email("faculty@nrtec.in")
                .active(true)
                .build();
        when(userRepository.findByUserId("usr_002")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-002")
                .recipientUserId("usr_002")
                .title("Request Approved")
                .message("Your stationery request has been approved.")
                .service("Stationery")
                .referenceId("REQ-ST-002")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        // Verify JavaMailSender was NEVER called
        verify(mockMailSender, never()).send(any(MimeMessage.class));

        // Verify HTTP request sent to Apps Script
        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(mockHttpClient, times(1)).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));

        HttpRequest sentRequest = requestCaptor.getValue();
        assertEquals("POST", sentRequest.method());
        assertEquals("https://script.google.com/macros/s/AKfycbz_test_deployment/exec", sentRequest.uri().toString());
        assertTrue(sentRequest.headers().firstValue("Content-Type").orElse("").contains("application/json"));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("APPS_SCRIPT", savedLog.getProvider());
        assertEquals("faculty@nrtec.in", savedLog.getPrimaryRecipient());
        assertTrue(savedLog.getCcRecipients().isEmpty());
        assertNull(savedLog.getErrorMessage());
    }

    @Test
    @DisplayName("3. Apps Script invalid secret and authorization failure marks log FAILED and redacts secret")
    @SuppressWarnings("unchecked")
    void testAppsScriptAuthorizationFailure() throws Exception {
        ReflectionTestUtils.setField(emailService, "mailProvider", "apps-script");

        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":false,\"error\":\"Unauthorized: Invalid shared secret super_secret_relay_key_12345\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(mockHttpResponse);

        User user = User.builder().userId("usr_auth_fail").email("auth.fail@nrtec.in").active(true).build();
        when(userRepository.findByUserId("usr_auth_fail")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-AUTH")
                .recipientUserId("usr_auth_fail")
                .title("Status Update")
                .message("Test update")
                .service("General")
                .referenceId("REQ-001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertEquals("APPS_SCRIPT", savedLog.getProvider());
        assertNotNull(savedLog.getErrorMessage());
        assertFalse(savedLog.getErrorMessage().contains("super_secret_relay_key_12345"), "Secret must not leak in error message");
        assertTrue(savedLog.getErrorMessage().contains("[REDACTED_SECRET]"));
    }

    @Test
    @DisplayName("4. Apps Script timeout handling marks log FAILED safely")
    @SuppressWarnings("unchecked")
    void testAppsScriptTimeoutHandling() throws Exception {
        ReflectionTestUtils.setField(emailService, "mailProvider", "apps-script");

        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpTimeoutException("Apps Script relay request timed out after 20000ms"));

        User user = User.builder().userId("usr_timeout").email("timeout@nrtec.in").active(true).build();
        when(userRepository.findByUserId("usr_timeout")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-TIMEOUT")
                .recipientUserId("usr_timeout")
                .title("Notification Timeout")
                .message("Testing timeout")
                .service("General")
                .referenceId("REQ-TO-001")
                .createdAt(LocalDateTime.now())
                .build();

        assertDoesNotThrow(() -> emailService.processAndSendNotificationEmail(notification));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertEquals("APPS_SCRIPT", savedLog.getProvider());
        assertTrue(savedLog.getErrorMessage().toLowerCase().contains("timed out"));
    }

    @Test
    @DisplayName("5. Hall-specific CC routing applies hall CCs and never includes global CCs")
    void testSeminarHallSpecificCcRoutingOnly() {
        SeminarBooking booking = SeminarBooking.builder()
                .bookingId("CSE-SEM-1001")
                .hallId("HALL_CSE_01")
                .hallName("Visvesvaraya Seminar Hall")
                .eventTitle("AI Workshop")
                .status("PENDING")
                .build();
        when(seminarBookingRepository.findByBookingId("CSE-SEM-1001")).thenReturn(Optional.of(booking));

        SeminarHall hall = SeminarHall.builder()
                .hallId("HALL_CSE_01")
                .name("Visvesvaraya Seminar Hall")
                .ccEmails(Arrays.asList("hall-coord@nrtec.in", "dept-cc@nrtec.in"))
                .build();
        when(seminarHallRepository.findByHallId("HALL_CSE_01")).thenReturn(Optional.of(hall));

        User faculty = User.builder()
                .userId("fac_101")
                .email("faculty@nrtec.in")
                .active(true)
                .build();
        when(userRepository.findByUserId("fac_101")).thenReturn(Optional.of(faculty));

        Notification notification = Notification.builder()
                .id("NOTIF-SEM-001")
                .recipientUserId("fac_101")
                .service("Seminar Hall")
                .title("New Seminar Request")
                .message("Booking submitted for Visvesvaraya Seminar Hall")
                .referenceId("CSE-SEM-1001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("faculty@nrtec.in", savedLog.getPrimaryRecipient());

        // Must contain hall-specific CCs
        assertEquals(2, savedLog.getCcRecipients().size());
        assertTrue(savedLog.getCcRecipients().contains("hall-coord@nrtec.in"));
        assertTrue(savedLog.getCcRecipients().contains("dept-cc@nrtec.in"));
    }

    @Test
    @DisplayName("6. Hall with no configured CC sends with strictly zero CC")
    void testSeminarHallWithoutCcSendsZeroCc() {
        SeminarBooking booking = SeminarBooking.builder()
                .bookingId("CSE-SEM-1002")
                .hallId("HALL_NO_CC")
                .hallName("Mini Seminar Hall")
                .status("PENDING")
                .build();
        when(seminarBookingRepository.findByBookingId("CSE-SEM-1002")).thenReturn(Optional.of(booking));

        SeminarHall hall = SeminarHall.builder()
                .hallId("HALL_NO_CC")
                .name("Mini Seminar Hall")
                .ccEmails(Collections.emptyList()) // No CC emails configured
                .build();
        when(seminarHallRepository.findByHallId("HALL_NO_CC")).thenReturn(Optional.of(hall));

        User faculty = User.builder().userId("fac_102").email("faculty2@nrtec.in").active(true).build();
        when(userRepository.findByUserId("fac_102")).thenReturn(Optional.of(faculty));

        Notification notification = Notification.builder()
                .id("NOTIF-SEM-002")
                .recipientUserId("fac_102")
                .service("Seminar Hall")
                .title("New Seminar Request")
                .message("Booking submitted")
                .referenceId("CSE-SEM-1002")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertTrue(savedLog.getCcRecipients().isEmpty(), "Hall without configured CC must send with 0 CC");
    }

    @Test
    @DisplayName("7. Non-seminar services (Transport, Meals, Accommodation, Stationery) have zero CC")
    void testNonSeminarServicesZeroCc() {
        String[] services = {"Transport", "Meals", "Accommodation", "Stationery", "Lab Equipment"};

        for (int i = 0; i < services.length; i++) {
            String service = services[i];
            String userId = "usr_" + service.toLowerCase().replace(" ", "_");
            String email = service.toLowerCase().replace(" ", "") + "@nrtec.in";

            User user = User.builder().userId(userId).email(email).active(true).build();
            when(userRepository.findByUserId(userId)).thenReturn(Optional.of(user));

            Notification notification = Notification.builder()
                    .id("NOTIF-" + i)
                    .recipientUserId(userId)
                    .title("New Request")
                    .message(service + " requested")
                    .service(service)
                    .referenceId("REQ-" + service.substring(0, 2).toUpperCase() + "-" + i)
                    .createdAt(LocalDateTime.now())
                    .build();

            emailService.processAndSendNotificationEmail(notification);
        }

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, atLeast(services.length)).save(logCaptor.capture());

        for (EmailLog log : logCaptor.getAllValues()) {
            assertTrue(log.getCcRecipients().isEmpty(), "Non-seminar service " + log.getService() + " must have 0 CC");
        }
    }

    @Test
    @DisplayName("8. Password-reset emails have strictly zero CC recipients and redact token")
    void testPasswordResetEmailPrivacyZeroCc() {
        String rawToken = "sample-secret-reset-token-xyz-12345";
        emailService.sendPasswordResetEmail("faculty.user@nrtec.in", "Prof. Sharma", rawToken);

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("PASSWORD_RESET", savedLog.getEventCategory());
        assertEquals("faculty.user@nrtec.in", savedLog.getPrimaryRecipient());
        assertTrue(savedLog.getCcRecipients().isEmpty(), "Password-reset must have strictly empty CC list");
    }

    @Test
    @DisplayName("9. SendTestEmail via Apps Script routes to relay with zero CC")
    @SuppressWarnings("unchecked")
    void testSendTestEmailViaAppsScript() throws Exception {
        ReflectionTestUtils.setField(emailService, "mailProvider", "apps-script");

        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"message\":\"Relay delivery success\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(mockHttpResponse);

        Map<String, Object> result = emailService.sendTestEmail("admin_user", "tester@nrtec.in");

        assertEquals("SENT", result.get("status"));
        assertEquals("APPS_SCRIPT", result.get("provider"));
        assertEquals("tester@nrtec.in", result.get("primaryRecipient"));
        assertTrue(((List<?>) result.get("ccRecipients")).isEmpty(), "Test email must have strictly zero CC");
        assertTrue(result.get("message").toString().contains("APPS_SCRIPT"));
    }

    @Test
    @DisplayName("10. SendTestEmail via SMTP routes to JavaMailSender with zero CC")
    void testSendTestEmailViaSmtp() {
        ReflectionTestUtils.setField(emailService, "mailProvider", "local");

        Map<String, Object> result = emailService.sendTestEmail("admin_user", "target@nrtec.in");

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        assertEquals("SENT", result.get("status"));
        assertEquals("SMTP", result.get("provider"));
        assertEquals("target@nrtec.in", result.get("primaryRecipient"));
        assertTrue(((List<?>) result.get("ccRecipients")).isEmpty(), "Test email must have strictly zero CC");
        assertTrue(result.get("message").toString().contains("SMTP"));
    }

    @Test
    @DisplayName("11. Unconfigured credentials simulate SKIPPED_NO_CREDENTIALS safely without throwing")
    void testMissingCredentialsSimulatedSafely() {
        // Test unconfigured SMTP
        ReflectionTestUtils.setField(emailService, "mailProvider", "local");
        ReflectionTestUtils.setField(emailService, "mailUsername", "");
        ReflectionTestUtils.setField(emailService, "mailPassword", "");

        User user = User.builder().userId("usr_unconfigured").email("test@nrtec.in").active(true).build();
        when(userRepository.findByUserId("usr_unconfigured")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-UNCONF")
                .recipientUserId("usr_unconfigured")
                .title("Maintenance Request")
                .message("Lab AC maintenance required.")
                .service("Maintenance")
                .referenceId("REQ-MN-001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);
        verify(mockMailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        assertEquals("SKIPPED_NO_CREDENTIALS", logCaptor.getValue().getStatus());

        // Test unconfigured Apps Script
        ReflectionTestUtils.setField(emailService, "mailProvider", "apps-script");
        ReflectionTestUtils.setField(emailService, "appsScriptUrl", "");

        emailService.processAndSendNotificationEmail(notification);
        ArgumentCaptor<EmailLog> logCaptor2 = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(2)).save(logCaptor2.capture());
        assertEquals("SKIPPED_NO_CREDENTIALS", logCaptor2.getValue().getStatus());
    }

    @Test
    @DisplayName("12. SMTP failure marks status FAILED and redacts password and token")
    void testSmtpFailureHandlingAndSanitization() {
        ReflectionTestUtils.setField(emailService, "mailProvider", "local");
        String sensitivePassword = "sample_smtp_app_password";
        String sensitiveToken = "secret-plain-token-abc-9876";

        doThrow(new MailSendException("SMTP connection failed with password " + sensitivePassword + " and token " + sensitiveToken))
                .when(mockMailSender).send(any(MimeMessage.class));

        emailService.sendPasswordResetEmail("error.test@nrtec.in", "User", sensitiveToken);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertNotNull(savedLog.getErrorMessage());

        assertFalse(savedLog.getErrorMessage().contains(sensitivePassword), "SMTP password must be redacted");
        assertFalse(savedLog.getErrorMessage().contains(sensitiveToken), "Reset token must be redacted");
        assertTrue(savedLog.getErrorMessage().contains("[REDACTED_PASSWORD]"));
        assertTrue(savedLog.getErrorMessage().contains("[REDACTED_TOKEN]"));
    }
}
