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
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EmailService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Autowired(required = false)
    private SeminarBookingRepository seminarBookingRepository;

    @Autowired(required = false)
    private SeminarHallRepository seminarHallRepository;

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private int mailPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private boolean smtpAuth;

    @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}")
    private boolean smtpStarttls;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${APP_MAIL_FROM:${MAIL_FROM:${spring.mail.username:no-reply@nrtec.in}}}")
    private String mailFrom;

    @Value("${APP_MAIL_FROM_NAME:${MAIL_FROM_NAME:NEC Service Management}}")
    private String mailFromName;

    @Value("${APP_URL:${FRONTEND_URL:http://localhost:5173}}")
    private String appUrl;

    @Value("${app.notification.cc-emails:zsonsoul@gmail.com}")
    private String ccEmailsConfig;

    @Value("${app.notification.cc-events:REQUEST_SUBMITTED,REQUEST_APPROVED,REQUEST_REJECTED,REQUEST_CANCELLED,TEST_EVENT}")
    private String ccEventsConfig;

    private JavaMailSender dynamicMailSender;

    public void setMailSender(JavaMailSender mailSender) {
        this.dynamicMailSender = mailSender;
    }

    @PostConstruct
    public void init() {
        log.info("==========================================================");
        log.info("EmailService initialized using SMTP provider");
        if (isSmtpConfigured()) {
            this.dynamicMailSender = createMailSender();
            log.info("SMTP active: host={}:{}, sender={}", mailHost, mailPort, mailUsername);
        } else {
            log.warn("SMTP credentials not configured (SPRING_MAIL_USERNAME / SPRING_MAIL_PASSWORD missing). " +
                     "Email notifications will be safely simulated/logged.");
        }
        log.info("==========================================================");
    }

    public boolean isSmtpConfigured() {
        return mailUsername != null && !mailUsername.isBlank() &&
               mailPassword != null && !mailPassword.isBlank();
    }

    public boolean isProviderConfigured() {
        return isSmtpConfigured();
    }

    public String getFormattedFrom() {
        String from = (mailFrom != null && !mailFrom.isBlank())
                ? mailFrom.trim().replaceAll("^[\"']|[\"']$", "")
                : ((mailUsername != null && !mailUsername.isBlank()) ? mailUsername.trim() : "no-reply@nrtec.in");
        if (from.contains("<") && from.contains(">")) {
            return from;
        }
        String name = (mailFromName != null && !mailFromName.isBlank())
                ? mailFromName.trim().replaceAll("^[\"']|[\"']$", "")
                : "NEC Service Management";
        return name + " <" + from + ">";
    }

    public String sanitizeErrorMessage(String msg, String... sensitiveValues) {
        if (msg == null) return "Unknown error";
        String sanitized = msg;
        if (mailPassword != null && !mailPassword.isBlank()) {
            sanitized = sanitized.replace(mailPassword, "[REDACTED_PASSWORD]");
            sanitized = sanitized.replace(mailPassword.trim(), "[REDACTED_PASSWORD]");
        }
        if (sensitiveValues != null) {
            for (String val : sensitiveValues) {
                if (val != null && !val.isBlank() && val.length() > 4) {
                    sanitized = sanitized.replace(val, "[REDACTED_TOKEN]");
                }
            }
        }
        sanitized = sanitized.replaceAll("(?i)Bearer\\s+[A-Za-z0-9_.-]+", "Bearer [REDACTED]");
        return sanitized;
    }

    private JavaMailSender createMailSender() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        String host = (mailHost != null && !mailHost.isBlank()) ? mailHost.trim().replaceAll("^[\"']|[\"']$", "") : "smtp.gmail.com";
        int port = mailPort > 0 ? mailPort : 587;
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(mailUsername != null ? mailUsername.trim().replaceAll("^[\"']|[\"']$", "") : "");
        sender.setPassword(mailPassword != null ? mailPassword.trim().replaceAll("^[\"']|[\"']$", "").replaceAll("\\s+", "") : "");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(smtpAuth));
        props.put("mail.smtp.starttls.enable", String.valueOf(smtpStarttls));
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
        props.put("mail.smtp.ssl.trust", "*");
        props.put("mail.smtp.connectiontimeout", "15000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        return sender;
    }

    public List<String> getCcEmailsList() {
        if (ccEmailsConfig == null || ccEmailsConfig.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(ccEmailsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank() && s.contains("@"))
                .distinct()
                .collect(Collectors.toList());
    }

    public Set<String> getCcEventsSet() {
        if (ccEventsConfig == null || ccEventsConfig.isBlank()) {
            return Collections.emptySet();
        }
        return Arrays.stream(ccEventsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(String::toUpperCase)
                .collect(Collectors.toSet());
    }

    public String classifyEvent(Notification notification) {
        if (notification == null) return "GENERAL";
        String title = notification.getTitle() != null ? notification.getTitle().toUpperCase() : "";
        String msg = notification.getMessage() != null ? notification.getMessage().toUpperCase() : "";

        if (title.contains("NEW") && (title.contains("REQUEST") || title.contains("BOOKING"))) {
            return "REQUEST_SUBMITTED";
        }
        if (title.contains("APPROVED") && (title.contains("CANCEL") || msg.contains("CANCELLATION"))) {
            return "REQUEST_CANCELLED";
        }
        if (title.contains("APPROVED")) {
            return "REQUEST_APPROVED";
        }
        if (title.contains("REJECTED") && (title.contains("CANCEL") || msg.contains("CANCELLATION"))) {
            return "REQUEST_CANCEL_REJECTED";
        }
        if (title.contains("REJECTED")) {
            return "REQUEST_REJECTED";
        }
        if (title.contains("CANCELLATION REQUESTED") || title.contains("CANCEL REQUEST")) {
            return "REQUEST_CANCEL_REQUESTED";
        }
        if (title.contains("CANCELLED") || title.contains("CANCELLATION")) {
            return "REQUEST_CANCELLED";
        }
        if (title.contains("READY") || title.contains("COLLECTED") || title.contains("UNDER REVIEW") || title.contains("FORWARDED")) {
            return "REQUEST_STATUS_UPDATED";
        }
        return "GENERAL_NOTIFICATION";
    }

    @Async
    public CompletableFuture<Void> sendNotificationEmailAsync(Notification notification) {
        try {
            processAndSendNotificationEmail(notification);
        } catch (Exception e) {
            log.warn("Asynchronous email notification dispatch failed for notification {}: {}",
                    notification != null ? notification.getId() : "null", e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    public void processAndSendNotificationEmail(Notification notification) {
        if (notification == null || !mailEnabled) {
            return;
        }

        String eventCategory = classifyEvent(notification);
        List<String> primaryRecipients = resolvePrimaryRecipients(notification);
        if (primaryRecipients.isEmpty()) {
            log.debug("No valid primary email recipients found for notification {}", notification.getId());
            return;
        }

        List<String> ccRecipients = resolveCcRecipients(notification, eventCategory);

        for (String primaryRecipient : primaryRecipients) {
            sendSingleEmail(notification, eventCategory, primaryRecipient, ccRecipients);
        }
    }

    public List<String> resolvePrimaryRecipients(Notification notification) {
        Set<String> recipientEmails = new LinkedHashSet<>();

        String userId = notification.getRecipientUserId();
        if (userId != null && !userId.isBlank() && !"ALL".equalsIgnoreCase(userId)) {
            userRepository.findByUserId(userId.trim())
                    .or(() -> userRepository.findByEmailIgnoreCase(userId.trim()))
                    .ifPresent(u -> {
                        if (u.getEmail() != null && !u.getEmail().isBlank()) {
                            recipientEmails.add(u.getEmail().trim().toLowerCase());
                        }
                    });
            return new ArrayList<>(recipientEmails);
        }

        String role = notification.getRecipientRole();
        String dept = notification.getRecipientDept();

        List<User> targetUsers = userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .filter(u -> {
                    boolean roleMatch = role == null || "ALL".equalsIgnoreCase(role) || u.hasRole(role) || u.hasServicePermission(role);
                    boolean deptMatch = dept == null || "ALL".equalsIgnoreCase(dept) || "ADMIN".equalsIgnoreCase(dept) ||
                            "ADMIN".equalsIgnoreCase(u.getDepartment()) || (u.getDepartment() != null && u.getDepartment().equalsIgnoreCase(dept));
                    return roleMatch && deptMatch;
                })
                .toList();

        for (User u : targetUsers) {
            if (u.getEmail() != null && !u.getEmail().isBlank() && u.getEmail().contains("@")) {
                recipientEmails.add(u.getEmail().trim().toLowerCase());
            }
        }

        return new ArrayList<>(recipientEmails);
    }

    public List<String> resolveCcRecipients(String eventCategory) {
        return resolveCcRecipients(null, eventCategory);
    }

    public List<String> resolveCcRecipients(Notification notification, String eventCategory) {
        if (isSeminarNotification(notification)) {
            return resolveSeminarHallCcRecipients(notification);
        }

        // Global CC behavior preserved for non-seminar services
        Set<String> configuredEvents = getCcEventsSet();
        if (configuredEvents.contains(eventCategory)) {
            return getCcEmailsList();
        }
        return Collections.emptyList();
    }

    public boolean isSeminarNotification(Notification notification) {
        if (notification == null) return false;
        String service = notification.getService();
        if (service != null && (service.equalsIgnoreCase("Seminar Hall") || service.equalsIgnoreCase("Seminar"))) {
            return true;
        }
        String title = notification.getTitle();
        if (title != null && title.toLowerCase().contains("seminar")) {
            return true;
        }
        String refId = notification.getReferenceId();
        if (refId != null && (refId.contains("-SEM-") || refId.startsWith("SEM-"))) {
            return true;
        }
        if (refId != null && seminarBookingRepository != null) {
            try {
                if (seminarBookingRepository.findByBookingId(refId).isPresent()) return true;
                if (seminarBookingRepository.findById(refId).isPresent()) return true;
                List<SeminarBooking> series = seminarBookingRepository.findBySeriesId(refId);
                if (series != null && !series.isEmpty()) return true;
            } catch (Exception ignored) {}
        }
        return false;
    }

    public List<String> resolveSeminarHallCcRecipients(Notification notification) {
        if (notification == null || seminarBookingRepository == null || seminarHallRepository == null) {
            return Collections.emptyList();
        }

        String refId = notification.getReferenceId();
        if (refId == null || refId.isBlank()) {
            return Collections.emptyList();
        }

        SeminarBooking booking = null;
        try {
            // 1. Try find by bookingId
            var byBookingId = seminarBookingRepository.findByBookingId(refId);
            if (byBookingId.isPresent()) {
                booking = byBookingId.get();
            } else {
                // 2. Try find by MongoDB document ID
                var byId = seminarBookingRepository.findById(refId);
                if (byId.isPresent()) {
                    booking = byId.get();
                } else {
                    // 3. Try find by recurring seriesId
                    List<SeminarBooking> seriesBookings = seminarBookingRepository.findBySeriesId(refId);
                    if (seriesBookings != null && !seriesBookings.isEmpty()) {
                        booking = seriesBookings.get(0);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error looking up booking for seminar notification {}: {}", refId, e.getMessage());
        }

        if (booking == null) {
            log.info("Seminar notification reference '{}' did not resolve to a booking record. Sending without CC.", refId);
            return Collections.emptyList();
        }

        // Identify the hall from the actual booking record
        String hallId = booking.getHallId();
        String hallName = booking.getHallName();

        SeminarHall hall = null;
        try {
            if (hallId != null && !hallId.isBlank()) {
                hall = seminarHallRepository.findByHallId(hallId).orElse(null);
                if (hall == null) {
                    hall = seminarHallRepository.findById(hallId).orElse(null);
                }
            }
            if (hall == null && hallName != null && !hallName.isBlank()) {
                hall = seminarHallRepository.findAll().stream()
                        .filter(h -> h.getName() != null && h.getName().equalsIgnoreCase(hallName))
                        .findFirst()
                        .orElse(null);
            }
        } catch (Exception e) {
            log.warn("Error looking up seminar hall for booking {}: {}", booking.getBookingId(), e.getMessage());
        }

        if (hall == null) {
            log.info("Seminar booking '{}' refers to hallId '{}' / hallName '{}' not found in database. Sending without CC.",
                    booking.getBookingId(), hallId, hallName);
            return Collections.emptyList();
        }

        List<String> rawCcEmails = hall.getCcEmails();
        if (rawCcEmails == null || rawCcEmails.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> validCcEmails = new LinkedHashSet<>();
        for (String email : rawCcEmails) {
            if (email == null) continue;
            String clean = email.trim().replaceAll("^[\"']|[\"']$", "").toLowerCase();
            if (clean.isEmpty()) continue;
            if (clean.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                validCcEmails.add(clean);
            } else {
                log.warn("Ignored invalid CC email '{}' in hall '{}' configuration.", email, hall.getHallId());
            }
        }

        return new ArrayList<>(validCcEmails);
    }

    private void sendSingleEmail(Notification notification, String eventCategory,
                                 String primaryRecipient, List<String> ccRecipients) {
        String referenceId = notification.getReferenceId() != null ? notification.getReferenceId() : notification.getId();
        String dedupKey = (referenceId != null ? referenceId : "GEN") + ":" + eventCategory + ":" + primaryRecipient.toLowerCase();

        // Check deduplication
        Optional<EmailLog> existing = emailLogRepository.findFirstByDeduplicationKeyAndStatus(dedupKey, "SENT");
        if (existing.isPresent()) {
            log.info("Duplicate email skipped for key: {}", dedupKey);
            return;
        }

        // Filter CCs so primary is not in CC
        List<String> effectiveCcs = ccRecipients.stream()
                .filter(cc -> !cc.equalsIgnoreCase(primaryRecipient))
                .toList();

        String subject = "[NEC Services] " + (notification.getTitle() != null ? notification.getTitle() : "Notification") +
                         (referenceId != null ? " (" + referenceId + ")" : "");

        EmailLog logEntry = EmailLog.builder()
                .notificationId(notification.getId())
                .referenceId(referenceId)
                .deduplicationKey(dedupKey)
                .service(notification.getService() != null ? notification.getService() : "General")
                .eventCategory(eventCategory)
                .primaryRecipient(primaryRecipient)
                .ccRecipients(effectiveCcs)
                .subject(subject)
                .provider("SMTP")
                .createdAt(LocalDateTime.now())
                .build();

        String htmlBody = buildHtmlEmailBody(notification, eventCategory, referenceId);
        String plainText = buildPlainTextEmailBody(notification, eventCategory, referenceId);

        dispatchEmail(primaryRecipient, effectiveCcs, subject, htmlBody, plainText, logEntry);
    }

    private void dispatchEmail(String primaryRecipient, List<String> ccRecipients,
                               String subject, String htmlBody, String plainText,
                               EmailLog logEntry, String... sensitiveValues) {
        dispatchViaSmtp(primaryRecipient, ccRecipients, subject, htmlBody, plainText, logEntry, sensitiveValues);
    }

    private void dispatchViaSmtp(String primaryRecipient, List<String> ccRecipients,
                                 String subject, String htmlBody, String plainText,
                                 EmailLog logEntry, String... sensitiveValues) {
        if (!isSmtpConfigured()) {
            logEntry.setStatus("SKIPPED_NO_CREDENTIALS");
            logEntry.setErrorMessage("SMTP credentials not configured in environment. Email logged safely.");
            emailLogRepository.save(logEntry);
            log.info("Email notification simulated [SKIPPED_NO_CREDENTIALS] via SMTP to: {} (CC: {}) - Subject: {}",
                    primaryRecipient, ccRecipients, subject);
            return;
        }

        try {
            JavaMailSender sender = (dynamicMailSender != null) ? dynamicMailSender : createMailSender();
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String senderFrom = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom : mailUsername;
            helper.setFrom(new InternetAddress(senderFrom, mailFromName));
            helper.setTo(primaryRecipient);
            if (!ccRecipients.isEmpty()) {
                helper.setCc(ccRecipients.toArray(new String[0]));
            }
            helper.setSubject(subject);
            helper.setText(plainText, htmlBody);

            sender.send(message);

            logEntry.setStatus("SENT");
            logEntry.setErrorMessage(null);
            emailLogRepository.save(logEntry);
            log.info("Email notification SENT successfully via SMTP to: {} (CC: {}) - Subject: {}",
                    primaryRecipient, ccRecipients, subject);

        } catch (Exception e) {
            String sanitizedError = sanitizeErrorMessage(e.getMessage(), sensitiveValues);
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(sanitizedError);
            emailLogRepository.save(logEntry);
            log.warn("SMTP email delivery failed to {}: {}", primaryRecipient, sanitizedError);
        }
    }

    public Map<String, Object> sendTestEmail(String requestingUserId, String targetEmail) {
        String recipient = (targetEmail != null && !targetEmail.isBlank())
                ? targetEmail.trim()
                : "sriramsriram123654@gmail.com";

        List<String> ccList = getCcEmailsList();

        Notification testNotification = Notification.builder()
                .id("TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .recipientUserId(requestingUserId)
                .service("Seminar Hall")
                .title("Test Email Notification")
                .message("This is a live test notification from Narasaraopet Engineering College Services Management System. " +
                         "Verifying email delivery to primary recipient and external CC via SMTP.")
                .type("INFO")
                .referenceId("TEST-SEM-0001")
                .createdAt(LocalDateTime.now())
                .build();

        String eventCategory = "TEST_EVENT";
        String dedupKey = "TEST:" + System.currentTimeMillis() + ":" + recipient.toLowerCase();

        EmailLog logEntry = EmailLog.builder()
                .notificationId(testNotification.getId())
                .referenceId(testNotification.getReferenceId())
                .deduplicationKey(dedupKey)
                .service("Seminar Hall")
                .eventCategory(eventCategory)
                .primaryRecipient(recipient)
                .ccRecipients(ccList)
                .subject("[NEC Services] Test Email Notification (TEST-SEM-0001)")
                .provider("SMTP")
                .createdAt(LocalDateTime.now())
                .build();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("primaryRecipient", recipient);
        result.put("ccRecipients", ccList);
        result.put("event", eventCategory);
        result.put("provider", "SMTP");
        result.put("configured", isSmtpConfigured());

        String htmlBody = buildHtmlEmailBody(testNotification, eventCategory, testNotification.getReferenceId());
        String plainText = buildPlainTextEmailBody(testNotification, eventCategory, testNotification.getReferenceId());

        if (!isSmtpConfigured()) {
            logEntry.setStatus("SKIPPED_NO_CREDENTIALS");
            logEntry.setErrorMessage("SMTP credentials not configured (set SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD to enable live delivery).");
            emailLogRepository.save(logEntry);
            result.put("status", "SKIPPED_NO_CREDENTIALS");
            result.put("message", "SMTP credentials not configured. Email logged safely without failure.");
            return result;
        }

        try {
            JavaMailSender sender = (dynamicMailSender != null) ? dynamicMailSender : createMailSender();
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String senderFrom = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom : mailUsername;
            helper.setFrom(new InternetAddress(senderFrom, mailFromName));
            helper.setTo(recipient);
            if (!ccList.isEmpty()) {
                helper.setCc(ccList.toArray(new String[0]));
            }
            helper.setSubject(logEntry.getSubject());
            helper.setText(plainText, htmlBody);

            sender.send(message);

            logEntry.setStatus("SENT");
            emailLogRepository.save(logEntry);

            result.put("status", "SENT");
            result.put("message", "Test email sent successfully via SMTP to " + recipient + " (CC: " + ccList + ")");
            return result;

        } catch (Exception e) {
            String sanitized = sanitizeErrorMessage(e.getMessage());
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(sanitized);
            emailLogRepository.save(logEntry);

            result.put("status", "FAILED");
            result.put("error", sanitized);
            result.put("message", "Failed to deliver email: " + sanitized);
            return result;
        }
    }

    private String buildHtmlEmailBody(Notification notification, String eventCategory, String referenceId) {
        String badgeColor = "#2563eb"; // blue
        String badgeText = "Notification";

        switch (eventCategory) {
            case "REQUEST_SUBMITTED":
                badgeColor = "#0284c7"; // sky
                badgeText = "Submitted";
                break;
            case "REQUEST_APPROVED":
                badgeColor = "#16a34a"; // green
                badgeText = "Approved";
                break;
            case "REQUEST_REJECTED":
                badgeColor = "#dc2626"; // red
                badgeText = "Rejected";
                break;
            case "REQUEST_CANCELLED":
                badgeColor = "#ea580c"; // orange
                badgeText = "Cancelled";
                break;
            case "REQUEST_CANCEL_REQUESTED":
                badgeColor = "#d97706"; // amber
                badgeText = "Cancellation Requested";
                break;
            case "TEST_EVENT":
                badgeColor = "#7c3aed"; // purple
                badgeText = "Test Verification";
                break;
        }

        String serviceName = notification.getService() != null ? notification.getService() : "Department Service";
        String reqId = referenceId != null ? referenceId : "N/A";
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

        return "<!DOCTYPE html>" +
                "<html><head><meta charset='UTF-8'>" +
                "<style>" +
                "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }" +
                ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }" +
                ".header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; color: #ffffff; text-align: center; }" +
                ".header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }" +
                ".header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }" +
                ".body-content { padding: 28px 24px; }" +
                ".badge-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }" +
                ".badge { background-color: " + badgeColor + "; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; }" +
                ".req-id { font-family: monospace; font-size: 14px; font-weight: 700; color: #334155; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; }" +
                ".card-title { font-size: 18px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }" +
                ".details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }" +
                ".details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }" +
                ".details-table td.label { font-weight: 600; color: #64748b; width: 35%; }" +
                ".details-table td.value { color: #1e293b; font-weight: 500; }" +
                ".message-box { background-color: #f8fafc; border-left: 4px solid " + badgeColor + "; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; line-height: 1.5; color: #334155; }" +
                ".action-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin-top: 10px; }" +
                ".footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }" +
                ".footer p { margin: 4px 0; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>NARASARAOPET ENGINEERING COLLEGE</h1>" +
                "<p>College Department Services Management System</p>" +
                "</div>" +
                "<div class='body-content'>" +
                "<div style='margin-bottom: 16px;'>" +
                "<span class='badge'>" + badgeText + "</span>" +
                "<span class='req-id' style='float: right;'>#" + reqId + "</span>" +
                "<div style='clear: both;'></div>" +
                "</div>" +
                "<h2 class='card-title'>" + (notification.getTitle() != null ? notification.getTitle() : "Service Notification") + "</h2>" +
                "<div class='message-box'>" + (notification.getMessage() != null ? notification.getMessage() : "") + "</div>" +
                "<table class='details-table'>" +
                "<tr><td class='label'>Service</td><td class='value'>" + serviceName + "</td></tr>" +
                "<tr><td class='label'>Request ID</td><td class='value'>" + reqId + "</td></tr>" +
                "<tr><td class='label'>Status</td><td class='value'><strong style='color: " + badgeColor + ";'>" + badgeText + "</strong></td></tr>" +
                "<tr><td class='label'>Timestamp</td><td class='value'>" + dateStr + "</td></tr>" +
                "</table>" +
                "<div style='text-align: center; margin-top: 24px;'>" +
                "<a href='" + appUrl + "/requests' class='action-btn' target='_blank'>View in Portal</a>" +
                "</div>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>This is an automated notification from NEC Department Services Management System.</p>" +
                "<p>Please do not reply directly to this email.</p>" +
                "<p>&copy; " + LocalDateTime.now().getYear() + " Narasaraopet Engineering College (Autonomous). All rights reserved.</p>" +
                "</div></div></body></html>";
    }

    private String buildPlainTextEmailBody(Notification notification, String eventCategory, String referenceId) {
        String reqId = referenceId != null ? referenceId : "N/A";
        String serviceName = notification.getService() != null ? notification.getService() : "Department Service";
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

        return "=======================================================\n" +
                "NARASARAOPET ENGINEERING COLLEGE (AUTONOMOUS)\n" +
                "College Department Services Management System\n" +
                "=======================================================\n\n" +
                "Notification: " + (notification.getTitle() != null ? notification.getTitle() : "Service Notification") + "\n" +
                "Request ID: " + reqId + "\n" +
                "Service: " + serviceName + "\n" +
                "Event: " + eventCategory + "\n" +
                "Timestamp: " + dateStr + "\n\n" +
                "Details:\n" +
                (notification.getMessage() != null ? notification.getMessage() : "") + "\n\n" +
                "View Request in Portal: " + appUrl + "/requests\n\n" +
                "-------------------------------------------------------\n" +
                "This is an automated notification. Please do not reply directly.";
    }

    @Async
    public CompletableFuture<Void> sendPasswordResetEmailAsync(String recipientEmail, String userName, String rawToken) {
        try {
            sendPasswordResetEmail(recipientEmail, userName, rawToken);
        } catch (Exception e) {
            log.warn("Asynchronous password reset email dispatch failed for {}: {}", recipientEmail, e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    public void sendPasswordResetEmail(String recipientEmail, String userName, String rawToken) {
        if (!mailEnabled || recipientEmail == null || recipientEmail.isBlank()) {
            return;
        }

        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl.replaceAll("/+$", "") : "http://localhost:5173";
        String resetLink = baseUrl + "/reset-password?token=" + rawToken;

        String subject = "[NEC Services] Password Reset Request";
        String referenceId = "PWD-RESET";
        String dedupKey = "PWD_RESET:" + System.currentTimeMillis() + ":" + recipientEmail.toLowerCase();

        EmailLog logEntry = EmailLog.builder()
                .referenceId(referenceId)
                .deduplicationKey(dedupKey)
                .service("Authentication")
                .eventCategory("PASSWORD_RESET")
                .primaryRecipient(recipientEmail)
                .ccRecipients(Collections.emptyList()) // Strictly NO CC
                .subject(subject)
                .provider("SMTP")
                .createdAt(LocalDateTime.now())
                .build();

        String htmlBody = buildPasswordResetHtml(userName, resetLink);
        String plainText = buildPasswordResetPlainText(userName, resetLink);

        dispatchEmail(recipientEmail, Collections.emptyList(), subject, htmlBody, plainText, logEntry, rawToken);
    }

    private String buildPasswordResetHtml(String userName, String resetLink) {
        String greeting = (userName != null && !userName.isBlank()) ? "Hello " + userName + "," : "Hello,";
        return "<!DOCTYPE html>" +
                "<html><head><meta charset='UTF-8'>" +
                "<style>" +
                "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }" +
                ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }" +
                ".header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; color: #ffffff; text-align: center; }" +
                ".header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }" +
                ".header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }" +
                ".body-content { padding: 28px 24px; }" +
                ".card-title { font-size: 18px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }" +
                ".message-box { background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #334155; }" +
                ".action-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin: 16px 0; }" +
                ".expiry-note { font-size: 13px; color: #64748b; margin-top: 16px; }" +
                ".footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }" +
                ".footer p { margin: 4px 0; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>NARASARAOPET ENGINEERING COLLEGE</h1>" +
                "<p>College Department Services Management System</p>" +
                "</div>" +
                "<div class='body-content'>" +
                "<h2 class='card-title'>Password Reset Request</h2>" +
                "<p style='font-size: 14px; line-height: 1.5; color: #334155;'>" + greeting + "</p>" +
                "<p style='font-size: 14px; line-height: 1.5; color: #334155;'>We received a request to reset your password for your institutional account on the NEC Services Management Portal.</p>" +
                "<div style='text-align: center; margin: 24px 0;'>" +
                "<a href='" + resetLink + "' class='action-btn' target='_blank'>Reset Password</a>" +
                "</div>" +
                "<div class='message-box'>" +
                "<strong>Security Notice:</strong> This password reset link is valid for <strong>15 minutes</strong> and can only be used once. If you did not request this reset, you can safely ignore this email; your existing password will remain secure and unchanged." +
                "</div>" +
                "<p class='expiry-note'>If the button above does not work, copy and paste the following link into your browser:<br>" +
                "<span style='word-break: break-all; color: #2563eb;'>" + resetLink + "</span></p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>This is an automated system email. Please do not reply directly.</p>" +
                "<p>&copy; " + LocalDateTime.now().getYear() + " Narasaraopet Engineering College (Autonomous). All rights reserved.</p>" +
                "</div></div></body></html>";
    }

    private String buildPasswordResetPlainText(String userName, String resetLink) {
        String greeting = (userName != null && !userName.isBlank()) ? "Hello " + userName + "," : "Hello,";
        return "=======================================================\n" +
                "NARASARAOPET ENGINEERING COLLEGE (AUTONOMOUS)\n" +
                "College Department Services Management System\n" +
                "=======================================================\n\n" +
                greeting + "\n\n" +
                "We received a request to reset your password for your institutional account on the NEC Services Management Portal.\n\n" +
                "To choose a new password, open the following link in your browser:\n" +
                resetLink + "\n\n" +
                "This password reset link is valid for 15 minutes and can only be used once.\n\n" +
                "If you did not request this password reset, please ignore this email. Your account remains secure.\n\n" +
                "-------------------------------------------------------\n" +
                "This is an automated notification. Please do not reply directly.";
    }
}
