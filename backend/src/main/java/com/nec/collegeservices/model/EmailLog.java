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

    @CreatedDate
    private LocalDateTime createdAt;
}
