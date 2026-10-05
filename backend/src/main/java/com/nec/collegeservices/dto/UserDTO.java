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
    private Boolean active;
    private Boolean mustChangePassword;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
