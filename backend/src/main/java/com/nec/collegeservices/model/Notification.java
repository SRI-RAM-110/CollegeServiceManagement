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
}
