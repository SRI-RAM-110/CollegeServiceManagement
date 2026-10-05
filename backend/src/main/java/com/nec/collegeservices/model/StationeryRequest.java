package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "stationery_requests")
public class StationeryRequest {
    @Id
    private String id;

    @Indexed(unique = true)
    private String requestId; // e.g. STA-014

    private String department;
    private String requestedBy;
    private String requesterUserId;
    private List<RequestedItem> itemsRequested;
    private String purpose;
    private String additionalNotes;
    private String adminComments;

    // Status: PENDING, UNDER_REVIEW, APPROVED, READY_FOR_COLLECTION, COLLECTED, REJECTED, CANCELLED
    private String status;

    private String rejectionReason;

    private String approvedBy;
    private LocalDateTime approvedAt;
    private String adminRemarks;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequestedItem {
        private String itemId;
        private String name;
        private Integer quantity; // requested quantity
        private String unit;
    }
}
