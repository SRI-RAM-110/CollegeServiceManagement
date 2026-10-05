package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "push_subscriptions")
public class PushSubscription {
    @Id
    private String id;

    @Indexed
    private String userId; // Authenticated user ID (e.g. csehod, ecehod)

    @Indexed(unique = true)
    private String endpoint; // Browser push service endpoint

    private String p256dh; // Client public key
    private String auth;   // Client auth secret

    private String userAgent;

    @CreatedDate
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
