package com.nec.collegeservices.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private String id;
    private String userId;
    private String name;
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
    private Boolean mustChangePassword;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Backward-compatible 15-argument constructor for any caller compiled without assignedHostels
    public UserDTO(String id, String userId, String name, String email, String phone,
                   String department, String designation, String role, List<String> roles,
                   List<String> servicePermissions, List<String> assignedHallIds,
                   Boolean active, Boolean mustChangePassword,
                   LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.department = department;
        this.designation = designation;
        this.role = role;
        this.roles = roles;
        this.servicePermissions = servicePermissions;
        this.assignedHallIds = assignedHallIds;
        this.assignedHostels = java.util.Collections.emptyList();
        this.active = active;
        this.mustChangePassword = mustChangePassword;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
