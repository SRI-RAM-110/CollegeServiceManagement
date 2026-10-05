package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.*;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.SeminarService;
import com.nec.collegeservices.service.UnifiedRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seminar")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SeminarController {

    @Autowired
    private SeminarService seminarService;

    @Autowired
    private AuthService authService;

    @GetMapping("/halls")
    public ResponseEntity<ApiResponse<List<SeminarHall>>> getAllHalls(
            @RequestParam(required = false) Boolean assignedOnly) {
        User user = null;
        try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        return ResponseEntity.ok(ApiResponse.ok("Seminar halls list", seminarService.getAllHalls(user, assignedOnly)));
    }

    @GetMapping("/halls/my")
    public ResponseEntity<ApiResponse<List<SeminarHall>>> getMyAssignedHalls() {
        User user = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok("My assigned seminar halls", seminarService.getMyAssignedHalls(user)));
    }

    @GetMapping("/availability")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAvailability(
            @RequestParam String hallId,
            @RequestParam String date) {
        return ResponseEntity.ok(ApiResponse.ok("Slot availability", seminarService.getAvailability(hallId, date)));
    }

    @PostMapping("/check-bulk-availability")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkBulkAvailability(
            @Valid @RequestBody SeminarBulkAvailabilityRequestDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok("Bulk slot availability", seminarService.checkBulkAvailability(dto)));
    }

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<SeminarBooking>> createBooking(@Valid @RequestBody SeminarBookingRequestDTO dto) {
        User user = authService.getCurrentUser();
        SeminarBooking booking = seminarService.createBooking(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Seminar hall booking request submitted successfully", booking));
    }

    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<List<SeminarBooking>>> getBookedSlots(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String hallId) {
        User user = authService.getCurrentUser();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("SEMINAR_ADMIN") || user.hasRole("SEMINAR_COORDINATOR"));
        List<SeminarBooking> list = seminarService.getBookingsInDateRange(fromDate, toDate, hallId);
        if (!isStaffOrAdmin && user != null) {
            list = list.stream()
                    .filter(b -> UnifiedRequestService.isRequestedByUser(b.getRequestedBy(), user))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.ok("Booked slots in date range", list));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<SeminarBooking>>> getRequests(
            @RequestParam(required = false) String hallId,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        User user = authService.getCurrentUser();

        // If department user (non-admin, non-coordinator), only view own department requests
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("SEMINAR_ADMIN") || user.hasRole("SEMINAR_COORDINATOR"));
        if (!isStaffOrAdmin && user != null) {
            department = user.getDepartment();
        }

        List<SeminarBooking> list = seminarService.getAllBookings(hallId, department, status, date, fromDate, toDate, user);
        return ResponseEntity.ok(ApiResponse.ok("Seminar booking requests", list));
    }

    @GetMapping("/requests/my")
    public ResponseEntity<ApiResponse<List<SeminarBooking>>> getMyRequests(
            @RequestParam(required = false) String hallId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        User user = authService.getCurrentUser();
        List<SeminarBooking> list = seminarService.getMyBookings(hallId, status, date, fromDate, toDate, user);
        return ResponseEntity.ok(ApiResponse.ok("My seminar booking requests", list));
    }


    @GetMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<SeminarBooking>> getRequestById(@PathVariable String id) {
        User user = authService.getCurrentUser();
        SeminarBooking booking = seminarService.getBookingById(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Seminar booking details", booking));
    }

    @GetMapping("/series/{seriesId}")
    public ResponseEntity<ApiResponse<List<SeminarBooking>>> getSeriesBookings(@PathVariable String seriesId) {
        User user = authService.getCurrentUser();
        List<SeminarBooking> list = seminarService.getSeriesBookings(seriesId, user);
        return ResponseEntity.ok(ApiResponse.ok("Series occurrences", list));
    }

    @PutMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR')")
    public ResponseEntity<ApiResponse<SeminarBooking>> approveBooking(@PathVariable String id) {
        User user = authService.getCurrentUser();
        SeminarBooking approved = seminarService.approveBooking(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Seminar booking approved successfully", approved));
    }

    @PutMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR')")
    public ResponseEntity<ApiResponse<SeminarBooking>> rejectBooking(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        User user = authService.getCurrentUser();
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        SeminarBooking rejected = seminarService.rejectBooking(id, reason, user);
        return ResponseEntity.ok(ApiResponse.ok("Seminar booking rejected", rejected));
    }

    @RequestMapping(value = "/requests/{id}/cancel", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<SeminarBooking>> cancelBooking(
            @PathVariable String id,
            @Valid @RequestBody SeminarCancelRequestDTO cancelDto) {
        User user = authService.getCurrentUser();
        SeminarBooking cancelled = seminarService.cancelBooking(id, cancelDto, user);
        return ResponseEntity.ok(ApiResponse.ok("Booking cancellation processed", cancelled));
    }

    @RequestMapping(value = {"/requests/{id}/approve-cancellation", "/requests/{id}/cancel/approve"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR')")
    public ResponseEntity<ApiResponse<SeminarBooking>> approveCancellation(@PathVariable String id) {
        User user = authService.getCurrentUser();
        SeminarBooking approved = seminarService.approveCancellation(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Cancellation approved successfully", approved));
    }

    @RequestMapping(value = {"/requests/{id}/reject-cancellation", "/requests/{id}/cancel/reject"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR')")
    public ResponseEntity<ApiResponse<SeminarBooking>> rejectCancellation(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        User user = authService.getCurrentUser();
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        SeminarBooking rejected = seminarService.rejectCancellation(id, reason, user);
        return ResponseEntity.ok(ApiResponse.ok("Cancellation request declined", rejected));
    }

    @RequestMapping(value = "/requests/{id}/reschedule", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<SeminarBooking>> requestReschedule(
            @PathVariable String id,
            @Valid @RequestBody SeminarRescheduleRequestDTO rescheduleDto) {
        User user = authService.getCurrentUser();
        SeminarBooking rescheduled = seminarService.requestReschedule(id, rescheduleDto, user);
        return ResponseEntity.ok(ApiResponse.ok("Reschedule request submitted successfully", rescheduled));
    }

    @RequestMapping(value = {"/requests/{id}/approve-reschedule", "/requests/{id}/reschedule/approve"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR')")
    public ResponseEntity<ApiResponse<SeminarBooking>> approveReschedule(@PathVariable String id) {
        User user = authService.getCurrentUser();
        SeminarBooking approved = seminarService.approveReschedule(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Reschedule approved successfully", approved));
    }

    @RequestMapping(value = {"/requests/{id}/reject-reschedule", "/requests/{id}/reschedule/reject"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR')")
    public ResponseEntity<ApiResponse<SeminarBooking>> rejectReschedule(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        User user = authService.getCurrentUser();
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        SeminarBooking rejected = seminarService.rejectReschedule(id, reason, user);
        return ResponseEntity.ok(ApiResponse.ok("Reschedule request declined", rejected));
    }

    // ==========================================
    // SUPER ADMIN HALL MANAGEMENT ENDPOINTS (Section 37)
    // ==========================================

    @PutMapping("/halls/{hallId}/status")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR')")
    public ResponseEntity<ApiResponse<SeminarHall>> updateHallStatus(
            @PathVariable String hallId,
            @RequestBody Object statusBody) {
        User user = authService.getCurrentUser();
        String status = "Available";
        if (statusBody instanceof Map<?, ?> map) {
            Object s = map.get("status");
            if (s != null) status = s.toString();
        } else if (statusBody instanceof String str) {
            status = str.replace("\"", "").trim();
        }
        SeminarHall updated = seminarService.updateHallStatus(hallId, status, user);
        return ResponseEntity.ok(ApiResponse.ok("Seminar hall status updated", updated));
    }

    @PutMapping("/halls/{hallId}")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<SeminarHall>> updateHall(
            @PathVariable String hallId,
            @RequestBody SeminarHall hall) {
        User user = authService.getCurrentUser();
        SeminarHall updated = seminarService.updateHall(hallId, hall, user);
        return ResponseEntity.ok(ApiResponse.ok("Seminar hall updated", updated));
    }

    @PostMapping("/halls/{hallId}/coordinators")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<SeminarHall>> assignCoordinators(
            @PathVariable String hallId,
            @RequestBody Map<String, List<String>> body) {
        User user = authService.getCurrentUser();
        List<String> coordinators = body != null ? body.get("coordinators") : List.of();
        SeminarHall updated = seminarService.assignCoordinators(hallId, coordinators, user);
        return ResponseEntity.ok(ApiResponse.ok("Coordinators assigned successfully", updated));
    }

    // ==========================================
    // TEST FIXTURE ENDPOINT (Section 48 - TEST 23)
    // ==========================================

    @PostMapping("/test-fixture/create-pending")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<SeminarBooking>> createPendingBookingTestFixture(
            @RequestBody SeminarBookingRequestDTO dto) {
        User user = authService.getCurrentUser();
        SeminarBooking booking = seminarService.createPendingBookingTestFixture(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Test fixture pending booking created", booking));
    }
}
