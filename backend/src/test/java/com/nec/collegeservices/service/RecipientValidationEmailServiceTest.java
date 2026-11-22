package com.nec.collegeservices.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.model.EmailLog;
import com.nec.collegeservices.model.Notification;
import com.nec.collegeservices.repository.EmailLogRepository;
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

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipientValidationEmailServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private HttpClient mockHttpClient;

    @Mock
    private HttpResponse<String> mockHttpResponse;

    @InjectMocks
    private EmailService emailService;

    private static final byte[] VALID_PDF_BYTES = ("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
            "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
            "3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n" +
            "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000102 00000 n \n" +
            "trailer<</Size 4/Root 1 0 R>>\nstartxref\n150\n%%EOF").getBytes();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailService, "mailProvider", "apps-script");
        ReflectionTestUtils.setField(emailService, "appsScriptUrl", "https://script.google.com/macros/s/TEST/exec");
        ReflectionTestUtils.setField(emailService, "appsScriptSecret", "test-secret");
        ReflectionTestUtils.setField(emailService, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(emailService, "httpClient", mockHttpClient);
        emailService.clearDeduplicationCache();
    }

    @Test
    @DisplayName("sendEmailWithAttachment rejects invalid recipient and saves FAILED log without relay call")
    void testSendEmailWithAttachment_rejectsInvalidRecipient() {
        boolean result = emailService.sendEmailWithAttachment(
                "principal@nrtec.i", // Truncated domain
                List.of("csehod@nrtec.in"),
                "Test Subject",
                "<html>Test</html>",
                "Test",
                "inspection_report.pdf",
                VALID_PDF_BYTES,
                "SEM-0001"
        );

        assertFalse(result, "Expected false for invalid recipient");

        // Verify relay was NOT called
        verifyNoInteractions(mockHttpClient);

        // Verify FAILED log entry was persisted
        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals(EmailLog.STATUS_FAILED, savedLog.getStatus());
        assertEquals("principal@nrtec.i", savedLog.getPrimaryRecipient());
        assertTrue(savedLog.getErrorMessage().contains("Invalid primary recipient email address"));
    }

    @Test
    @DisplayName("sendEmailWithAttachment rejects quoted primary recipient without stripping quotes")
    void testSendEmailWithAttachment_rejectsQuotedPrimaryRecipient() {
        boolean result = emailService.sendEmailWithAttachment(
                "\"principal@nrtec.in\"", // Enclosing quotes
                List.of("csehod@nrtec.in"),
                "Test Subject",
                "<html>Test</html>",
                "Test",
                "inspection_report.pdf",
                VALID_PDF_BYTES,
                "SEM-QUOTE-001"
        );

        assertFalse(result);
        verifyNoInteractions(mockHttpClient);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());
        assertEquals(EmailLog.STATUS_FAILED, logCaptor.getValue().getStatus());
        assertEquals("\"principal@nrtec.in\"", logCaptor.getValue().getPrimaryRecipient());
    }

    @Test
    @DisplayName("sendEmailWithAttachment rejects truncated consumer domain (@gmail.co)")
    void testSendEmailWithAttachment_rejectsTruncatedConsumer() {
        boolean result = emailService.sendEmailWithAttachment(
                "user@gmail.co", // Truncated gmail
                List.of(),
                "Test Subject",
                "<html>Test</html>",
                "Test",
                "inspection_report.pdf",
                VALID_PDF_BYTES,
                "SEM-0002"
        );

        assertFalse(result);
        verifyNoInteractions(mockHttpClient);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());
        assertEquals(EmailLog.STATUS_FAILED, logCaptor.getValue().getStatus());
        assertTrue(logCaptor.getValue().getErrorMessage().contains("Invalid primary recipient email address"));
    }

    @Test
    @DisplayName("sendEmailWithAttachment accepts valid .co domain and dispatches to relay")
    @SuppressWarnings("unchecked")
    void testSendEmailWithAttachment_acceptsValidCoDomain() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg-co-123\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "partner@startup.co", // Valid .co ccTLD
                List.of("  AO@NRTEC.IN ", "partner@startup.co"), // CC contains uppercase and duplicate of primary
                List.of("support@fintech.co"),
                "Test Subject",
                "<html>Test</html>",
                "Test",
                "inspection_report.pdf",
                VALID_PDF_BYTES,
                "SEM-0003"
        );

        assertTrue(result);
        verify(mockHttpClient, times(1)).send(any(HttpRequest.class), any());

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, savedLog.getStatus());
        assertEquals("partner@startup.co", savedLog.getPrimaryRecipient());
        assertEquals(List.of("ao@nrtec.in"), savedLog.getCcRecipients(), "Primary should be excluded from CC and CC normalized");
    }

    @Test
    @DisplayName("sendEmailWithAttachment filters invalid and duplicate CCs and BCCs while preserving valid delivery")
    @SuppressWarnings("unchecked")
    void testSendEmailWithAttachment_filtersInvalidAndDuplicateSecondaryRecipients() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg-sec-456\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "ao@nrtec.in",
                List.of(
                        "csehod@nrtec.in",          // Valid CC
                        "\"quoted_cc@nrtec.in\"",   // Invalid CC (quotes)
                        "bad@nrtec.i",              // Invalid CC (truncated domain)
                        "ao@nrtec.in"               // Duplicate of primary
                ),
                List.of(
                        "dean@nrtec.in",            // Valid BCC
                        "'quoted_bcc@nrtec.in'",    // Invalid BCC (quotes)
                        "csehod@nrtec.in",          // Duplicate of CC (must be excluded from BCC)
                        "ao@nrtec.in"               // Duplicate of primary (must be excluded from BCC)
                ),
                "Inspection Report",
                "<html>Report</html>",
                "Report",
                "inspection_report.pdf",
                VALID_PDF_BYTES,
                "SEM-ATTACH-SEC-01"
        );

        assertTrue(result);
        verify(mockHttpClient, times(1)).send(any(HttpRequest.class), any());

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("ao@nrtec.in", savedLog.getPrimaryRecipient());
        assertEquals(List.of("csehod@nrtec.in"), savedLog.getCcRecipients());
    }

    @Test
    @DisplayName("sendSingleEmail rejects invalid primary recipient before claim or relay dispatch")
    void testSendSingleEmail_rejectsInvalidRecipient() {
        Notification notification = Notification.builder()
                .id("NOTIF-001")
                .referenceId("SEM-0004")
                .title("Seminar Request Submitted")
                .service("Seminar Hall")
                .createdAt(LocalDateTime.now())
                .build();

        // Use reflection to invoke private sendSingleEmail method
        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "nipsprincipal07@gmail.co", // Truncated recipient
                List.of("ao@nrtec.in")
        );

        // Verify relay was NOT called
        verifyNoInteractions(mockHttpClient);

        // Verify FAILED log was saved
        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals(EmailLog.STATUS_FAILED, savedLog.getStatus());
        assertEquals("nipsprincipal07@gmail.co", savedLog.getPrimaryRecipient());
        assertTrue(savedLog.getErrorMessage().contains("Invalid primary recipient email address"));
    }

    @Test
    @DisplayName("sendSingleEmail rejects quoted primary recipient")
    void testSendSingleEmail_rejectsQuotedPrimaryRecipient() {
        Notification notification = Notification.builder()
                .id("NOTIF-QUOTE-01")
                .referenceId("SEM-0006")
                .title("Seminar Request Submitted")
                .service("Seminar Hall")
                .createdAt(LocalDateTime.now())
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "\"principal@nrtec.in\"", // Unexpected quotes
                List.of("ao@nrtec.in")
        );

        verifyNoInteractions(mockHttpClient);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals(EmailLog.STATUS_FAILED, savedLog.getStatus());
        assertEquals("\"principal@nrtec.in\"", savedLog.getPrimaryRecipient());
    }

    @Test
    @DisplayName("sendSingleEmail normalizes recipient and filters invalid CCs before dispatch")
    @SuppressWarnings("unchecked")
    void testSendSingleEmail_normalizesAndFiltersCcs() throws Exception {
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg-html-123\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        Notification notification = Notification.builder()
                .id("NOTIF-002")
                .referenceId("SEM-0005")
                .title("Seminar Request Submitted")
                .service("Seminar Hall")
                .createdAt(LocalDateTime.now())
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "  Principal@NRTEC.IN  ", // Unnormalized primary
                List.of(
                        "principal@nrtec.in",   // Duplicate of primary (must be excluded)
                        "  CSEHOD@NRTEC.IN ",    // Valid CC (must be normalized)
                        "\"quoted@nrtec.in\"",  // Quoted CC (must be rejected)
                        "bad@gmail.co"          // Invalid CC (must be rejected)
                )
        );

        verify(mockHttpClient, times(1)).send(any(HttpRequest.class), any());

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("principal@nrtec.in", savedLog.getPrimaryRecipient());
        assertEquals(EmailLog.STATUS_SMTP_ACCEPTED, savedLog.getStatus());
        assertEquals(List.of("csehod@nrtec.in"), savedLog.getCcRecipients());
    }

    @Test
    @DisplayName("sendTestEmail rejects unexpected quote characters")
    void testSendTestEmail_rejectsQuotes() {
        Map<String, Object> result = emailService.sendTestEmail("ADMIN-1", "\"collegeservice2026@gmail.com\"");
        assertEquals("VALIDATION_ERROR", result.get("status"));
        assertTrue(((String) result.get("message")).contains("Invalid recipient email address format"));
        verifyNoInteractions(mockHttpClient);
    }
}
