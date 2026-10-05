package com.nec.collegeservices.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportDataDTO {

    private ReportMetadataDTO metadata;

    private ReportSummaryDTO summary;

    @Builder.Default
    private List<ServiceBreakdownDTO> serviceBreakdown = new ArrayList<>();

    @Builder.Default
    private List<DepartmentBreakdownDTO> departmentBreakdown = new ArrayList<>();

    @Builder.Default
    private List<HallBreakdownDTO> hallBreakdown = new ArrayList<>();

    @Builder.Default
    private Map<String, Long> slotBreakdown = new HashMap<>();

    @Builder.Default
    private MealsHeadcountDTO mealsHeadcount = new MealsHeadcountDTO();

    @Builder.Default
    private List<StationeryItemSummaryDTO> stationeryItems = new ArrayList<>();

    @Builder.Default
    private TransportMetricsDTO transportMetrics = new TransportMetricsDTO();

    @Builder.Default
    private AccommodationMetricsDTO accommodationMetrics = new AccommodationMetricsDTO();

    @Builder.Default
    private List<ReportRecordDTO> detailedRecords = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportMetadataDTO {
        private String reportTitle;
        private String generatedBy;
        private String userRole;
        private String userDepartment;
        private LocalDateTime generatedAt;
        private String dateRangeLabel;
        private String activeService;
        private String activeDepartment;
        private String activeHall;
        private String activeHallName;
        private String activeStatus;
        private String viewType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportSummaryDTO {
        private long totalRequests;
        private long approved;
        private long pending;
        private long rejected;
        private long cancelled;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceBreakdownDTO {
        private String serviceKey; // SEMINAR, ACCOMMODATION, TRANSPORT, STATIONERY, MEALS
        private String serviceName;
        private long total;
        private long approved;
        private long pending;
        private long rejected;
        private long cancelled;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentBreakdownDTO {
        private String department;
        private long total;
        private long approved;
        private long pending;
        private long rejected;
        private long cancelled;
        private long seminarCount;
        private long accommodationCount;
        private long transportCount;
        private long stationeryCount;
        private long mealsCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HallBreakdownDTO {
        private String hallId;
        private String hallName;
        private String location;
        private Integer capacity;
        private long total;
        private long approved;
        private long pending;
        private long rejected;
        private long cancelled;
        private long forenoonCount;
        private long afternoonCount;
        private long fullDayCount;
        private double totalBookedHours;
        @Builder.Default
        private Map<String, Long> departmentUsage = new HashMap<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealsHeadcountDTO {
        private long breakfast;
        private long lunch;
        private long dinner;
        private long snacks;
        private long teaCoffee;
        private long snacksForenoon;
        private long snacksAfternoon;
        private long teaCoffeeForenoon;
        private long teaCoffeeAfternoon;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StationeryItemSummaryDTO {
        private String name;
        private long totalQuantity;
        private String unit;
        private long requestCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransportMetricsDTO {
        private long totalPassengers;
        @Builder.Default
        private Map<String, Long> vehicleUsage = new HashMap<>();
        @Builder.Default
        private Map<String, Long> tripTypes = new HashMap<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccommodationMetricsDTO {
        private long totalGuests;
        @Builder.Default
        private Map<String, Long> roomUsage = new HashMap<>();
        @Builder.Default
        private Map<String, Long> roomTypes = new HashMap<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportRecordDTO {
        private String requestId;
        private String service; // Seminar Hall, Accommodation, Transport, Stationery, Snacks & Meals
        private String serviceKey;
        private String department;
        private String requestedBy;
        private String requesterUserId;
        private String date; // YYYY-MM-DD
        private String purpose;
        private String status;
        private LocalDateTime createdAt;
        private String approvedBy;
        private String resource; // e.g. "Seminar Hall 1", "Room GH-AC-1", "College Bus"
        private String slotOrTiming; // e.g. "FORENOON", "09:00 AM - 05:00 PM"
        private Integer guestOrQuantityCount;
        private String details;
    }
}
