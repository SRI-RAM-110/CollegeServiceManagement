package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "email_logs")
public class EmailLog {
    @Id
    private String id;

    private String notificationId;
    private String referenceId;
    private String deduplicationKey;
    private String service;
    private String eventCategory;
    private String primaryRecipient;
    private List<String> ccRecipients;
    private String subject;
    private String status;
    private String errorMessage;
    private String provider;
    private String messageId;

    @CreatedDate
    private LocalDateTime createdAt;

    public static final String STATUS_QUEUED = "QUEUED";
    public static final String STATUS_SENDING = "SENDING";
    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_SMTP_ACCEPTED = "SMTP_ACCEPTED";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_DELIVERED = "DELIVERED";
    public static final String STATUS_BOUNCED = "BOUNCED";
    public static final String STATUS_SKIPPED_NO_CREDENTIALS = "SKIPPED_NO_CREDENTIALS";
    public static final String STATUS_SKIPPED_LOCAL_DOMAIN = "SKIPPED_LOCAL_DOMAIN";
}
