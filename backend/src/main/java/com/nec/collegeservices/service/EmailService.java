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
import org.springframework.core.io.ByteArrayResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EmailService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    public static final long MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    private static final byte[] PDF_MAGIC_BYTES = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D }; // %PDF-

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Autowired(required = false)
    private SeminarBookingRepository seminarBookingRepository;

    @Autowired(required = false)
    private SeminarHallRepository seminarHallRepository;

    @Autowired(required = false)
    private EmailDeduplicationService deduplicationService;

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

    @Value("${app.frontend.url:${app.mail.app-url:${APP_FRONTEND_URL:${FRONTEND_URL:${APP_URL:http://localhost:5173}}}}}")
    private String frontendUrl;

    @Value("${app.mail.app-url:${APP_URL:${FRONTEND_URL:}}}")
    private String appUrl;

    @Value("${app.mail.provider:${APP_MAIL_PROVIDER:${MAIL_PROVIDER:local}}}")
    private String mailProvider;

    @Value("${app.mail.apps-script.url:${APP_SCRIPT_MAIL_URL:${APPS_SCRIPT_URL:}}}")
    private String appsScriptUrl;

    @Value("${app.mail.apps-script.secret:${APP_SCRIPT_MAIL_SECRET:${APPS_SCRIPT_SECRET:}}}")
    private String appsScriptSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpClient httpClient;

    public void setHttpClient(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    private JavaMailSender dynamicMailSender;

    public void setMailSender(JavaMailSender mailSender) {
        this.dynamicMailSender = mailSender;
    }

    @PostConstruct
    public void init() {
        log.info("==========================================================");
        String provider = getActiveProvider();
        log.info("EmailService initialized. Active provider: {}", provider.toUpperCase());
        log.info("Frontend portal URL: {}", getEffectiveFrontendUrl());
        if ("apps-script".equals(provider)) {
            if (isAppsScriptConfigured()) {
                log.info("Google Apps Script HTTPS relay active: endpoint configured, secret configured");
            } else {
                log.warn(
                        "Google Apps Script relay credentials missing (APP_SCRIPT_MAIL_URL / APP_SCRIPT_MAIL_SECRET).");
            }
        } else {
            if (isSmtpConfigured()) {
                this.dynamicMailSender = createMailSender();
                log.info("SMTP active: host={}:{}, sender={}", mailHost, mailPort, mailUsername);
            } else {
                log.warn("SMTP credentials not configured (SPRING_MAIL_USERNAME / SPRING_MAIL_PASSWORD missing). " +
                        "Email notifications will be safely simulated/logged.");
            }
        }
        log.info("==========================================================");
    }

    public String getEffectiveFrontendUrl() {
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            return frontendUrl.trim().replaceAll("/+$", "");
        }
        if (appUrl != null && !appUrl.isBlank()) {
            return appUrl.trim().replaceAll("/+$", "");
        }
        return "http://localhost:5173";
    }

    public String getFrontendUrl() {
        return getEffectiveFrontendUrl();
    }

    public void setFrontendUrl(String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public String getAppUrl() {
        return getEffectiveFrontendUrl();
    }

    public void setAppUrl(String appUrl) {
        this.appUrl = appUrl;
    }

    public String getActiveProvider() {
        if (mailProvider == null || mailProvider.isBlank()) {
            return "local";
        }
        String p = mailProvider.trim().toLowerCase();
        if (p.contains("apps-script") || p.contains("appscript") || p.contains("google")) {
            return "apps-script";
        }
        return "local";
    }

    public boolean isSmtpConfigured() {
        return mailUsername != null && !mailUsername.isBlank() &&
                mailPassword != null && !mailPassword.isBlank();
    }

    public boolean isAppsScriptConfigured() {
        return appsScriptUrl != null && !appsScriptUrl.isBlank() &&
                appsScriptSecret != null && !appsScriptSecret.isBlank();
    }

    public boolean isProviderConfigured() {
        if ("apps-script".equals(getActiveProvider())) {
            return isAppsScriptConfigured();
        }
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
        if (msg == null)
            return "Unknown error";
        String sanitized = msg;
        if (mailPassword != null && !mailPassword.isBlank()) {
            sanitized = sanitized.replace(mailPassword, "[REDACTED_PASSWORD]");
            sanitized = sanitized.replace(mailPassword.trim(), "[REDACTED_PASSWORD]");
        }
        if (appsScriptSecret != null && !appsScriptSecret.isBlank()) {
            sanitized = sanitized.replace(appsScriptSecret, "[REDACTED_SECRET]");
            sanitized = sanitized.replace(appsScriptSecret.trim(), "[REDACTED_SECRET]");
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

    /**
     * Sanitizes email recipient strings before logging to prevent log injection
     * (CRLF stripping), caps length, and redacts sensitive credentials.
     *
     * @param input the raw recipient or parameter string
     * @return safe loggable string
     */
    public String sanitizeForLog(String input) {
        if (input == null) {
            return "null";
        }
        String clean = input.replaceAll("[\\r\\n\\t]", "_").trim();
        if (clean.length() > 100) {
            clean = clean.substring(0, 100) + "...";
        }
        return sanitizeErrorMessage(clean, appsScriptSecret, mailPassword);
    }

    private JavaMailSender createMailSender() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        String host = (mailHost != null && !mailHost.isBlank()) ? mailHost.trim().replaceAll("^[\"']|[\"']$", "")
                : "smtp.gmail.com";
        int port = mailPort > 0 ? mailPort : 587;
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(mailUsername != null ? mailUsername.trim().replaceAll("^[\"']|[\"']$", "") : "");
        sender.setPassword(
                mailPassword != null ? mailPassword.trim().replaceAll("^[\"']|[\"']$", "").replaceAll("\\s+", "") : "");

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

    private HttpClient createHttpClient() {
        return HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    public String classifyEvent(Notification notification) {
        if (notification == null)
            return "GENERAL";
        String title = notification.getTitle() != null ? notification.getTitle().toUpperCase() : "";
        String msg = notification.getMessage() != null ? notification.getMessage().toUpperCase() : "";

        if (title.contains("NEW") && (title.contains("REQUEST") || title.contains("BOOKING"))) {
            return "REQUEST_SUBMITTED";
        }
        if (title.contains("RESCHEDULE") || title.contains("RESCHEDULED") || msg.contains("RESCHEDULE")) {
            return "REQUEST_RESCHEDULED";
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
        if (title.contains("READY") || title.contains("COLLECTED") || title.contains("UNDER REVIEW")
                || title.contains("FORWARDED")) {
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

        // Suppress generic notification email for inspection reports as they are distributed with official PDF attachments
        if (notification.getTitle() != null && notification.getTitle().startsWith("Seminar Event Inspection Report")) {
            log.info("Skipping generic HTML notification email for inspection report notification {} - report with PDF attachment is dispatched directly", notification.getId());
            return;
        }

        String eventCategory = classifyEvent(notification);
        List<String> primaryRecipients = resolvePrimaryRecipients(notification);
        if (primaryRecipients.isEmpty()) {
            log.warn("No valid primary email recipients found for notification {} (role={}, dept={}, uid={}). Recording auditable skip log.",
                    notification.getId(), notification.getRecipientRole(), notification.getRecipientDept(), notification.getRecipientUserId());
            try {
                EmailLog skipLog = EmailLog.builder()
                        .notificationId(notification.getId())
                        .referenceId(notification.getReferenceId())
                        .service(notification.getService() != null ? notification.getService() : "General")
                        .eventCategory(eventCategory)
                        .status(EmailLog.STATUS_SKIPPED_NO_RECIPIENTS)
                        .errorMessage(String.format("No active registered recipient matching role='%s', dept='%s', userId='%s'",
                                notification.getRecipientRole(), notification.getRecipientDept(), notification.getRecipientUserId()))
                        .createdAt(LocalDateTime.now())
                        .build();
                emailLogRepository.save(skipLog);
            } catch (Exception ex) {
                log.error("Failed to save SKIPPED_NO_RECIPIENTS log for notification {}: {}", notification.getId(), ex.getMessage());
            }
            return;
        }

        List<String> ccRecipients = resolveCcRecipients(notification, eventCategory);

        for (String primaryRecipient : primaryRecipients) {
            // Deduplicate CC recipients and exclude the primary recipient
            List<String> filteredCc = ccRecipients.stream()
                    .filter(cc -> cc != null && !cc.equalsIgnoreCase(primaryRecipient))
                    .distinct()
                    .toList();
            sendSingleEmail(notification, eventCategory, primaryRecipient, filteredCc);
        }
    }

    public boolean isAdministrativeRole(String role) {
        if (role == null || role.isBlank()) return false;
        String r = role.trim().toUpperCase();
        return r.endsWith("_ADMIN") || r.equals("CREATOR") || r.equals("SUPER_ADMIN")
                || r.equals("SEMINAR_COORDINATOR") || r.equals("SEMINAR_TECHNICIAN")
                || r.equals("GENERATOR_OPERATOR") || r.equals("ELECTRICIAN");
    }

    public static String normalizeDepartmentCode(String dept) {
        if (dept == null) return null;
        String trimmed = dept.trim();
        if (trimmed.isEmpty()) return trimmed;
        String upper = trimmed.toUpperCase();
        if ("MECH".equals(upper) || "MECHANICAL".equals(upper)) {
            return "ME";
        }
        return upper;
    }

    /**
     * Determines whether a notification represents a routine operational facility or logistics workflow
     * (e.g. Accommodation, Seminar Hall, Electrical, Transport, Stationery, Snacks & Meals)
     * as opposed to an executive, institutional governance, or Principal-level escalation.
     */
    public boolean isOperationalWorkflow(Notification notification) {
        if (notification == null) return false;

        // 1. Explicit notification type check
        String type = notification.getType() != null ? notification.getType().trim().toUpperCase() : "";
        if ("EXECUTIVE".equals(type) || "GOVERNANCE".equals(type) || "POLICY".equals(type) || "AUDIT".equals(type)) {
            return false;
        }

        // 2. Explicit service-based operational classification
        String service = notification.getService() != null ? notification.getService().trim().toUpperCase() : "";
        if (service.contains("ACCOMMODATION") ||
            service.contains("SEMINAR") ||
            service.contains("ELECTRICAL") ||
            service.contains("TRANSPORT") ||
            service.contains("STATIONERY") ||
            service.contains("MEAL") ||
            service.contains("SNACK") ||
            service.contains("FACILITY") ||
            service.contains("MAINTENANCE")) {
            return true;
        }

        // 3. Operational reference ID prefix check (ACC-, SEM-, ELC-, TRN-, STN-, MLS-)
        String refId = notification.getReferenceId() != null ? notification.getReferenceId().trim().toUpperCase() : "";
        if (refId.startsWith("ACC-") || refId.startsWith("SEM-") || refId.startsWith("ELC-") ||
            refId.startsWith("TRN-") || refId.startsWith("STN-") || refId.startsWith("MLS-") ||
            refId.contains("-SEM-") || refId.contains("-ELEC-") || refId.contains("-ACCOM-")) {
            return true;
        }

        // 4. Operational event category check
        String eventCat = classifyEvent(notification);
        if ("REQUEST_SUBMITTED".equals(eventCat) ||
            "REQUEST_APPROVED".equals(eventCat) ||
            "REQUEST_REJECTED".equals(eventCat) ||
            "REQUEST_CANCELLED".equals(eventCat) ||
            "REQUEST_RESCHEDULED".equals(eventCat) ||
            "REQUEST_STATUS_UPDATED".equals(eventCat)) {
            return true;
        }

        return false;
    }

    public List<String> resolvePrimaryRecipients(Notification notification) {
        Set<String> recipientEmails = new LinkedHashSet<>();

        String userId = notification.getRecipientUserId();
        if (userId != null && !userId.isBlank() && !"ALL".equalsIgnoreCase(userId)) {
            userRepository.findByUserId(userId.trim())
                    .or(() -> userRepository.findByEmailIgnoreCase(userId.trim()))
                    .filter(u -> Boolean.TRUE.equals(u.getActive()))
                    .ifPresent(u -> {
                        if (u.getEmail() != null && !u.getEmail().isBlank()) {
                            recipientEmails.add(u.getEmail().trim().toLowerCase());
                        }
                    });
            return new ArrayList<>(recipientEmails);
        }

        String role = notification.getRecipientRole();
        String dept = notification.getRecipientDept();

        boolean isRoleAll = role == null || role.isBlank() || "ALL".equalsIgnoreCase(role.trim());
        boolean isDeptAll = dept == null || dept.isBlank() || "ALL".equalsIgnoreCase(dept.trim());
        boolean isAdminRole = !isRoleAll && isAdministrativeRole(role.trim());

        List<User> targetUsers = userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .filter(u -> {
                    boolean roleMatch = isRoleAll || u.hasRole(role.trim());
                    boolean deptMatch = isDeptAll
                            || (isAdminRole && "ADMIN".equalsIgnoreCase(dept.trim()))
                            || (u.getDepartment() != null && normalizeDepartmentCode(u.getDepartment()).equalsIgnoreCase(normalizeDepartmentCode(dept)));
                    return roleMatch && deptMatch;
                })
                .toList();

        // Operational AO_ADMIN defense-in-depth:
        // The AO_ADMIN role is held in Atlas by the Administrative Officer ("ao"), the Principal, and a developer account.
        // Routine operational notifications targeting AO_ADMIN must resolve exclusively to the designated
        // Administrative Officer ("ao"), protecting the Principal and developer from operational noise.
        // Executive and governance events targeting AO_ADMIN continue to reach executive recipients.
        if ("AO_ADMIN".equalsIgnoreCase(role.trim())) {
            if (isOperationalWorkflow(notification)) {
                targetUsers = targetUsers.stream()
                        .filter(u -> "ao".equalsIgnoreCase(u.getUserId()))
                        .toList();
            } else {
                // For non-operational / executive alerts, exclude third-party/developer test accounts
                // while preserving legitimate administrative leadership (ao and Principal)
                targetUsers = targetUsers.stream()
                        .filter(u -> !"sriramsriram123654".equalsIgnoreCase(u.getUserId()))
                        .toList();
            }
        }

        for (User u : targetUsers) {
            if (u.getEmail() != null && !u.getEmail().isBlank() && u.getEmail().contains("@")) {
                recipientEmails.add(u.getEmail().trim().toLowerCase());
            }
        }

        return new ArrayList<>(recipientEmails);
    }

    public List<String> resolveCcRecipients(String eventCategory) {
        return Collections.emptyList();
    }

    public List<String> resolveCcRecipients(Notification notification, String eventCategory) {
        if (notification != null && ("SEMINAR_TECHNICIAN".equalsIgnoreCase(notification.getRecipientRole()) ||
                "GENERATOR_OPERATOR".equalsIgnoreCase(notification.getRecipientRole()) ||
                "ELECTRICIAN".equalsIgnoreCase(notification.getRecipientRole()) ||
                "Seminar Equipment".equalsIgnoreCase(notification.getService()) ||
                "Generator Service".equalsIgnoreCase(notification.getService()) ||
                "Electrical Service".equalsIgnoreCase(notification.getService()) ||
                "Stationery".equalsIgnoreCase(notification.getService()))) {
            return Collections.emptyList();
        }

        Set<String> ccEmails = new LinkedHashSet<>();

        // 1. Hall-specific CC recipients for Seminar notifications
        if (isSeminarNotification(notification)) {
            ccEmails.addAll(resolveSeminarHallCcRecipients(notification));
        }

        // 2. Department HOD for departmental events (approval, rejection, cancellation,
        // rescheduling)
        if (isDepartmentEvent(eventCategory) && notification != null) {
            String dept = resolveNotificationDepartment(notification);
            if (dept != null && !dept.isBlank() && !"ADMIN".equalsIgnoreCase(dept) && !"ALL".equalsIgnoreCase(dept)) {
                List<String> hodEmails = resolveDepartmentHodEmails(dept);
                ccEmails.addAll(hodEmails);
            }
        }

        return new ArrayList<>(ccEmails);
    }

    public boolean isDepartmentEvent(String eventCategory) {
        if (eventCategory == null)
            return false;
        return switch (eventCategory) {
            case "REQUEST_APPROVED",
                    "REQUEST_REJECTED",
                    "REQUEST_CANCELLED",
                    "REQUEST_CANCEL_REQUESTED",
                    "REQUEST_CANCEL_REJECTED",
                    "REQUEST_RESCHEDULED",
                    "REQUEST_STATUS_UPDATED" ->
                true;
            default -> false;
        };
    }

    public String resolveNotificationDepartment(Notification notification) {
        if (notification == null)
            return null;
        if (notification.getRecipientDept() != null && !notification.getRecipientDept().isBlank() &&
                !"ALL".equalsIgnoreCase(notification.getRecipientDept())) {
            return notification.getRecipientDept().trim();
        }
        String userId = notification.getRecipientUserId();
        if (userId != null && !userId.isBlank() && !"ALL".equalsIgnoreCase(userId)) {
            return userRepository.findByUserId(userId.trim())
                    .or(() -> userRepository.findByEmailIgnoreCase(userId.trim()))
                    .map(User::getDepartment)
                    .orElse(null);
        }
        return null;
    }

    public List<String> resolveDepartmentHodEmails(String department) {
        if (department == null || department.isBlank() || "ADMIN".equalsIgnoreCase(department)
                || "ALL".equalsIgnoreCase(department)) {
            return Collections.emptyList();
        }
        String deptTrimmed = department.trim();
        String normDept = normalizeDepartmentCode(deptTrimmed);
        return userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .filter(u -> u.hasRole("DEPARTMENT_HOD"))
                .filter(u -> u.getDepartment() != null && normalizeDepartmentCode(u.getDepartment()).equalsIgnoreCase(normDept))
                .map(User::getEmail)
                .filter(e -> e != null && !e.isBlank() && e.contains("@"))
                .map(String::trim)
                .map(String::toLowerCase)
                .distinct()
                .toList();
    }

    public boolean isSeminarNotification(Notification notification) {
        if (notification == null)
            return false;
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
                if (seminarBookingRepository.findByBookingId(refId).isPresent())
                    return true;
                if (seminarBookingRepository.findById(refId).isPresent())
                    return true;
                List<SeminarBooking> series = seminarBookingRepository.findBySeriesId(refId);
                if (series != null && !series.isEmpty())
                    return true;
            } catch (Exception ignored) {
            }
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
            log.info("Seminar notification reference '{}' did not resolve to a booking record. Sending without CC.",
                    refId);
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
            log.info(
                    "Seminar booking '{}' refers to hallId '{}' / hallName '{}' not found in database. Sending without CC.",
                    booking.getBookingId(), hallId, hallName);
            return Collections.emptyList();
        }

        List<String> rawCcEmails = hall.getCcEmails();
        if (rawCcEmails == null || rawCcEmails.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> validCcEmails = new LinkedHashSet<>();
        for (String email : rawCcEmails) {
            if (email == null)
                continue;
            if (!EmailRecipientValidator.isValidRecipient(email)) {
                log.warn("Ignored invalid CC email '{}' in hall '{}' configuration.", sanitizeForLog(email), hall.getHallId());
                continue;
            }
            validCcEmails.add(EmailRecipientValidator.normalizeEmail(email));
        }

        return new ArrayList<>(validCcEmails);
    }

    private final java.util.concurrent.ConcurrentHashMap<String, Long> activeDeduplicationKeys = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, EmailClaimHandle> activeClaimHandles = new java.util.concurrent.ConcurrentHashMap<>();

    public EmailDeduplicationService getDeduplicationService() {
        return deduplicationService;
    }

    public void setDeduplicationService(EmailDeduplicationService deduplicationService) {
        this.deduplicationService = deduplicationService;
    }

    public String buildDeduplicationKey(String referenceId, String eventCategory, String email) {
        String ref = (referenceId != null && !referenceId.isBlank()) ? referenceId.trim() : "GEN";
        String cat = (eventCategory != null && !eventCategory.isBlank()) ? eventCategory.trim().toUpperCase()
                : "GENERAL";
        String em = (email != null && !email.isBlank()) ? email.trim().toLowerCase() : "unknown";
        return ref + ":" + cat + ":" + em;
    }

    public boolean claimEventKey(String dedupKey) {
        if (dedupKey == null || dedupKey.isBlank())
            return false;

        // Periodic cleanup of keys older than 2 hours if cache grows large
        if (activeDeduplicationKeys.size() > 5000) {
            long cutoff = System.currentTimeMillis() - 7200000L;
            activeDeduplicationKeys.entrySet().removeIf(entry -> entry.getValue() < cutoff);
            activeClaimHandles.entrySet().removeIf(entry -> {
                LocalDateTime exp = entry.getValue().getLeaseExpiresAt();
                return exp != null && exp.isBefore(LocalDateTime.now().minusHours(2));
            });
        }

        // 1. Fast in-memory check (within this JVM)
        Long existingTime = activeDeduplicationKeys.putIfAbsent(dedupKey, System.currentTimeMillis());
        if (existingTime != null) {
            return false;
        }

        // 2. Distributed atomic claim via EmailDeduplicationService
        if (deduplicationService != null) {
            ClaimAcquisitionResult claimResult = deduplicationService.acquireClaim(dedupKey);
            if (!claimResult.isAcquired()) {
                activeDeduplicationKeys.remove(dedupKey);
                log.info("Distributed claim acquisition failed for key {}: status={}", dedupKey, claimResult.getStatus());
                return false;
            }
            activeClaimHandles.put(dedupKey, claimResult.getHandle());
        }

        // 3. Historical check against email_logs repository (preserves pre-Phase 2 historical logs)
        if (emailLogRepository != null) {
            try {
                boolean existsInDb = emailLogRepository.existsByDeduplicationKeyAndStatusIn(
                        dedupKey, List.of(
                                EmailLog.STATUS_SENT,
                                EmailLog.STATUS_SMTP_ACCEPTED,
                                EmailLog.STATUS_SENDING,
                                EmailLog.STATUS_SKIPPED_LOCAL_DOMAIN));
                if (existsInDb) {
                    completeEventKey(dedupKey);
                    activeDeduplicationKeys.remove(dedupKey);
                    return false;
                }

                // Check if an ambiguous timeout occurred historically for this deduplication key
                Optional<EmailLog> failedLog = emailLogRepository.findFirstByDeduplicationKeyAndStatus(dedupKey, EmailLog.STATUS_FAILED);
                if (failedLog.isPresent()) {
                    String err = failedLog.get().getErrorMessage();
                    if (err != null && (err.toLowerCase().contains("timed out") || err.toLowerCase().contains("timeout"))) {
                        log.warn("Deduplication claim blocked: previous ambiguous timeout recorded in MongoDB for {}", dedupKey);
                        markEventKeyAmbiguous(dedupKey, "Historical ambiguous timeout in email_logs");
                        return false;
                    }
                }
            } catch (Exception e) {
                log.error("Fail-closed: Error checking deduplication in emailLogRepository for {}: {}", dedupKey, e.getMessage());
                releaseEventKey(dedupKey);
                return false; // FAIL CLOSED
            }
        }

        return true;
    }

    public void releaseEventKey(String dedupKey) {
        if (dedupKey != null) {
            activeDeduplicationKeys.remove(dedupKey);
            EmailClaimHandle handle = activeClaimHandles.remove(dedupKey);
            if (handle != null && deduplicationService != null) {
                deduplicationService.releaseClaim(handle);
            }
        }
    }

    public void completeEventKey(String dedupKey) {
        if (dedupKey != null) {
            // Keep in activeDeduplicationKeys to block immediate duplicate calls in the same JVM
            EmailClaimHandle handle = activeClaimHandles.remove(dedupKey);
            if (handle != null && deduplicationService != null) {
                deduplicationService.completeClaim(handle);
            }
        }
    }

    public void markEventKeyAmbiguous(String dedupKey, String reason) {
        if (dedupKey != null) {
            // Keep in activeDeduplicationKeys to block duplicate calls in the same JVM
            EmailClaimHandle handle = activeClaimHandles.remove(dedupKey);
            if (handle != null && deduplicationService != null) {
                deduplicationService.markAmbiguous(handle, reason);
            }
        }
    }

    public boolean validateClaimOwnership(String dedupKey) {
        if (dedupKey == null) {
            return false;
        }
        if (deduplicationService != null) {
            EmailClaimHandle handle = activeClaimHandles.get(dedupKey);
            if (handle == null) {
                return false;
            }
            return deduplicationService.validateOwnership(handle);
        }
        return activeDeduplicationKeys.containsKey(dedupKey);
    }

    public void clearDeduplicationCache() {
        activeDeduplicationKeys.clear();
        activeClaimHandles.clear();
    }

    private void sendSingleEmail(Notification notification, String eventCategory,
            String primaryRecipient, List<String> ccRecipients) {
        if (primaryRecipient == null || primaryRecipient.isBlank()) {
            return;
        }
        String cleanPrimary = EmailRecipientValidator.normalizeEmail(primaryRecipient);
        String referenceId = notification.getReferenceId() != null ? notification.getReferenceId()
                : notification.getId();

        if (!EmailRecipientValidator.isValidRecipient(cleanPrimary)) {
            String activeProvider = getActiveProvider();
            String providerName = "apps-script".equalsIgnoreCase(activeProvider) ? "APPS_SCRIPT" : "SMTP";
            EmailLog logEntry = EmailLog.builder()
                    .notificationId(notification.getId())
                    .referenceId(referenceId)
                    .service(notification.getService() != null ? notification.getService() : "General")
                    .eventCategory(eventCategory)
                    .primaryRecipient(cleanPrimary != null ? cleanPrimary : primaryRecipient.trim())
                    .subject("[NEC Services] " + (notification.getTitle() != null ? notification.getTitle() : "Notification")
                            + (referenceId != null ? " (" + referenceId + ")" : ""))
                    .provider(providerName)
                    .status(EmailLog.STATUS_FAILED)
                    .errorMessage("Invalid primary recipient email address: " + (cleanPrimary != null ? cleanPrimary : primaryRecipient))
                    .createdAt(LocalDateTime.now())
                    .build();
            emailLogRepository.save(logEntry);
            log.warn("Email notification rejected before dispatch: invalid recipient address '{}'", primaryRecipient);
            return;
        }

        String primaryDedupKey = buildDeduplicationKey(referenceId, eventCategory, cleanPrimary);

        // Deduplicate primary recipient by normalized email
        if (!claimEventKey(primaryDedupKey)) {
            log.info("Duplicate email skipped for key: {}", primaryDedupKey);
            return;
        }

        // Filter CCs: validate, log failures, exclude primary, deduplicate, and claim event keys
        EmailRecipientValidator.SecondaryValidationResult ccValidation =
                EmailRecipientValidator.validateSecondaryRecipients(ccRecipients, cleanPrimary);

        for (String invalidCc : ccValidation.getInvalidRecipients()) {
            log.warn("Invalid CC recipient '{}' rejected for notification {} (ref: {})",
                    sanitizeForLog(invalidCc), notification.getId(), referenceId);
        }
        for (String dupCc : ccValidation.getPrimaryDuplicates()) {
            log.info("CC recipient '{}' excluded because it matches primary recipient for notification {} (ref: {})",
                    sanitizeForLog(dupCc), notification.getId(), referenceId);
        }

        List<String> claimedCcs = new ArrayList<>();
        for (String cleanCc : ccValidation.getValidRecipients()) {
            String ccDedupKey = buildDeduplicationKey(referenceId, eventCategory, cleanCc);
            if (claimEventKey(ccDedupKey)) {
                claimedCcs.add(cleanCc);
            } else {
                log.info("CC recipient {} already received event {} - excluded from CC", cleanCc, ccDedupKey);
            }
        }

        String subject = "[NEC Services] "
                + (notification.getTitle() != null ? notification.getTitle() : "Notification") +
                (referenceId != null ? " (" + referenceId + ")" : "");

        String activeProvider = getActiveProvider();
        String providerName = "apps-script".equalsIgnoreCase(activeProvider) ? "APPS_SCRIPT" : "SMTP";

        EmailLog logEntry = EmailLog.builder()
                .notificationId(notification.getId())
                .referenceId(referenceId)
                .deduplicationKey(primaryDedupKey)
                .service(notification.getService() != null ? notification.getService() : "General")
                .eventCategory(eventCategory)
                .primaryRecipient(cleanPrimary)
                .ccRecipients(claimedCcs)
                .subject(subject)
                .provider(providerName)
                .createdAt(LocalDateTime.now())
                .build();

        String htmlBody = buildHtmlEmailBody(notification, eventCategory, referenceId, cleanPrimary);
        String plainText = buildPlainTextEmailBody(notification, eventCategory, referenceId, cleanPrimary);

        if (!validateClaimOwnership(primaryDedupKey)) {
            log.error("Lost claim ownership or lease expired before dispatch for primary recipient {}", cleanPrimary);
            releaseEventKey(primaryDedupKey);
            for (String cc : claimedCcs) {
                releaseEventKey(buildDeduplicationKey(referenceId, eventCategory, cc));
            }
            return;
        }

        try {
            dispatchEmail(cleanPrimary, claimedCcs, subject, htmlBody, plainText, logEntry);
            if (EmailLog.STATUS_FAILED.equals(logEntry.getStatus())) {
                String err = logEntry.getErrorMessage();
                boolean isAmbiguous = err != null && (err.toLowerCase().contains("timed out") || err.toLowerCase().contains("timeout"));
                if (isAmbiguous) {
                    markEventKeyAmbiguous(primaryDedupKey, err);
                    for (String cc : claimedCcs) {
                        markEventKeyAmbiguous(buildDeduplicationKey(referenceId, eventCategory, cc), err);
                    }
                } else {
                    releaseEventKey(primaryDedupKey);
                    for (String cc : claimedCcs) {
                        releaseEventKey(buildDeduplicationKey(referenceId, eventCategory, cc));
                    }
                }
            } else {
                completeEventKey(primaryDedupKey);
                for (String cc : claimedCcs) {
                    completeEventKey(buildDeduplicationKey(referenceId, eventCategory, cc));
                }
            }
        } catch (Exception e) {
            releaseEventKey(primaryDedupKey);
            for (String cc : claimedCcs) {
                releaseEventKey(buildDeduplicationKey(referenceId, eventCategory, cc));
            }
            log.warn("Unexpected dispatch error for {}: {}", cleanPrimary, e.getMessage());
        }
    }

    private void dispatchEmail(String primaryRecipient, List<String> ccRecipients,
            String subject, String htmlBody, String plainText,
            EmailLog logEntry, String... sensitiveValues) {
        String activeProvider = getActiveProvider();
        if ("apps-script".equalsIgnoreCase(activeProvider)) {
            logEntry.setProvider("APPS_SCRIPT");
            dispatchViaAppsScript(primaryRecipient, ccRecipients, subject, htmlBody, plainText, logEntry,
                    sensitiveValues);
        } else {
            logEntry.setProvider("SMTP");
            dispatchViaSmtp(primaryRecipient, ccRecipients, subject, htmlBody, plainText, logEntry, sensitiveValues);
        }
    }

    private void dispatchViaAppsScript(String primaryRecipient, List<String> ccRecipients,
            String subject, String htmlBody, String plainText,
            EmailLog logEntry, String... sensitiveValues) {
        if (!isAppsScriptConfigured()) {
            logEntry.setStatus("SKIPPED_NO_CREDENTIALS");
            logEntry.setErrorMessage("Apps Script URL or secret not configured in environment. Email logged safely.");
            emailLogRepository.save(logEntry);
            log.info(
                    "Email notification simulated [SKIPPED_NO_CREDENTIALS] via Apps Script to: {} (CC: {}) - Subject: {}",
                    primaryRecipient, ccRecipients, subject);
            return;
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("secret", appsScriptSecret);
            payload.put("to", primaryRecipient);
            payload.put("cc", ccRecipients != null ? ccRecipients : Collections.emptyList());
            payload.put("subject", subject);
            payload.put("htmlBody", htmlBody);
            payload.put("textBody", plainText);
            payload.put("senderName",
                    (mailFromName != null && !mailFromName.isBlank()) ? mailFromName.trim() : "NEC Service Management");

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(appsScriptUrl.trim()))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(20))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .build();

            HttpClient client = (this.httpClient != null) ? this.httpClient : createHttpClient();
            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            int statusCode = response.statusCode();
            String responseBody = response.body() != null ? response.body().trim() : "";

            if (statusCode >= 200 && statusCode < 300) {
                boolean success = false;
                String errorDetail = null;
                JsonNode root = null;
                try {
                    root = objectMapper.readTree(responseBody);
                    success = root.path("success").asBoolean(false);
                    if (!success) {
                        errorDetail = root.has("error") ? root.get("error").asText()
                                : (root.has("message") ? root.get("message").asText() : "Apps Script rejected request");
                    }
                } catch (Exception parseEx) {
                    errorDetail = "Invalid JSON response from Apps Script: " + responseBody;
                }

                if (success) {
                    logEntry.setStatus(EmailLog.STATUS_SMTP_ACCEPTED);
                    if (root != null && root.has("messageId") && !root.get("messageId").isNull()) {
                        logEntry.setMessageId(root.get("messageId").asText());
                    }
                    logEntry.setErrorMessage(null);
                    emailLogRepository.save(logEntry);
                    log.info(
                            "Email notification accepted by Apps Script relay [SMTP_ACCEPTED] to: {} (CC: {}) - Subject: {}",
                            primaryRecipient, ccRecipients, subject);
                } else {
                    String sanitized = sanitizeErrorMessage(errorDetail, sensitiveValues);
                    logEntry.setStatus("FAILED");
                    logEntry.setErrorMessage(sanitized);
                    emailLogRepository.save(logEntry);
                    log.warn("Apps Script relay reported failure for {}: {}", primaryRecipient, sanitized);
                }
            } else {
                String sanitized = sanitizeErrorMessage("HTTP " + statusCode + ": " + responseBody, sensitiveValues);
                logEntry.setStatus("FAILED");
                logEntry.setErrorMessage(sanitized);
                emailLogRepository.save(logEntry);
                log.warn("Apps Script HTTP failure for {}: {}", primaryRecipient, sanitized);
            }
        } catch (HttpTimeoutException te) {
            String sanitized = sanitizeErrorMessage("Apps Script request timed out: " + te.getMessage(),
                    sensitiveValues);
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(sanitized);
            emailLogRepository.save(logEntry);
            log.warn("Apps Script timeout for {}: {}", primaryRecipient, sanitized);
        } catch (Exception e) {
            String sanitized = sanitizeErrorMessage(
                    e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName(), sensitiveValues);
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(sanitized);
            emailLogRepository.save(logEntry);
            log.warn("Apps Script delivery error for {}: {}", primaryRecipient, sanitized);
        }
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

            String messageId = message.getMessageID();
            logEntry.setMessageId(messageId);
            logEntry.setStatus(EmailLog.STATUS_SMTP_ACCEPTED);
            logEntry.setErrorMessage(null);
            emailLogRepository.save(logEntry);
            log.info(
                    "Email notification accepted by SMTP relay [SMTP_ACCEPTED] to: {} (CC: {}) - MessageId: {} - Subject: {}",
                    primaryRecipient, ccRecipients, messageId, subject);

        } catch (Exception e) {
            String sanitizedError = sanitizeErrorMessage(e.getMessage(), sensitiveValues);
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(sanitizedError);
            emailLogRepository.save(logEntry);
            log.warn("SMTP email delivery failed to {}: {}", primaryRecipient, sanitizedError);
        }
    }

    public Map<String, Object> sendTestEmail(String requestingUserId, String targetEmail) {
        Map<String, Object> result = new LinkedHashMap<>();

        if (targetEmail == null || targetEmail.isBlank()) {
            result.put("status", "VALIDATION_ERROR");
            result.put("message", "Recipient email address is required. Please supply a valid target email.");
            return result;
        }

        String recipient = EmailRecipientValidator.normalizeEmail(targetEmail);
        if (!EmailRecipientValidator.isValidRecipient(recipient)) {
            result.put("status", "VALIDATION_ERROR");
            result.put("message", "Invalid recipient email address format: " + targetEmail);
            return result;
        }

        List<String> ccList = Collections.emptyList(); // Strictly no global CC

        String activeProvider = getActiveProvider();
        boolean isAppsScript = "apps-script".equalsIgnoreCase(activeProvider);
        String providerName = isAppsScript ? "APPS_SCRIPT" : "SMTP";
        boolean isConfigured = isAppsScript ? isAppsScriptConfigured() : isSmtpConfigured();

        Notification testNotification = Notification.builder()
                .id("TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .recipientUserId(requestingUserId)
                .service("Seminar Hall")
                .title("Test Email Notification")
                .message(
                        "This is a live test notification from Narasaraopeta Engineering College Services Management System. "
                                +
                                "Verifying email delivery via " + providerName + ".")
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
                .provider(providerName)
                .createdAt(LocalDateTime.now())
                .build();

        result.put("primaryRecipient", recipient);
        result.put("ccRecipients", ccList);
        result.put("event", eventCategory);
        result.put("provider", providerName);
        result.put("configured", isConfigured);

        String htmlBody = buildHtmlEmailBody(testNotification, eventCategory, testNotification.getReferenceId(), recipient);
        String plainText = buildPlainTextEmailBody(testNotification, eventCategory, testNotification.getReferenceId(), recipient);

        if (!isConfigured) {
            logEntry.setStatus("SKIPPED_NO_CREDENTIALS");
            logEntry.setErrorMessage(isAppsScript
                    ? "Apps Script URL or secret not configured."
                    : "SMTP credentials not configured.");
            emailLogRepository.save(logEntry);
            result.put("status", "SKIPPED_NO_CREDENTIALS");
            result.put("message", providerName + " credentials not configured. Email logged safely without failure.");
            return result;
        }

        dispatchEmail(recipient, ccList, logEntry.getSubject(), htmlBody, plainText, logEntry);

        result.put("status", logEntry.getStatus());
        result.put("messageId", logEntry.getMessageId());
        if (EmailLog.STATUS_SMTP_ACCEPTED.equals(logEntry.getStatus()) || "SENT".equals(logEntry.getStatus())) {
            result.put("message", "Test email accepted by " + providerName + " relay for " + recipient);
        } else {
            result.put("error", logEntry.getErrorMessage());
            result.put("message", "Failed to deliver email: " + logEntry.getErrorMessage());
        }
        return result;
    }

    public String resolvePortalUrl(Notification notification, String referenceId, String recipientEmail) {
        String baseUrl = getEffectiveFrontendUrl();
        String path = resolvePortalPath(notification, referenceId, recipientEmail);
        if (path == null || path.isBlank()) {
            return baseUrl;
        }
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        return baseUrl + path;
    }

    public String resolvePortalPath(Notification notification, String referenceId, String recipientEmail) {
        String reqId = (referenceId != null && !referenceId.isBlank() && !"N/A".equalsIgnoreCase(referenceId))
                ? referenceId.trim()
                : null;
        String queryParam = (reqId != null) ? "?q=" + reqId : "";

        // Determine user role if recipient user is registered
        String role = null;
        if (recipientEmail != null && !recipientEmail.isBlank()) {
            try {
                Optional<User> userOpt = userRepository.findByEmailIgnoreCase(recipientEmail.trim());
                if (userOpt.isPresent()) {
                    role = userOpt.get().getRole();
                }
            } catch (Exception e) {
                log.debug("Error resolving user role for recipient {}: {}", recipientEmail, e.getMessage());
            }
        }
        if (role == null && notification != null) {
            role = notification.getRecipientRole();
        }

        String service = notification != null && notification.getService() != null ? notification.getService().trim() : "";

        // 1. Role-specific operator / technician routing
        if ("ELECTRICIAN".equalsIgnoreCase(role)) {
            return "/operator/electrician";
        }
        if ("GENERATOR_OPERATOR".equalsIgnoreCase(role)) {
            return "/operator/generator";
        }
        if ("SEMINAR_TECHNICIAN".equalsIgnoreCase(role)) {
            return "/technician/seminar";
        }

        // 2. Role-specific domain admin routing
        if ("SEMINAR_ADMIN".equalsIgnoreCase(role) || "SEMINAR_COORDINATOR".equalsIgnoreCase(role)) {
            return "/admin/seminar" + queryParam;
        }
        if ("ACCOMMODATION_ADMIN".equalsIgnoreCase(role) || "BOYS_HOSTEL_ADMIN".equalsIgnoreCase(role)
                || "GIRLS_HOSTEL_ADMIN".equalsIgnoreCase(role)) {
            return "/admin/accommodation" + queryParam;
        }
        if ("TRANSPORT_ADMIN".equalsIgnoreCase(role)) {
            return "/admin/transport" + queryParam;
        }
        if ("STATIONERY_ADMIN".equalsIgnoreCase(role)) {
            return "/admin/stationery" + queryParam;
        }
        if ("MEALS_ADMIN".equalsIgnoreCase(role)) {
            return "/admin/meals" + queryParam;
        }

        // 3. AO Admin / Creator routing
        if ("AO_ADMIN".equalsIgnoreCase(role) || "CREATOR".equalsIgnoreCase(role)) {
            if (service.equalsIgnoreCase("Electrical Service") || (reqId != null && reqId.startsWith("ELE"))) {
                return "/admin/electrical-issues" + queryParam;
            }
            if (service.equalsIgnoreCase("Seminar Hall") || service.equalsIgnoreCase("Seminar")
                    || (reqId != null && reqId.contains("SEM"))) {
                return "/admin/seminar" + queryParam;
            }
            if (service.equalsIgnoreCase("Accommodation") || service.equalsIgnoreCase("Hostel")
                    || (reqId != null && reqId.contains("ACC"))) {
                return "/admin/accommodation" + queryParam;
            }
            if (service.equalsIgnoreCase("Transport") || (reqId != null && reqId.contains("TRN"))) {
                return "/admin/transport" + queryParam;
            }
            if (service.equalsIgnoreCase("Stationery") || (reqId != null && reqId.contains("STA"))) {
                return "/admin/stationery" + queryParam;
            }
            if (service.equalsIgnoreCase("Snacks & Meals") || service.equalsIgnoreCase("Meals")
                    || (reqId != null && reqId.contains("MEAL"))) {
                return "/admin/meals" + queryParam;
            }
            return "/admin/ao" + queryParam;
        }

        // 4. Default for Faculty, Department Users, Department HODs, Requesters:
        return "/my-requests" + queryParam;
    }

    public String buildHtmlEmailBody(Notification notification, String eventCategory, String referenceId) {
        return buildHtmlEmailBody(notification, eventCategory, referenceId, null);
    }

    public String buildHtmlEmailBody(Notification notification, String eventCategory, String referenceId, String recipientEmail) {
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
            case "REQUEST_RESCHEDULED":
                badgeColor = "#0d9488"; // teal
                badgeText = "Rescheduled";
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
        String portalUrl = resolvePortalUrl(notification, reqId, recipientEmail);

        return "<!DOCTYPE html>" +
                "<html><head><meta charset='UTF-8'>" +
                "<style>" +
                "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }"
                +
                ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }"
                +
                ".header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; color: #ffffff; text-align: center; }"
                +
                ".header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }" +
                ".header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }" +
                ".body-content { padding: 28px 24px; }" +
                ".badge-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }"
                +
                ".badge { background-color: " + badgeColor
                + "; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; }"
                +
                ".req-id { font-family: monospace; font-size: 14px; font-weight: 700; color: #334155; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; }"
                +
                ".card-title { font-size: 18px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }" +
                ".details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }" +
                ".details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }" +
                ".details-table td.label { font-weight: 600; color: #64748b; width: 35%; }" +
                ".details-table td.value { color: #1e293b; font-weight: 500; }" +
                ".message-box { background-color: #f8fafc; border-left: 4px solid " + badgeColor
                + "; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; line-height: 1.5; color: #334155; }"
                +
                ".action-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin-top: 10px; }"
                +
                ".footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }"
                +
                ".footer p { margin: 4px 0; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>NARASARAOPETA ENGINEERING COLLEGE</h1>" +
                "<p>College Department Services Management System</p>" +
                "</div>" +
                "<div class='body-content'>" +
                "<div style='margin-bottom: 16px;'>" +
                "<span class='badge'>" + badgeText + "</span>" +
                "<span class='req-id' style='float: right;'>#" + reqId + "</span>" +
                "<div style='clear: both;'></div>" +
                "</div>" +
                "<h2 class='card-title'>"
                + (notification.getTitle() != null ? notification.getTitle() : "Service Notification") + "</h2>" +
                "<div class='message-box'>" + (notification.getMessage() != null ? notification.getMessage() : "")
                + "</div>" +
                "<table class='details-table'>" +
                "<tr><td class='label'>Service</td><td class='value'>" + serviceName + "</td></tr>" +
                "<tr><td class='label'>Request ID</td><td class='value'>" + reqId + "</td></tr>" +
                "<tr><td class='label'>Status</td><td class='value'><strong style='color: " + badgeColor + ";'>"
                + badgeText + "</strong></td></tr>" +
                "<tr><td class='label'>Timestamp</td><td class='value'>" + dateStr + "</td></tr>" +
                "</table>" +
                "<div style='text-align: center; margin-top: 24px;'>" +
                "<a href='" + portalUrl + "' class='action-btn' target='_blank'>View in Portal</a>" +
                "</div>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>This is an automated notification from NEC Department Services Management System.</p>" +
                "<p>Please do not reply directly to this email.</p>" +
                "<p>&copy; " + LocalDateTime.now().getYear()
                + " Narasaraopeta Engineering College (Autonomous). All rights reserved.</p>" +
                "</div></div></body></html>";
    }

    public String buildPlainTextEmailBody(Notification notification, String eventCategory, String referenceId) {
        return buildPlainTextEmailBody(notification, eventCategory, referenceId, null);
    }

    public String buildPlainTextEmailBody(Notification notification, String eventCategory, String referenceId, String recipientEmail) {
        String reqId = referenceId != null ? referenceId : "N/A";
        String serviceName = notification.getService() != null ? notification.getService() : "Department Service";
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        String portalUrl = resolvePortalUrl(notification, reqId, recipientEmail);

        return "=======================================================\n" +
                "NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)\n" +
                "College Department Services Management System\n" +
                "=======================================================\n\n" +
                "Notification: " + (notification.getTitle() != null ? notification.getTitle() : "Service Notification")
                + "\n" +
                "Request ID: " + reqId + "\n" +
                "Service: " + serviceName + "\n" +
                "Event: " + eventCategory + "\n" +
                "Timestamp: " + dateStr + "\n\n" +
                "Details:\n" +
                (notification.getMessage() != null ? notification.getMessage() : "") + "\n\n" +
                "View Request in Portal: " + portalUrl + "\n\n" +
                "-------------------------------------------------------\n" +
                "This is an automated notification. Please do not reply directly.";
    }

    @Async
    public CompletableFuture<Void> sendPasswordResetEmailAsync(String recipientEmail, String userName,
            String rawToken) {
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

        String baseUrl = getEffectiveFrontendUrl();
        String resetLink = baseUrl + "/reset-password?token=" + rawToken;

        String subject = "[NEC Services] Password Reset Request";
        String referenceId = "PWD-RESET";
        String dedupKey = "PWD_RESET:" + System.currentTimeMillis() + ":" + recipientEmail.toLowerCase();

        String activeProvider = getActiveProvider();
        String providerName = "apps-script".equalsIgnoreCase(activeProvider) ? "APPS_SCRIPT" : "SMTP";

        EmailLog logEntry = EmailLog.builder()
                .referenceId(referenceId)
                .deduplicationKey(dedupKey)
                .service("Authentication")
                .eventCategory("PASSWORD_RESET")
                .primaryRecipient(recipientEmail)
                .ccRecipients(Collections.emptyList()) // Strictly NO CC
                .subject(subject)
                .provider(providerName)
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
                "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }"
                +
                ".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }"
                +
                ".header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; color: #ffffff; text-align: center; }"
                +
                ".header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }" +
                ".header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }" +
                ".body-content { padding: 28px 24px; }" +
                ".card-title { font-size: 18px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }" +
                ".message-box { background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #334155; }"
                +
                ".action-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin: 16px 0; }"
                +
                ".expiry-note { font-size: 13px; color: #64748b; margin-top: 16px; }" +
                ".footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }"
                +
                ".footer p { margin: 4px 0; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>NARASARAOPETA ENGINEERING COLLEGE</h1>" +
                "<p>College Department Services Management System</p>" +
                "</div>" +
                "<div class='body-content'>" +
                "<h2 class='card-title'>Password Reset Request</h2>" +
                "<p style='font-size: 14px; line-height: 1.5; color: #334155;'>" + greeting + "</p>" +
                "<p style='font-size: 14px; line-height: 1.5; color: #334155;'>We received a request to reset your password for your institutional account on the NEC Services Management Portal.</p>"
                +
                "<div style='text-align: center; margin: 24px 0;'>" +
                "<a href='" + resetLink + "' class='action-btn' target='_blank'>Reset Password</a>" +
                "</div>" +
                "<div class='message-box'>" +
                "<strong>Security Notice:</strong> This password reset link is valid for <strong>15 minutes</strong> and can only be used once. If you did not request this reset, you can safely ignore this email; your existing password will remain secure and unchanged."
                +
                "</div>" +
                "<p class='expiry-note'>If the button above does not work, copy and paste the following link into your browser:<br>"
                +
                "<span style='word-break: break-all; color: #2563eb;'>" + resetLink + "</span></p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>This is an automated system email. Please do not reply directly.</p>" +
                "<p>&copy; " + LocalDateTime.now().getYear()
                + " Narasaraopeta Engineering College (Autonomous). All rights reserved.</p>" +
                "</div></div></body></html>";
    }

    private String buildPasswordResetPlainText(String userName, String resetLink) {
        String greeting = (userName != null && !userName.isBlank()) ? "Hello " + userName + "," : "Hello,";
        return "=======================================================\n" +
                "NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)\n" +
                "College Department Services Management System\n" +
                "=======================================================\n\n" +
                greeting + "\n\n" +
                "We received a request to reset your password for your institutional account on the NEC Services Management Portal.\n\n"
                +
                "To choose a new password, open the following link in your browser:\n" +
                resetLink + "\n\n" +
                "This password reset link is valid for 15 minutes and can only be used once.\n\n" +
                "If you did not request this password reset, please ignore this email. Your account remains secure.\n\n"
                +
                "-------------------------------------------------------\n" +
                "This is an automated notification. Please do not reply directly.";
    }

    private boolean isValidPdfBytes(byte[] bytes) {
        if (bytes == null || bytes.length < 5) {
            return false;
        }
        for (int i = 0; i < PDF_MAGIC_BYTES.length; i++) {
            if (bytes[i] != PDF_MAGIC_BYTES[i]) {
                return false;
            }
        }
        return true;
    }

    private boolean isValidPdfFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return false;
        }
        String clean = filename.trim().toLowerCase();
        return clean.endsWith(".pdf") && clean.length() > 4;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "attachment.pdf";
        String clean = filename.trim().replaceAll("[/\\\\?%*:|\"<>]", "_");
        return clean.isEmpty() ? "attachment.pdf" : clean;
    }

    public boolean sendEmailWithAttachment(String primaryRecipient, List<String> ccRecipients,
                                           String subject, String htmlBody, String plainText,
                                           String attachmentFilename, byte[] attachmentBytes, String referenceId) {
        return sendEmailWithAttachment(primaryRecipient, ccRecipients, Collections.emptyList(),
                subject, htmlBody, plainText, attachmentFilename, attachmentBytes, referenceId);
    }

    public boolean sendEmailWithAttachment(String primaryRecipient, List<String> ccRecipients, List<String> bccRecipients,
                                           String subject, String htmlBody, String plainText,
                                           String attachmentFilename, byte[] attachmentBytes, String referenceId) {
        if (!mailEnabled || primaryRecipient == null || primaryRecipient.isBlank()) {
            return false;
        }

        String cleanPrimary = EmailRecipientValidator.normalizeEmail(primaryRecipient);
        if (!EmailRecipientValidator.isValidRecipient(cleanPrimary)) {
            EmailLog logEntry = EmailLog.builder()
                    .referenceId(referenceId)
                    .service("Seminar Hall Inspection")
                    .eventCategory("INSPECTION_REPORT")
                    .primaryRecipient(cleanPrimary != null ? cleanPrimary : (primaryRecipient != null ? primaryRecipient.trim() : "null"))
                    .subject(subject)
                    .provider(getActiveProvider().toUpperCase())
                    .status(EmailLog.STATUS_FAILED)
                    .errorMessage("Invalid primary recipient email address: " + (cleanPrimary != null ? cleanPrimary : primaryRecipient))
                    .createdAt(LocalDateTime.now())
                    .build();
            emailLogRepository.save(logEntry);
            log.warn("Inspection report email rejected: invalid email address '{}'", primaryRecipient);
            return false;
        }

        EmailRecipientValidator.SecondaryValidationResult ccValidation =
                EmailRecipientValidator.validateSecondaryRecipients(ccRecipients, cleanPrimary);
        for (String invalidCc : ccValidation.getInvalidRecipients()) {
            log.warn("Invalid CC recipient '{}' rejected for inspection email (ref: {})",
                    sanitizeForLog(invalidCc), referenceId);
        }
        for (String dupCc : ccValidation.getPrimaryDuplicates()) {
            log.info("CC recipient '{}' excluded because it matches primary recipient for inspection email (ref: {})",
                    sanitizeForLog(dupCc), referenceId);
        }
        List<String> cleanCcs = ccValidation.getValidRecipients();

        EmailRecipientValidator.SecondaryValidationResult bccValidation =
                EmailRecipientValidator.validateSecondaryRecipients(bccRecipients, cleanPrimary);
        for (String invalidBcc : bccValidation.getInvalidRecipients()) {
            log.warn("Invalid BCC recipient '{}' rejected for inspection email (ref: {})",
                    sanitizeForLog(invalidBcc), referenceId);
        }
        for (String dupBcc : bccValidation.getPrimaryDuplicates()) {
            log.info("BCC recipient '{}' excluded because it matches primary recipient for inspection email (ref: {})",
                    sanitizeForLog(dupBcc), referenceId);
        }
        List<String> cleanBccs = bccValidation.getValidRecipients().stream()
                .filter(b -> {
                    if (cleanCcs.contains(b)) {
                        log.info("BCC recipient '{}' excluded because it is already in CC list for inspection email (ref: {})",
                                sanitizeForLog(b), referenceId);
                        return false;
                    }
                    return true;
                })
                .toList();

        String idempotencyKey = buildDeduplicationKey(referenceId, "INSPECTION_REPORT", cleanPrimary);
        if (!claimEventKey(idempotencyKey)) {
            log.info("Inspection report email for {} already sent or in-flight (key={}) - suppressing duplicate", cleanPrimary, idempotencyKey);
            return true; // Idempotent success: email already distributed
        }

        String activeProvider = getActiveProvider();
        String providerName = "apps-script".equalsIgnoreCase(activeProvider) ? "APPS_SCRIPT" : "SMTP";

        EmailLog logEntry = EmailLog.builder()
                .referenceId(referenceId)
                .deduplicationKey(idempotencyKey)
                .service("Seminar Hall Inspection")
                .eventCategory("INSPECTION_REPORT")
                .primaryRecipient(cleanPrimary)
                .ccRecipients(cleanCcs)
                .subject(subject)
                .provider(providerName)
                .createdAt(LocalDateTime.now())
                .build();

        if (!isValidPdfFilename(attachmentFilename)) {
            releaseEventKey(idempotencyKey);
            logEntry.setStatus(EmailLog.STATUS_FAILED);
            logEntry.setErrorMessage("Invalid attachment filename: '" + attachmentFilename + "'. PDF extension (.pdf) is required.");
            emailLogRepository.save(logEntry);
            log.warn("Inspection report attachment rejected for {}: invalid filename '{}'", cleanPrimary, attachmentFilename);
            return false;
        }
        String sanitizedFilename = sanitizeFilename(attachmentFilename);

        if (attachmentBytes == null || attachmentBytes.length == 0) {
            releaseEventKey(idempotencyKey);
            logEntry.setStatus(EmailLog.STATUS_FAILED);
            logEntry.setErrorMessage("Attachment content is missing or empty for file: " + sanitizedFilename);
            emailLogRepository.save(logEntry);
            log.warn("Inspection report attachment rejected for {}: empty bytes", cleanPrimary);
            return false;
        }

        if (attachmentBytes.length > MAX_ATTACHMENT_SIZE_BYTES) {
            releaseEventKey(idempotencyKey);
            logEntry.setStatus(EmailLog.STATUS_FAILED);
            logEntry.setErrorMessage("Attachment exceeds maximum allowed size of 10 MB (" + attachmentBytes.length + " bytes)");
            emailLogRepository.save(logEntry);
            log.warn("Inspection report attachment rejected for {}: oversized ({} bytes)", cleanPrimary, attachmentBytes.length);
            return false;
        }

        if (!isValidPdfBytes(attachmentBytes)) {
            releaseEventKey(idempotencyKey);
            logEntry.setStatus(EmailLog.STATUS_FAILED);
            logEntry.setErrorMessage("Invalid attachment format: File does not contain a valid PDF magic header (%PDF-)");
            emailLogRepository.save(logEntry);
            log.warn("Inspection report attachment rejected for {}: invalid PDF header bytes", cleanPrimary);
            return false;
        }

        if (!validateClaimOwnership(idempotencyKey)) {
            log.error("Lost claim ownership or lease expired before dispatch for inspection email {}", cleanPrimary);
            releaseEventKey(idempotencyKey);
            return false;
        }

        if ("apps-script".equalsIgnoreCase(activeProvider)) {
            return dispatchAttachmentViaAppsScript(cleanPrimary, cleanCcs, cleanBccs, subject, htmlBody, plainText,
                    sanitizedFilename, attachmentBytes, idempotencyKey, logEntry);
        } else {
            return dispatchAttachmentViaSmtp(cleanPrimary, cleanCcs, cleanBccs, subject, htmlBody, plainText,
                    sanitizedFilename, attachmentBytes, idempotencyKey, logEntry);
        }
    }

    private boolean dispatchAttachmentViaSmtp(String primaryRecipient, List<String> ccRecipients, List<String> bccRecipients,
                                              String subject, String htmlBody, String plainText,
                                              String attachmentFilename, byte[] attachmentBytes,
                                              String idempotencyKey, EmailLog logEntry) {
        if (!isSmtpConfigured()) {
            logEntry.setStatus(EmailLog.STATUS_SKIPPED_NO_CREDENTIALS);
            logEntry.setErrorMessage("SMTP credentials not configured in environment. Email logged safely.");
            emailLogRepository.save(logEntry);
            log.info("Email with attachment simulated [SKIPPED_NO_CREDENTIALS] via SMTP to: {}", primaryRecipient);
            completeEventKey(idempotencyKey);
            return true;
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
            if (!bccRecipients.isEmpty()) {
                helper.setBcc(bccRecipients.toArray(new String[0]));
            }
            helper.setSubject(subject);
            helper.setText(plainText != null ? plainText : htmlBody, htmlBody);

            helper.addAttachment(attachmentFilename, new ByteArrayResource(attachmentBytes));

            sender.send(message);

            String messageId = message.getMessageID();
            logEntry.setMessageId(messageId);
            logEntry.setStatus(EmailLog.STATUS_SMTP_ACCEPTED);
            logEntry.setErrorMessage(null);
            emailLogRepository.save(logEntry);
            log.info("Inspection report email with attachment successfully sent via SMTP to {}", primaryRecipient);
            completeEventKey(idempotencyKey);
            return true;
        } catch (Exception e) {
            releaseEventKey(idempotencyKey);
            log.error("Failed to send inspection report email via SMTP to {}: {}", primaryRecipient, e.getMessage());
            logEntry.setStatus(EmailLog.STATUS_FAILED);
            logEntry.setErrorMessage(e.getMessage());
            emailLogRepository.save(logEntry);
            return false;
        }
    }

    private boolean dispatchAttachmentViaAppsScript(String primaryRecipient, List<String> ccRecipients, List<String> bccRecipients,
                                                    String subject, String htmlBody, String plainText,
                                                    String attachmentFilename, byte[] attachmentBytes,
                                                    String idempotencyKey, EmailLog logEntry) {
        if (!isAppsScriptConfigured()) {
            logEntry.setStatus(EmailLog.STATUS_SKIPPED_NO_CREDENTIALS);
            logEntry.setErrorMessage("Apps Script URL or secret not configured in environment. Email logged safely.");
            emailLogRepository.save(logEntry);
            log.info("Email with attachment simulated [SKIPPED_NO_CREDENTIALS] via Apps Script to: {}", primaryRecipient);
            completeEventKey(idempotencyKey);
            return true;
        }

        try {
            String base64Content = Base64.getEncoder().encodeToString(attachmentBytes);

            Map<String, Object> attachmentMap = new LinkedHashMap<>();
            attachmentMap.put("filename", attachmentFilename);
            attachmentMap.put("mimeType", "application/pdf");
            attachmentMap.put("base64Data", base64Content);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("secret", appsScriptSecret);
            payload.put("to", primaryRecipient);
            payload.put("cc", ccRecipients != null ? ccRecipients : Collections.emptyList());
            if (bccRecipients != null && !bccRecipients.isEmpty()) {
                payload.put("bcc", bccRecipients);
            }
            payload.put("subject", subject);
            payload.put("htmlBody", htmlBody);
            payload.put("textBody", plainText);
            payload.put("senderName",
                    (mailFromName != null && !mailFromName.isBlank()) ? mailFromName.trim() : "NEC Service Management");
            payload.put("idempotencyKey", idempotencyKey);
            payload.put("attachments", List.of(attachmentMap));

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(appsScriptUrl.trim()))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .build();

            HttpClient client = (this.httpClient != null) ? this.httpClient : createHttpClient();
            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            int statusCode = response.statusCode();
            String responseBody = response.body() != null ? response.body().trim() : "";

            if (statusCode >= 200 && statusCode < 300) {
                boolean success = false;
                String errorDetail = null;
                JsonNode root = null;
                try {
                    root = objectMapper.readTree(responseBody);
                    success = root.path("success").asBoolean(false);
                    if (!success) {
                        errorDetail = root.has("error") ? root.get("error").asText()
                                : (root.has("message") ? root.get("message").asText() : "Apps Script rejected request");
                    }
                } catch (Exception parseEx) {
                    errorDetail = "Invalid JSON response from Apps Script: " + responseBody;
                }

                if (success) {
                    logEntry.setStatus(EmailLog.STATUS_SMTP_ACCEPTED);
                    if (root != null && root.has("messageId") && !root.get("messageId").isNull()) {
                        logEntry.setMessageId(root.get("messageId").asText());
                    }
                    logEntry.setErrorMessage(null);
                    emailLogRepository.save(logEntry);
                    log.info("Inspection report email with attachment accepted by Apps Script relay [SMTP_ACCEPTED] for {}", primaryRecipient);
                    completeEventKey(idempotencyKey);
                    return true;
                } else {
                    releaseEventKey(idempotencyKey);
                    String sanitized = sanitizeErrorMessage(errorDetail, appsScriptSecret);
                    logEntry.setStatus(EmailLog.STATUS_FAILED);
                    logEntry.setErrorMessage(sanitized);
                    emailLogRepository.save(logEntry);
                    log.warn("Apps Script relay reported attachment failure for {}: {}", primaryRecipient, sanitized);
                    return false;
                }
            } else {
                releaseEventKey(idempotencyKey);
                String sanitized = sanitizeErrorMessage("HTTP " + statusCode + ": " + responseBody, appsScriptSecret);
                logEntry.setStatus(EmailLog.STATUS_FAILED);
                logEntry.setErrorMessage(sanitized);
                emailLogRepository.save(logEntry);
                log.warn("Apps Script HTTP failure for attachment dispatch to {}: {}", primaryRecipient, sanitized);
                return false;
            }
        } catch (HttpTimeoutException te) {
            // Under timeout, keep event key to prevent double dispatch of the same inspection report email
            String sanitized = sanitizeErrorMessage("Apps Script request timed out: " + te.getMessage(), appsScriptSecret);
            logEntry.setStatus(EmailLog.STATUS_FAILED);
            logEntry.setErrorMessage(sanitized);
            emailLogRepository.save(logEntry);
            log.warn("Apps Script timeout for attachment dispatch to {}: {}", primaryRecipient, sanitized);
            markEventKeyAmbiguous(idempotencyKey, sanitized);
            return false;
        } catch (Exception e) {
            releaseEventKey(idempotencyKey);
            String sanitized = sanitizeErrorMessage(
                    e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName(), appsScriptSecret);
            logEntry.setStatus(EmailLog.STATUS_FAILED);
            logEntry.setErrorMessage(sanitized);
            emailLogRepository.save(logEntry);
            log.warn("Apps Script attachment delivery error for {}: {}", primaryRecipient, sanitized);
            return false;
        }
    }
}
