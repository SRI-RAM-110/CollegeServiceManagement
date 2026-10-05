package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.report.ReportDataDTO;
import com.nec.collegeservices.dto.report.ReportFilterRequest;
import com.nec.collegeservices.dto.report.UserReportPermissionsDTO;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ReportController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private AuthService authService;

    @GetMapping("/permissions")
    public ResponseEntity<ApiResponse<UserReportPermissionsDTO>> getPermissions() {
        User user = authService.getCurrentUser();
        UserReportPermissionsDTO permissions = reportService.getUserPermissions(user);
        return ResponseEntity.ok(ApiResponse.ok("User report permissions", permissions));
    }

    @PostMapping("/data")
    public ResponseEntity<ApiResponse<ReportDataDTO>> getReportData(@RequestBody ReportFilterRequest filter) {
        User user = authService.getCurrentUser();
        ReportDataDTO data = reportService.generateReportData(filter, user);
        return ResponseEntity.ok(ApiResponse.ok("Report data generated successfully", data));
    }

    @PostMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(@RequestBody ReportFilterRequest filter) {
        User user = authService.getCurrentUser();
        byte[] pdfBytes = reportService.generateReportPdf(filter, user);

        String filename = "NEC_Report_" + System.currentTimeMillis() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(@RequestBody ReportFilterRequest filter) {
        User user = authService.getCurrentUser();
        byte[] excelBytes = reportService.generateReportExcel(filter, user);

        String filename = "NEC_Report_" + System.currentTimeMillis() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }
}
