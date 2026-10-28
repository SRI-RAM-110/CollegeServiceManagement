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
@Document(collection = "device_tokens")
public class DeviceToken {
    @Id
    private String id;

    @Indexed
    private String userId; // Authenticated user ID (e.g. csehod, ecehod)

    @Indexed(unique = true)
    private String token; // FCM Device Registration Token

    private String platform; // "ANDROID", "IOS", etc.

    private String deviceModel;

    @CreatedDate
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

