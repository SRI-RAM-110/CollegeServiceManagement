package com.nec.collegeservices.dto;

import jakarta.validation.constraints.NotBlank;
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
public class AccommodationBulkAvailabilityRequestDTO {
    @NotBlank(message = "Room ID is required")
    private String roomId;

    @NotEmpty(message = "Dates list cannot be empty")
    private List<String> dates;

    private String bookingType;
}
