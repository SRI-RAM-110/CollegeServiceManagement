package com.nec.collegeservices.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@JsonIgnoreProperties(ignoreUnknown = true)
@Document(collection = "electrical_issue_requests")
@CompoundIndexes({
    @CompoundIndex(name = "status_priority_created_idx", def = "{'status': 1, 'priority': 1, 'createdAt': -1}")
})
public class ElectricalIssueRequest {

    @Id
    private String id;

    @Indexed(unique = true)
    private String requestId; // e.g. CSE-ELEC-0001 or ELEC-0001

    private String locationType;      // e.g. Academic Block, Hostel, Administration, Laboratory, Outdoor, etc.
    private String buildingName;      // e.g. Main Block, Mechanical Block, Girls Hostel 1
    private String floor;             // e.g. Ground Floor, 1st Floor, 2nd Floor
    private String roomNumber;        // e.g. MB-204, LH-102
    private String specificLocation;  // e.g. Near projector panel, Switchboard 3

    private String issueCategory;     // e.g. Power Outage, Wiring / Switchboard, Lighting, Short Circuit, etc.
    private String priority;          // LOW, MEDIUM, HIGH, EMERGENCY
    private String description;
    private String photoUrl;          // Optional image or attachment URL

    // Reporting user details (Seminar Technician / AO Admin)
    @Indexed
    private String reportedByUserId;
    private String reportedByName;
    private String reportedByDepartment;
    private String reportedByPhone;

    // Assigned Electrician details
    @Indexed
    private String assignedElectricianId;
    private String assignedElectricianName;
    private String assignedElectricianPhone;

    // Request lifecycle status: SUBMITTED, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED, REOPENED
    @Indexed
    @Builder.Default
    private String status = Status.SUBMITTED.name();

    private String rejectionReason;
    private String workRemarks;
    private String resolutionRemarks;
    private String reopenReason;
    private String cancellationReason;
    private String cancelledBy;
    private LocalDateTime cancelledAt;
    private String overrideReason;
    private String overrideBy;

    // Lifecycle timeline and audit history
    @Builder.Default
    private List<StatusHistoryEntry> statusHistory = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private LocalDateTime acceptedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime reopenedAt;

    public void addStatusHistory(String status, String updatedBy, String comments) {
        if (this.statusHistory == null) {
            this.statusHistory = new ArrayList<>();
        }
        this.statusHistory.add(StatusHistoryEntry.builder()
                .status(status)
                .timestamp(LocalDateTime.now())
                .updatedBy(updatedBy)
                .comments(comments)
                .build());
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusHistoryEntry {
        private String status;
        private LocalDateTime timestamp;
        private String updatedBy;
        private String comments;

        public String getActor() {
            return updatedBy;
        }

        public void setActor(String actor) {
            this.updatedBy = actor;
        }

        public String getComment() {
            return comments;
        }

        public void setComment(String comment) {
            this.comments = comment;
        }
    }

    public enum Status {
        SUBMITTED,
        UNASSIGNED,
        ASSIGNED,
        ACCEPTED,
        IN_PROGRESS,
        COMPLETED,
        REJECTED,
        REOPENED,
        CANCELLED;

        public static boolean isValid(String val) {
            if (val == null) return false;
            for (Status s : values()) {
                if (s.name().equalsIgnoreCase(val.trim())) return true;
            }
            return false;
        }
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        EMERGENCY;

        public static boolean isValid(String val) {
            if (val == null) return false;
            for (Priority p : values()) {
                if (p.name().equalsIgnoreCase(val.trim())) return true;
            }
            return false;
        }
    }

    public enum LocationType {
        ACADEMIC_BLOCK("Academic Block"),
        HOSTEL("Hostel"),
        ADMINISTRATION("Administration"),
        LABORATORY("Laboratory"),
        OUTDOOR("Outdoor / Campus Grounds"),
        AUDITORIUM_SEMINAR("Auditorium / Seminar Hall"),
        OTHER("Other");

        private final String displayName;

        LocationType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum IssueCategory {
        POWER_OUTAGE("Power Outage"),
        WIRING_SWITCHBOARD("Wiring / Switchboard"),
        LIGHTING("Lighting"),
        FAN_APPLIANCE("Fan / Appliance"),
        SHORT_CIRCUIT("Short Circuit / Sparking"),
        AC_HEAVY_EQUIPMENT("AC / Heavy Equipment"),
        UPS_INVERTER("UPS / Inverter"),
        OTHER("Other");

        private final String displayName;

        IssueCategory(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}

