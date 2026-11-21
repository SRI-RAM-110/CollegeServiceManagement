package com.nec.collegeservices.service;

import com.nec.collegeservices.model.EmailLog;
import com.nec.collegeservices.repository.EmailLogRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@org.junit.jupiter.api.Disabled("Explicit manual smoke test only - excluded from automated builds")
@SpringBootTest
public class SingleRealEmailSmokeTest {

    @Autowired
    private EmailService emailService;

    // Strict safety mock: zero database records created in MongoDB Atlas
    @MockBean
    private EmailLogRepository emailLogRepository;

    @Test
    @DisplayName("Single Real Email Delivery Smoke Test via Gmail SMTP")
    void executeSingleEmailSmokeTest() {
        AtomicInteger attemptCount = new AtomicInteger(0);
        AtomicReference<String> messageIdRef = new AtomicReference<>(null);
        AtomicReference<String> logStatusRef = new AtomicReference<>(null);
        AtomicReference<String> failureDetailRef = new AtomicReference<>(null);
        boolean connectionSucceeded = false;
        boolean authSucceeded = false;
        boolean smtpAccepted = false;

        // Ensure mock returns argument without persisting anything to MongoDB Atlas
        when(emailLogRepository.save(any(EmailLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        System.out.println("==========================================================");
        System.out.println("EXECUTING AUTHORIZED SINGLE REAL EMAIL DELIVERY SMOKE TEST");
        System.out.println("==========================================================");

        assertTrue(emailService.isSmtpConfigured(), "SMTP must be configured in local environment");

        JavaMailSenderImpl mailSender = (JavaMailSenderImpl) ReflectionTestUtils.getField(emailService, "dynamicMailSender");
        assertNotNull(mailSender, "JavaMailSenderImpl must be initialized");

        // 1. Test SMTP Connection and Authentication
        System.out.println("Step 1: Testing SMTP connection and TLS authentication to host...");
        try {
            mailSender.testConnection();
            connectionSucceeded = true;
            authSucceeded = true;
            System.out.println("SMTP CONNECTION RESULT: SUCCESS (Connected to " + mailSender.getHost() + ":" + mailSender.getPort() + ")");
            System.out.println("AUTHENTICATION RESULT: SUCCESS (Authenticated as " + mailSender.getUsername() + ")");
        } catch (Exception e) {
            failureDetailRef.set("SMTP connection/auth error: " + e.getMessage());
            System.err.println("SMTP connection/auth failed: " + e.getMessage());
            fail("SMTP connection or authentication failed: " + e.getMessage());
        }

        // 2. Prepare Single Test Email
        String senderEmail = "collegeservice2026@gmail.com";
        String recipientEmail = "collegeservice2026@gmail.com";
        String subject = "[EMAIL ROUTING TEST] Real Email Delivery Verification";
        String plainText = "College Service Management System - Email Delivery Test\n\n"
                + "This is an authorized single-recipient test to verify Gmail SMTP integration.\n\n"
                + "Test details:\n"
                + "- Environment: Local development\n"
                + "- Purpose: Verify real email delivery\n"
                + "- Notification routing: Not being tested yet\n\n"
                + "No action is required.";

        String htmlBody = "<p>College Service Management System - Email Delivery Test</p>"
                + "<p>This is an authorized single-recipient test to verify Gmail SMTP integration.</p>"
                + "<p>Test details:<br/>"
                + "- Environment: Local development<br/>"
                + "- Purpose: Verify real email delivery<br/>"
                + "- Notification routing: Not being tested yet</p>"
                + "<p>No action is required.</p>";

        EmailLog logEntry = EmailLog.builder()
                .notificationId("SMOKE-TEST-001")
                .referenceId("SMOKE-TEST-REF-001")
                .deduplicationKey("SMOKE-TEST:" + System.currentTimeMillis() + ":" + recipientEmail)
                .service("Email Smoke Test")
                .eventCategory("SMOKE_TEST")
                .primaryRecipient(recipientEmail)
                .ccRecipients(Collections.emptyList())
                .subject(subject)
                .provider("SMTP")
                .createdAt(LocalDateTime.now())
                .build();

        // 3. Dispatch Exactly One Email
        System.out.println("Step 2: Dispatching exactly ONE real email via Gmail SMTP...");
        int attempt = attemptCount.incrementAndGet();
        assertEquals(1, attempt, "Strict rule: exactly ONE real email attempt must be made");

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(senderEmail, "NEC Service Management"));
            helper.setTo(recipientEmail);
            helper.setSubject(subject);
            helper.setText(plainText, htmlBody);

            mailSender.send(message);

            String messageId = message.getMessageID();
            messageIdRef.set(messageId);
            smtpAccepted = true;
            logStatusRef.set(EmailLog.STATUS_SMTP_ACCEPTED);
            logEntry.setStatus(EmailLog.STATUS_SMTP_ACCEPTED);
            logEntry.setMessageId(messageId);

            System.out.println("SMTP ACCEPTED: TRUE (250 OK)");
            System.out.println("MESSAGE ID: " + messageId);
            System.out.println("BACKEND EMAIL LOG STATUS: " + logEntry.getStatus());

        } catch (Exception e) {
            String err = emailService.sanitizeErrorMessage(e.getMessage());
            failureDetailRef.set(err);
            logStatusRef.set("FAILED");
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(err);
            System.err.println("Email dispatch failed: " + err);
            fail("Email dispatch failed: " + err);
        }

        // 4. Assert strict outcomes
        assertTrue(connectionSucceeded, "SMTP connection must succeed");
        assertTrue(authSucceeded, "Authentication must succeed");
        assertTrue(smtpAccepted, "SMTP server must accept the message");
        assertNotNull(messageIdRef.get(), "Message ID must be present");
        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, logStatusRef.get(), "Log status must be SMTP_ACCEPTED");
        assertNull(failureDetailRef.get(), "No failures or exceptions allowed");
        assertEquals(1, attemptCount.get(), "Exactly one attempt must have been made");

        System.out.println("==========================================================");
        System.out.println("SINGLE REAL EMAIL DELIVERY SMOKE TEST COMPLETED SUCCESSFULLY");
        System.out.println("==========================================================");
    }
}
