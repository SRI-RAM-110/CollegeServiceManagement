package com.nec.collegeservices.dto.electrical;

import com.nec.collegeservices.model.ElectricalIssueRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ElectricalIssueResponseDTO {
    private String id;
    private String requestId;
    private String locationType;
    private String buildingName;
    private String floor;
    private String roomNumber;
    private String specificLocation;
    private String issueCategory;
    private String priority;
    private String description;
    private String photoUrl;

    private String reportedByUserId;
    private String reportedByName;
    private String reportedByDepartment;
    private String reportedByPhone;

    private String assignedElectricianId;
    private String assignedElectricianName;
    private String assignedElectricianPhone;

    private String status;
    private String rejectionReason;
    private String workRemarks;
    private String resolutionRemarks;
    private String reopenReason;

    private String cancellationReason;
    private String cancelledBy;
    private LocalDateTime cancelledAt;
    private String overrideReason;
    private String overrideBy;

    private List<ElectricalIssueRequest.StatusHistoryEntry> statusHistory;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime reopenedAt;

    public static ElectricalIssueResponseDTO fromEntity(ElectricalIssueRequest req) {
        if (req == null) return null;
        return ElectricalIssueResponseDTO.builder()
                .id(req.getId())
                .requestId(req.getRequestId())
                .locationType(req.getLocationType())
                .buildingName(req.getBuildingName())
                .floor(req.getFloor())
                .roomNumber(req.getRoomNumber())
                .specificLocation(req.getSpecificLocation())
                .issueCategory(req.getIssueCategory())
                .priority(req.getPriority())
                .description(req.getDescription())
                .photoUrl(req.getPhotoUrl())
                .reportedByUserId(req.getReportedByUserId())
                .reportedByName(req.getReportedByName())
                .reportedByDepartment(req.getReportedByDepartment())
                .reportedByPhone(req.getReportedByPhone())
                .assignedElectricianId(req.getAssignedElectricianId())
                .assignedElectricianName(req.getAssignedElectricianName())
                .assignedElectricianPhone(req.getAssignedElectricianPhone())
                .status(req.getStatus())
                .rejectionReason(req.getRejectionReason())
                .workRemarks(req.getWorkRemarks())
                .resolutionRemarks(req.getResolutionRemarks())
                .reopenReason(req.getReopenReason())
                .cancellationReason(req.getCancellationReason())
                .cancelledBy(req.getCancelledBy())
                .cancelledAt(req.getCancelledAt())
                .overrideReason(req.getOverrideReason())
                .overrideBy(req.getOverrideBy())
                .statusHistory(req.getStatusHistory())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .acceptedAt(req.getAcceptedAt())
                .startedAt(req.getStartedAt())
                .completedAt(req.getCompletedAt())
                .reopenedAt(req.getReopenedAt())
                .build();
    }
}

