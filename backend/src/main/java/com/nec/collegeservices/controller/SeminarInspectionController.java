package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.SeminarInspectionSubmitDTO;
import com.nec.collegeservices.model.SeminarEventInspection;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.SeminarInspectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seminar/inspections")
public class SeminarInspectionController {

    @Autowired
    private SeminarInspectionService inspectionService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SeminarEventInspection>>> getInspections(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String hallId) {
        User user = authService.getCurrentUser();
        List<SeminarEventInspection> list = inspectionService.getInspections(user, status, hallId);
        return ResponseEntity.ok(ApiResponse.ok("Event inspections retrieved successfully", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SeminarEventInspection>> getInspectionById(@PathVariable String id) {
        User user = authService.getCurrentUser();
        SeminarEventInspection inspection = inspectionService.getInspectionById(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Event inspection retrieved", inspection));
    }

    @GetMapping("/by-booking/{bookingId}")
    public ResponseEntity<ApiResponse<SeminarEventInspection>> getInspectionByBookingAndDate(
            @PathVariable String bookingId,
            @RequestParam(required = false) String date) {
        User user = authService.getCurrentUser();
        SeminarEventInspection inspection = inspectionService.getInspectionByBookingAndDate(bookingId, date, user);
        return ResponseEntity.ok(ApiResponse.ok("Event inspection retrieved", inspection));
    }

    @PutMapping("/{id}/pre-event")
    public ResponseEntity<ApiResponse<SeminarEventInspection>> submitPreEventInspection(
            @PathVariable String id,
            @RequestBody SeminarInspectionSubmitDTO dto) {
        User user = authService.getCurrentUser();
        SeminarEventInspection updated = inspectionService.submitPreEventInspection(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Pre-event inspection successfully verified and saved", updated));
    }

    @PutMapping("/{id}/post-event")
    public ResponseEntity<ApiResponse<SeminarEventInspection>> submitPostEventInspection(
            @PathVariable String id,
            @RequestBody SeminarInspectionSubmitDTO dto) {
        User user = authService.getCurrentUser();
        SeminarEventInspection updated = inspectionService.submitPostEventInspection(id, dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Post-event inspection completed. Event report generated and distributed.", updated));
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadInspectionReportPdf(@PathVariable String id) {
        User user = authService.getCurrentUser();
        SeminarEventInspection inspection = inspectionService.getInspectionById(id, user);
        byte[] pdfBytes = inspectionService.generateInspectionReportPdf(id, user);

        String filename = "NEC_Inspection_Report_" + inspection.getBookingId() + "_" + inspection.getOccurrenceDate() + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/{id}/retry-distribution")
    public ResponseEntity<ApiResponse<SeminarEventInspection>> retryDistribution(@PathVariable String id) {
        User user = authService.getCurrentUser();
        SeminarEventInspection updated = inspectionService.retryDistribution(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Report distribution retry initiated", updated));
    }
}

