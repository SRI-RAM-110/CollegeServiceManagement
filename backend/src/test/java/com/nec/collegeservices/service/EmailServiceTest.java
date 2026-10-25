package com.nec.collegeservices.service;

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

    @InjectMocks
    private EmailService emailService;

    private MimeMessage mimeMessage;

    @BeforeEach
    void setUp() {
        mimeMessage = new MimeMessage((Session) null);
        when(mockMailSender.createMimeMessage()).thenReturn(mimeMessage);

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
        ReflectionTestUtils.setField(emailService, "ccEmailsConfig", "global-cc@nrtec.in");
        ReflectionTestUtils.setField(emailService, "ccEventsConfig", "REQUEST_SUBMITTED,REQUEST_APPROVED,REQUEST_REJECTED,REQUEST_CANCELLED,TEST_EVENT");

        emailService.setMailSender(mockMailSender);
    }

    @Test
    @DisplayName("1. SMTP notification delivery sends MimeMessage and marks log SENT")
    void testSmtpNotificationDeliverySuccess() {
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
        assertTrue(savedLog.getCcRecipients().contains("global-cc@nrtec.in"));
        assertNull(savedLog.getErrorMessage());
    }

    @Test
    @DisplayName("2. Hall-specific CC routing applies hall CCs and bypasses global CC for seminars")
    void testSeminarHallSpecificCcRouting() {
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
        assertTrue(savedLog.getCcRecipients().contains("hall-coord@nrtec.in"));
        assertTrue(savedLog.getCcRecipients().contains("dept-cc@nrtec.in"));
        // Must NOT contain global CC for seminar notifications
        assertFalse(savedLog.getCcRecipients().contains("global-cc@nrtec.in"));
    }

    @Test
    @DisplayName("3. Non-seminar notifications preserve global CC recipients")
    void testNonSeminarNotificationsPreserveGlobalCc() {
        User user = User.builder()
                .userId("usr_transport")
                .email("transport.user@nrtec.in")
                .active(true)
                .build();
        when(userRepository.findByUserId("usr_transport")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-TR-001")
                .recipientUserId("usr_transport")
                .title("New Transport Booking")
                .message("Bus requested for industry tour.")
                .service("Transport")
                .referenceId("REQ-TR-1001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notification);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("transport.user@nrtec.in", savedLog.getPrimaryRecipient());
        assertTrue(savedLog.getCcRecipients().contains("global-cc@nrtec.in"), "Global CC must be present for non-seminar events");
    }

    @Test
    @DisplayName("4. Password-reset emails have strictly zero CC recipients")
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
    @DisplayName("5. SMTP failure marks status FAILED and redacts password and token")
    void testSmtpFailureHandlingAndSanitization() {
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

        // Verify sensitive credentials and reset token are redacted
        assertFalse(savedLog.getErrorMessage().contains(sensitivePassword), "SMTP password must be redacted");
        assertFalse(savedLog.getErrorMessage().contains(sensitiveToken), "Reset token must be redacted");
        assertTrue(savedLog.getErrorMessage().contains("[REDACTED_PASSWORD]"));
        assertTrue(savedLog.getErrorMessage().contains("[REDACTED_TOKEN]"));
    }

    @Test
    @DisplayName("6. Unconfigured SMTP credentials safely simulate SKIPPED_NO_CREDENTIALS")
    void testMissingSmtpCredentialsSimulatedSafely() {
        ReflectionTestUtils.setField(emailService, "mailUsername", "");
        ReflectionTestUtils.setField(emailService, "mailPassword", "");

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

        // MailSender should not be invoked when credentials are missing
        verify(mockMailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SKIPPED_NO_CREDENTIALS", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("SMTP"));
    }

    @Test
    @DisplayName("7. SendTestEmail via SMTP executes delivery and returns formatted result")
    void testSendTestEmailViaSmtp() {
        Map<String, Object> result = emailService.sendTestEmail("admin_user", "target@nrtec.in");

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        assertEquals("SENT", result.get("status"));
        assertEquals("SMTP", result.get("provider"));
        assertEquals("target@nrtec.in", result.get("primaryRecipient"));
        assertTrue(result.get("message").toString().contains("SMTP"));
    }
}
