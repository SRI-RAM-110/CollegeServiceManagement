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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transport_requests")
public class TransportRequest {
    @Id
    private String id;

    @Indexed(unique = true)
    private String requestId; // e.g. TR-021

    private String department;
    private String tripType; // College Bus, Mini Bus, Tempo Traveller, Innova
    private String tripDate; // YYYY-MM-DD
    private boolean roundTrip;

    private String pickupLocation;
    private String destination;
    private String purpose;

    private String departureTime; // e.g. 09:00 AM
    private String returnTime; // e.g. 05:00 PM
    private Integer expectedPassengers;

    private String vehicleId;
    private String vehicleName;
    private String additionalNotes;

    // Booking Type: ONE_TIME, MULTI_DAY, RECURRING
    @Builder.Default
    private String bookingType = "ONE_TIME";

    private String startDate; // YYYY-MM-DD
    private String endDate;   // YYYY-MM-DD

    @Builder.Default
    private Boolean isRecurring = false;
    private String seriesId;             // Unique identifier for the recurring/multi-day series
    private String recurrencePattern;    // e.g. "WEEKLY"
    private java.util.List<String> recurrenceDays; // e.g. ["MONDAY", "WEDNESDAY"]
    private Integer occurrenceIndex;     // e.g. 1
    private Integer totalOccurrences;    // e.g. 8
    private java.util.List<String> dates; // List of all dates in the request

    // Status: PENDING, APPROVED, REJECTED
    private String status;

    private String requestedBy;
    private String requesterUserId;
    private String rejectionReason;

    private String approvedBy;
    private LocalDateTime approvedAt;
    private String adminRemarks;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
