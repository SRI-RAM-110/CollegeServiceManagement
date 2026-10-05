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

    // Booking Type: ONE_TIME, MULTI_DAY
    @Builder.Default
    private String bookingType = "ONE_TIME";

    // Status: PENDING, APPROVED, REJECTED, CANCELLED, CANCELLATION_REQUESTED, RESCHEDULE_REQUESTED
    private String status;

    private String requestedBy;
    private String requesterUserId;
    private String rejectionReason;

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
