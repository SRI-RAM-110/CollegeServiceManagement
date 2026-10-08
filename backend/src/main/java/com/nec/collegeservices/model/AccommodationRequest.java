package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "accommodation_requests")
@CompoundIndexes({
    @CompoundIndex(name = "room_dates_status_idx", def = "{'roomId': 1, 'checkInDate': 1, 'checkOutDate': 1, 'status': 1}")
})
public class AccommodationRequest {
    @Id
    private String id;

    @Indexed(unique = true)
    private String requestId; // e.g. ACC-2026-00015 or AC-015

    private String department;
    private String facultyOrGuestName;
    private String hostel; // Girls Hostel, Boys Hostel
    private String roomType; // AC Room, Non-AC Room
    private String roomId; // e.g. GH-AC-1
    private String roomLocation;

    private String checkInDate; // YYYY-MM-DD
    private String checkOutDate; // YYYY-MM-DD
    private Integer guestsCount;
    private String purpose;
    private String additionalNotes;

    // Booking Type: ONE_TIME, MULTI_DAY, RECURRING
    @Builder.Default
    private String bookingType = "ONE_TIME";

    private String startDate; // YYYY-MM-DD
    private String endDate;   // YYYY-MM-DD

    @Builder.Default
    private Boolean isRecurring = false;
    private String seriesId;             // Unique identifier for the entire recurring/multi-day series
    private String recurrencePattern;    // e.g., "WEEKLY"
    private List<String> recurrenceDays; // e.g., ["MONDAY", "WEDNESDAY"]
    private Integer occurrenceIndex;     // e.g., 1
    private Integer totalOccurrences;    // e.g., 8
    private List<String> dates;          // List of all dates in the request

    // Status: PENDING_AO_APPROVAL, AO_APPROVED, AO_REJECTED, PENDING, APPROVED, REJECTED, CANCELLED, CANCELLATION_REQUESTED, RESCHEDULE_REQUESTED
    private String status;

    // Parent Request relationship for dual/multi-hostel submissions
    private String parentRequestId;      // e.g., ACC-PARENT-2026-00015

    // Two-Level Approval: AO Admin (Level 1) Details
    private String aoApprovalStatus;     // PENDING, APPROVED, REJECTED, FORWARDED
    private String aoAction;             // DIRECT_APPROVE, FORWARD
    private String forwardedTo;          // BOYS_HOSTEL_ADMIN, GIRLS_HOSTEL_ADMIN
    private LocalDateTime forwardedAt;
    private String aoApprovedBy;
    private LocalDateTime aoApprovedAt;
    private String aoRemarks;

    private String requestedBy;
    private String requesterUserId;
    private String rejectionReason;

    // Respective Hostel Admin (Level 2) Details
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String adminRemarks;

    // Cancellation Details
    private String cancellationReason;
    private LocalDateTime cancellationRequestedAt;
    private String cancellationRequestedBy;
    private LocalDateTime cancellationReviewedAt;
    private String cancellationReviewedBy;

    // Rescheduling Details
    private String rescheduledRoomId;
    private String rescheduledHostel;
    private String rescheduledRoomType;
    private String rescheduledRoomLocation;
    private String rescheduledCheckInDate;
    private String rescheduledCheckOutDate;
    private String rescheduleReason;
    private LocalDateTime rescheduleRequestedAt;
    private String rescheduleRequestedBy;
    private LocalDateTime rescheduleReviewedAt;
    private String rescheduleReviewedBy;

    // Original booking values before reschedule
    private String originalRoomId;
    private String originalCheckInDate;
    private String originalCheckOutDate;

    // Lifecycle Status History
    @Builder.Default
    private List<StatusHistoryEntry> statusHistory = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusHistoryEntry {
        private String status;
        private String actor;
        private LocalDateTime timestamp;
        private String comment;
    }
}
