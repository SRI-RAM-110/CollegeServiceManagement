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
public class RejectIssueDTO {
    @NotBlank(message = "Rejection reason is required")
    @Size(min = 5, max = 1000, message = "Rejection reason must be between 5 and 1000 characters")
    private String rejectionReason;
}

