package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.electrical.*;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.ElectricalIssueRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.ElectricalIssueRequestRepository;
import com.nec.collegeservices.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ElectricalIssueService {

    @Autowired
    private ElectricalIssueRequestRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RequestIdService requestIdService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AuthService authService;

    private static final String SERVICE_NAME = "Electrical Service";

    /**
     * Create a new campus electrical issue request.
     * Allowed Roles: SEMINAR_TECHNICIAN, AO_ADMIN
     */
    public ElectricalIssueResponseDTO createRequest(CreateElectricalIssueDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        validateCreatorRole(currentUser);
        validateCreatePayload(dto);

        // Department prefix resolution: Department of technician, or AO if AO Admin
        String deptPrefix = currentUser.getDepartment();
        if (currentUser.hasRole("AO_ADMIN") || "AO_ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            deptPrefix = "AO";
        }
        String requestId = requestIdService.generateRequestId("ELEC", currentUser, deptPrefix);

        if (repository.existsByRequestId(requestId)) {
            throw new ConflictException("Generated request ID already exists: " + requestId);
        }

        LocalDateTime now = LocalDateTime.now();

        ElectricalIssueRequest request = ElectricalIssueRequest.builder()
                .requestId(requestId)
                .locationType(dto.getLocationType().trim())
                .buildingName(dto.getBuildingName().trim())
                .floor(dto.getFloor().trim())
                .roomNumber(dto.getRoomNumber() != null ? dto.getRoomNumber().trim() : "")
                .specificLocation(dto.getSpecificLocation().trim())
                .issueCategory(dto.getIssueCategory().trim())
                .priority(dto.getPriority().trim().toUpperCase())
                .description(dto.getDescription().trim())
                .photoUrl(dto.getPhotoUrl() != null ? dto.getPhotoUrl().trim() : null)
                // Enforce authenticated context - never trust client payload for reporter
                .reportedByUserId(currentUser.getUserId())
                .reportedByName(currentUser.getName())
                .reportedByDepartment(currentUser.getDepartment())
                .reportedByPhone(currentUser.getPhone())
                .createdAt(now)
                .updatedAt(now)
                .statusHistory(new ArrayList<>())
                .build();

        // Initial SUBMITTED history entry
        request.addStatusHistory(
                ElectricalIssueRequest.Status.SUBMITTED.name(),
                currentUser.getUserId(),
                "Electrical issue ticket submitted at " + request.getBuildingName() + " (" + request.getSpecificLocation() + ")"
        );

        // Auto-assignment check for active Electrician
        List<User> activeElectricians = getActiveElectricians();

        if (activeElectricians.size() == 1) {
            User electrician = activeElectricians.get(0);
            request.setAssignedElectricianId(electrician.getUserId());
            request.setAssignedElectricianName(electrician.getName());
            request.setAssignedElectricianPhone(electrician.getPhone());
            request.setStatus(ElectricalIssueRequest.Status.ASSIGNED.name());
            request.addStatusHistory(
                    ElectricalIssueRequest.Status.ASSIGNED.name(),
                    "SYSTEM",
                    "Automatically assigned to active campus electrician " + electrician.getName()
            );
        } else if (activeElectricians.isEmpty()) {
            request.setStatus(ElectricalIssueRequest.Status.UNASSIGNED.name());
            request.addStatusHistory(
                    ElectricalIssueRequest.Status.UNASSIGNED.name(),
                    "SYSTEM",
                    "No active campus electrician found. Ticket queued for administrator assignment."
            );
        } else {
            // Multiple active electricians detected: do not pick arbitrarily
            request.setStatus(ElectricalIssueRequest.Status.UNASSIGNED.name());
            request.addStatusHistory(
                    ElectricalIssueRequest.Status.UNASSIGNED.name(),
                    "SYSTEM",
                    "Multiple active campus electricians detected (" + activeElectricians.size() + "). Ticket queued for administrator assignment."
            );
        }

        ElectricalIssueRequest saved = repository.save(request);
        log.info("Electrical issue request created: {} with status {}", saved.getRequestId(), saved.getStatus());

        // Dispatch notifications asynchronously with isolated failure protection
        try {
            if (ElectricalIssueRequest.Status.ASSIGNED.name().equals(saved.getStatus()) && saved.getAssignedElectricianId() != null) {
                notificationService.sendNotification(
                        "ELECTRICIAN",
                        null,
                        saved.getAssignedElectricianId(),
                        "New Electrical Issue Assigned (" + saved.getPriority() + ")",
                        "New issue " + saved.getRequestId() + " assigned at " + saved.getBuildingName() + " (" + saved.getSpecificLocation() + "): " + saved.getIssueCategory(),
                        SERVICE_NAME,
                        "ASSIGNMENT",
                        saved.getRequestId()
                );
            } else if (ElectricalIssueRequest.Status.UNASSIGNED.name().equals(saved.getStatus())) {
                notificationService.sendNotification(
                        "AO_ADMIN",
                        "ADMIN",
                        null,
                        "Unassigned Electrical Issue (" + saved.getPriority() + ")",
                        "Issue " + saved.getRequestId() + " at " + saved.getBuildingName() + " requires manual electrician assignment.",
                        SERVICE_NAME,
                        "ALERT",
                        saved.getRequestId()
                );
            }
        } catch (Exception e) {
            log.error("Notification dispatch failed for created request {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Technician request history:
     * - SEMINAR_TECHNICIAN views only their own reports.
     * - AO_ADMIN views all reports.
     */
    public List<ElectricalIssueResponseDTO> getMyRequests(User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        if (currentUser.hasRole("AO_ADMIN")) {
            return repository.findAllByOrderByCreatedAtDesc().stream()
                    .map(ElectricalIssueResponseDTO::fromEntity)
                    .collect(Collectors.toList());
        }
        if (currentUser.hasRole("SEMINAR_TECHNICIAN")) {
            return repository.findByReportedByUserIdOrderByCreatedAtDesc(currentUser.getUserId()).stream()
                    .map(ElectricalIssueResponseDTO::fromEntity)
                    .collect(Collectors.toList());
        }
        throw new AccessDeniedException("Access denied: You do not have permission to view reported electrical issues.");
    }

    /**
     * Electrician request queue:
     * - ELECTRICIAN views only requests assigned to their authenticated userId.
     */
    public List<ElectricalIssueResponseDTO> getAssignedRequests(String statusFilter, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        if (!currentUser.hasRole("ELECTRICIAN") && !currentUser.hasRole("AO_ADMIN")) {
            throw new AccessDeniedException("Access denied: Only electricians can access assigned work items.");
        }

        List<ElectricalIssueRequest> list;
        if (currentUser.hasRole("AO_ADMIN") && !currentUser.hasRole("ELECTRICIAN")) {
            // AO Admin inspecting assigned queue can view all or filtered
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter.trim())) {
                list = repository.findByStatusOrderByCreatedAtDesc(statusFilter.trim().toUpperCase());
            } else {
                list = repository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            // Electrician strictly restricted to own assigned requests
            list = repository.findByAssignedElectricianIdOrderByCreatedAtDesc(currentUser.getUserId());
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter.trim())) {
                String target = statusFilter.trim().toUpperCase();
                list = list.stream().filter(r -> target.equalsIgnoreCase(r.getStatus())).collect(Collectors.toList());
            }
        }

        return list.stream()
                .map(ElectricalIssueResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Campus-wide view for AO_ADMIN with comprehensive multi-criteria filters.
     */
    public List<ElectricalIssueResponseDTO> getAllRequests(String building, String status, String priority, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        if (!currentUser.hasRole("AO_ADMIN")) {
            throw new AccessDeniedException("Access denied: Campus-wide electrical issue management is restricted to AO_ADMIN.");
        }

        List<ElectricalIssueRequest> list = repository.findAllByOrderByCreatedAtDesc();

        if (building != null && !building.isBlank() && !"ALL".equalsIgnoreCase(building.trim())) {
            String b = building.trim();
            list = list.stream().filter(r -> r.getBuildingName() != null && r.getBuildingName().equalsIgnoreCase(b)).collect(Collectors.toList());
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
            String s = status.trim();
            list = list.stream().filter(r -> r.getStatus() != null && r.getStatus().equalsIgnoreCase(s)).collect(Collectors.toList());
        }
        if (priority != null && !priority.isBlank() && !"ALL".equalsIgnoreCase(priority.trim())) {
            String p = priority.trim();
            list = list.stream().filter(r -> r.getPriority() != null && r.getPriority().equalsIgnoreCase(p)).collect(Collectors.toList());
        }

        return list.stream()
                .map(ElectricalIssueResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get single request details by ID or Request ID with strict role isolation.
     */
    public ElectricalIssueResponseDTO getRequestById(String idOrRequestId, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);

        // Security isolation check
        boolean isAO = currentUser.hasRole("AO_ADMIN");
        boolean isOwner = currentUser.getUserId().equals(req.getReportedByUserId());
        boolean isAssignedElectrician = req.getAssignedElectricianId() != null && req.getAssignedElectricianId().equals(currentUser.getUserId());

        if (!isAO && !isOwner && !isAssignedElectrician) {
            throw new AccessDeniedException("Access denied: You do not have permission to view this electrical issue request.");
        }

        return ElectricalIssueResponseDTO.fromEntity(req);
    }

    /**
     * Accept request: ASSIGNED -> ACCEPTED
     */
    public synchronized ElectricalIssueResponseDTO acceptRequest(String idOrRequestId, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);
        validateElectricianOrAdmin(req, currentUser);

        String currentStatus = req.getStatus();
        if (!ElectricalIssueRequest.Status.ASSIGNED.name().equalsIgnoreCase(currentStatus) &&
            !ElectricalIssueRequest.Status.REOPENED.name().equalsIgnoreCase(currentStatus)) {
            throw new BadRequestException("Cannot accept request in status '" + currentStatus + "'. Request must be in ASSIGNED or REOPENED status.");
        }

        LocalDateTime now = LocalDateTime.now();
        req.setStatus(ElectricalIssueRequest.Status.ACCEPTED.name());
        req.setAcceptedAt(now);
        req.setUpdatedAt(now);
        req.addStatusHistory(
                ElectricalIssueRequest.Status.ACCEPTED.name(),
                currentUser.getUserId(),
                "Electrician " + currentUser.getName() + " acknowledged and accepted the issue ticket"
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.info("Electrical issue {} accepted by {}", saved.getRequestId(), currentUser.getUserId());

        try {
            notificationService.sendNotification(
                    "SEMINAR_TECHNICIAN",
                    saved.getReportedByDepartment(),
                    saved.getReportedByUserId(),
                    "Electrical Issue Accepted",
                    "Your reported issue " + saved.getRequestId() + " has been accepted by electrician " + currentUser.getName(),
                    SERVICE_NAME,
                    "STATUS_UPDATE",
                    saved.getRequestId()
            );
        } catch (Exception e) {
            log.error("Notification failed for accepted issue {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Start repair: ACCEPTED -> IN_PROGRESS
     */
    public synchronized ElectricalIssueResponseDTO startRepair(String idOrRequestId, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);
        validateElectricianOrAdmin(req, currentUser);

        if (!ElectricalIssueRequest.Status.ACCEPTED.name().equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Cannot start repair on request in status '" + req.getStatus() + "'. Request must be in ACCEPTED status.");
        }

        LocalDateTime now = LocalDateTime.now();
        req.setStatus(ElectricalIssueRequest.Status.IN_PROGRESS.name());
        req.setStartedAt(now);
        req.setUpdatedAt(now);
        req.addStatusHistory(
                ElectricalIssueRequest.Status.IN_PROGRESS.name(),
                currentUser.getUserId(),
                "Electrician " + currentUser.getName() + " commenced on-site repair work"
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.info("Electrical issue {} work started by {}", saved.getRequestId(), currentUser.getUserId());

        try {
            notificationService.sendNotification(
                    "SEMINAR_TECHNICIAN",
                    saved.getReportedByDepartment(),
                    saved.getReportedByUserId(),
                    "Repair Work In Progress",
                    "On-site repair work has commenced for electrical issue " + saved.getRequestId(),
                    SERVICE_NAME,
                    "STATUS_UPDATE",
                    saved.getRequestId()
            );
        } catch (Exception e) {
            log.error("Notification failed for started repair {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Update progress remarks during repair.
     */
    public synchronized ElectricalIssueResponseDTO updateRemarks(String idOrRequestId, UpdateRemarksDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);
        validateElectricianOrAdmin(req, currentUser);

        if (dto == null || dto.getRemarks() == null || dto.getRemarks().trim().isBlank()) {
            throw new BadRequestException("Work remarks cannot be empty.");
        }

        LocalDateTime now = LocalDateTime.now();
        String remarks = dto.getRemarks().trim();
        req.setWorkRemarks(remarks);
        req.setUpdatedAt(now);
        req.addStatusHistory(
                req.getStatus(),
                currentUser.getUserId(),
                "Progress Remarks: " + remarks
        );

        ElectricalIssueRequest saved = repository.save(req);
        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Complete request: IN_PROGRESS -> COMPLETED
     */
    public synchronized ElectricalIssueResponseDTO completeRequest(String idOrRequestId, CompleteIssueDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);
        validateElectricianOrAdmin(req, currentUser);

        if (!ElectricalIssueRequest.Status.IN_PROGRESS.name().equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Cannot complete request in status '" + req.getStatus() + "'. Request must be in IN_PROGRESS status.");
        }
        if (dto == null || dto.getResolutionRemarks() == null || dto.getResolutionRemarks().trim().isBlank()) {
            throw new BadRequestException("Resolution remarks are mandatory to complete the repair.");
        }

        LocalDateTime now = LocalDateTime.now();
        String remarks = dto.getResolutionRemarks().trim();
        req.setStatus(ElectricalIssueRequest.Status.COMPLETED.name());
        req.setResolutionRemarks(remarks);
        req.setCompletedAt(now);
        req.setUpdatedAt(now);
        req.addStatusHistory(
                ElectricalIssueRequest.Status.COMPLETED.name(),
                currentUser.getUserId(),
                "Repair completed: " + remarks
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.info("Electrical issue {} marked COMPLETED by {}", saved.getRequestId(), currentUser.getUserId());

        try {
            // Notify reporting technician
            notificationService.sendNotification(
                    "SEMINAR_TECHNICIAN",
                    saved.getReportedByDepartment(),
                    saved.getReportedByUserId(),
                    "Electrical Issue Resolved",
                    "Issue " + saved.getRequestId() + " has been resolved. Remarks: " + remarks,
                    SERVICE_NAME,
                    "RESOLUTION",
                    saved.getRequestId()
            );

            // Notify AO Admin
            notificationService.sendNotification(
                    "AO_ADMIN",
                    "ADMIN",
                    null,
                    "Electrical Issue Completed",
                    "Issue " + saved.getRequestId() + " at " + saved.getBuildingName() + " resolved by " + currentUser.getName(),
                    SERVICE_NAME,
                    "INFO",
                    saved.getRequestId()
            );
        } catch (Exception e) {
            log.error("Notification failed for completed issue {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Reject request: ASSIGNED / ACCEPTED / SUBMITTED -> REJECTED
     */
    public synchronized ElectricalIssueResponseDTO rejectRequest(String idOrRequestId, RejectIssueDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);
        validateElectricianOrAdmin(req, currentUser);

        if (ElectricalIssueRequest.Status.COMPLETED.name().equalsIgnoreCase(req.getStatus()) ||
            ElectricalIssueRequest.Status.CANCELLED.name().equalsIgnoreCase(req.getStatus()) ||
            ElectricalIssueRequest.Status.REJECTED.name().equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Cannot reject request already in '" + req.getStatus() + "' status.");
        }
        if (dto == null || dto.getRejectionReason() == null || dto.getRejectionReason().trim().isBlank()) {
            throw new BadRequestException("A valid rejection reason is mandatory.");
        }

        LocalDateTime now = LocalDateTime.now();
        String reason = dto.getRejectionReason().trim();
        req.setStatus(ElectricalIssueRequest.Status.REJECTED.name());
        req.setRejectionReason(reason);
        req.setUpdatedAt(now);
        req.addStatusHistory(
                ElectricalIssueRequest.Status.REJECTED.name(),
                currentUser.getUserId(),
                "Ticket rejected: " + reason
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.info("Electrical issue {} rejected by {}", saved.getRequestId(), currentUser.getUserId());

        try {
            notificationService.sendNotification(
                    "SEMINAR_TECHNICIAN",
                    saved.getReportedByDepartment(),
                    saved.getReportedByUserId(),
                    "Electrical Issue Rejected",
                    "Issue " + saved.getRequestId() + " was rejected. Reason: " + reason,
                    SERVICE_NAME,
                    "STATUS_UPDATE",
                    saved.getRequestId()
            );
        } catch (Exception e) {
            log.error("Notification failed for rejected issue {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Reopen request: COMPLETED -> REOPENED
     */
    public synchronized ElectricalIssueResponseDTO reopenRequest(String idOrRequestId, ReopenIssueDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);

        boolean isAO = currentUser.hasRole("AO_ADMIN");
        boolean isOwner = currentUser.getUserId().equals(req.getReportedByUserId());

        if (!isAO && !isOwner) {
            throw new AccessDeniedException("Access denied: Only the reporting technician or AO_ADMIN can reopen a completed request.");
        }
        if (!ElectricalIssueRequest.Status.COMPLETED.name().equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Only COMPLETED requests can be reopened. Current status: " + req.getStatus());
        }
        if (dto == null || dto.getReopenReason() == null || dto.getReopenReason().trim().isBlank()) {
            throw new BadRequestException("Reopen reason is mandatory.");
        }

        LocalDateTime now = LocalDateTime.now();
        String reason = dto.getReopenReason().trim();
        req.setStatus(ElectricalIssueRequest.Status.REOPENED.name());
        req.setReopenReason(reason);
        req.setReopenedAt(now);
        req.setUpdatedAt(now);
        req.addStatusHistory(
                ElectricalIssueRequest.Status.REOPENED.name(),
                currentUser.getUserId(),
                "Issue reopened by " + currentUser.getName() + ". Reason: " + reason
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.info("Electrical issue {} reopened by {}", saved.getRequestId(), currentUser.getUserId());

        try {
            if (saved.getAssignedElectricianId() != null) {
                notificationService.sendNotification(
                        "ELECTRICIAN",
                        null,
                        saved.getAssignedElectricianId(),
                        "Electrical Issue Reopened",
                        "Issue " + saved.getRequestId() + " has been reopened. Reason: " + reason,
                        SERVICE_NAME,
                        "ALERT",
                        saved.getRequestId()
                );
            }
        } catch (Exception e) {
            log.error("Notification failed for reopened issue {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Reassign Electrician (AO_ADMIN only).
     */
    public synchronized ElectricalIssueResponseDTO reassignElectrician(String idOrRequestId, ReassignElectricianDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        if (!currentUser.hasRole("AO_ADMIN")) {
            throw new AccessDeniedException("Access denied: Only AO_ADMIN can reassign electrician tickets.");
        }
        if (dto == null || dto.getElectricianUserId() == null || dto.getElectricianUserId().trim().isBlank()) {
            throw new BadRequestException("Electrician user ID is required for reassignment.");
        }

        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);

        if (ElectricalIssueRequest.Status.COMPLETED.name().equalsIgnoreCase(req.getStatus()) ||
            ElectricalIssueRequest.Status.CANCELLED.name().equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Cannot reassign a " + req.getStatus() + " request.");
        }

        // Validate target electrician exists and has ELECTRICIAN role
        String targetUserId = dto.getElectricianUserId().trim();
        User targetElectrician = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target electrician user not found: " + targetUserId));

        if (!Boolean.TRUE.equals(targetElectrician.getActive()) || !targetElectrician.hasRole("ELECTRICIAN")) {
            throw new BadRequestException("Selected user '" + targetUserId + "' is not an active electrician.");
        }

        LocalDateTime now = LocalDateTime.now();
        String prevAssignee = req.getAssignedElectricianName() != null ? req.getAssignedElectricianName() : "None";
        req.setAssignedElectricianId(targetElectrician.getUserId());
        req.setAssignedElectricianName(targetElectrician.getName());
        req.setAssignedElectricianPhone(targetElectrician.getPhone());

        // If ticket was UNASSIGNED or SUBMITTED, transition to ASSIGNED
        if (ElectricalIssueRequest.Status.UNASSIGNED.name().equalsIgnoreCase(req.getStatus()) ||
            ElectricalIssueRequest.Status.SUBMITTED.name().equalsIgnoreCase(req.getStatus())) {
            req.setStatus(ElectricalIssueRequest.Status.ASSIGNED.name());
        }

        req.setUpdatedAt(now);
        String note = (dto.getRemarks() != null && !dto.getRemarks().isBlank()) ? " Note: " + dto.getRemarks().trim() : "";
        req.addStatusHistory(
                req.getStatus(),
                currentUser.getUserId(),
                "Reassigned from " + prevAssignee + " to " + targetElectrician.getName() + " by AO Admin." + note
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.info("Electrical issue {} reassigned to {}", saved.getRequestId(), targetElectrician.getUserId());

        try {
            // Notify newly assigned electrician
            notificationService.sendNotification(
                    "ELECTRICIAN",
                    null,
                    targetElectrician.getUserId(),
                    "Electrical Issue Assigned (" + saved.getPriority() + ")",
                    "Issue " + saved.getRequestId() + " at " + saved.getBuildingName() + " has been assigned to you by AO Admin.",
                    SERVICE_NAME,
                    "ASSIGNMENT",
                    saved.getRequestId()
            );

            // Notify reporting technician
            notificationService.sendNotification(
                    "SEMINAR_TECHNICIAN",
                    saved.getReportedByDepartment(),
                    saved.getReportedByUserId(),
                    "Electrician Reassigned",
                    "Electrician for your reported issue " + saved.getRequestId() + " is now " + targetElectrician.getName(),
                    SERVICE_NAME,
                    "STATUS_UPDATE",
                    saved.getRequestId()
            );
        } catch (Exception e) {
            log.error("Notification failed for reassigned issue {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Override Status (AO_ADMIN exceptional override with mandatory reason).
     */
    public synchronized ElectricalIssueResponseDTO overrideStatus(String idOrRequestId, OverrideStatusDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        if (!currentUser.hasRole("AO_ADMIN")) {
            throw new AccessDeniedException("Access denied: Administrative status override is restricted to AO_ADMIN.");
        }
        if (dto == null || dto.getTargetStatus() == null || dto.getTargetStatus().trim().isBlank()) {
            throw new BadRequestException("Target status is required.");
        }
        if (dto.getReason() == null || dto.getReason().trim().isBlank()) {
            throw new BadRequestException("An audit reason is mandatory for administrative status override.");
        }

        String target = dto.getTargetStatus().trim().toUpperCase();
        if (!ElectricalIssueRequest.Status.isValid(target)) {
            throw new BadRequestException("Invalid target status: " + target);
        }

        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);
        LocalDateTime now = LocalDateTime.now();

        String prevStatus = req.getStatus();
        req.setStatus(target);
        req.setOverrideReason(dto.getReason().trim());
        req.setOverrideBy(currentUser.getUserId());
        req.setUpdatedAt(now);

        req.addStatusHistory(
                target,
                currentUser.getUserId(),
                "ADMINISTRATIVE OVERRIDE from " + prevStatus + " to " + target + ". Reason: " + dto.getReason().trim()
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.warn("Electrical issue {} status administratively overridden to {} by {}", saved.getRequestId(), target, currentUser.getUserId());

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    /**
     * Cancel request (AO_ADMIN only).
     */
    public synchronized ElectricalIssueResponseDTO cancelRequest(String idOrRequestId, CancelIssueDTO dto, User currentUser) {
        if (currentUser == null) {
            currentUser = authService.getCurrentUser();
        }
        if (!currentUser.hasRole("AO_ADMIN")) {
            throw new AccessDeniedException("Access denied: Only AO_ADMIN can cancel electrical issue requests.");
        }
        if (dto == null || dto.getCancellationReason() == null || dto.getCancellationReason().trim().isBlank()) {
            throw new BadRequestException("Cancellation reason is mandatory.");
        }

        ElectricalIssueRequest req = findByIdOrRequestId(idOrRequestId);

        if (ElectricalIssueRequest.Status.COMPLETED.name().equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Cannot cancel a completed request.");
        }
        if (ElectricalIssueRequest.Status.CANCELLED.name().equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Request is already cancelled.");
        }

        LocalDateTime now = LocalDateTime.now();
        String reason = dto.getCancellationReason().trim();
        req.setStatus(ElectricalIssueRequest.Status.CANCELLED.name());
        req.setCancellationReason(reason);
        req.setCancelledBy(currentUser.getUserId());
        req.setCancelledAt(now);
        req.setUpdatedAt(now);

        req.addStatusHistory(
                ElectricalIssueRequest.Status.CANCELLED.name(),
                currentUser.getUserId(),
                "Ticket cancelled by AO Admin. Reason: " + reason
        );

        ElectricalIssueRequest saved = repository.save(req);
        log.info("Electrical issue {} cancelled by {}", saved.getRequestId(), currentUser.getUserId());

        try {
            notificationService.sendNotification(
                    "SEMINAR_TECHNICIAN",
                    saved.getReportedByDepartment(),
                    saved.getReportedByUserId(),
                    "Electrical Issue Cancelled",
                    "Issue " + saved.getRequestId() + " was cancelled. Reason: " + reason,
                    SERVICE_NAME,
                    "STATUS_UPDATE",
                    saved.getRequestId()
            );
        } catch (Exception e) {
            log.error("Notification failed for cancelled issue {}: {}", saved.getRequestId(), e.getMessage());
        }

        return ElectricalIssueResponseDTO.fromEntity(saved);
    }

    // =========================================================================
    // HELPER & VALIDATION METHODS
    // =========================================================================

    public ElectricalIssueRequest findByIdOrRequestId(String idOrRequestId) {
        if (idOrRequestId == null || idOrRequestId.trim().isBlank()) {
            throw new BadRequestException("Request ID must not be blank.");
        }
        String clean = idOrRequestId.trim();
        return repository.findByRequestId(clean)
                .or(() -> repository.findById(clean))
                .orElseThrow(() -> new ResourceNotFoundException("Electrical issue request not found with ID: " + clean));
    }

    public List<User> getActiveElectricians() {
        return userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()) && u.hasRole("ELECTRICIAN"))
                .collect(Collectors.toList());
    }

    private void validateCreatorRole(User user) {
        if (!user.hasRole("SEMINAR_TECHNICIAN") && !user.hasRole("AO_ADMIN")) {
            throw new AccessDeniedException("Access denied: Only SEMINAR_TECHNICIAN and AO_ADMIN can submit electrical issues.");
        }
    }

    private void validateElectricianOrAdmin(ElectricalIssueRequest req, User user) {
        boolean isAO = user.hasRole("AO_ADMIN");
        boolean isAssignedElectrician = user.hasRole("ELECTRICIAN") &&
                req.getAssignedElectricianId() != null &&
                req.getAssignedElectricianId().equals(user.getUserId());

        if (!isAO && !isAssignedElectrician) {
            throw new AccessDeniedException("Access denied: Only the assigned electrician or AO_ADMIN can perform this action.");
        }
    }

    private void validateCreatePayload(CreateElectricalIssueDTO dto) {
        if (dto == null) {
            throw new BadRequestException("Request payload cannot be null.");
        }
        if (dto.getLocationType() == null || dto.getLocationType().trim().isBlank()) {
            throw new BadRequestException("Location type is required.");
        }
        if (dto.getBuildingName() == null || dto.getBuildingName().trim().isBlank()) {
            throw new BadRequestException("Building name is required.");
        }
        if (dto.getFloor() == null || dto.getFloor().trim().isBlank()) {
            throw new BadRequestException("Floor is required.");
        }
        if (dto.getSpecificLocation() == null || dto.getSpecificLocation().trim().isBlank()) {
            throw new BadRequestException("Specific location details are required.");
        }
        if (dto.getIssueCategory() == null || dto.getIssueCategory().trim().isBlank()) {
            throw new BadRequestException("Issue category is required.");
        }
        if (dto.getPriority() == null || !ElectricalIssueRequest.Priority.isValid(dto.getPriority())) {
            throw new BadRequestException("Invalid priority. Must be one of: LOW, MEDIUM, HIGH, EMERGENCY.");
        }
        if (dto.getDescription() == null || dto.getDescription().trim().length() < 10) {
            throw new BadRequestException("Description must be at least 10 characters long.");
        }
        if (dto.getDescription().trim().length() > 2000) {
            throw new BadRequestException("Description cannot exceed 2000 characters.");
        }
        if (dto.getPhotoUrl() != null && dto.getPhotoUrl().length() > 2000000) {
            throw new BadRequestException("Photo reference exceeds maximum permissible size.");
        }
    }
}

