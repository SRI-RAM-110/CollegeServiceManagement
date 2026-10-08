package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.RejectRequestDTO;
import com.nec.collegeservices.dto.TransportBulkAvailabilityRequestDTO;
import com.nec.collegeservices.dto.TransportRequestDTO;
import com.nec.collegeservices.model.TransportRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.model.Vehicle;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.TransportService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.nec.collegeservices.service.UnifiedRequestService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transport")
@CrossOrigin(origins = "*", maxAge = 3600)
public class TransportController {

    @Autowired
    private TransportService transportService;

    @Autowired
    private AuthService authService;

    @GetMapping("/vehicles")
    public ResponseEntity<ApiResponse<List<Vehicle>>> getAllVehicles(
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(ApiResponse.ok("Vehicles fleet", transportService.getVehiclesWithDateAvailability(date)));
    }

    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<List<TransportRequest>>> getTripsForDate(
            @RequestParam(required = false) String date) {
        User user = authService.getCurrentUser();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("TRANSPORT_ADMIN") || user.hasServicePermission("TRANSPORT_ADMIN"));
        List<TransportRequest> list = transportService.getTripsForDate(date);
        if (!isStaffOrAdmin && user != null) {
            list = list.stream().filter(r -> UnifiedRequestService.isRequestedByUser(r.getRequestedBy(), user)).toList();
        }
        return ResponseEntity.ok(ApiResponse.ok("Transport trips for date", list));
    }

    @PostMapping("/vehicles/add")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'TRANSPORT_ADMIN')")
    public ResponseEntity<ApiResponse<Vehicle>> addVehicle(@RequestBody Vehicle vehicle) {
        Vehicle saved = transportService.addVehicle(vehicle);
        return ResponseEntity.ok(ApiResponse.ok("Vehicle added successfully", saved));
    }

    @PostMapping("/check-bulk-availability")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkBulkAvailability(
            @Valid @RequestBody TransportBulkAvailabilityRequestDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok("Bulk vehicle availability", transportService.checkBulkAvailability(dto)));
    }

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<TransportRequest>> createRequest(@Valid @RequestBody TransportRequestDTO dto) {
        User user = authService.getCurrentUser();
        TransportRequest request = transportService.createRequest(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Transport request submitted successfully", request));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<TransportRequest>>> getRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tripType,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String department) {
        User user = authService.getCurrentUser();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("TRANSPORT_ADMIN") || user.hasServicePermission("TRANSPORT_ADMIN"));
        if (!isStaffOrAdmin && user != null) {
            department = user.getDepartment();
        }
        List<TransportRequest> list = transportService.getAllRequests(status, tripType, date, fromDate, toDate, department, user);
        return ResponseEntity.ok(ApiResponse.ok("Transport requests", list));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<TransportRequest>> getRequestById(@PathVariable String id) {
        User user = authService.getCurrentUser();
        TransportRequest request = transportService.getRequestById(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Transport request details", request));
    }

    @PutMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'TRANSPORT_ADMIN')")
    public ResponseEntity<ApiResponse<TransportRequest>> approveRequest(@PathVariable String id) {
        TransportRequest approved = transportService.approveRequest(id);
        return ResponseEntity.ok(ApiResponse.ok("Transport request approved successfully", approved));
    }

    @PutMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'TRANSPORT_ADMIN')")
    public ResponseEntity<ApiResponse<TransportRequest>> rejectRequest(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        TransportRequest rejected = transportService.rejectRequest(id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Transport request rejected", rejected));
    }
}
