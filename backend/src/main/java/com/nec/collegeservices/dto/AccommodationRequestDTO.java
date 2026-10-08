package com.nec.collegeservices.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class AccommodationRequestDTO {
    private String facultyOrGuestName;

    @NotBlank(message = "Hostel is required (Girls Hostel or Boys Hostel)")
    private String hostel;

    @NotBlank(message = "Room type is required (AC Room or Non-AC Room)")
    private String roomType;

    private String roomId; // Optional specific room

    @NotBlank(message = "Check-in date is required")
    private String checkInDate;

    @NotBlank(message = "Check-out date is required")
    private String checkOutDate;

    @NotNull(message = "Number of guests is required")
    @Min(value = 1, message = "Number of guests must be at least 1")
    @Max(value = 50, message = "Number of guests cannot exceed 50")
    private Integer guestsCount;

    @NotBlank(message = "Purpose of visit is required")
    private String purpose;

    private String additionalNotes;

    @Builder.Default
    private String bookingType = "ONE_TIME"; // ONE_TIME, MULTI_DAY, RECURRING

    private String startDate;
    private String endDate;
    private java.util.List<String> dates;
    private java.util.List<String> recurrenceDays;

    @Builder.Default
    private String recurrencePattern = "WEEKLY";

    private String selectionMode; // "BOYS", "GIRLS", "BOTH"
    private AccommodationRequestDTO boysRequest;
    private AccommodationRequestDTO girlsRequest;
}
