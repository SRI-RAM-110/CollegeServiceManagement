package com.nec.collegeservices.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportFilterRequest {
    /**
     * ALL, SEMINAR, ACCOMMODATION, TRANSPORT, STATIONERY, MEALS
     */
    @Builder.Default
    private String service = "ALL";

    /**
     * List of selected services for multi-select
     */
    private java.util.List<String> services;

    /**
     * ALL or department code (e.g. CSE, ECE, EEE, etc.)
     */
    @Builder.Default
    private String department = "ALL";

    /**
     * List of selected departments for multi-select
     */
    private java.util.List<String> departments;

    /**
     * ALL or seminar hall ID (e.g. SH-1, SH-2, TECH-HUB)
     */
    @Builder.Default
    private String hallId = "ALL";

    /**
     * ALL, APPROVED, PENDING, REJECTED, CANCELLED, etc.
     */
    @Builder.Default
    private String status = "ALL";

    /**
     * List of selected statuses for multi-select
     */
    private java.util.List<String> statuses;

    /**
     * ALL, TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR, CUSTOM
     */
    @Builder.Default
    private String dateRangeType = "ALL";

    /**
     * YYYY-MM-DD
     */
    private String startDate;

    /**
     * YYYY-MM-DD
     */
    private String endDate;

    /**
     * OVERVIEW, SERVICE, SEMINAR_HALL, DEPARTMENT, DEPARTMENT_SERVICE, DEPARTMENT_HALL, MY_DEPARTMENT, MY_REQUESTS, DETAILED
     */
    @Builder.Default
    private String viewType = "OVERVIEW";

    /**
     * Optional search query
     */
    private String search;
}

