package com.nec.collegeservices.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeminarBookingRequestDTO {
    @NotBlank(message = "Event title is required")
    private String eventTitle;

    private String purpose;

    @NotNull(message = "Expected participants count is required")
    private Integer expectedParticipants;

    private String additionalRequirements;

    // Date is required for single-day. For multi-day/recurring, startDate/endDate are used.
    private String date;

    // Booking Type: ONE_TIME, MULTI_DAY, RECURRING
    @Builder.Default
    private String bookingType = "ONE_TIME";

    private String startDate;
    private String endDate;

    private java.util.List<String> recurrenceDays; // e.g., ["MONDAY", "WEDNESDAY"]

    @Builder.Default
    private String recurrencePattern = "WEEKLY";

    @NotBlank(message = "Hall ID is required")
    private String hallId;

    // Slot: FORENOON, AFTERNOON, FULL_DAY
    @NotBlank(message = "Preferred slot is required (FORENOON, AFTERNOON, or FULL_DAY)")
    private String slot;
}
