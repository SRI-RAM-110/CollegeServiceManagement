package com.nec.collegeservices.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportBulkAvailabilityRequestDTO {
    private String vehicleId;
    private String tripType;

    @NotEmpty(message = "Dates list cannot be empty")
    private List<String> dates;

    private String departureTime;
    private String returnTime;
    private String bookingType;
}
