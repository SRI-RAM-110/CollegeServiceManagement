package com.nec.collegeservices.dto;

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
