package com.nec.collegeservices.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequestDTO {
    private String name;

    @Email(message = "Please enter a valid email address")
    @Pattern(
        regexp = "^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,24}$",
        message = "Please enter a valid email address"
    )
    private String email;

    private String phone;
    private String department;
    private String designation;
    private String role;
    private List<String> roles;
    private List<String> servicePermissions;
    private List<String> assignedHallIds;
    private List<String> assignedHostels;
    private Boolean active;
}
