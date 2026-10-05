package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.PdfGenerationService;
import com.nec.collegeservices.service.UnifiedRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = "*", maxAge = 3600)
public class RequestController {

    @Autowired
    private UnifiedRequestService unifiedRequestService;

    @Autowired
    private PdfGenerationService pdfGenerationService;

    @Autowired
    private AuthService authService;

    /**
     * Requirement 17: /my-requests
     * Display all requests created by the logged-in department.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<UnifiedRequestService.UnifiedRequestItem>>> getMyRequests(
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        User user = authService.getCurrentUser();
        List<UnifiedRequestService.UnifiedRequestItem> list =
                unifiedRequestService.getRequestsForUser(user, service, status, search);
        return ResponseEntity.ok(ApiResponse.ok("My departmental requests", list));
    }

    /**
     * Requirement 23: AO Super Admin access to all requests across all services.
     */
    @GetMapping({"", "/all"})
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<List<UnifiedRequestService.UnifiedRequestItem>>> getAllRequests(
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        List<UnifiedRequestService.UnifiedRequestItem> list =
                unifiedRequestService.getAllRequests(service, department, status, search);
        return ResponseEntity.ok(ApiResponse.ok("All service requests across college", list));
    }

    /**
     * Get single request details by ID across any service with strict department/admin authorization.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UnifiedRequestService.UnifiedRequestItem>> getRequestDetails(@PathVariable String id) {
        User user = authService.getCurrentUser();
        UnifiedRequestService.UnifiedRequestItem item = unifiedRequestService.getRequestById(id);
        if (item == null) {
            throw new ResourceNotFoundException("Request not found: " + id);
        }
        checkAccess(user, item);
        return ResponseEntity.ok(ApiResponse.ok("Request details", item));
    }

    /**
     * Feature: Approved Request -> Official PDF Preview + Download
     * Endpoint: GET /api/requests/{id}/pdf
     * Produces genuine, selectable text PDF document with official NEC logo and approval metadata.
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getRequestPdf(@PathVariable String id) {
        User user = authService.getCurrentUser();
        UnifiedRequestService.UnifiedRequestItem item = unifiedRequestService.getRequestById(id);
        if (item == null) {
            throw new ResourceNotFoundException("Request not found: " + id);
        }
        checkAccess(user, item);

        String status = item.getStatus() != null ? item.getStatus().toUpperCase() : "";
        boolean isApproved = "APPROVED".equals(status) || "BOOKED".equals(status) ||
                             "READY_FOR_COLLECTION".equals(status) || "COLLECTED".equals(status);
        if (!isApproved) {
            throw new BadRequestException("This request is not approved yet. Official PDF document is only available for approved requests.");
        }

        byte[] pdfBytes = pdfGenerationService.generateRequestPdf(item);

        // Sanitize service name and request ID for filename
        // Format: <Service>_Request_<RequestID>.pdf (e.g., Seminar_Request_SEM-2026-38815.pdf)
        String serviceName = item.getService() != null ? item.getService().replaceAll("[^a-zA-Z0-9]", "_") : "Service";
        if (serviceName.equalsIgnoreCase("Seminar_Hall")) serviceName = "Seminar";
        if (serviceName.equalsIgnoreCase("Snacks___Meals") || serviceName.equalsIgnoreCase("Snacks_Meals")) serviceName = "Meals";
        String reqId = item.getRequestId() != null ? item.getRequestId().replaceAll("[^a-zA-Z0-9_-]", "_") : id;
        String filename = serviceName + "_Request_" + reqId + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    private void checkAccess(User user, UnifiedRequestService.UnifiedRequestItem item) {
        if (user == null) {
            throw new AccessDeniedException("User not authenticated.");
        }
        if (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN")) {
            return;
        }
        String serviceCategory = item.getServiceCategory() != null ? item.getServiceCategory().toUpperCase() : "";
        if ("SEMINAR".equals(serviceCategory) && (user.hasRole("SEMINAR_ADMIN") || user.hasServicePermission("SEMINAR_ADMIN"))) {
            return;
        }
        if ("SEMINAR".equals(serviceCategory) && user.hasRole("SEMINAR_COORDINATOR")) {
            if (item.getRawObject() instanceof com.nec.collegeservices.model.SeminarBooking b) {
                if (b.getHallId() != null && user.isAssignedToHall(b.getHallId())) {
                    return;
                }
            }
        }
        if ("ACCOMMODATION".equals(serviceCategory) && (user.hasRole("ACCOMMODATION_ADMIN") || user.hasServicePermission("ACCOMMODATION_ADMIN"))) {
            return;
        }
        if ("TRANSPORT".equals(serviceCategory) && (user.hasRole("TRANSPORT_ADMIN") || user.hasServicePermission("TRANSPORT_ADMIN"))) {
            return;
        }
        if ("STATIONERY".equals(serviceCategory) && (user.hasRole("STATIONERY_ADMIN") || user.hasServicePermission("STATIONERY_ADMIN"))) {
            return;
        }
        if ("MEALS".equals(serviceCategory) && (user.hasRole("MEALS_ADMIN") || user.hasServicePermission("MEALS_ADMIN"))) {
            return;
        }
        if (UnifiedRequestService.isRequestedByUser(item, user)) {
            return;
        }
        throw new AccessDeniedException("You are not authorized to view or download this request document.");
    }
}
