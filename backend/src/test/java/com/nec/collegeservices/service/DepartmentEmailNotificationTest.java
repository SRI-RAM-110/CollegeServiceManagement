package com.nec.collegeservices.service;

import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
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
public class DepartmentEmailNotificationTest {

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
        }

        @Test
        @DisplayName("1. Unit test: HOD is resolved in CC for department approval events")
        void testHodRecipientResolutionForDepartmentApprovalEvent() {
                // Given: Active HOD in CSE department
                User hod = User.builder()
                                .userId("csehod")
                                .name("Dr. CSE HOD")
                                .email("csehod@nrtec.in")
                                .role("DEPARTMENT_HOD")
                                .roles(List.of("DEPARTMENT_HOD", "DEPARTMENT_USER"))
                                .department("CSE")
                                .active(true)
                                .build();

                // Requester in CSE department
                User requester = User.builder()
                                .userId("CSE001")
                                .name("Faculty User")
                                .email("cse001@nrtec.in")
                                .role("DEPARTMENT_USER")
                                .roles(List.of("DEPARTMENT_USER"))
                                .department("CSE")
                                .active(true)
                                .build();

                when(userRepository.findByUserId("CSE001")).thenReturn(Optional.of(requester));
                when(userRepository.findAll()).thenReturn(List.of(hod, requester));

                // When: An approval notification for CSE department is processed
                Notification notification = Notification.builder()
                                .id("NOTIF-APP-001")
                                .recipientRole("DEPARTMENT_USER")
                                .recipientDept("CSE")
                                .recipientUserId("CSE001")
                                .title("Seminar Request Approved")
                                .message("Your booking for Seminar Hall 3 has been approved.")
                                .service("Seminar Hall")
                                .referenceId("CSE-SEM-0100")
                                .createdAt(LocalDateTime.now())
                                .build();

                emailService.processAndSendNotificationEmail(notification);

                // Then: Email is sent with requester in TO and HOD in CC
                verify(mockMailSender, times(1)).send(any(MimeMessage.class));

                ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
                verify(emailLogRepository).save(captor.capture());

                EmailLog savedLog = captor.getValue();
                assertEquals("cse001@nrtec.in", savedLog.getPrimaryRecipient(), "Primary recipient must be requester");
                assertTrue(savedLog.getCcRecipients().contains("csehod@nrtec.in"), "HOD email must be resolved in CC");
                assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, savedLog.getStatus(),
                                "Truthful state must be SMTP_ACCEPTED");
        }

        @Test
        @DisplayName("2. Unit test: Multiple recipients without duplicates and excludes primary recipient from CC")
        void testMultipleRecipientsWithoutDuplicatesAndExcludesTo() {
                // Given: HOD is the requester (primary recipient)
                User hod = User.builder()
                                .userId("csehod")
                                .name("Dr. CSE HOD")
                                .email("csehod@nrtec.in")
                                .role("DEPARTMENT_HOD")
                                .roles(List.of("DEPARTMENT_HOD"))
                                .department("CSE")
                                .active(true)
                                .build();

                when(userRepository.findByUserId("csehod")).thenReturn(Optional.of(hod));
                when(userRepository.findAll()).thenReturn(List.of(hod));

                // Approval notification addressed directly to HOD as requester
                Notification notification = Notification.builder()
                                .id("NOTIF-HOD-001")
                                .recipientRole("DEPARTMENT_HOD")
                                .recipientDept("CSE")
                                .recipientUserId("csehod")
                                .title("Seminar Request Approved")
                                .message("Your booking has been approved.")
                                .service("Seminar Hall")
                                .referenceId("CSE-SEM-0101")
                                .createdAt(LocalDateTime.now())
                                .build();

                emailService.processAndSendNotificationEmail(notification);

                ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
                verify(emailLogRepository).save(captor.capture());

                EmailLog savedLog = captor.getValue();
                assertEquals("csehod@nrtec.in", savedLog.getPrimaryRecipient());
                assertFalse(savedLog.getCcRecipients().contains("csehod@nrtec.in"),
                                "Primary recipient must be excluded from CC to avoid duplication");
        }

        @Test
        @DisplayName("3. Integration test: SMTP success records SMTP_ACCEPTED and captures Message-ID")
        void testSmtpSuccessRecordsSmtpAcceptedAndMessageId() {
                User user = User.builder()
                                .userId("test_user")
                                .email("test.success@nrtec.in")
                                .active(true)
                                .build();
                when(userRepository.findByUserId("test_user")).thenReturn(Optional.of(user));

                Notification notification = Notification.builder()
                                .id("NOTIF-SUCC-001")
                                .recipientUserId("test_user")
                                .title("Status Update")
                                .message("Operation succeeded.")
                                .service("Transport")
                                .referenceId("TRN-001")
                                .createdAt(LocalDateTime.now())
                                .build();

                emailService.processAndSendNotificationEmail(notification);

                ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
                verify(emailLogRepository).save(captor.capture());

                EmailLog savedLog = captor.getValue();
                assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, savedLog.getStatus());
                assertNull(savedLog.getErrorMessage());
        }

        @Test
        @DisplayName("4. Integration test: SMTP failure records FAILED and redacts credentials without throwing")
        void testSmtpFailureRecordsFailedAndDoesNotThrow() {
                User user = User.builder()
                                .userId("test_err_user")
                                .email("test.fail@nrtec.in")
                                .active(true)
                                .build();
                when(userRepository.findByUserId("test_err_user")).thenReturn(Optional.of(user));

                doThrow(new MailSendException(
                                "SMTP relay rejected message: mock_app_password_2026 550 Mailbox unavailable"))
                                .when(mockMailSender).send(any(MimeMessage.class));

                Notification notification = Notification.builder()
                                .id("NOTIF-ERR-001")
                                .recipientUserId("test_err_user")
                                .title("Status Update")
                                .message("Test failure handling.")
                                .service("Transport")
                                .referenceId("TRN-002")
                                .createdAt(LocalDateTime.now())
                                .build();

                // Must not throw exception
                assertDoesNotThrow(() -> emailService.processAndSendNotificationEmail(notification));

                ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
                verify(emailLogRepository).save(captor.capture());

                EmailLog savedLog = captor.getValue();
                assertEquals(EmailLog.STATUS_FAILED, savedLog.getStatus());
                assertNotNull(savedLog.getErrorMessage());
                assertFalse(savedLog.getErrorMessage().contains("mock_app_password_2026"),
                                "Credentials must be redacted");
                assertTrue(savedLog.getErrorMessage().contains("[REDACTED_PASSWORD]"));
        }

        @Test
        @DisplayName("5. Unit test: Inactive HOD is strictly excluded from resolution")
        void testInactiveHodIsExcludedFromResolution() {
                User inactiveHod = User.builder()
                                .userId("inactive_csehod")
                                .name("Former HOD")
                                .email("oldhod@nrtec.in")
                                .role("DEPARTMENT_HOD")
                                .department("CSE")
                                .active(false) // Inactive account
                                .build();

                User activeHod = User.builder()
                                .userId("active_csehod")
                                .name("Current HOD")
                                .email("currenthod@nrtec.in")
                                .role("DEPARTMENT_HOD")
                                .department("CSE")
                                .active(true)
                                .build();

                when(userRepository.findAll()).thenReturn(List.of(inactiveHod, activeHod));

                List<String> emails = emailService.resolveDepartmentHodEmails("CSE");
                assertEquals(1, emails.size());
                assertEquals("currenthod@nrtec.in", emails.get(0));
                assertFalse(emails.contains("oldhod@nrtec.in"), "Inactive account must not receive emails");
        }

        @Test
        @DisplayName("6. Unit test: Electrician and Generator Operator never receive HOD or global CCs")
        void testElectricianAndGeneratorOperatorDoNotReceiveGlobalOrHodCc() {
                Notification elecNotif = Notification.builder()
                                .id("NOTIF-ELEC-01")
                                .recipientRole("ELECTRICIAN")
                                .service("Electrical Service")
                                .recipientDept("ADMIN")
                                .title("Electrical Issue Assigned")
                                .build();

                List<String> elecCc = emailService.resolveCcRecipients(elecNotif, "REQUEST_APPROVED");
                assertTrue(elecCc.isEmpty(), "Electrician notifications must have 0 CC");

                Notification genNotif = Notification.builder()
                                .id("NOTIF-GEN-01")
                                .recipientRole("GENERATOR_OPERATOR")
                                .service("Generator Service")
                                .recipientDept("ADMIN")
                                .title("Generator Ready")
                                .build();

                List<String> genCc = emailService.resolveCcRecipients(genNotif, "REQUEST_APPROVED");
                assertTrue(genCc.isEmpty(), "Generator Operator notifications must have 0 CC");
        }
}
