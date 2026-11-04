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

    private String department; // CSE, ECE, EEE, ME, CIVIL, IT, CSDS, MBA, PHARM, ADMIN, etc.
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
        if (assignedHostels != null) {
            for (String h : assignedHostels) {
                if (h != null && (h.equalsIgnoreCase("Boys Hostel") || h.equalsIgnoreCase("Boys"))) {
                    effective.add("BOYS_HOSTEL_ADMIN");
                } else if (h != null && (h.equalsIgnoreCase("Girls Hostel") || h.equalsIgnoreCase("Girls"))) {
                    effective.add("GIRLS_HOSTEL_ADMIN");
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
            if ((a.equalsIgnoreCase("SH-5") || a.equalsIgnoreCase("TECH-HUB") || a.equalsIgnoreCase("Tech Hub") || a.equalsIgnoreCase("Tech Hub Wifi center")) &&
                (hallId.equalsIgnoreCase("SH-5") || hallId.equalsIgnoreCase("TECH-HUB") || hallId.equalsIgnoreCase("Tech Hub") || hallId.equalsIgnoreCase("Tech Hub Wifi center"))) {
                return true;
            }
            if ((a.equalsIgnoreCase("SH-3") || a.equalsIgnoreCase("Seminar Hall 3") || a.equalsIgnoreCase("Block 4 Seminar Hall") || a.equalsIgnoreCase("Block 4")) &&
                (hallId.equalsIgnoreCase("SH-3") || hallId.equalsIgnoreCase("Seminar Hall 3") || hallId.equalsIgnoreCase("Block 4 Seminar Hall") || hallId.equalsIgnoreCase("Block 4"))) {
                return true;
            }
            if ((a.equalsIgnoreCase("SH-1") || a.equalsIgnoreCase("Seminar Hall 1") || a.equalsIgnoreCase("Block 3 Seminar Hall")) &&
                (hallId.equalsIgnoreCase("SH-1") || hallId.equalsIgnoreCase("Seminar Hall 1") || hallId.equalsIgnoreCase("Block 3 Seminar Hall"))) {
                return true;
            }
            if ((a.equalsIgnoreCase("SH-2") || a.equalsIgnoreCase("Seminar Hall 2")) &&
                (hallId.equalsIgnoreCase("SH-2") || hallId.equalsIgnoreCase("Seminar Hall 2"))) {
                return true;
            }
            if ((a.equalsIgnoreCase("SH-4") || a.equalsIgnoreCase("Seminar Hall 4") || a.equalsIgnoreCase("Pharma Block Seminar Hall")) &&
                (hallId.equalsIgnoreCase("SH-4") || hallId.equalsIgnoreCase("Seminar Hall 4") || hallId.equalsIgnoreCase("Pharma Block Seminar Hall"))) {
                return true;
            }
            if ((a.equalsIgnoreCase("SH-6") || a.equalsIgnoreCase("Seminar Hall 6") || a.equalsIgnoreCase("Block 2 Seminar hall")) &&
                (hallId.equalsIgnoreCase("SH-6") || hallId.equalsIgnoreCase("Seminar Hall 6") || hallId.equalsIgnoreCase("Block 2 Seminar hall"))) {
                return true;
            }
        }
        return false;
    }

    public boolean isAssignedToHostel(String hostel) {
        if (hostel == null) return false;
        if (hasRole("CREATOR") || hasRole("AO_ADMIN")) return true;
        if (hasRole("ACCOMMODATION_ADMIN") && (assignedHostels == null || assignedHostels.isEmpty())) return true;
        boolean canBoys = hasRole("BOYS_HOSTEL_ADMIN") || (assignedHostels != null && assignedHostels.stream().anyMatch(h -> h != null && (h.equalsIgnoreCase("Boys Hostel") || h.equalsIgnoreCase("Boys") || h.equalsIgnoreCase("ALL"))));
        boolean canGirls = hasRole("GIRLS_HOSTEL_ADMIN") || (assignedHostels != null && assignedHostels.stream().anyMatch(h -> h != null && (h.equalsIgnoreCase("Girls Hostel") || h.equalsIgnoreCase("Girls") || h.equalsIgnoreCase("ALL"))));

        if (hostel.equalsIgnoreCase("Boys Hostel")) return canBoys;
        if (hostel.equalsIgnoreCase("Girls Hostel")) return canGirls;
        return canBoys || canGirls;
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
