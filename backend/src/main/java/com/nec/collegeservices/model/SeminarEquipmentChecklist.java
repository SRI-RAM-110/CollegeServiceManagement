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
@Document(collection = "seminar_equipment_checklists")
@CompoundIndexes({
    @CompoundIndex(name = "booking_occurrence_idx", def = "{'bookingId': 1, 'occurrenceDate': 1}", unique = true)
})
public class SeminarEquipmentChecklist {
    @Id
    private String id;

    @Indexed
    private String bookingId;

    private String occurrenceDate; // YYYY-MM-DD
    private Integer occurrenceIndex;

    @Indexed
    private String hallId;
    private String hallName;
    private String eventTitle;
    private String slot;
    private String department;

    private String technicianUserId;
    private String technicianName;

    // Status: PENDING, IN_PROGRESS, VERIFIED, ISSUES_REPORTED
    @Builder.Default
    private String checklistStatus = "PENDING";

    @Builder.Default
    private List<ChecklistItem> items = new ArrayList<>();

    // Organizer's original requested requirements from booking
    private String requestedArrangements;

    // Technician's verification notes regarding organizer's arrangements
    private String requestedArrangementsNotes;

    // General remarks or issue notes
    private String generalRemarks;

    private LocalDateTime inspectedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChecklistItem {
        private String key;        // e.g. "AUDIO_MICS", "PROJECTOR_DISPLAY", "AC_SYSTEM", etc.
        private String itemName;   // e.g. "Microphones (Collar & Handheld)"
        private String category;   // e.g. "Audio", "Display", "Facility", "Power", "Network"
        @Builder.Default
        private String status = "PENDING"; // "OK", "FAULTY", "NOT_REQUIRED", "PENDING"
        private String notes;
    }
}
