package com.nec.collegeservices.controller;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.TestEmailAttachmentRequestDTO;
import com.nec.collegeservices.model.EmailLog;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.EmailLogRepository;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Controlled administrative test endpoint to verify production PDF attachment
 * delivery through the active email provider (Google Apps Script Relay v2 / SMTP).
 *
 * Strict Security & Safety Controls:
 * 1. Requires AO_ADMIN role via both Spring Security filter chain and @PreAuthorize.
 * 2. Disabled by default via 'app.mail.test-attachment.enabled=false'.
 * 3. Does NOT accept arbitrary recipients; strictly validates against configured allowlist
 *    ('app.mail.test-attachment.recipient=collegeservice2026@gmail.com').
 * 4. Generates a small, valid test PDF in memory without modifying any database records.
 * 5. Uses deterministic reference ID ('PROD-ATTACHMENT-TEST-SINGLETON') backed by
 *    EmailService and MongoDB 'email_logs' deduplication to prevent duplicate dispatches
 *    across multiple instances and process restarts.
 * 6. Never exposes secrets, passwords, or base64 attachment contents in logs or responses.
 */
@RestController
@RequestMapping("/api/admin/email")
public class AdminEmailTestController {

    private static final Logger log = LoggerFactory.getLogger(AdminEmailTestController.class);
    public static final String TEST_REFERENCE_ID = "PROD-ATTACHMENT-TEST-SINGLETON";
    public static final String DEFAULT_ALLOWED_RECIPIENT = "collegeservice2026@gmail.com";
    public static final String ATTACHMENT_FILENAME = "NEC_Render_PDF_Test.pdf";

    private final EmailService emailService;
    private final EmailLogRepository emailLogRepository;
    private final AuthService authService;
    private final boolean testAttachmentEnabled;
    private final String allowedRecipient;
    private final AtomicBoolean alreadyDispatched = new AtomicBoolean(false);

    @Autowired(required = false)
    private com.nec.collegeservices.service.EmailDeduplicationService deduplicationService;

    public void setDeduplicationService(com.nec.collegeservices.service.EmailDeduplicationService deduplicationService) {
        this.deduplicationService = deduplicationService;
    }

    @Autowired
    public AdminEmailTestController(
            EmailService emailService,
            @Autowired(required = false) EmailLogRepository emailLogRepository,
            @Autowired(required = false) AuthService authService,
            @Value("${app.mail.test-attachment.enabled:false}") boolean testAttachmentEnabled,
            @Value("${app.mail.test-attachment.recipient:collegeservice2026@gmail.com}") String allowedRecipient) {
        this.emailService = emailService;
        this.emailLogRepository = emailLogRepository;
        this.authService = authService;
        this.testAttachmentEnabled = testAttachmentEnabled;
        this.allowedRecipient = (allowedRecipient != null && !allowedRecipient.isBlank())
                ? allowedRecipient.trim().toLowerCase()
                : DEFAULT_ALLOWED_RECIPIENT;
    }

    /**
     * Dispatches a single controlled test email with an attached PDF report.
     * Accessible strictly by authenticated AO_ADMIN users when the feature flag is active.
     */
    @PostMapping("/test-attachment")
    @PreAuthorize("hasRole('AO_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dispatchTestAttachment(
            @RequestBody(required = false) TestEmailAttachmentRequestDTO request) {

        // 1. Feature Flag Guard
        if (!testAttachmentEnabled) {
            log.warn("[EMAIL-TEST] Rejected test attachment request: feature flag 'app.mail.test-attachment.enabled' is false.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Test email attachment endpoint is disabled in server configuration."));
        }

        // 2. Caller Context & Audit Logging (No secrets logged)
        String callerId = "unknown";
        if (authService != null) {
            try {
                User currentUser = authService.getCurrentUser();
                if (currentUser != null) {
                    callerId = currentUser.getUserId();
                }
            } catch (Exception ex) {
                log.debug("[EMAIL-TEST] Could not resolve caller User from AuthService: {}", ex.getMessage());
            }
        }

