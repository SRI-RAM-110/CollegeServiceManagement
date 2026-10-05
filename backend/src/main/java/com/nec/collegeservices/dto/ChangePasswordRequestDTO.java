package com.nec.collegeservices.dto;

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
public class ChangePasswordRequestDTO {
    private String userId;

    @NotBlank(message = "Current/Temporary password is required")
    private String oldPassword;

    @NotBlank(message = "New password is required")
    @Size(min = 4, message = "New password must be at least 4 characters long")
    private String newPassword;

    private String confirmPassword;
}
