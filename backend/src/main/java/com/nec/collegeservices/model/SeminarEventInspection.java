package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "seminar_event_inspections")
@CompoundIndexes({
    @CompoundIndex(name = "booking_occ_inspection_idx", def = "{'bookingId': 1, 'occurrenceDate': 1}", unique = true),
    @CompoundIndex(name = "hall_date_status_idx", def = "{'hallId': 1, 'occurrenceDate': 1, 'overallStatus': 1}")
})
public class SeminarEventInspection {

    @Id
    private String id;

    @Indexed
    private String bookingId;

    @Indexed
    private String occurrenceDate; // YYYY-MM-DD
    private Integer occurrenceIndex;

    @Indexed
    private String hallId;
    private String hallName;
    private String hallLocation;

    private String eventTitle;
    private String purpose;
    private String slot; // FORENOON, AFTERNOON, FULL_DAY
    private String startTime;
    private String endTime;
    private String department;

    private String requesterUserId;
    private String requestedBy;

    private String coordinatorUserId;
    private String coordinatorName;

    private String technicianUserId;
    private String technicianName;

    // Overall Status: NOT_STARTED, PRE_EVENT_PENDING, POST_EVENT_PENDING, COMPLETED, CANCELLED
    @Builder.Default
    private String overallStatus = "PRE_EVENT_PENDING";

    // Pre-Event Status: PENDING, IN_PROGRESS, COMPLETED
    @Builder.Default
    private String preEventStatus = "PENDING";

    // Post-Event Status: PENDING, IN_PROGRESS, COMPLETED
    @Builder.Default
    private String postEventStatus = "PENDING";

    @Builder.Default
    private InspectionChecklist preEventInspection = new InspectionChecklist();

    @Builder.Default
    private InspectionChecklist postEventInspection = new InspectionChecklist();

    @Builder.Default
    private FinalSummary finalSummary = new FinalSummary();

    @Builder.Default
    private ReportMetadata reportMetadata = new ReportMetadata();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InspectionChecklist {
        private String inspectedByUserId;
        private String inspectedByName;
        private LocalDateTime inspectedAt;

        @Builder.Default
        private List<InspectionItem> items = new ArrayList<>();

        private String overallNotes;
        private String maintenanceRequestId; // Linked maintenance/electrical ticket if any
        private String maintenanceNotes;
        private Boolean issuesIdentified;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InspectionItem {
        private String key;         // e.g. "HALL_CLEANED", "PROJECTOR_WORKING"
        private String name;        // e.g. "Hall cleaned properly"
        private String category;    // "Hall Arrangement", "Audio and Visual Equipment", etc.
        
        // Condition: WORKING, NOT_WORKING, NOT_AVAILABLE, NOT_APPLICABLE
        @Builder.Default
        private String condition = "WORKING";

        private String remarks;     // Mandatory if NOT_WORKING or NOT_AVAILABLE
        private String photoUrl;    // Optional image URL or base64 attachment
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinalSummary {
        private Boolean eventConducted;
        private Boolean damageIdentified;
        private Boolean issuesIdentified;
        private String technicianFinalRemarks;
        private LocalDateTime completedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportMetadata {
        private boolean reportGenerated;
        private LocalDateTime reportGeneratedAt;
        private boolean reportDistributed;
        private String distributionStatus; // PENDING, SENT, FAILED
        private String distributionError;
        private LocalDateTime distributedAt;
        
        @Builder.Default
        private List<String> distributedToEmails = new ArrayList<>();

        @Builder.Default
        private List<String> distributedToUserIds = new ArrayList<>();
    }
}

