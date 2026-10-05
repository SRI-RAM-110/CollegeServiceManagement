package com.nec.collegeservices.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequestDTO {
    @NotBlank(message = "Full Name is required")
    private String name;

    @NotBlank(message = "Username / Login ID is required")
    private String userId;

    private String email;
    private String phone;

    @NotBlank(message = "Department is required")
    private String department;

    private String designation;
    private String password;
    private String confirmPassword;

    private String role;

    @Builder.Default
    private List<String> roles = new ArrayList<>();

    @Builder.Default
    private List<String> servicePermissions = new ArrayList<>();

    @Builder.Default
    private List<String> assignedHallIds = new ArrayList<>();

    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    private Boolean mustChangePassword = true;
}
