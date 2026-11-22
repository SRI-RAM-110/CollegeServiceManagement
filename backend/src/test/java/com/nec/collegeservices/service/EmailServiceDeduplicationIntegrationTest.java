package com.nec.collegeservices.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.model.EmailDeduplicationClaim;
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
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.mail.internet.MimeMessage;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceDeduplicationIntegrationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private EmailDeduplicationService deduplicationService;

    @Mock
    private HttpClient mockHttpClient;

    @Mock
    private HttpResponse<String> mockHttpResponse;

    @Mock
    private JavaMailSender mockMailSender;

    @Mock
    private MimeMessage mockMimeMessage;

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
        emailService.setDeduplicationService(deduplicationService);
        emailService.clearDeduplicationCache();
    }

    @Test
    @DisplayName("sendSingleEmail: acquires claim, validates ownership, dispatches, and completes claim")
    @SuppressWarnings("unchecked")
    void testSendSingleEmail_AcquiresAndCompletesClaimOnSuccess() throws Exception {
        String dedupKey = "SEM-101:REQUEST_SUBMITTED:principal@nrtec.in";
        EmailClaimHandle handle = new EmailClaimHandle(dedupKey, "owner-single-01", 1L, LocalDateTime.now().plusSeconds(60));

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.acquired(handle));
        when(deduplicationService.validateOwnership(any(EmailClaimHandle.class)))
                .thenReturn(true);
        when(deduplicationService.completeClaim(any(EmailClaimHandle.class)))
                .thenReturn(true);

        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg-single-001\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        Notification notification = Notification.builder()
                .id("NOTIF-101")
                .referenceId("SEM-101")
                .title("Seminar Booking")
                .service("Seminar Hall")
                .createdAt(LocalDateTime.now())
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "principal@nrtec.in",
                List.of()
        );

        // Verify acquisition, ownership validation, dispatch, and completion
        verify(deduplicationService, times(1)).acquireClaim(dedupKey);
        verify(deduplicationService, times(1)).validateOwnership(eq(handle));
        verify(mockHttpClient, times(1)).send(any(HttpRequest.class), any());
        verify(deduplicationService, times(1)).completeClaim(eq(handle));
        verify(deduplicationService, never()).releaseClaim(any());
        verify(deduplicationService, never()).markAmbiguous(any(), anyString());
    }

    @Test
    @DisplayName("sendSingleEmail: duplicate dispatch blocked when claim is ALREADY_COMPLETED")
    void testSendSingleEmail_BlocksDuplicateCompleted() {
        String dedupKey = "SEM-102:REQUEST_SUBMITTED:ao@nrtec.in";
        EmailDeduplicationClaim completedClaim = EmailDeduplicationClaim.builder()
                .id(dedupKey)
                .status(EmailDeduplicationClaim.STATUS_COMPLETED)
                .build();

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.alreadyCompleted(completedClaim));

        Notification notification = Notification.builder()
                .id("NOTIF-102")
                .referenceId("SEM-102")
                .title("Seminar Booking")
                .service("Seminar Hall")
                .createdAt(LocalDateTime.now())
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "ao@nrtec.in",
                List.of()
        );

        verify(deduplicationService, times(1)).acquireClaim(dedupKey);
        verifyNoInteractions(mockHttpClient);
    }

    @Test
    @DisplayName("sendSingleEmail: duplicate dispatch blocked when claim is AMBIGUOUS")
    void testSendSingleEmail_BlocksDuplicateAmbiguous() {
        String dedupKey = "SEM-103:REQUEST_SUBMITTED:ao@nrtec.in";
        EmailDeduplicationClaim ambiguousClaim = EmailDeduplicationClaim.builder()
                .id(dedupKey)
                .status(EmailDeduplicationClaim.STATUS_AMBIGUOUS)
                .build();

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.ambiguous(ambiguousClaim));

        Notification notification = Notification.builder()
                .id("NOTIF-103")
                .referenceId("SEM-103")
                .title("Seminar Booking")
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "ao@nrtec.in",
                List.of()
        );

        verifyNoInteractions(mockHttpClient);
    }

    @Test
    @DisplayName("sendSingleEmail: fails closed and blocks dispatch when database error occurs")
    void testSendSingleEmail_FailsClosedOnDatabaseError() {
        String dedupKey = "SEM-104:REQUEST_SUBMITTED:ao@nrtec.in";

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.databaseError("MongoDB connection lost"));

        Notification notification = Notification.builder()
                .id("NOTIF-104")
                .referenceId("SEM-104")
                .title("Seminar Booking")
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "ao@nrtec.in",
                List.of()
        );

        verifyNoInteractions(mockHttpClient);
    }

    @Test
    @DisplayName("sendSingleEmail: marks claim AMBIGUOUS on Apps Script HttpTimeoutException")
    @SuppressWarnings("unchecked")
    void testSendSingleEmail_MarksAmbiguousOnTimeout() throws Exception {
        String dedupKey = "SEM-105:REQUEST_SUBMITTED:principal@nrtec.in";
        EmailClaimHandle handle = new EmailClaimHandle(dedupKey, "owner-timeout", 1L, LocalDateTime.now().plusSeconds(60));

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.acquired(handle));
        when(deduplicationService.validateOwnership(any(EmailClaimHandle.class)))
                .thenReturn(true);

        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpTimeoutException("request timed out after 20000ms"));

        Notification notification = Notification.builder()
                .id("NOTIF-105")
                .referenceId("SEM-105")
                .title("Seminar Booking")
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "principal@nrtec.in",
                List.of()
        );

        verify(deduplicationService, times(1)).markAmbiguous(eq(handle), contains("timed out"));
        verify(deduplicationService, never()).releaseClaim(any());
        verify(deduplicationService, never()).completeClaim(any());
    }

    @Test
    @DisplayName("sendEmailWithAttachment: acquires, validates ownership, and completes claim on Apps Script success")
    @SuppressWarnings("unchecked")
    void testSendEmailWithAttachment_AcquiresAndCompletesClaimOnSuccess() throws Exception {
        String dedupKey = "SEM-INSP-201:INSPECTION_REPORT:principal@nrtec.in";
        EmailClaimHandle handle = new EmailClaimHandle(dedupKey, "owner-attach-01", 1L, LocalDateTime.now().plusSeconds(60));

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.acquired(handle));
        when(deduplicationService.validateOwnership(any(EmailClaimHandle.class)))
                .thenReturn(true);
        when(deduplicationService.completeClaim(any(EmailClaimHandle.class)))
                .thenReturn(true);

        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"success\":true,\"messageId\":\"msg-attach-001\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        boolean result = emailService.sendEmailWithAttachment(
                "principal@nrtec.in",
                List.of("csehod@nrtec.in"),
                List.of(),
                "Inspection Report",
                "<html>Report</html>",
                "Report",
                "inspection.pdf",
                VALID_PDF_BYTES,
                "SEM-INSP-201"
        );

        assertTrue(result);
        verify(deduplicationService, times(1)).acquireClaim(dedupKey);
        verify(deduplicationService, times(1)).validateOwnership(eq(handle));
        verify(deduplicationService, times(1)).completeClaim(eq(handle));
        verify(deduplicationService, never()).releaseClaim(any());
        verify(deduplicationService, never()).markAmbiguous(any(), anyString());
    }

    @Test
    @DisplayName("sendEmailWithAttachment: marks claim AMBIGUOUS on Apps Script HttpTimeoutException")
    @SuppressWarnings("unchecked")
    void testSendEmailWithAttachment_MarksAmbiguousOnTimeout() throws Exception {
        String dedupKey = "SEM-INSP-202:INSPECTION_REPORT:principal@nrtec.in";
        EmailClaimHandle handle = new EmailClaimHandle(dedupKey, "owner-attach-timeout", 1L, LocalDateTime.now().plusSeconds(60));

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.acquired(handle));
        when(deduplicationService.validateOwnership(any(EmailClaimHandle.class)))
                .thenReturn(true);

        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpTimeoutException("request timed out after 30000ms"));

        boolean result = emailService.sendEmailWithAttachment(
                "principal@nrtec.in",
                List.of(),
                List.of(),
                "Inspection Report",
                "<html>Report</html>",
                "Report",
                "inspection.pdf",
                VALID_PDF_BYTES,
                "SEM-INSP-202"
        );

        assertFalse(result);
        verify(deduplicationService, times(1)).markAmbiguous(eq(handle), contains("timed out"));
        verify(deduplicationService, never()).releaseClaim(any());
        verify(deduplicationService, never()).completeClaim(any());

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, atLeastOnce()).save(logCaptor.capture());
        assertEquals(EmailLog.STATUS_FAILED, logCaptor.getValue().getStatus());
        assertTrue(logCaptor.getValue().getErrorMessage().contains("timed out"));
    }

    @Test
    @DisplayName("sendEmailWithAttachment: releases claim on conclusive pre-dispatch validation failure")
    void testSendEmailWithAttachment_ReleasesClaimOnPreDispatchFailure() {
        String dedupKey = "SEM-INSP-203:INSPECTION_REPORT:principal@nrtec.in";
        EmailClaimHandle handle = new EmailClaimHandle(dedupKey, "owner-attach-invalid", 1L, LocalDateTime.now().plusSeconds(60));

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.acquired(handle));

        // Invalid PDF magic bytes (conclusive failure before external relay)
        boolean result = emailService.sendEmailWithAttachment(
                "principal@nrtec.in",
                List.of(),
                List.of(),
                "Inspection Report",
                "<html>Report</html>",
                "Report",
                "inspection.pdf",
                new byte[] { 0x00, 0x01, 0x02 }, // NOT %PDF-
                "SEM-INSP-203"
        );

        assertFalse(result);
        verify(deduplicationService, times(1)).releaseClaim(eq(handle));
        verifyNoInteractions(mockHttpClient);
    }

    @Test
    @DisplayName("sendEmailWithAttachment: aborts dispatch when ownership validation fails before send")
    void testSendEmailWithAttachment_AbortsWhenOwnershipLost() {
        String dedupKey = "SEM-INSP-204:INSPECTION_REPORT:principal@nrtec.in";
        EmailClaimHandle handle = new EmailClaimHandle(dedupKey, "owner-expired", 1L, LocalDateTime.now().minusSeconds(1));

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.acquired(handle));
        when(deduplicationService.validateOwnership(eq(handle)))
                .thenReturn(false); // Lease expired or lost

        boolean result = emailService.sendEmailWithAttachment(
                "principal@nrtec.in",
                List.of(),
                List.of(),
                "Inspection Report",
                "<html>Report</html>",
                "Report",
                "inspection.pdf",
                VALID_PDF_BYTES,
                "SEM-INSP-204"
        );

        assertFalse(result);
        verifyNoInteractions(mockHttpClient);
        verify(deduplicationService, times(1)).releaseClaim(eq(handle));
    }

    @Test
    @DisplayName("SMTP compatibility: sendSingleEmail dispatches via SMTP and completes claim")
    void testSmtpCompatibility_CompletesClaimOnSmtpSend() {
        ReflectionTestUtils.setField(emailService, "mailProvider", "smtp");
        ReflectionTestUtils.setField(emailService, "mailHost", "smtp.gmail.com");
        ReflectionTestUtils.setField(emailService, "mailUsername", "mailer@nrtec.in");
        ReflectionTestUtils.setField(emailService, "mailPassword", "smtp-pass");
        ReflectionTestUtils.setField(emailService, "dynamicMailSender", mockMailSender);

        when(mockMailSender.createMimeMessage()).thenReturn(mockMimeMessage);

        String dedupKey = "SEM-301:REQUEST_SUBMITTED:principal@nrtec.in";
        EmailClaimHandle handle = new EmailClaimHandle(dedupKey, "owner-smtp", 1L, LocalDateTime.now().plusSeconds(60));

        when(deduplicationService.acquireClaim(dedupKey))
                .thenReturn(ClaimAcquisitionResult.acquired(handle));
        when(deduplicationService.validateOwnership(any(EmailClaimHandle.class)))
                .thenReturn(true);

        Notification notification = Notification.builder()
                .id("NOTIF-301")
                .referenceId("SEM-301")
                .title("Seminar Booking")
                .build();

        ReflectionTestUtils.invokeMethod(
                emailService,
                "sendSingleEmail",
                notification,
                "REQUEST_SUBMITTED",
                "principal@nrtec.in",
                List.of()
        );

        verify(mockMailSender, times(1)).send(any(MimeMessage.class));
        verify(deduplicationService, times(1)).completeClaim(eq(handle));
    }
}
