package com.nec.collegeservices.service;

import com.nec.collegeservices.model.EmailLog;
import com.nec.collegeservices.model.Notification;
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
public class EmailServiceReliabilityTest {

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

        ReflectionTestUtils.setField(emailService, "mailProvider", "local");
        ReflectionTestUtils.setField(emailService, "mailHost", "smtp.gmail.com");
        ReflectionTestUtils.setField(emailService, "mailPort", 587);
        ReflectionTestUtils.setField(emailService, "mailUsername", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailPassword", "mock_app_password_2026");
        ReflectionTestUtils.setField(emailService, "smtpAuth", true);
        ReflectionTestUtils.setField(emailService, "smtpStarttls", true);
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailService, "mailFrom", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailFromName", "NEC Service Management");

        emailService.setMailSender(mockMailSender);
        emailService.clearDeduplicationCache();
    }

    @Test
    @DisplayName("1. CREATOR and AO_ADMIN receiving the same logical event results in one email per recipient")
    void testCreatorAndAoAdminSameLogicalEventDeduplicatedToOnePerRecipient() {
        // User with CREATOR role (matches SEMINAR_ADMIN and AO_ADMIN permissions)
        User creator = User.builder()
                .userId("CREATOR001")
                .name("Creator User")
                .email("creator@nrtec.in")
                .role("CREATOR")
                .roles(List.of("CREATOR"))
                .department("ADMIN")
                .active(true)
                .build();

        // User with pure AO_ADMIN role
        User aoAdmin = User.builder()
                .userId("AO001")
                .name("AO Admin")
                .email("ao@nrtec.in")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        // User with pure SEMINAR_ADMIN role
        User semAdmin = User.builder()
                .userId("SEM_ADM_01")
                .name("Seminar Admin")
                .email("seminaradmin@nrtec.in")
                .role("SEMINAR_ADMIN")
                .roles(List.of("SEMINAR_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(creator, aoAdmin, semAdmin));

        // Event 1: New Seminar Hall Request broadcast to SEMINAR_ADMIN
        Notification notif1 = Notification.builder()
                .id("NOTIF-SEM-ADMIN-01")
                .recipientRole("SEMINAR_ADMIN")
                .recipientDept("ADMIN")
                .title("New Seminar Hall Request")
                .message("CSE requested Seminar Hall 3")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-0099")
                .createdAt(LocalDateTime.now())
                .build();

        // Event 2: Same request broadcast to AO_ADMIN for the same booking
        Notification notif2 = Notification.builder()
                .id("NOTIF-AO-ADMIN-02")
                .recipientRole("AO_ADMIN")
                .recipientDept("ADMIN")
                .title("New Seminar Hall Request")
                .message("CSE requested Seminar Hall 3")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-0099")
                .createdAt(LocalDateTime.now())
                .build();

        // Process Notification 1 (SEMINAR_ADMIN): resolves creator & semAdmin
        emailService.processAndSendNotificationEmail(notif1);

        // Process Notification 2 (AO_ADMIN): resolves creator & aoAdmin
        emailService.processAndSendNotificationEmail(notif2);

        // Verify: creator@nrtec.in was sent ONCE, semAdmin ONCE, aoAdmin ONCE. Total = 3 (not 4)
        verify(mockMailSender, times(3)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(3)).save(captor.capture());

        List<String> recipientsSent = captor.getAllValues().stream()
                .map(EmailLog::getPrimaryRecipient)
                .toList();

        assertEquals(1, recipientsSent.stream().filter(e -> e.equals("creator@nrtec.in")).count(),
                "Creator must receive exactly one email for the same booking event");
        assertEquals(1, recipientsSent.stream().filter(e -> e.equals("seminaradmin@nrtec.in")).count());
        assertEquals(1, recipientsSent.stream().filter(e -> e.equals("ao@nrtec.in")).count());
    }

    @Test
    @DisplayName("2. The same email appearing in TO and CC is not duplicated")
    void testSameEmailInToAndCcIsNotDuplicated() {
        // Notification addressed to primary recipient A, with B in CC
        Notification notif1 = Notification.builder()
                .id("NOTIF-APP-A")
                .recipientRole("DEPARTMENT_USER")
                .recipientDept("CSE")
                .recipientUserId("CSE001")
                .title("Seminar Request Approved")
                .message("Your booking has been approved.")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-0077")
                .createdAt(LocalDateTime.now())
                .build();

        User userA = User.builder().userId("CSE001").email("user.a@nrtec.in").active(true).department("CSE").build();
        User userB = User.builder().userId("csehod").email("user.b@nrtec.in").role("DEPARTMENT_HOD").roles(List.of("DEPARTMENT_HOD")).active(true).department("CSE").build();

        when(userRepository.findByUserId("CSE001")).thenReturn(Optional.of(userA));
        when(userRepository.findByUserId("csehod")).thenReturn(Optional.of(userB));
        when(userRepository.findAll()).thenReturn(List.of(userA, userB));

        // Process notif1: TO user.a@nrtec.in, CC user.b@nrtec.in
        emailService.processAndSendNotificationEmail(notif1);

        // Now suppose another notification for the same booking arrives with TO user.b@nrtec.in
        Notification notif2 = Notification.builder()
                .id("NOTIF-APP-B")
                .recipientRole("DEPARTMENT_HOD")
                .recipientDept("CSE")
                .recipientUserId("csehod")
                .title("Seminar Request Approved")
                .message("Department booking approved.")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-0077")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notif2);

        // Verify: user.b was already notified in CC of first email, so notif2 skips duplicate TO dispatch
        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(captor.capture());

        EmailLog log = captor.getValue();
        assertEquals("user.a@nrtec.in", log.getPrimaryRecipient());
        assertTrue(log.getCcRecipients().contains("user.b@nrtec.in"));
    }

    @Test
    @DisplayName("3. .local addresses attempt SMTP dispatch when syntactically valid")
    void testLocalAddressesAttemptSmtpDispatch() {
        User mockUser = User.builder()
                .userId("CSE001")
                .email("cse001@nrtec.local")
                .active(true)
                .build();
        when(userRepository.findByUserId("CSE001")).thenReturn(Optional.of(mockUser));

        Notification notif = Notification.builder()
                .id("NOTIF-LOCAL-01")
                .recipientUserId("CSE001")
                .title("Booking Status Update")
                .message("Update for local account")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-LOCAL")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notif);

        // Verify: mockMailSender WAS called because domain filtering is removed
        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        // Verify: EmailLog recorded with status SMTP_ACCEPTED
        ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(captor.capture());

        EmailLog saved = captor.getValue();
        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, saved.getStatus());
        assertEquals("cse001@nrtec.local", saved.getPrimaryRecipient());
    }

    @Test
    @DisplayName("4. @nrtec.in recipients continue through SMTP dispatch")
    void testNrtecInRecipientsContinueThroughSmtpDispatch() {
        User realUser = User.builder()
                .userId("HOD01")
                .email("csehod@nrtec.in")
                .active(true)
                .build();
        when(userRepository.findByUserId("HOD01")).thenReturn(Optional.of(realUser));

        Notification notif = Notification.builder()
                .id("NOTIF-NRTEC-01")
                .recipientUserId("HOD01")
                .title("Approval Notice")
                .message("Approved for nrtec.in")
                .service("Transport")
                .referenceId("TRN-001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notif);

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(captor.capture());

        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, captor.getValue().getStatus());
        assertEquals("csehod@nrtec.in", captor.getValue().getPrimaryRecipient());
    }

    @Test
    @DisplayName("5. @nec.edu.in recipients continue through SMTP dispatch")
    void testNecEduInRecipientsContinueThroughSmtpDispatch() {
        User elecUser = User.builder()
                .userId("ELEC01")
                .email("campus.electrician@nec.edu.in")
                .active(true)
                .build();
        when(userRepository.findByUserId("ELEC01")).thenReturn(Optional.of(elecUser));

        Notification notif = Notification.builder()
                .id("NOTIF-NEC-01")
                .recipientUserId("ELEC01")
                .title("Electrical Ticket")
                .message("Issue reported")
                .service("Electrical Service")
                .referenceId("ELEC-001")
                .createdAt(LocalDateTime.now())
                .build();

        emailService.processAndSendNotificationEmail(notif);

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(captor.capture());

        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, captor.getValue().getStatus());
        assertEquals("campus.electrician@nec.edu.in", captor.getValue().getPrimaryRecipient());
    }