        // 3. Recipient Allowlist Verification (Exclusively bound to server allowlist)
        String targetRecipient = this.allowedRecipient;
        if (request != null && request.getRecipient() != null && !request.getRecipient().isBlank()) {
            String requested = request.getRecipient().trim().toLowerCase();
            if (!requested.equalsIgnoreCase(targetRecipient)) {
                log.warn("[EMAIL-TEST] Caller '{}' attempted to dispatch test email to unapproved recipient: {}",
                        callerId, requested);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("Arbitrary recipients are rejected. Test emails can only be sent to the configured allowlist: " + targetRecipient));
            }
        }

        // 4. Preflight Persistent Deduplication Check (MongoDB Atlas email_logs)
        // Deduplication key must be identical to EmailService.buildDeduplicationKey(...)
        String dedupKey = emailService.buildDeduplicationKey(TEST_REFERENCE_ID, "INSPECTION_REPORT", targetRecipient);
        if (emailLogRepository != null) {
            boolean alreadyLogged = emailLogRepository.existsByDeduplicationKeyAndStatusIn(
                    dedupKey,
                    List.of(
                            EmailLog.STATUS_SENT,
                            EmailLog.STATUS_SMTP_ACCEPTED,
                            EmailLog.STATUS_SENDING,
                            EmailLog.STATUS_SKIPPED_LOCAL_DOMAIN
                    )
            );

            // Also check for ambiguous outcomes (e.g. timeout where email may have been delivered by Gmail)
            if (!alreadyLogged) {
                java.util.Optional<EmailLog> failedLog = emailLogRepository.findFirstByDeduplicationKeyAndStatus(dedupKey, EmailLog.STATUS_FAILED);
                if (failedLog.isPresent()) {
                    String err = failedLog.get().getErrorMessage();
                    if (err != null && (err.toLowerCase().contains("timed out") || err.toLowerCase().contains("timeout"))) {
                        alreadyLogged = true;
                        log.warn("[EMAIL-TEST] Preflight check blocked dispatch: found previous ambiguous timeout log in MongoDB for key '{}' (error: '{}')", dedupKey, err);
                    }
                }
            }

            if (alreadyLogged) {
                log.warn("[EMAIL-TEST] Preflight check blocked dispatch: active/completed/ambiguous claim exists in MongoDB for key '{}'", dedupKey);
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error("Test email attachment has an existing dispatched or ambiguous outcome recorded in production email logs (key: " + dedupKey + "). Further dispatches are permanently prevented."));
            }
        }

        // Also check MongoDB distributed claims collection
        if (deduplicationService != null) {
            com.nec.collegeservices.model.EmailDeduplicationClaim claim = deduplicationService.getClaim(dedupKey);
            if (claim != null) {
                if (com.nec.collegeservices.model.EmailDeduplicationClaim.STATUS_COMPLETED.equals(claim.getStatus())
                        || com.nec.collegeservices.model.EmailDeduplicationClaim.STATUS_AMBIGUOUS.equals(claim.getStatus())
                        || (com.nec.collegeservices.model.EmailDeduplicationClaim.STATUS_IN_PROGRESS.equals(claim.getStatus())
                            && claim.getLeaseExpiresAt() != null
                            && claim.getLeaseExpiresAt().isAfter(java.time.LocalDateTime.now()))) {
                    log.warn("[EMAIL-TEST] Preflight check blocked dispatch: claim exists in email_deduplication_claims with status '{}' for key '{}'",
                            claim.getStatus(), dedupKey);
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(ApiResponse.error("Test email attachment has an existing dispatched or ambiguous outcome recorded in production email logs (key: " + dedupKey + "). Further dispatches are permanently prevented."));
                }
            }
        }

        // 5. In-Memory Process Lifecycle Guard (Fast multi-call block on same JVM)
        if (!alreadyDispatched.compareAndSet(false, true)) {
            log.warn("[EMAIL-TEST] In-memory check blocked dispatch: single dispatch already attempted for this process lifecycle by '{}'", callerId);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("Test email attachment has already been dispatched or initiated for this process lifecycle. Repeated dispatch is prevented for safety."));
        }

        // 6. In-Memory Safe PDF Generation (Zero database records touched)
        byte[] pdfBytes;
        try {
            pdfBytes = generateTestPdf(TEST_REFERENCE_ID, targetRecipient);
        } catch (Exception e) {
            // Failed BEFORE dispatch was initiated: safe to reset in-memory guard
            alreadyDispatched.set(false);
            log.error("[EMAIL-TEST] Failed to generate test PDF document before dispatch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to generate test PDF document: " + e.getMessage()));
        }

        // 7. Build Safe Email Content
        String subject = "[PRODUCTION TEST] NEC College Services - Render Apps Script PDF Attachment Relay Verification";
        String htmlBody = buildTestHtml(TEST_REFERENCE_ID, targetRecipient, ATTACHMENT_FILENAME);
        String plainText = "NEC College Service Management System\n"
                + "Production PDF Attachment Relay Verification\n"
                + "Reference ID: " + TEST_REFERENCE_ID + "\n"
                + "Recipient: " + targetRecipient + "\n"
                + "Attachment: " + ATTACHMENT_FILENAME + " (" + pdfBytes.length + " bytes)\n"
                + "Dispatched by: " + callerId + "\n";

        // 8. Dispatch via existing EmailService (Never logs payload bytes or secrets)
        log.info("[EMAIL-TEST] Dispatching controlled test attachment to '{}' (caller: '{}', ref: '{}', size: {} bytes)",
                targetRecipient, callerId, TEST_REFERENCE_ID, pdfBytes.length);

        boolean sent;
        try {
            sent = emailService.sendEmailWithAttachment(
                    targetRecipient,
                    Collections.emptyList(),
                    subject,
                    htmlBody,
                    plainText,
                    ATTACHMENT_FILENAME,
                    pdfBytes,
                    TEST_REFERENCE_ID
            );
        } catch (Exception e) {
            // DO NOT reset alreadyDispatched! Uncertain outcome after dispatch initiated.
            log.error("[EMAIL-TEST] Ambiguous exception during EmailService dispatch (ref: '{}'): {}",
                    TEST_REFERENCE_ID, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Email dispatch encountered an ambiguous exception: " + e.getMessage() + ". The dispatch guard remains locked for safety to prevent duplicate sends."));
        }

        if (!sent) {
            // DO NOT reset alreadyDispatched! Guard remains locked to prevent automatic or manual retry loops.
            log.error("[EMAIL-TEST] EmailService reported failure or rejection for test email (ref: '{}'). Guard remains locked.", TEST_REFERENCE_ID);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Email dispatch failed or was rejected by the provider. The dispatch guard remains locked for safety to prevent duplicate sends."));
        }

        // 9. Structured Safe Response
        Map<String, Object> responseData = new LinkedHashMap<>();
        responseData.put("status", "DISPATCHED");
        responseData.put("recipient", targetRecipient);
        responseData.put("attachmentFilename", ATTACHMENT_FILENAME);
        responseData.put("attachmentSizeBytes", pdfBytes.length);
        responseData.put("referenceId", TEST_REFERENCE_ID);
        responseData.put("dispatchedBy", callerId);
        responseData.put("timestamp", Instant.now().toString());

        log.info("[EMAIL-TEST] Successfully dispatched controlled test email with attachment (ref: '{}')", TEST_REFERENCE_ID);
        return ResponseEntity.ok(ApiResponse.ok("Test email attachment dispatched successfully", responseData));
    }

    /**
     * Resets the dispatch guard. Primarily used in test suites to enable multiple test scenarios.
     */
    public void resetDispatchGuard() {
        this.alreadyDispatched.set(false);
    }

    /**
     * Checks if the test email has already been dispatched.
     */
    public boolean isAlreadyDispatched() {
        return this.alreadyDispatched.get();
    }

    /**
     * Generates a minimal, valid PDF document in memory using OpenPDF.
     * Verified to begin with %PDF- magic bytes and contain structured inspection-test content.
     */
    private byte[] generateTestPdf(String referenceId, String recipient) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        PdfWriter.getInstance(document, baos);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(15, 76, 129));
        Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.DARK_GRAY);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
        Font noteFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY);

        Paragraph header = new Paragraph("NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)", titleFont);
        header.setAlignment(Element.ALIGN_CENTER);
        document.add(header);

        Paragraph subheader = new Paragraph("COLLEGE SERVICE MANAGEMENT SYSTEM\nPRODUCTION EMAIL ATTACHMENT RELAY VERIFICATION", subtitleFont);
        subheader.setAlignment(Element.ALIGN_CENTER);
        subheader.setSpacingAfter(15);
        document.add(subheader);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{35f, 65f});
        table.setSpacingBefore(10);
        table.setSpacingAfter(15);

        addTableRow(table, "Document Purpose", "Production PDF Relay Compatibility Test", boldFont, normalFont);
        addTableRow(table, "Reference ID", referenceId, boldFont, normalFont);
        addTableRow(table, "Target Recipient", recipient, boldFont, normalFont);
        addTableRow(table, "Active Host", "Render Backend (Spring Boot)", boldFont, normalFont);
        addTableRow(table, "Relay Service", "Google Apps Script Relay v2", boldFont, normalFont);
        addTableRow(table, "Generated At (UTC)", DateTimeFormatter.ISO_INSTANT.format(Instant.now()), boldFont, normalFont);
        addTableRow(table, "Generated At (IST)", DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss")
                .withZone(ZoneId.of("Asia/Kolkata")).format(Instant.now()), boldFont, normalFont);
        addTableRow(table, "Database Mutation", "None (Zero records created or altered)", boldFont, normalFont);

        document.add(table);

        Paragraph desc = new Paragraph(
                "This document is an administrative verification report generated automatically by the College Service "
                        + "Management backend to test end-to-end PDF attachment delivery through Google Apps Script Relay v2.\n\n"
                        + "Verification Scope:\n"
                        + "1. Base64 encoding of PDF binary data in Spring Boot EmailService.\n"
                        + "2. Secure HTTPS transmission to Google Apps Script Web App relay.\n"
                        + "3. Relay-side magic-byte verification (%PDF-) and size compliance.\n"
                        + "4. Final delivery to the authorized Gmail recipient mailbox.\n",
                normalFont
        );
        desc.setSpacingAfter(20);
        document.add(desc);

        Paragraph footer = new Paragraph("CONFIDENTIAL - AUTHORIZED ADMINISTRATIVE VERIFICATION ONLY", noteFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);

        document.close();
        byte[] bytes = baos.toByteArray();

        // Magic byte verification check
        if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-') {
            throw new IllegalStateException("Generated test PDF failed magic byte verification");
        }

        return bytes;
    }

    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBackgroundColor(new Color(245, 247, 250));
        c1.setPadding(6);
        PdfPCell c2 = new PdfPCell(new Phrase(value, valueFont));
        c2.setPadding(6);
        table.addCell(c1);
        table.addCell(c2);
    }

    private String buildTestHtml(String referenceId, String recipient, String filename) {
        String istTime = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss")
                .withZone(ZoneId.of("Asia/Kolkata")).format(Instant.now());
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='font-family:Arial,sans-serif;color:#333;line-height:1.6;'>"
                + "<div style='max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;padding:24px;background:#ffffff;'>"
                + "<div style='border-bottom:2px solid #0f4c81;padding-bottom:12px;margin-bottom:20px;text-align:center;'>"
                + "<h2 style='color:#0f4c81;margin:0 0 6px;'>Narasaraopeta Engineering College</h2>"
                + "<h4 style='color:#475569;margin:0;'>College Service Management System</h4>"
                + "</div>"
                + "<p>This is a controlled verification test email sent from the <strong>Render Spring Boot backend</strong>.</p>"
                + "<p>If you are reading this email and the attached PDF file (<strong>" + filename + "</strong>) is attached and readable, "
                + "the <strong>Google Apps Script Relay v2</strong> PDF attachment delivery pipeline is operating normally.</p>"
                + "<table style='width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;'>"
                + "<tr><td style='padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;width:40%;'>Reference ID</td><td style='padding:8px;border:1px solid #cbd5e1;'>" + referenceId + "</td></tr>"
                + "<tr><td style='padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;'>Recipient</td><td style='padding:8px;border:1px solid #cbd5e1;'>" + recipient + "</td></tr>"
                + "<tr><td style='padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;'>Delivery Pipeline</td><td style='padding:8px;border:1px solid #cbd5e1;'>Render Backend &rarr; Google Apps Script Relay v2 &rarr; Gmail</td></tr>"
                + "<tr><td style='padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;'>Timestamp (IST)</td><td style='padding:8px;border:1px solid #cbd5e1;'>" + istTime + "</td></tr>"
                + "<tr><td style='padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;'>Attached Document</td><td style='padding:8px;border:1px solid #cbd5e1;'>" + filename + "</td></tr>"
                + "<tr><td style='padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;'>Database Changes</td><td style='padding:8px;border:1px solid #cbd5e1;'>None (Zero records created or altered)</td></tr>"
                + "</table>"
                + "<p style='font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;'>"
                + "This is an automated administrative notification. Please do not reply directly to this email."
                + "</p>"
                + "</div></body></html>";
    }
}
