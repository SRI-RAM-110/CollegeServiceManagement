package com.nec.collegeservices.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import com.nec.collegeservices.dto.report.ReportDataDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Component
public class PdfReportGenerator {

    private static final Logger logger = LoggerFactory.getLogger(PdfReportGenerator.class);

    // Styling Palette
    private static final Color PRIMARY_NAVY = new Color(15, 30, 60);      // #0f1e3c
    private static final Color SECONDARY_BLUE = new Color(14, 116, 144);  // #0e7490
    private static final Color BG_HEADER = new Color(241, 245, 249);      // #f1f5f9
    private static final Color BG_SECTION = new Color(248, 250, 252);     // #f8fafc
    private static final Color BORDER_GRAY = new Color(203, 213, 225);    // #cbd5e1
    private static final Color TEXT_DARK = new Color(30, 41, 59);         // #1e293b
    private static final Color TEXT_MUTED = new Color(100, 116, 139);     // #64748b

    private static final Font FONT_COLLEGE_NAME = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, PRIMARY_NAVY);
    private static final Font FONT_COLLEGE_SUB = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_MUTED);
    private static final Font FONT_SYSTEM_NAME = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, SECONDARY_BLUE);
    private static final Font FONT_REPORT_TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, PRIMARY_NAVY);
    private static final Font FONT_SECTION_HEADER = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
    private static final Font FONT_TABLE_HEADER = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
    private static final Font FONT_LABEL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, PRIMARY_NAVY);
    private static final Font FONT_VALUE = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_DARK);
    private static final Font FONT_CELL = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);
    private static final Font FONT_CELL_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK);
    private static final Font FONT_FOOTER = FontFactory.getFont(FontFactory.HELVETICA, 7, TEXT_MUTED);

    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    public byte[] generatePdf(ReportDataDTO data) {
        Document document = new Document(PageSize.A4, 32, 32, 36, 42);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            ReportFooterPageEvent event = new ReportFooterPageEvent(data.getMetadata() != null ? data.getMetadata().getReportTitle() : "Report");
            writer.setPageEvent(event);

            document.open();

            // 1. Header with Logo & Title Banner
            addReportHeader(document, data);

            // 2. Metadata Grid
            addMetadataSection(document, data);

            // 3. Summary Statistics Table
            addSummarySection(document, data);

            // 4. Service Breakdown (if available)
            if (data.getServiceBreakdown() != null && !data.getServiceBreakdown().isEmpty() && data.getServiceBreakdown().size() > 1) {
                addServiceBreakdownSection(document, data);
            }

            // 5. Seminar Hall & Slot Breakdown (if available)
            if (data.getHallBreakdown() != null && !data.getHallBreakdown().isEmpty()) {
                addHallBreakdownSection(document, data);
            }

            // 6. Department Breakdown (if available)
            if (data.getDepartmentBreakdown() != null && !data.getDepartmentBreakdown().isEmpty() && data.getDepartmentBreakdown().size() > 1) {
                addDepartmentBreakdownSection(document, data);
            }

            // 7. Meals Headcount Breakdown (if meals)
            if (data.getMealsHeadcount() != null && (data.getMealsHeadcount().getBreakfast() > 0 || data.getMealsHeadcount().getLunch() > 0
                    || data.getMealsHeadcount().getDinner() > 0 || data.getMealsHeadcount().getSnacks() > 0 || data.getMealsHeadcount().getTeaCoffee() > 0)) {
                addMealsHeadcountSection(document, data);
            }

            // 8. Detailed Requests / Bookings Table
            addDetailedRecordsSection(document, data);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            logger.error("Failed to generate PDF report", e);
            throw new RuntimeException("Error generating PDF report: " + e.getMessage(), e);
        }
    }

    private void addReportHeader(Document document, ReportDataDTO data) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{1.2f, 4.8f});
        headerTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Image logo = loadCollegeLogo();
        if (logo != null) {
            logo.scaleToFit(75, 75);
            logoCell.addElement(logo);
        } else {
            Paragraph p = new Paragraph("[ NEC ]", FONT_SYSTEM_NAME);
            p.setAlignment(Element.ALIGN_CENTER);
            logoCell.addElement(p);
        }
        headerTable.addCell(logoCell);

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Paragraph collegeName = new Paragraph("NARASARAOPETA ENGINEERING COLLEGE", FONT_COLLEGE_NAME);
        collegeName.setSpacingAfter(1);
        textCell.addElement(collegeName);

        Paragraph collegeSub = new Paragraph("(Autonomous) • Approved by AICTE • Permanently Affiliated to JNTUK • Accredited by NAAC 'A+'", FONT_COLLEGE_SUB);
        collegeSub.setSpacingAfter(2);
        textCell.addElement(collegeSub);

        Paragraph systemTitle = new Paragraph("COLLEGE DEPARTMENT SERVICES MANAGEMENT SYSTEM", FONT_SYSTEM_NAME);
        systemTitle.setSpacingAfter(2);
        textCell.addElement(systemTitle);

        headerTable.addCell(textCell);
        document.add(headerTable);

        // Banner
        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);
        banner.setSpacingBefore(6);
        banner.setSpacingAfter(8);

        String title = data.getMetadata() != null ? data.getMetadata().getReportTitle().toUpperCase() : "SERVICES REPORT";
        PdfPCell titleCell = new PdfPCell(new Phrase(title, FONT_REPORT_TITLE));
        titleCell.setBackgroundColor(BG_HEADER);
        titleCell.setBorderColor(BORDER_GRAY);
        titleCell.setPadding(6);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        banner.addCell(titleCell);

        document.add(banner);
    }

    private void addMetadataSection(Document document, ReportDataDTO data) throws DocumentException {
        if (data.getMetadata() == null) return;
        ReportDataDTO.ReportMetadataDTO m = data.getMetadata();

        PdfPTable meta = new PdfPTable(4);
        meta.setWidthPercentage(100);
        meta.setWidths(new float[]{1.5f, 3.5f, 1.5f, 3.5f});
        meta.setSpacingAfter(8);

        addGridRow(meta, "Generated By", m.getGeneratedBy() + " (" + m.getUserRole() + ")", "Generated Date", m.getGeneratedAt() != null ? m.getGeneratedAt().format(DATE_TIME_FMT) : "-");
        addGridRow(meta, "Date Range", m.getDateRangeLabel(), "Filtered Service", m.getActiveService());
        addGridRow(meta, "Filtered Dept", m.getActiveDepartment(), "Filtered Status", m.getActiveStatus());
        if (m.getActiveHall() != null && !m.getActiveHall().equalsIgnoreCase("ALL")) {
            addGridRow(meta, "Seminar Hall", m.getActiveHall(), "View Mode", m.getViewType());
        }

        document.add(meta);
    }

    private void addSummarySection(Document document, ReportDataDTO data) throws DocumentException {
        addSectionBanner(document, "EXECUTIVE SUMMARY");

        ReportDataDTO.ReportSummaryDTO s = data.getSummary();
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2f, 2f, 2f, 2f, 2f});
        table.setSpacingAfter(10);

        String[] headers = {"Total Requests", "Approved", "Pending", "Rejected", "Cancelled"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, FONT_TABLE_HEADER));
            c.setBackgroundColor(PRIMARY_NAVY);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setPadding(5);
            table.addCell(c);
        }

        if (s != null) {
            table.addCell(createSummaryCell(String.valueOf(s.getTotalRequests()), PRIMARY_NAVY));
            table.addCell(createSummaryCell(String.valueOf(s.getApproved()), new Color(22, 101, 52)));
            table.addCell(createSummaryCell(String.valueOf(s.getPending()), new Color(180, 83, 9)));
            table.addCell(createSummaryCell(String.valueOf(s.getRejected()), new Color(190, 24, 93)));
            table.addCell(createSummaryCell(String.valueOf(s.getCancelled()), TEXT_MUTED));
        }

        document.add(table);
    }

    private PdfPCell createSummaryCell(String text, Color textColor) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, textColor);
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setPadding(6);
        c.setBackgroundColor(BG_SECTION);
        c.setBorderColor(BORDER_GRAY);
        return c;
    }

    private void addServiceBreakdownSection(Document document, ReportDataDTO data) throws DocumentException {
        addSectionBanner(document, "SERVICE-WISE UTILIZATION SUMMARY");

        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3f, 1.4f, 1.4f, 1.4f, 1.4f, 1.4f});
        table.setSpacingAfter(10);

        String[] headers = {"Service Name", "Total", "Approved", "Pending", "Rejected", "Cancelled"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, FONT_TABLE_HEADER));
            c.setBackgroundColor(SECONDARY_BLUE);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setPadding(4);
            table.addCell(c);
        }

        for (ReportDataDTO.ServiceBreakdownDTO s : data.getServiceBreakdown()) {
            addTableCell(table, s.getServiceName(), Element.ALIGN_LEFT, false);
            addTableCell(table, String.valueOf(s.getTotal()), Element.ALIGN_CENTER, true);
            addTableCell(table, String.valueOf(s.getApproved()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(s.getPending()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(s.getRejected()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(s.getCancelled()), Element.ALIGN_CENTER, false);
        }

        document.add(table);
    }

    private void addHallBreakdownSection(Document document, ReportDataDTO data) throws DocumentException {
        addSectionBanner(document, "SEMINAR HALL USAGE & SLOT UTILIZATION");

        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.4f, 2.6f, 1f, 1f, 1f, 1f, 1f, 1f});
        table.setSpacingAfter(10);

        String[] headers = {"Hall ID", "Hall Name", "Total", "Appr", "Pend", "Rej", "Slots (FN/AN/FD)", "Hours"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, FONT_TABLE_HEADER));
            c.setBackgroundColor(PRIMARY_NAVY);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setPadding(4);
            table.addCell(c);
        }

        for (ReportDataDTO.HallBreakdownDTO h : data.getHallBreakdown()) {
            addTableCell(table, h.getHallId(), Element.ALIGN_CENTER, true);
            addTableCell(table, h.getHallName(), Element.ALIGN_LEFT, false);
            addTableCell(table, String.valueOf(h.getTotal()), Element.ALIGN_CENTER, true);
            addTableCell(table, String.valueOf(h.getApproved()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(h.getPending()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(h.getRejected()), Element.ALIGN_CENTER, false);
            addTableCell(table, h.getForenoonCount() + "/" + h.getAfternoonCount() + "/" + h.getFullDayCount(), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf((long) h.getTotalBookedHours()), Element.ALIGN_CENTER, false);
        }

        document.add(table);
    }

    private void addDepartmentBreakdownSection(Document document, ReportDataDTO data) throws DocumentException {
        addSectionBanner(document, "DEPARTMENT USAGE BREAKDOWN");

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2.2f, 1.3f, 1.3f, 1.3f, 1.3f, 1.3f, 1.3f});
        table.setSpacingAfter(10);

        String[] headers = {"Department", "Total", "Seminar", "Accom.", "Transport", "Stationery", "Meals"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, FONT_TABLE_HEADER));
            c.setBackgroundColor(SECONDARY_BLUE);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setPadding(4);
            table.addCell(c);
        }

        for (ReportDataDTO.DepartmentBreakdownDTO d : data.getDepartmentBreakdown()) {
            addTableCell(table, d.getDepartment(), Element.ALIGN_LEFT, true);
            addTableCell(table, String.valueOf(d.getTotal()), Element.ALIGN_CENTER, true);
            addTableCell(table, String.valueOf(d.getSeminarCount()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(d.getAccommodationCount()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(d.getTransportCount()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(d.getStationeryCount()), Element.ALIGN_CENTER, false);
            addTableCell(table, String.valueOf(d.getMealsCount()), Element.ALIGN_CENTER, false);
        }

        document.add(table);
    }

    private void addMealsHeadcountSection(Document document, ReportDataDTO data) throws DocumentException {
        addSectionBanner(document, "CATERING HEADCOUNT & SERVICE-TIME BREAKDOWN");

        ReportDataDTO.MealsHeadcountDTO m = data.getMealsHeadcount();
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2f, 2f, 2f, 2f, 2f});
        table.setSpacingAfter(10);

        String[] headers = {"Breakfast", "Lunch", "Dinner", "Snacks (FN/AN)", "Tea/Coffee (FN/AN)"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, FONT_TABLE_HEADER));
            c.setBackgroundColor(PRIMARY_NAVY);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setPadding(4);
            table.addCell(c);
        }

        addTableCell(table, m.getBreakfast() + " guests", Element.ALIGN_CENTER, false);
        addTableCell(table, m.getLunch() + " guests", Element.ALIGN_CENTER, false);
        addTableCell(table, m.getDinner() + " guests", Element.ALIGN_CENTER, false);
        addTableCell(table, m.getSnacks() + " (" + m.getSnacksForenoon() + "/" + m.getSnacksAfternoon() + ")", Element.ALIGN_CENTER, false);
        addTableCell(table, m.getTeaCoffee() + " (" + m.getTeaCoffeeForenoon() + "/" + m.getTeaCoffeeAfternoon() + ")", Element.ALIGN_CENTER, false);

        document.add(table);
    }

    private void addDetailedRecordsSection(Document document, ReportDataDTO data) throws DocumentException {
        addSectionBanner(document, "DETAILED REQUEST & BOOKING RECORDS (" + (data.getDetailedRecords() != null ? data.getDetailedRecords().size() : 0) + ")");

        List<ReportDataDTO.ReportRecordDTO> records = data.getDetailedRecords();
        if (records == null || records.isEmpty()) {
            Paragraph p = new Paragraph("No service usage records found for the selected filters.", FONT_VALUE);
            p.setSpacingAfter(10);
            document.add(p);
            return;
        }

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.4f, 1.4f, 1.1f, 1.3f, 2.4f, 1.4f, 1f});
        table.setSpacingAfter(10);

        String[] headers = {"Request ID", "Service", "Dept", "Date", "Purpose / Event", "Resource / Slot", "Status"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, FONT_TABLE_HEADER));
            c.setBackgroundColor(PRIMARY_NAVY);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setPadding(4);
            table.addCell(c);
        }

        // Limit PDF detailed rows to first 150 to keep reasonable PDF size
        int count = 0;
        for (ReportDataDTO.ReportRecordDTO rec : records) {
            addTableCell(table, rec.getRequestId(), Element.ALIGN_CENTER, true);
            addTableCell(table, rec.getService(), Element.ALIGN_LEFT, false);
            addTableCell(table, rec.getDepartment(), Element.ALIGN_CENTER, false);
            addTableCell(table, rec.getDate(), Element.ALIGN_CENTER, false);
            addTableCell(table, rec.getPurpose(), Element.ALIGN_LEFT, false);

            String resText = (rec.getResource() != null ? rec.getResource() : "")
                    + (rec.getSlotOrTiming() != null && !rec.getSlotOrTiming().isBlank() ? " (" + rec.getSlotOrTiming() + ")" : "");
            addTableCell(table, resText, Element.ALIGN_LEFT, false);
            addTableCell(table, rec.getStatus(), Element.ALIGN_CENTER, false);

            count++;
            if (count >= 150) {
                break;
            }
        }

        document.add(table);

        if (records.size() > 150) {
            Paragraph note = new Paragraph("* Table truncated to first 150 records for PDF format. Download Excel for complete " + records.size() + " records.", FONT_FOOTER);
            note.setSpacingAfter(8);
            document.add(note);
        }
    }

    private void addSectionBanner(Document document, String title) throws DocumentException {
        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);
        banner.setSpacingBefore(4);
        banner.setSpacingAfter(4);

        PdfPCell c = new PdfPCell(new Phrase(title, FONT_SECTION_HEADER));
        c.setBackgroundColor(PRIMARY_NAVY);
        c.setPadding(4);
        banner.addCell(c);

        document.add(banner);
    }

    private void addGridRow(PdfPTable table, String l1, String v1, String l2, String v2) {
        addLabelCell(table, l1);
        addValueCell(table, v1);
        addLabelCell(table, l2);
        addValueCell(table, v2);
    }

    private void addLabelCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FONT_LABEL));
        cell.setBackgroundColor(BG_SECTION);
        cell.setBorderColor(BORDER_GRAY);
        cell.setPadding(3.5f);
        table.addCell(cell);
    }

    private void addValueCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", FONT_VALUE));
        cell.setBackgroundColor(Color.WHITE);
        cell.setBorderColor(BORDER_GRAY);
        cell.setPadding(3.5f);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, int align, boolean bold) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", bold ? FONT_CELL_BOLD : FONT_CELL));
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(Color.WHITE);
        cell.setBorderColor(BORDER_GRAY);
        cell.setPadding(3);
        table.addCell(cell);
    }

    private static byte[] cachedLogoPngBytes = null;

    private Image loadCollegeLogo() {
        if (cachedLogoPngBytes != null) {
            try {
                return Image.getInstance(cachedLogoPngBytes);
            } catch (Exception ignored) {}
        }

        try {
            byte[] rawBytes = null;
            ClassPathResource res = new ClassPathResource("NEClogo.png");
            if (res.exists()) {
                try (InputStream is = res.getInputStream()) {
                    rawBytes = is.readAllBytes();
                }
            }

            if (rawBytes == null || rawBytes.length == 0) {
                Path directPath = Paths.get("src/main/resources/NEClogo.png");
                if (Files.exists(directPath)) {
                    rawBytes = Files.readAllBytes(directPath);
                }
            }

            if (rawBytes != null && rawBytes.length > 0) {
                try {
                    Image directImg = Image.getInstance(rawBytes);
                    cachedLogoPngBytes = rawBytes;
                    return directImg;
                } catch (Exception notDirectlySupported) {
                    BufferedImage bi = ImageIO.read(new ByteArrayInputStream(rawBytes));
                    if (bi != null) {
                        ByteArrayOutputStream pngOut = new ByteArrayOutputStream();
                        ImageIO.write(bi, "png", pngOut);
                        cachedLogoPngBytes = pngOut.toByteArray();
                        return Image.getInstance(cachedLogoPngBytes);
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Could not load NEC logo: " + e.getMessage());
        }
        return null;
    }

    private static class ReportFooterPageEvent extends PdfPageEventHelper {
        private final String title;
        private PdfTemplate totalPagesTemplate;
        private BaseFont baseFont;

        public ReportFooterPageEvent(String title) {
            this.title = title;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
                totalPagesTemplate = writer.getDirectContent().createTemplate(30, 16);
            } catch (Exception e) {
                logger.warn("Failed to create footer font/template", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            float y = document.bottom() - 14;

            cb.setColorStroke(BORDER_GRAY);
            cb.setLineWidth(0.5f);
            cb.moveTo(document.left(), y + 10);
            cb.lineTo(document.right(), y + 10);
            cb.stroke();

            cb.beginText();
            cb.setFontAndSize(baseFont, 7);
            cb.setColorFill(TEXT_MUTED);

            String footerLeft = "Narasaraopet Engineering College (Autonomous) • Services Management System";
            cb.showTextAligned(PdfContentByte.ALIGN_LEFT, footerLeft, document.left(), y, 0);

            String pageStr = "Page " + writer.getPageNumber() + " of ";
            float rightX = document.right();
            cb.showTextAligned(PdfContentByte.ALIGN_RIGHT, pageStr, rightX - 14, y, 0);
            cb.endText();

            cb.addTemplate(totalPagesTemplate, rightX - 12, y);
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (totalPagesTemplate != null && baseFont != null) {
                totalPagesTemplate.beginText();
                totalPagesTemplate.setFontAndSize(baseFont, 7);
                totalPagesTemplate.setColorFill(TEXT_MUTED);
                totalPagesTemplate.showText(String.valueOf(writer.getPageNumber()));
                totalPagesTemplate.endText();
            }
        }
    }
}
