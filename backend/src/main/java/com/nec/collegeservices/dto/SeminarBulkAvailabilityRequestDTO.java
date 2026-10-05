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
public class SeminarBulkAvailabilityRequestDTO {
    @NotBlank(message = "Hall ID is required")
    private String hallId;

    @NotBlank(message = "Slot is required (FORENOON, AFTERNOON, or FULL_DAY)")
    private String slot;

    @NotEmpty(message = "Dates list cannot be empty")
    private List<String> dates;

    private String bookingType;
}
