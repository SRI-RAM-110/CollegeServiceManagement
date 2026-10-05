package com.nec.collegeservices.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class UserReportPermissionsDTO {
    @JsonProperty("userId")
    private String userId;

    @JsonProperty("name")
    private String name;

    @JsonProperty("primaryRole")
    private String primaryRole;

    @JsonProperty("department")
    private String department;

    @JsonProperty("userDepartment")
    private String userDepartment;

    @JsonProperty("aoAdmin")
    private boolean isAOAdmin;

    @JsonProperty("serviceAdmin")
    private boolean isServiceAdmin;

    @JsonProperty("seminarCoordinator")
    private boolean isSeminarCoordinator;

    @JsonProperty("departmentUser")
    private boolean isDepartmentUser;

    @JsonProperty("canViewOverall")
    private boolean canViewOverall;

    @JsonProperty("canViewAllDepartments")
    private boolean canViewAllDepartments;

    @Builder.Default
    @JsonProperty("effectiveRoles")
    private List<String> effectiveRoles = new ArrayList<>();

    @Builder.Default
    @JsonProperty("allowedServices")
    private List<String> allowedServices = new ArrayList<>(); // ALL, SEMINAR_HALL, ACCOMMODATION, TRANSPORT, STATIONERY, MEALS

    @Builder.Default
    @JsonProperty("allowedHalls")
    private List<SeminarHallOptionDTO> allowedHalls = new ArrayList<>();

    @Builder.Default
    @JsonProperty("availableDepartments")
    private List<String> availableDepartments = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeminarHallOptionDTO {
        @JsonProperty("hallId")
        private String hallId;

        @JsonProperty("hallName")
        private String hallName;

        @JsonProperty("name")
        private String name;

        @JsonProperty("location")
        private String location;

        @JsonProperty("capacity")
        private Integer capacity;
    }
}
