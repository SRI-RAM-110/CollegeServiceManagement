package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.report.ReportDataDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Component
public class ExcelReportGenerator {

    private static final Logger logger = LoggerFactory.getLogger(ExcelReportGenerator.class);
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    public byte[] generateExcel(ReportDataDTO data) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            // Styles
            CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleFont.setColor(IndexedColors.DARK_BLUE.getIndex());
            titleStyle.setFont(titleFont);

            CellStyle subTitleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font subTitleFont = workbook.createFont();
            subTitleFont.setFontHeightInPoints((short) 10);
            subTitleFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            subTitleStyle.setFont(subTitleFont);

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.LEFT);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            CellStyle boldDataStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font boldFont = workbook.createFont();
            boldFont.setBold(true);
            boldDataStyle.setFont(boldFont);
            boldDataStyle.setBorderBottom(BorderStyle.THIN);
            boldDataStyle.setBorderTop(BorderStyle.THIN);
            boldDataStyle.setBorderLeft(BorderStyle.THIN);
            boldDataStyle.setBorderRight(BorderStyle.THIN);

            // 1. Sheet: Summary
            buildSummarySheet(workbook, data, titleStyle, subTitleStyle, headerStyle, dataStyle, boldDataStyle);

            // 2. Sheet: Detailed Requests
            buildDetailedRequestsSheet(workbook, data, headerStyle, dataStyle);

            // 3. Sheet: Service Usage
            if (data.getServiceBreakdown() != null && !data.getServiceBreakdown().isEmpty()) {
                buildServiceUsageSheet(workbook, data, headerStyle, dataStyle, boldDataStyle);
            }

            // 4. Sheet: Department Usage
            if (data.getDepartmentBreakdown() != null && !data.getDepartmentBreakdown().isEmpty()) {
                buildDepartmentUsageSheet(workbook, data, headerStyle, dataStyle, boldDataStyle);
            }

            // 5. Sheet: Seminar Hall & Slot Usage (if applicable)
            if (data.getHallBreakdown() != null && !data.getHallBreakdown().isEmpty()) {
                buildHallUsageSheet(workbook, data, headerStyle, dataStyle, boldDataStyle);
            }

            workbook.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            logger.error("Failed to generate Excel report", e);
            throw new RuntimeException("Error generating Excel report: " + e.getMessage(), e);
        }
    }

    private void buildSummarySheet(Workbook workbook, ReportDataDTO data,
                                   CellStyle titleStyle, CellStyle subTitleStyle,
                                   CellStyle headerStyle, CellStyle dataStyle, CellStyle boldDataStyle) {
        Sheet sheet = workbook.createSheet("Summary");
        int r = 0;

        Row r0 = sheet.createRow(r++);
        Cell c0 = r0.createCell(0);
        c0.setCellValue("NARASARAOPET ENGINEERING COLLEGE (AUTONOMOUS)");
        c0.setCellStyle(titleStyle);

        Row r1 = sheet.createRow(r++);
        Cell c1 = r1.createCell(0);
        c1.setCellValue("College Department Services Management System - Reports & Analytics");
        c1.setCellStyle(subTitleStyle);

        r++; // blank row

        Row r2 = sheet.createRow(r++);
        Cell c2 = r2.createCell(0);
        c2.setCellValue("REPORT: " + (data.getMetadata() != null ? data.getMetadata().getReportTitle() : "Service Usage Report"));
        c2.setCellStyle(titleStyle);

        if (data.getMetadata() != null) {
            ReportDataDTO.ReportMetadataDTO m = data.getMetadata();
            addMetaRow(sheet, r++, "Generated By:", m.getGeneratedBy() + " (" + m.getUserRole() + ")");
            addMetaRow(sheet, r++, "Date Range:", m.getDateRangeLabel());
            addMetaRow(sheet, r++, "Generated At:", m.getGeneratedAt() != null ? m.getGeneratedAt().format(DATE_TIME_FMT) : "-");
            addMetaRow(sheet, r++, "Filtered Service:", m.getActiveService());
            addMetaRow(sheet, r++, "Filtered Department:", m.getActiveDepartment());
            addMetaRow(sheet, r++, "Filtered Status:", m.getActiveStatus());
            if (m.getActiveHall() != null && !m.getActiveHall().equalsIgnoreCase("ALL")) {
                addMetaRow(sheet, r++, "Filtered Seminar Hall:", m.getActiveHall());
            }
        }

        r++; // blank row

        // Executive Totals
        Row hRow = sheet.createRow(r++);
        String[] headers = {"Metric", "Count"};
        for (int i = 0; i < headers.length; i++) {
            Cell c = hRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        ReportDataDTO.ReportSummaryDTO s = data.getSummary();
        if (s != null) {
            addSummaryMetric(sheet, r++, "Total Requests / Bookings", s.getTotalRequests(), dataStyle, boldDataStyle);
            addSummaryMetric(sheet, r++, "Approved / Confirmed", s.getApproved(), dataStyle, boldDataStyle);
            addSummaryMetric(sheet, r++, "Pending Review", s.getPending(), dataStyle, boldDataStyle);
            addSummaryMetric(sheet, r++, "Rejected / Declined", s.getRejected(), dataStyle, boldDataStyle);
            addSummaryMetric(sheet, r++, "Cancelled", s.getCancelled(), dataStyle, boldDataStyle);
        }

        // Auto size columns
        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);
    }

    private void addMetaRow(Sheet sheet, int r, String label, String value) {
        Row row = sheet.createRow(r);
        Cell c0 = row.createCell(0);
        c0.setCellValue(label);
        Cell c1 = row.createCell(1);
        c1.setCellValue(value != null ? value : "-");
    }

    private void addSummaryMetric(Sheet sheet, int r, String label, long val, CellStyle dataStyle, CellStyle boldDataStyle) {
        Row row = sheet.createRow(r);
        Cell c0 = row.createCell(0);
        c0.setCellValue(label);
        c0.setCellStyle(dataStyle);

        Cell c1 = row.createCell(1);
        c1.setCellValue(val);
        c1.setCellStyle(boldDataStyle);
    }

    private void buildDetailedRequestsSheet(Workbook workbook, ReportDataDTO data,
                                            CellStyle headerStyle, CellStyle dataStyle) {
        Sheet sheet = workbook.createSheet("Detailed Requests");
        String[] headers = {
                "Request ID", "Service", "Department", "Requested By",
                "Service Date", "Purpose / Event", "Resource / Location", "Slot / Timing",
                "Guests / Qty", "Status", "Approved By", "Submission Date"
        };

        Row hRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = hRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int r = 1;
        List<ReportDataDTO.ReportRecordDTO> records = data.getDetailedRecords();
        if (records != null) {
            for (ReportDataDTO.ReportRecordDTO rec : records) {
                Row row = sheet.createRow(r++);
                int c = 0;
                createCell(row, c++, rec.getRequestId(), dataStyle);
                createCell(row, c++, rec.getService(), dataStyle);
                createCell(row, c++, rec.getDepartment(), dataStyle);
                createCell(row, c++, rec.getRequestedBy(), dataStyle);
                createCell(row, c++, rec.getDate(), dataStyle);
                createCell(row, c++, rec.getPurpose(), dataStyle);
                createCell(row, c++, rec.getResource(), dataStyle);
                createCell(row, c++, rec.getSlotOrTiming(), dataStyle);
                createCell(row, c++, rec.getGuestOrQuantityCount() != null ? String.valueOf(rec.getGuestOrQuantityCount()) : "-", dataStyle);
                createCell(row, c++, rec.getStatus(), dataStyle);
                createCell(row, c++, rec.getApprovedBy() != null ? rec.getApprovedBy() : "-", dataStyle);
                createCell(row, c++, rec.getCreatedAt() != null ? rec.getCreatedAt().format(DATE_TIME_FMT) : "-", dataStyle);
            }
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void buildServiceUsageSheet(Workbook workbook, ReportDataDTO data,
                                        CellStyle headerStyle, CellStyle dataStyle, CellStyle boldDataStyle) {
        Sheet sheet = workbook.createSheet("Service Usage");
        String[] headers = {"Service Name", "Total Requests", "Approved", "Pending", "Rejected", "Cancelled"};

        Row hRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = hRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int r = 1;
        for (ReportDataDTO.ServiceBreakdownDTO s : data.getServiceBreakdown()) {
            Row row = sheet.createRow(r++);
            int c = 0;
            createCell(row, c++, s.getServiceName(), dataStyle);
            createNumericCell(row, c++, s.getTotal(), dataStyle);
            createNumericCell(row, c++, s.getApproved(), dataStyle);
            createNumericCell(row, c++, s.getPending(), dataStyle);
            createNumericCell(row, c++, s.getRejected(), dataStyle);
            createNumericCell(row, c++, s.getCancelled(), dataStyle);
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void buildDepartmentUsageSheet(Workbook workbook, ReportDataDTO data,
                                           CellStyle headerStyle, CellStyle dataStyle, CellStyle boldDataStyle) {
        Sheet sheet = workbook.createSheet("Department Usage");
        String[] headers = {
                "Department", "Total Requests", "Approved", "Pending", "Rejected", "Cancelled",
                "Seminar Hall", "Accommodation", "Transport", "Stationery", "Snacks & Meals"
        };

        Row hRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = hRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int r = 1;
        for (ReportDataDTO.DepartmentBreakdownDTO d : data.getDepartmentBreakdown()) {
            Row row = sheet.createRow(r++);
            int c = 0;
            createCell(row, c++, d.getDepartment(), dataStyle);
            createNumericCell(row, c++, d.getTotal(), dataStyle);
            createNumericCell(row, c++, d.getApproved(), dataStyle);
            createNumericCell(row, c++, d.getPending(), dataStyle);
            createNumericCell(row, c++, d.getRejected(), dataStyle);
            createNumericCell(row, c++, d.getCancelled(), dataStyle);
            createNumericCell(row, c++, d.getSeminarCount(), dataStyle);
            createNumericCell(row, c++, d.getAccommodationCount(), dataStyle);
            createNumericCell(row, c++, d.getTransportCount(), dataStyle);
            createNumericCell(row, c++, d.getStationeryCount(), dataStyle);
            createNumericCell(row, c++, d.getMealsCount(), dataStyle);
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void buildHallUsageSheet(Workbook workbook, ReportDataDTO data,
                                     CellStyle headerStyle, CellStyle dataStyle, CellStyle boldDataStyle) {
        Sheet sheet = workbook.createSheet("Seminar Hall Usage");
        String[] headers = {
                "Hall ID", "Hall Name", "Location", "Capacity", "Total Bookings",
                "Approved", "Pending", "Rejected", "Cancelled",
                "Forenoon", "Afternoon", "Full Day", "Booked Hours"
        };

        Row hRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = hRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int r = 1;
        for (ReportDataDTO.HallBreakdownDTO h : data.getHallBreakdown()) {
            Row row = sheet.createRow(r++);
            int c = 0;
            createCell(row, c++, h.getHallId(), dataStyle);
            createCell(row, c++, h.getHallName(), dataStyle);
            createCell(row, c++, h.getLocation(), dataStyle);
            createCell(row, c++, h.getCapacity() != null ? String.valueOf(h.getCapacity()) : "-", dataStyle);
            createNumericCell(row, c++, h.getTotal(), dataStyle);
            createNumericCell(row, c++, h.getApproved(), dataStyle);
            createNumericCell(row, c++, h.getPending(), dataStyle);
            createNumericCell(row, c++, h.getRejected(), dataStyle);
            createNumericCell(row, c++, h.getCancelled(), dataStyle);
            createNumericCell(row, c++, h.getForenoonCount(), dataStyle);
            createNumericCell(row, c++, h.getAfternoonCount(), dataStyle);
            createNumericCell(row, c++, h.getFullDayCount(), dataStyle);
            createNumericCell(row, c++, (long) h.getTotalBookedHours(), dataStyle);
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createCell(Row row, int col, String val, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(val != null ? val : "-");
        cell.setCellStyle(style);
    }

    private void createNumericCell(Row row, int col, long val, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(val);
        cell.setCellStyle(style);
    }
}
