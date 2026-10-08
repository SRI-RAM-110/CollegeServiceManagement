package com.nec.collegeservices.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String userId;
    private String name;
    private String role;
    private java.util.List<String> roles;
    private java.util.List<String> assignedHallIds;
    private java.util.List<String> assignedHostels;
    private java.util.List<String> servicePermissions;
    private String department;
    private String designation;
    private String email;
    private Boolean active;
    private Boolean mustChangePassword;
}
