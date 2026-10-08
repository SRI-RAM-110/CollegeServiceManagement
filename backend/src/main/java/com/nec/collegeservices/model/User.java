package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private String password;
    private String name; // fullName
    private String role; // primary role: DEPARTMENT_USER, AO_ADMIN, SEMINAR_ADMIN, SEMINAR_COORDINATOR, etc.

    @Builder.Default
    private java.util.List<String> roles = new java.util.ArrayList<>(); // all assigned roles

    @Builder.Default
    private java.util.List<String> assignedHallIds = new java.util.ArrayList<>(); // e.g. ["SH-1", "SH-5"]

    private String department; // CSE, ECE, EEE, ME, CIVIL, AI, MBA, PHARM, ADMIN, etc.
    private String designation; // e.g. Professor, Coordinator, HOD

    @Indexed(unique = true)
    private String email;
    private String phone;

    @Builder.Default
    private java.util.List<String> servicePermissions = new java.util.ArrayList<>(); // e.g. ["SEMINAR_ADMIN", "MEALS_ADMIN"]

    @Builder.Default
    private Boolean mustChangePassword = false;

    @Builder.Default
    private Boolean active = true;

    @CreatedDate
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public java.util.List<String> getEffectiveRoles() {
        java.util.Set<String> effective = new java.util.LinkedHashSet<>();
        if (role != null && !role.isBlank()) {
            effective.add(role.trim().toUpperCase());
        }
        if (roles != null) {
            for (String r : roles) {
                if (r != null && !r.isBlank()) {
                    effective.add(r.trim().toUpperCase());
                }
            }
        }
        if (servicePermissions != null) {
            for (String sp : servicePermissions) {
                if (sp != null && !sp.isBlank()) {
                    effective.add(sp.trim().toUpperCase());
                }
            }
        }
        return new java.util.ArrayList<>(effective);
    }

    public boolean hasRole(String targetRole) {
        if (targetRole == null) return false;
        String t = targetRole.trim().toUpperCase();
        return getEffectiveRoles().contains(t);
    }

    public boolean hasServicePermission(String permission) {
        if (permission == null) return false;
        if (hasRole("CREATOR") || hasRole("AO_ADMIN")) return true;
        if (servicePermissions == null) return false;
        String p = permission.trim().toUpperCase();
        for (String sp : servicePermissions) {
            if (sp != null && sp.trim().equalsIgnoreCase(p)) return true;
        }
        return hasRole(p);
    }

    @Builder.Default
    private java.util.List<String> assignedHostels = new java.util.ArrayList<>(); // e.g. ["Boys Hostel"], ["Girls Hostel"]

    public boolean isAssignedToHall(String hallId) {
        if (hallId == null) return false;
        if (hasRole("CREATOR") || hasRole("AO_ADMIN") || hasRole("SEMINAR_ADMIN")) return true;
        if (assignedHallIds == null || assignedHallIds.isEmpty()) return false;
        for (String a : assignedHallIds) {
            if (a == null) continue;
            if (a.equalsIgnoreCase(hallId)) return true;
            if ((a.equalsIgnoreCase("SH-5") || a.equalsIgnoreCase("TECH-HUB") || a.equalsIgnoreCase("Tech Hub")) &&
                (hallId.equalsIgnoreCase("SH-5") || hallId.equalsIgnoreCase("TECH-HUB") || hallId.equalsIgnoreCase("Tech Hub"))) {
                return true;
            }
        }
        return false;
    }

    public boolean isAssignedToHostel(String hostel) {
        if (hostel == null) return false;
        if (hasRole("CREATOR") || hasRole("AO_ADMIN")) return true;
        if (hasRole("BOYS_HOSTEL_ADMIN") && hostel.equalsIgnoreCase("Boys Hostel")) return true;
        if (hasRole("GIRLS_HOSTEL_ADMIN") && hostel.equalsIgnoreCase("Girls Hostel")) return true;
        if (hasRole("BOYS_HOSTEL_ADMIN") && !hostel.equalsIgnoreCase("Boys Hostel")) return false;
        if (hasRole("GIRLS_HOSTEL_ADMIN") && !hostel.equalsIgnoreCase("Girls Hostel")) return false;

        if (assignedHostels != null && !assignedHostels.isEmpty()) {
            return assignedHostels.stream().anyMatch(h -> h != null && (h.equalsIgnoreCase(hostel) || h.equalsIgnoreCase("ALL")));
        }
        return hasRole("ACCOMMODATION_ADMIN") || hasServicePermission("ACCOMMODATION_ADMIN");
    }

    public boolean isSpecificHostelAdmin() {
        if (hasRole("CREATOR") || hasRole("AO_ADMIN")) return false;
        if (hasRole("BOYS_HOSTEL_ADMIN") || hasRole("GIRLS_HOSTEL_ADMIN")) return true;
        if (assignedHostels != null && !assignedHostels.isEmpty()) {
            return assignedHostels.stream().noneMatch(h -> h != null && h.equalsIgnoreCase("ALL"));
        }
        return false;
    }
}
