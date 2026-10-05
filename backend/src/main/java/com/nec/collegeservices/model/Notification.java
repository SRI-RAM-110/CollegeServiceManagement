package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;

    private String recipientRole; // DEPARTMENT_USER, AO_ADMIN, SEMINAR_ADMIN, etc., or ALL
    private String recipientDept; // CSE, ECE, or ALL
    private String recipientUserId; // specific user or null for role/dept broadcast

    private String title;
    private String message;
    private String service; // Seminar Hall, Accommodation, Transport, Stationery, Snacks & Meals, System
    private String type; // INFO, SUCCESS, WARNING, DANGER
    private boolean read;
    private String referenceId; // e.g. bookingId or requestId

    @CreatedDate
    private LocalDateTime createdAt;

    @Builder.Default
    private java.util.Set<String> readByUserIds = new java.util.HashSet<>();

    @Builder.Default
    private java.util.Set<String> clearedByUserIds = new java.util.HashSet<>();

    public String getRequestId() {
        return referenceId;
    }

    public boolean isReadForUser(String userId) {
        if (userId != null && recipientUserId != null && userId.trim().equalsIgnoreCase(recipientUserId.trim())) {
            return read;
        }
        if (readByUserIds != null && userId != null && readByUserIds.contains(userId.trim())) {
            return true;
        }
        return false;
    }

    public boolean isClearedByUser(String userId) {
        if (userId == null) return false;
        return clearedByUserIds != null && clearedByUserIds.contains(userId.trim());
    }
}