    @Test
    @DisplayName("6. Missing test recipient is rejected with VALIDATION_ERROR")
    void testMissingTestRecipientIsRejected() {
        Map<String, Object> resNull = emailService.sendTestEmail("admin1", null);
        assertEquals("VALIDATION_ERROR", resNull.get("status"));
        assertTrue(String.valueOf(resNull.get("message")).contains("required"));

        Map<String, Object> resEmpty = emailService.sendTestEmail("admin1", "");
        assertEquals("VALIDATION_ERROR", resEmpty.get("status"));
        assertTrue(String.valueOf(resEmpty.get("message")).contains("required"));

        Map<String, Object> resBlank = emailService.sendTestEmail("admin1", "   ");
        assertEquals("VALIDATION_ERROR", resBlank.get("status"));
        assertTrue(String.valueOf(resBlank.get("message")).contains("required"));

        verify(mockMailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("7. Explicit test recipient validation rejects invalid formats and allows valid domains including .local")
    void testExplicitTestRecipientValidation() {
        // Invalid format
        Map<String, Object> resFormat = emailService.sendTestEmail("admin1", "invalid-email-address");
        assertEquals("VALIDATION_ERROR", resFormat.get("status"));
        assertTrue(String.valueOf(resFormat.get("message")).contains("Invalid recipient email address format"));

        // Valid syntax domain (such as .local) proceeds to SMTP dispatch
        Map<String, Object> resLocal = emailService.sendTestEmail("admin1", "test@nrtec.local");
        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, resLocal.get("status"));
        verify(mockMailSender, times(1)).send(any(MimeMessage.class));

        // Valid external recipient also proceeds
        Map<String, Object> resValid = emailService.sendTestEmail("admin1", "valid.admin@nrtec.in");
        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, resValid.get("status"));
        verify(mockMailSender, times(2)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("8. Operator notifications remain strictly isolated with empty CC lists")
    void testOperatorNotificationsRemainIsolated() {
        Notification elecNotif = Notification.builder()
                .id("NOTIF-OP-01")
                .recipientRole("ELECTRICIAN")
                .service("Electrical Service")
                .recipientDept("ADMIN")
                .title("New Seminar Approved - Electrical Schedule Updated")
                .referenceId("CSE-SEM-0088")
                .build();

        List<String> elecCc = emailService.resolveCcRecipients(elecNotif, "REQUEST_APPROVED");
        assertTrue(elecCc.isEmpty(), "Electrician notifications must have empty CC list");

        Notification genNotif = Notification.builder()
                .id("NOTIF-OP-02")
                .recipientRole("GENERATOR_OPERATOR")
                .service("Generator Service")
                .recipientDept("ADMIN")
                .title("New Seminar Approved - Generator Schedule Updated")
                .referenceId("CSE-SEM-0088")
                .build();

        List<String> genCc = emailService.resolveCcRecipients(genNotif, "REQUEST_APPROVED");
        assertTrue(genCc.isEmpty(), "Generator operator notifications must have empty CC list");
    }

    @Test
    @DisplayName("9. Email failure does not throw or interrupt execution")
    void testEmailFailureDoesNotInterruptBusinessTransactions() {
        User user = User.builder().userId("USR_FAIL").email("fail.user@nrtec.in").active(true).build();
        when(userRepository.findByUserId("USR_FAIL")).thenReturn(Optional.of(user));

        doThrow(new MailSendException("SMTP relay network timeout"))
                .when(mockMailSender).send(any(MimeMessage.class));

        Notification notif = Notification.builder()
                .id("NOTIF-FAIL-01")
                .recipientUserId("USR_FAIL")
                .title("Booking Approved")
                .service("Seminar Hall")
                .referenceId("CSE-SEM-FAIL")
                .createdAt(LocalDateTime.now())
                .build();

        // Must complete without throwing
        assertDoesNotThrow(() -> emailService.processAndSendNotificationEmail(notif));

        ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(captor.capture());

        assertEquals(EmailLog.STATUS_FAILED, captor.getValue().getStatus());
    }
}

