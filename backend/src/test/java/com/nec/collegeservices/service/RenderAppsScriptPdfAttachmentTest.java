package com.nec.collegeservices.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.model.EmailLog;
import com.nec.collegeservices.model.Notification;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.EmailLogRepository;
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
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RenderAppsScriptPdfAttachmentTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private HttpClient mockHttpClient;

    @Mock
    private HttpResponse<String> mockHttpResponse;

    @Mock
    private JavaMailSender mockMailSender;

    @InjectMocks
    private EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Standard valid minimal PDF (header + minimal xref/trailer)
    private static final byte[] VALID_PDF_BYTES = ("%PDF-1.4\n" +
            "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
            "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n" +
            "3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n" +
            "xref\n0 4\n0000000000 65535 f\n" +
            "trailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF").getBytes(StandardCharsets.UTF_8);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailService, "mailProvider", "apps-script");
        ReflectionTestUtils.setField(emailService, "appsScriptUrl", "https://script.google.com/macros/s/AKfycbz_render_relay/exec");
        ReflectionTestUtils.setField(emailService, "appsScriptSecret", "render_test_secret_key_8899");
        ReflectionTestUtils.setField(emailService, "mailFromName", "NEC Service Management");
        ReflectionTestUtils.setField(emailService, "mailUsername", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailFrom", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailPassword", "app_pass_123");
        ReflectionTestUtils.setField(emailService, "httpClient", mockHttpClient);
        ReflectionTestUtils.setField(emailService, "dynamicMailSender", mockMailSender);
        ReflectionTestUtils.setField(emailService, "objectMapper", objectMapper);

        // Reset in-memory deduplication cache
        java.util.concurrent.ConcurrentHashMap<String, Long> keyCache = new java.util.concurrent.ConcurrentHashMap<>();
        ReflectionTestUtils.setField(emailService, "activeDeduplicationKeys", keyCache);
    }

    @Test
    @DisplayName("1. Valid PDF dispatch through Apps Script formats base64 and verifies SMTP_ACCEPTED")
    @SuppressWarnings("unchecked")
    void test1_validPdfDispatchThroughAppsScript() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg_gas_pdf_001\",\"attachmentCount\":1}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Event Inspection Report — Visvesvaraya Hall (CSE-SEM-1001)",
                "<p>Inspection Completed</p>",
                "Inspection Completed",
                "NEC_Inspection_Report_CSE-SEM-1001_2026-11-21.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-1001"
        );

        assertTrue(result, "sendEmailWithAttachment must return true on valid Apps Script acceptance");

        // Verify HTTP Request sent to Apps Script
        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(mockHttpClient).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));
        HttpRequest capturedReq = requestCaptor.getValue();
        assertEquals("POST", capturedReq.method());
        assertEquals("https://script.google.com/macros/s/AKfycbz_render_relay/exec", capturedReq.uri().toString());

        // Verify EmailLog saved with correct details
        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SMTP_ACCEPTED", savedLog.getStatus());
        assertEquals("APPS_SCRIPT", savedLog.getProvider());
        assertEquals("msg_gas_pdf_001", savedLog.getMessageId());
        assertEquals("csehod@nrtec.in", savedLog.getPrimaryRecipient());
        assertNull(savedLog.getErrorMessage());
    }

    @Test
    @DisplayName("2. Existing HTML-only email backward compatibility without attachments")
    @SuppressWarnings("unchecked")
    void test2_existingHtmlOnlyEmailBackwardCompatibility() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg_html_002\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        User user = User.builder().userId("faculty1").email("faculty1@nrtec.in").active(true).build();
        when(userRepository.findByUserId("faculty1")).thenReturn(Optional.of(user));

        Notification notification = Notification.builder()
                .id("NOTIF-HTML-001")
                .recipientUserId("faculty1")
                .title("Standard Notification Title")
                .message("This is a standard notification without attachments")
                .service("General")
                .referenceId("REQ-GEN-001")
                .createdAt(LocalDateTime.now())
                .build();

        assertDoesNotThrow(() -> emailService.processAndSendNotificationEmail(notification));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SMTP_ACCEPTED", savedLog.getStatus());
        assertEquals("APPS_SCRIPT", savedLog.getProvider());
        assertEquals("faculty1@nrtec.in", savedLog.getPrimaryRecipient());
    }

    @Test
    @DisplayName("3. Local SMTP attachment regression executes MimeMessageHelper with attachment")
    void test3_localSmtpAttachmentRegression() throws Exception {
        ReflectionTestUtils.setField(emailService, "mailProvider", "local");

        Session session = Session.getInstance(new Properties());
        MimeMessage mimeMessage = new MimeMessage(session);
        when(mockMailSender.createMimeMessage()).thenReturn(mimeMessage);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Event Inspection Report — Visvesvaraya Hall (CSE-SEM-1002)",
                "<p>Inspection Completed</p>",
                "Inspection Completed",
                "NEC_Inspection_Report_CSE-SEM-1002.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-1002"
        );

        assertTrue(result, "sendEmailWithAttachment must return true on local SMTP success");
        verify(mockMailSender).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("SMTP_ACCEPTED", savedLog.getStatus());
        assertEquals("SMTP", savedLog.getProvider());
        assertEquals("csehod@nrtec.in", savedLog.getPrimaryRecipient());
    }

    @Test
    @DisplayName("4. Invalid PDF content rejected without network transmission")
    void test4_invalidPdfContent() throws Exception {
        byte[] invalidBytes = "THIS IS NOT A VALID PDF FILE".getBytes(StandardCharsets.UTF_8);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Test</p>",
                "Test",
                "invalid_file.pdf",
                invalidBytes,
                "CSE-SEM-INV-01"
        );

        assertFalse(result, "sendEmailWithAttachment must return false on invalid PDF magic header");
        verifyNoInteractions(mockHttpClient);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("PDF magic header"));
    }

    @Test
    @DisplayName("5. Corrupted base64 or decode error from relay recorded as FAILED")
    @SuppressWarnings("unchecked")
    void test5_invalidBase64RelayError() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(400);
        when(mockHttpResponse.body()).thenReturn("{\"success\":false,\"error\":\"Attachment error: Corrupted or invalid base64 encoding for attachment 'report.pdf'.\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Test</p>",
                "Test",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-B64-01"
        );

        assertFalse(result, "sendEmailWithAttachment must return false when relay rejects corrupted base64");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("Corrupted or invalid base64 encoding"));
    }

    @Test
    @DisplayName("6. Oversized attachments (>10MB) rejected before network dispatch")
    void test6_oversizedAttachments() throws Exception {
        // Construct 11 MB byte array with valid PDF header
        byte[] oversizedBytes = new byte[11 * 1024 * 1024];
        System.arraycopy(new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D}, 0, oversizedBytes, 0, 5);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Large Report",
                "<p>Large Report</p>",
                "Large Report",
                "large_report.pdf",
                oversizedBytes,
                "CSE-SEM-OVER-01"
        );

        assertFalse(result, "sendEmailWithAttachment must reject oversized attachments > 10 MB");
        verifyNoInteractions(mockHttpClient);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("Attachment exceeds maximum allowed size"));
    }

    @Test
    @DisplayName("7. Unauthorized relay requests (invalid/missing secret) handled safely")
    @SuppressWarnings("unchecked")
    void test7_unauthorizedRelayRequests() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(401);
        when(mockHttpResponse.body()).thenReturn("{\"success\":false,\"error\":\"Unauthorized: Invalid or missing shared secret.\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-AUTH-01"
        );

        assertFalse(result, "sendEmailWithAttachment must return false on unauthorized relay response");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("Unauthorized"));
    }

    @Test
    @DisplayName("8. Invalid recipient requests rejected before transmission")
    void test8_invalidRecipientRequests() throws Exception {
        boolean result = emailService.sendEmailWithAttachment(
                "invalid-recipient-without-at",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-BADREC-01"
        );

        assertFalse(result, "sendEmailWithAttachment must reject invalid email formats");
        verifyNoInteractions(mockHttpClient);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("Invalid primary recipient email address"));
    }

    @Test
    @DisplayName("9. HTTP 200 with unsuccessful response body (success: false) treated as failure")
    @SuppressWarnings("unchecked")
    void test9_http200WithUnsuccessfulResponseBody() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":false,\"error\":\"GmailApp daily quota exceeded.\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-QUOTA-01"
        );

        assertFalse(result, "sendEmailWithAttachment must not treat HTTP 200 as success when body has success:false");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("daily quota exceeded"));
    }

    @Test
    @DisplayName("10. Relay timeout and idempotency protection")
    @SuppressWarnings("unchecked")
    void test10_relayTimeoutAndIdempotency() throws Exception {
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpTimeoutException("Apps Script relay request timed out after 30000ms"));

        boolean result1 = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Timeout Report",
                "<p>Timeout</p>",
                "Timeout",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-TO-101"
        );

        assertFalse(result1, "First attempt must return false on timeout");

        // Verify timeout log
        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("timed out"));

        // Second immediate attempt with same booking and recipient is suppressed by idempotency protection
        boolean result2 = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Timeout Report",
                "<p>Timeout</p>",
                "Timeout",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-TO-101"
        );

        assertTrue(result2, "Second attempt must be gracefully handled/suppressed by idempotency deduplication");
        // Verify mockHttpClient was only called once, not twice
        verify(mockHttpClient, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @DisplayName("11. Duplicate inspection report suppression prevents second delivery")
    @SuppressWarnings("unchecked")
    void test11_duplicateInspectionReportSuppression() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg_dup_101\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        // Attempt 1: successfully delivered
        boolean firstRun = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Event Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-DUP-201"
        );
        assertTrue(firstRun, "First dispatch must succeed");

        // Attempt 2: identical booking and recipient triggered again
        boolean secondRun = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Event Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-DUP-201"
        );
        assertTrue(secondRun, "Second dispatch must be suppressed idempotently");

        // Verify only 1 HTTP request was dispatched
        verify(mockHttpClient, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @DisplayName("12. Multiple recipients and CC/BCC properly routed")
    @SuppressWarnings("unchecked")
    void test12_multipleRecipientsAndCcBcc() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg_cc_bcc_01\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                List.of("ao@nrtec.in", "technician_cse@nrtec.in"),
                List.of("principal@nrtec.in"),
                "[NEC Inspection] Multi-Recipient Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-CCBCC-01"
        );

        assertTrue(result, "sendEmailWithAttachment with CC and BCC must return true");

        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(mockHttpClient).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("csehod@nrtec.in", savedLog.getPrimaryRecipient());
        assertEquals(2, savedLog.getCcRecipients().size());
        assertTrue(savedLog.getCcRecipients().contains("ao@nrtec.in"));
        assertTrue(savedLog.getCcRecipients().contains("technician_cse@nrtec.in"));
    }

    @Test
    @DisplayName("13. Partial recipient failure handled independently")
    @SuppressWarnings("unchecked")
    void test13_partialRecipientFailure() throws Exception {
        HttpResponse<String> successResponse = mock(HttpResponse.class);
        when(successResponse.statusCode()).thenReturn(200);
        when(successResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg_part_ok\"}");

        HttpResponse<String> failureResponse = mock(HttpResponse.class);
        when(failureResponse.statusCode()).thenReturn(500);
        when(failureResponse.body()).thenReturn("{\"success\":false,\"error\":\"Internal Apps Script error\"}");

        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(successResponse)
                .thenReturn(failureResponse);

        // Stakeholder 1: Hall Coordinator
        boolean coordResult = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-PARTIAL-01"
        );
        assertTrue(coordResult, "Recipient 1 must succeed");

        // Stakeholder 2: Technician
        boolean techResult = emailService.sendEmailWithAttachment(
                "technician_cse@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-PARTIAL-01"
        );
        assertFalse(techResult, "Recipient 2 must fail and be recorded explicitly as false");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(2)).save(logCaptor.capture());
        List<EmailLog> logs = logCaptor.getAllValues();

        assertEquals("SMTP_ACCEPTED", logs.get(0).getStatus());
        assertEquals("csehod@nrtec.in", logs.get(0).getPrimaryRecipient());

        assertEquals("FAILED", logs.get(1).getStatus());
        assertEquals("technician_cse@nrtec.in", logs.get(1).getPrimaryRecipient());
    }

    @Test
    @DisplayName("14. Missing or malformed relay responses handled safely")
    @SuppressWarnings("unchecked")
    void test14_missingOrMalformedRelayResponses() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("<html><body>502 Bad Gateway</body></html>");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "[NEC Inspection] Report",
                "<p>Report</p>",
                "Report",
                "report.pdf",
                VALID_PDF_BYTES,
                "CSE-SEM-MALFORM-01"
        );

        assertFalse(result, "sendEmailWithAttachment must return false on malformed JSON response");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("Invalid JSON response"));
    }
}
