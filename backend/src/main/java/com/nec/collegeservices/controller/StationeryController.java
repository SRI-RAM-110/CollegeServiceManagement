package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.RejectRequestDTO;
import com.nec.collegeservices.dto.StationeryRequestDTO;
import com.nec.collegeservices.model.StationeryItem;
import com.nec.collegeservices.model.StationeryRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.StationeryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stationery")
@CrossOrigin(origins = "*", maxAge = 3600)
public class StationeryController {

    @Autowired
    private StationeryService stationeryService;

    @Autowired
    private AuthService authService;

    @GetMapping("/items")
    public ResponseEntity<ApiResponse<List<StationeryItem>>> getAllItems() {
        return ResponseEntity.ok(ApiResponse.ok("Stationery items catalog", stationeryService.getAllItems()));
    }

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<StationeryRequest>> createRequest(@Valid @RequestBody StationeryRequestDTO dto) {
        User user = authService.getCurrentUser();
        StationeryRequest request = stationeryService.createRequest(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request submitted successfully", request));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<StationeryRequest>>> getRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        User user = authService.getCurrentUser();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("STATIONERY_ADMIN") || user.hasServicePermission("STATIONERY_ADMIN"));
        if (!isStaffOrAdmin && user != null) {
            department = user.getDepartment();
        }
        List<StationeryRequest> list = stationeryService.getAllRequests(status, department, fromDate, toDate, user);
        return ResponseEntity.ok(ApiResponse.ok("Stationery requests list", list));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<StationeryRequest>> getRequestById(@PathVariable String id) {
        User user = authService.getCurrentUser();
        StationeryRequest request = stationeryService.getRequestById(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request details", request));
    }

    @PutMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN')")
    public ResponseEntity<ApiResponse<StationeryRequest>> approveRequest(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String comments = body != null ? body.get("comments") : null;
        StationeryRequest approved = stationeryService.approveRequest(id, comments);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request approved successfully", approved));
    }

    @PutMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN')")
    public ResponseEntity<ApiResponse<StationeryRequest>> rejectRequest(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        StationeryRequest rejected = stationeryService.rejectRequest(id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request rejected", rejected));
    }

    @PutMapping("/requests/{id}/review")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN')")
    public ResponseEntity<ApiResponse<StationeryRequest>> markUnderReview(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String comments = body != null ? body.get("comments") : null;
        StationeryRequest req = stationeryService.markUnderReview(id, comments);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request marked as under review", req));
    }

    @PutMapping("/requests/{id}/ready")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN')")
    public ResponseEntity<ApiResponse<StationeryRequest>> markReadyForCollection(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String comments = body != null ? body.get("comments") : null;
        StationeryRequest req = stationeryService.markReadyForCollection(id, comments);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request marked ready for collection", req));
    }

    @PutMapping("/requests/{id}/collect")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN')")
    public ResponseEntity<ApiResponse<StationeryRequest>> markCollected(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String comments = body != null ? body.get("comments") : null;
        StationeryRequest req = stationeryService.markCollected(id, comments);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request marked as collected", req));
    }

    @RequestMapping(value = "/requests/{id}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN')")
    public ResponseEntity<ApiResponse<StationeryRequest>> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body != null ? body.get("status") : null;
        String comments = body != null ? (body.get("comments") != null ? body.get("comments") : body.get("reason")) : null;
        StationeryRequest updated = stationeryService.updateRequestStatus(id, status, comments);
        return ResponseEntity.ok(ApiResponse.ok("Stationery request status updated to " + updated.getStatus(), updated));
    }
}
