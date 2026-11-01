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
public class UpdateRemarksDTO {
    @NotBlank(message = "Work remarks cannot be empty")
    @Size(max = 2000, message = "Work remarks cannot exceed 2000 characters")
    private String remarks;
}

