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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "seminar_bookings")
@CompoundIndexes({
    @CompoundIndex(name = "hall_date_slot_idx", def = "{'hallId': 1, 'date': 1, 'slot': 1}")
})
public class SeminarBooking {
    @Id
    private String id;

    @Indexed(unique = true)
    private String bookingId; // e.g. SH-021

    private String department;
    private String eventTitle;
    private String purpose;
    private Integer expectedParticipants;
    private String additionalRequirements;

    private String date; // YYYY-MM-DD
    private String hallId;
    private String hallName;
    private String hallLocation;

    // Slot: FORENOON (09:00 AM - 12:00 PM), AFTERNOON (12:00 PM - 04:00 PM), FULL_DAY (09:00 AM - 04:00 PM)
    private String slot; 

    // Status: PENDING, APPROVED, REJECTED, BOOKED
    private String status;

    private String requestedBy;
    private String requesterUserId;
    private String rejectionReason;

    private String approvedBy;
    private LocalDateTime approvedAt;
    private String adminRemarks;

    // Booking Type: ONE_TIME, MULTI_DAY, RECURRING
    @Builder.Default
    private String bookingType = "ONE_TIME";

    private String startDate; // YYYY-MM-DD
    private String endDate;   // YYYY-MM-DD

    // Recurring Series details
    @Builder.Default
    private Boolean isRecurring = false;
    private String seriesId;             // Unique identifier for the entire recurring series
    private String recurrencePattern;    // e.g., "WEEKLY"
    private java.util.List<String> recurrenceDays; // e.g., ["MONDAY", "WEDNESDAY"]
    private Integer occurrenceIndex;     // e.g., 1
    private Integer totalOccurrences;    // e.g., 8

    // Cancellation details
    private String cancellationReason;
    private LocalDateTime cancellationRequestedAt;
    private String cancellationRequestedBy;
    private String cancellationScope;     // "THIS_OCCURRENCE", "THIS_AND_FUTURE", "ENTIRE_SERIES"
    private LocalDateTime cancellationReviewedAt;
    private String cancellationReviewedBy;

    // Rescheduling details
    private String rescheduleReason;
    private LocalDateTime rescheduleRequestedAt;
    private String rescheduleRequestedBy;
    private String rescheduleScope;      // "THIS_OCCURRENCE", "THIS_AND_FUTURE"
    private String rescheduledHallId;
    private String rescheduledHallName;
    private String rescheduledHallLocation;
    private String rescheduledDate;
    private String rescheduledSlot;
    private String originalBookingId;    // Link to predecessor booking if this was created via reschedule
    private String rescheduledToBookingId; // Link to successor booking

    // Lifecycle Status History
    @Builder.Default
    private java.util.List<StatusHistoryEntry> statusHistory = new java.util.ArrayList<>();

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
