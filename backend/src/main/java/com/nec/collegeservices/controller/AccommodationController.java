package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.AccommodationBulkAvailabilityRequestDTO;
import com.nec.collegeservices.dto.AccommodationCancelRequestDTO;
import com.nec.collegeservices.dto.AccommodationDualRequestDTO;
import com.nec.collegeservices.dto.AccommodationRequestDTO;
import com.nec.collegeservices.dto.AccommodationRescheduleRequestDTO;
import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.RejectRequestDTO;
import com.nec.collegeservices.model.AccommodationRequest;
import com.nec.collegeservices.model.AccommodationRoom;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AccommodationService;
import com.nec.collegeservices.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accommodation")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AccommodationController {

    @Autowired
    private AccommodationService accommodationService;

    @Autowired
    private AuthService authService;

    @Autowired
    private RequestController requestController;

    @GetMapping("/requests/{id}/pdf")
    public ResponseEntity<byte[]> getAccommodationPdf(@PathVariable String id) {
        return requestController.getRequestPdf(id);
    }

    // ==========================================
    // ROOM ENDPOINTS
    // ==========================================

    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<AccommodationRoom>>> getAllRooms(
            @RequestParam(required = false) String hostel) {
        User user = authService.getCurrentUser();
        if (user != null && !accommodationService.isSuperAdmin(user) && accommodationService.isAccommodationAdmin(user)) {
            if (user.getAssignedHostels() != null && !user.getAssignedHostels().isEmpty()) {
                hostel = user.getAssignedHostels().get(0);
            }
        }
        List<AccommodationRoom> rooms = hostel != null && !hostel.isBlank()
                ? accommodationService.getRoomsByHostel(hostel)
                : accommodationService.getAllRooms();
        return ResponseEntity.ok(ApiResponse.ok("Accommodation rooms", rooms));
    }

    @PutMapping("/rooms/{roomId}/status")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRoom>> updateRoomStatus(
            @PathVariable String roomId,
            @RequestBody Object statusBody) {
        User user = authService.getCurrentUser();
        String status = "Available";
        if (statusBody instanceof Map<?, ?> map) {
            Object s = map.get("status");
            if (s != null) status = s.toString();
        } else if (statusBody instanceof String str) {
            status = str.replace("\"", "").trim();
        }
        AccommodationRoom updated = accommodationService.updateRoomStatus(roomId, status, user);
        return ResponseEntity.ok(ApiResponse.ok("Room status updated successfully", updated));
    }

    @GetMapping("/rooms/{roomId}/availability")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRoomAvailability(
            @PathVariable String roomId,
            @RequestParam(required = false) String checkInDate,
            @RequestParam(required = false) String checkOutDate) {
        Map<String, Object> avail = accommodationService.getRoomAvailability(roomId, checkInDate, checkOutDate);
        return ResponseEntity.ok(ApiResponse.ok("Room availability details", avail));
    }

    @PostMapping("/check-bulk-availability")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkBulkAvailability(
            @Valid @RequestBody AccommodationBulkAvailabilityRequestDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok("Bulk room availability", accommodationService.checkBulkAvailability(dto)));
    }

    // ==========================================
    // REQUEST SUBMISSION & QUERY ENDPOINTS
    // ==========================================

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<AccommodationRequest>> createRequest(@Valid @RequestBody AccommodationRequestDTO dto) {
        User user = authService.getCurrentUser();
        AccommodationRequest request = accommodationService.createRequest(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request submitted successfully", request));
    }

    @PostMapping("/requests/dual")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDualRequest(@Valid @RequestBody AccommodationDualRequestDTO dto) {
        User user = authService.getCurrentUser();
        Map<String, Object> result = accommodationService.createDualRequest(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation requests submitted successfully for both hostels", result));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<AccommodationRequest>>> getRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String hostel,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String department) {
        User user = authService.getCurrentUser();
        boolean isStaffOrAdmin = user != null && accommodationService.isAccommodationAdmin(user);
        if (!isStaffOrAdmin && user != null) {
            department = user.getDepartment();
        }
        List<AccommodationRequest> list = accommodationService.getAllRequests(status, hostel, date, fromDate, toDate, department, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation requests", list));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<AccommodationRequest>> getRequestById(@PathVariable String id) {
        User user = authService.getCurrentUser();
        AccommodationRequest request = accommodationService.getRequestById(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request details", request));
    }

    // ==========================================
    // APPROVAL & REJECTION ENDPOINTS
    // ==========================================

    @PutMapping("/requests/{id}/ao-direct-approve")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> aoDirectApproveRequest(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        User user = authService.getCurrentUser();
        String remarks = body != null ? body.get("remarks") : null;
        AccommodationRequest approved = accommodationService.aoDirectApproveRequest(id, remarks, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request directly approved by AO Admin", approved));
    }

    @PutMapping("/requests/{id}/ao-forward")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> aoForwardRequest(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        User user = authService.getCurrentUser();
        String remarks = body != null ? body.get("remarks") : null;
        AccommodationRequest forwarded = accommodationService.aoForwardRequest(id, remarks, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request forwarded to " + forwarded.getHostel() + " Admin", forwarded));
    }

    @PutMapping("/requests/{id}/ao-approve")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> aoApproveRequest(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        User user = authService.getCurrentUser();
        String remarks = body != null ? body.get("remarks") : null;
        AccommodationRequest approved = accommodationService.aoForwardRequest(id, remarks, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request forwarded by AO Admin", approved));
    }

    @PutMapping("/requests/{id}/ao-reject")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> aoRejectRequest(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        User user = authService.getCurrentUser();
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        AccommodationRequest rejected = accommodationService.aoRejectRequest(id, reason, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request rejected by AO Admin", rejected));
    }

    @PutMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN', 'BOYS_HOSTEL_ADMIN', 'GIRLS_HOSTEL_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> approveRequest(@PathVariable String id) {
        User user = authService.getCurrentUser();
        AccommodationRequest approved = accommodationService.approveRequest(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request approved successfully", approved));
    }

    @PutMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN', 'BOYS_HOSTEL_ADMIN', 'GIRLS_HOSTEL_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> rejectRequest(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        User user = authService.getCurrentUser();
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        AccommodationRequest rejected = accommodationService.rejectRequest(id, reason, user);
        return ResponseEntity.ok(ApiResponse.ok("Accommodation request rejected", rejected));
    }

    // ==========================================
    // CANCELLATION ENDPOINTS
    // ==========================================

    @RequestMapping(value = "/requests/{id}/cancel", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<AccommodationRequest>> cancelRequest(
            @PathVariable String id,
            @Valid @RequestBody AccommodationCancelRequestDTO cancelDto) {
        User user = authService.getCurrentUser();
        AccommodationRequest cancelled = accommodationService.cancelRequest(id, cancelDto, user);
        return ResponseEntity.ok(ApiResponse.ok("Cancellation request processed", cancelled));
    }

    @RequestMapping(value = {"/requests/{id}/approve-cancellation", "/requests/{id}/cancel/approve"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> approveCancellation(@PathVariable String id) {
        User user = authService.getCurrentUser();
        AccommodationRequest approved = accommodationService.approveCancellation(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Cancellation approved successfully", approved));
    }

    @RequestMapping(value = {"/requests/{id}/reject-cancellation", "/requests/{id}/cancel/reject"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> rejectCancellation(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        User user = authService.getCurrentUser();
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        AccommodationRequest rejected = accommodationService.rejectCancellation(id, reason, user);
        return ResponseEntity.ok(ApiResponse.ok("Cancellation request declined", rejected));
    }

    // ==========================================
    // RESCHEDULING ENDPOINTS
    // ==========================================

    @RequestMapping(value = "/requests/{id}/reschedule", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<AccommodationRequest>> requestReschedule(
            @PathVariable String id,
            @Valid @RequestBody AccommodationRescheduleRequestDTO rescheduleDto) {
        User user = authService.getCurrentUser();
        AccommodationRequest rescheduled = accommodationService.requestReschedule(id, rescheduleDto, user);
        return ResponseEntity.ok(ApiResponse.ok("Reschedule request submitted successfully", rescheduled));
    }

    @RequestMapping(value = {"/requests/{id}/approve-reschedule", "/requests/{id}/reschedule/approve"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> approveReschedule(@PathVariable String id) {
        User user = authService.getCurrentUser();
        AccommodationRequest approved = accommodationService.approveReschedule(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Reschedule approved successfully", approved));
    }

    @RequestMapping(value = {"/requests/{id}/reject-reschedule", "/requests/{id}/reschedule/reject"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> rejectReschedule(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        User user = authService.getCurrentUser();
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        AccommodationRequest rejected = accommodationService.rejectReschedule(id, reason, user);
        return ResponseEntity.ok(ApiResponse.ok("Reschedule request declined", rejected));
    }

    // ==========================================
    // TEST FIXTURE ENDPOINT (Step 33, Test 29)
    // ==========================================

    @PostMapping("/test-fixture/create-pending")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> createPendingBookingTestFixture(
            @RequestBody AccommodationRequestDTO dto) {
        User user = authService.getCurrentUser();
        AccommodationRequest booking = accommodationService.createPendingBookingTestFixture(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Test fixture pending booking created", booking));
    }
}
