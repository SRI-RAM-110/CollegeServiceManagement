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
public class CompleteIssueDTO {
    @NotBlank(message = "Resolution remarks are required to complete the repair")
    @Size(min = 5, max = 2000, message = "Resolution remarks must be between 5 and 2000 characters")
    private String resolutionRemarks;
}

