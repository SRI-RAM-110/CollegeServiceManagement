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
public class TransportRequestDTO {
    @NotBlank(message = "Trip type is required (e.g. College Bus, Mini Bus, Tempo Traveller, Innova)")
    private String tripType;

    @NotBlank(message = "Trip date is required (YYYY-MM-DD)")
    private String tripDate;

    private boolean roundTrip;

    @NotBlank(message = "Pickup location is required")
    private String pickupLocation;

    @NotBlank(message = "Destination is required")
    private String destination;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    @NotBlank(message = "Departure time is required")
    private String departureTime;

    private String returnTime;

    @NotNull(message = "Expected passengers count is required")
    private Integer expectedPassengers;

    private String vehicleId;
    private String additionalNotes;

    // Booking Type: ONE_TIME, MULTI_DAY, RECURRING
    @Builder.Default
    private String bookingType = "ONE_TIME";

    private String startDate;
    private String endDate;
    private java.util.List<String> dates;
    private java.util.List<String> recurrenceDays;

    @Builder.Default
    private String recurrencePattern = "WEEKLY";
}
