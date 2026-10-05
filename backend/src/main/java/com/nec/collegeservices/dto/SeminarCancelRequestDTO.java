package com.nec.collegeservices.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeminarCancelRequestDTO {
    @NotBlank(message = "Cancellation reason is required")
    private String reason;

    // Scope: "THIS_OCCURRENCE", "THIS_AND_FUTURE", "ENTIRE_SERIES"
    @Builder.Default
    private String scope = "THIS_OCCURRENCE";
}
