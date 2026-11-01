package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.electrical.*;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.ElectricalIssueService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/electrical-issues")
public class ElectricalIssueController {

    @Autowired
    private ElectricalIssueService electricalIssueService;

    @Autowired
    private AuthService authService;

    /**
     * Submit a new campus electrical issue.
     * Permission: SEMINAR_TECHNICIAN, AO_ADMIN
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('SEMINAR_TECHNICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> createRequest(
            @Valid @RequestBody CreateElectricalIssueDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.createRequest(dto, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Electrical issue request submitted successfully", response));
    }

    /**
     * View own submitted electrical issue requests.
     * Permission: SEMINAR_TECHNICIAN, AO_ADMIN
     */
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('SEMINAR_TECHNICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<List<ElectricalIssueResponseDTO>>> getMyRequests() {
        User user = authService.getCurrentUser();
        List<ElectricalIssueResponseDTO> list = electricalIssueService.getMyRequests(user);
        return ResponseEntity.ok(ApiResponse.ok("My reported electrical issues", list));
    }

    /**
     * View requests assigned to the authenticated electrician.
     * Permission: ELECTRICIAN (or AO_ADMIN)
     */
    @GetMapping("/assigned")
    @PreAuthorize("hasAnyRole('ELECTRICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<List<ElectricalIssueResponseDTO>>> getAssignedRequests(
            @RequestParam(required = false) String status) {
        User user = authService.getCurrentUser();
        List<ElectricalIssueResponseDTO> list = electricalIssueService.getAssignedRequests(status, user);
        return ResponseEntity.ok(ApiResponse.ok("Assigned electrical issues", list));
    }

    /**
     * Campus-wide view of all electrical requests with multi-attribute filtering.
     * Permission: AO_ADMIN only
     */
    @GetMapping("/all")
    @PreAuthorize("hasRole('AO_ADMIN')")
    public ResponseEntity<ApiResponse<List<ElectricalIssueResponseDTO>>> getAllRequests(
            @RequestParam(required = false) String building,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority) {
        User user = authService.getCurrentUser();
        List<ElectricalIssueResponseDTO> list = electricalIssueService.getAllRequests(building, status, priority, user);
        return ResponseEntity.ok(ApiResponse.ok("All campus electrical issue requests", list));
    }

    /**
     * View request details by ID or Request ID.
     * Permission: Authorized request reporter, assigned electrician, or AO_ADMIN
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SEMINAR_TECHNICIAN', 'ELECTRICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> getRequestById(
            @PathVariable String id) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.getRequestById(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrical issue details", response));
    }

    /**
     * Acknowledge and accept request.
     * Permission: Assigned ELECTRICIAN or AO_ADMIN
     */
    @PutMapping("/{id}/accept")
    @PreAuthorize("hasAnyRole('ELECTRICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> acceptRequest(
            @PathVariable String id) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.acceptRequest(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrical issue request accepted", response));
    }

    /**
     * Start on-site repair work.
     * Permission: Assigned ELECTRICIAN or AO_ADMIN
     */
    @PutMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ELECTRICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> startRepair(
            @PathVariable String id) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.startRepair(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrical repair work commenced", response));
    }

    /**
     * Update interim repair progress remarks.
     * Permission: Assigned ELECTRICIAN or AO_ADMIN
     */
    @PutMapping("/{id}/remarks")
    @PreAuthorize("hasAnyRole('ELECTRICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> updateRemarks(
            @PathVariable String id,
            @Valid @RequestBody UpdateRemarksDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.updateRemarks(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Work remarks updated successfully", response));
    }

    /**
     * Complete request with resolution details.
     * Permission: Assigned ELECTRICIAN or AO_ADMIN
     */
    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ELECTRICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> completeRequest(
            @PathVariable String id,
            @Valid @RequestBody CompleteIssueDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.completeRequest(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrical issue completed successfully", response));
    }

    /**
     * Reject request with reason.
     * Permission: Assigned ELECTRICIAN or AO_ADMIN
     */
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ELECTRICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> rejectRequest(
            @PathVariable String id,
            @Valid @RequestBody RejectIssueDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.rejectRequest(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrical issue rejected", response));
    }

    /**
     * Reopen an eligible completed request.
     * Permission: Reporting technician or AO_ADMIN
     */
    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAnyRole('SEMINAR_TECHNICIAN', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> reopenRequest(
            @PathVariable String id,
            @Valid @RequestBody ReopenIssueDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.reopenRequest(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrical issue reopened", response));
    }

    /**
     * Assign or reassign ticket to an active electrician.
     * Permission: AO_ADMIN only
     */
    @PutMapping("/{id}/reassign")
    @PreAuthorize("hasRole('AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> reassignElectrician(
            @PathVariable String id,
            @Valid @RequestBody ReassignElectricianDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.reassignElectrician(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrician reassigned successfully", response));
    }

    /**
     * Administrative status override for exceptional dispute handling.
     * Permission: AO_ADMIN only
     */
    @PutMapping("/{id}/override-status")
    @PreAuthorize("hasRole('AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> overrideStatus(
            @PathVariable String id,
            @Valid @RequestBody OverrideStatusDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.overrideStatus(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Status overridden administratively", response));
    }

    /**
     * Cancel an active electrical issue request.
     * Permission: AO_ADMIN only
     */
    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('AO_ADMIN')")
    public ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> cancelRequest(
            @PathVariable String id,
            @Valid @RequestBody CancelIssueDTO dto) {
        User user = authService.getCurrentUser();
        ElectricalIssueResponseDTO response = electricalIssueService.cancelRequest(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Electrical issue request cancelled", response));
    }
}

