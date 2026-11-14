package com.nec.collegeservices.dto;

import com.nec.collegeservices.model.SeminarEventInspection;
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
public class SeminarInspectionSubmitDTO {

    @Builder.Default
    private List<SeminarEventInspection.InspectionItem> items = new ArrayList<>();

    private String overallNotes;

    private String maintenanceRequestId;

    private String maintenanceNotes;

    // For post-event inspection
    private Boolean eventConducted;

    private Boolean damageIdentified;

    private String technicianFinalRemarks;
}

