package com.nec.collegeservices.dto.electrical;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReassignElectricianDTO {
    @NotBlank(message = "Electrician user ID is required")
    private String electricianUserId;

    @Size(max = 1000, message = "Remarks cannot exceed 1000 characters")
    private String remarks;
}

