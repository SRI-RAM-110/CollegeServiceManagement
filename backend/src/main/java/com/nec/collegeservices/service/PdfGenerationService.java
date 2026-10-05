package com.nec.collegeservices.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.nec.collegeservices.model.AccommodationRequest;
import com.nec.collegeservices.model.MealRequest;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.StationeryRequest;
import com.nec.collegeservices.model.TransportRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import javax.imageio.ImageIO;

@Service
public class PdfGenerationService {

    private static final Logger logger = LoggerFactory.getLogger(PdfGenerationService.class);

    // Color Palette - Institutional Navy & Arctic Blue Glass
    private static final Color PRIMARY_NAVY = new Color(15, 30, 60);      // #0f1e3c
    private static final Color SECONDARY_BLUE = new Color(14, 116, 144);  // #0e7490
    private static final Color ACCENT_GREEN = new Color(22, 101, 52);     // #166534
    private static final Color BG_HEADER = new Color(241, 245, 249);      // #f1f5f9
    private static final Color BG_SECTION = new Color(248, 250, 252);     // #f8fafc
    private static final Color BORDER_GRAY = new Color(203, 213, 225);    // #cbd5e1
    private static final Color TEXT_DARK = new Color(30, 41, 59);         // #1e293b
    private static final Color TEXT_MUTED = new Color(100, 116, 139);     // #64748b

    // Standard Document Fonts
    private static final Font FONT_COLLEGE_NAME = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, PRIMARY_NAVY);
    private static final Font FONT_COLLEGE_SUB = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, TEXT_MUTED);
    private static final Font FONT_SYSTEM_NAME = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, SECONDARY_BLUE);
    private static final Font FONT_DOC_TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, PRIMARY_NAVY);
    private static final Font FONT_SECTION_HEADER = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
    private static final Font FONT_LABEL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, PRIMARY_NAVY);
    private static final Font FONT_VALUE = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, TEXT_DARK);
    private static final Font FONT_STATUS_APPROVED = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, ACCENT_GREEN);
    private static final Font FONT_TABLE_HEADER = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, Color.WHITE);
    private static final Font FONT_FOOTER = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    public byte[] generateRequestPdf(UnifiedRequestService.UnifiedRequestItem item) {
        Document document = new Document(PageSize.A4, 36, 36, 40, 48); // margins: left, right, top, bottom
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            HeaderFooterPageEvent event = new HeaderFooterPageEvent(item.getRequestId());
            writer.setPageEvent(event);

            document.open();

            // 1. College Header with Official Logo
            addCollegeHeader(document, item);

            // 2. Request Information Section
            addRequestInfoSection(document, item);

            // 3. Service Details Section (Specific to service)
            addServiceDetailsSection(document, item);

            // 4. Approval Information Section
            addApprovalSection(document, item);

            // 5. Verification Sign-off Box
            addSignaturesSection(document);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            logger.error("Failed to generate PDF for request: " + item.getRequestId(), e);
            throw new RuntimeException("Error generating official PDF document: " + e.getMessage(), e);
        }
    }

    private void addCollegeHeader(Document document, UnifiedRequestService.UnifiedRequestItem item) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{1.2f, 4.8f});
        headerTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

        // Logo Cell
        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Image logo = loadCollegeLogo();
        if (logo != null) {
            logo.scaleToFit(85, 85);
            logoCell.addElement(logo);
        } else {
            Paragraph logoPlaceholder = new Paragraph("[ NEC LOGO ]", FONT_SYSTEM_NAME);
            logoPlaceholder.setAlignment(Element.ALIGN_CENTER);
            logoCell.addElement(logoPlaceholder);
        }
        headerTable.addCell(logoCell);

        // College & Document Details Cell
        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Paragraph collegeName = new Paragraph("NARASARAOPETA ENGINEERING COLLEGE", FONT_COLLEGE_NAME);
        collegeName.setSpacingAfter(1);
        textCell.addElement(collegeName);

        Paragraph collegeSub = new Paragraph("(Autonomous) • Approved by AICTE • Permanently Affiliated to JNTUK • Accredited by NAAC with 'A+' Grade", FONT_COLLEGE_SUB);
        collegeSub.setSpacingAfter(2);
        textCell.addElement(collegeSub);

        Paragraph systemTitle = new Paragraph("COLLEGE DEPARTMENT SERVICES MANAGEMENT SYSTEM", FONT_SYSTEM_NAME);
        systemTitle.setSpacingAfter(4);
        textCell.addElement(systemTitle);

        headerTable.addCell(textCell);
        document.add(headerTable);

        // Document Banner Bar
        PdfPTable banner = new PdfPTable(2);
        banner.setWidthPercentage(100);
        banner.setWidths(new float[]{3.5f, 1.5f});
        banner.setSpacingBefore(8);
        banner.setSpacingAfter(10);

        PdfPCell titleCell = new PdfPCell(new Phrase("SERVICE REQUEST DOCUMENT", FONT_DOC_TITLE));
        titleCell.setBackgroundColor(BG_HEADER);
        titleCell.setBorderColor(BORDER_GRAY);
        titleCell.setPadding(6);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        banner.addCell(titleCell);

        String statusText = item.getStatus() != null ? item.getStatus().toUpperCase() : "APPROVED";
        PdfPCell statusCell = new PdfPCell(new Phrase("STATUS: " + statusText, FONT_STATUS_APPROVED));
        statusCell.setBackgroundColor(new Color(240, 253, 244)); // light green
        statusCell.setBorderColor(new Color(187, 247, 208));
        statusCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        statusCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        statusCell.setPadding(6);
        banner.addCell(statusCell);

        document.add(banner);
    }

    private void addRequestInfoSection(Document document, UnifiedRequestService.UnifiedRequestItem item) throws DocumentException {
        addSectionHeader(document, "1. REQUEST INFORMATION");

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.3f, 1.7f, 1.3f, 1.7f});
        table.setSpacingAfter(10);

        String submittedDate = item.getCreatedAt() != null ? item.getCreatedAt().format(DATE_FORMATTER) : formatCustomDate(item.getDate());

        addGridRow(table, "Request ID", item.getRequestId(), "Service Category", item.getService());
        addGridRow(table, "Department", item.getDepartment(), "Requested By", item.getRequestedBy() != null ? item.getRequestedBy() : item.getDepartment() + " Department");
        addGridRow(table, "Submitted Date", submittedDate, "Approval Status", item.getStatus());

        document.add(table);
    }

    private void addServiceDetailsSection(Document document, UnifiedRequestService.UnifiedRequestItem item) throws DocumentException {
        String category = item.getServiceCategory() != null ? item.getServiceCategory().toUpperCase() : "";
        Object raw = item.getRawObject();

        addSectionHeader(document, "2. SERVICE DETAILS — " + item.getService().toUpperCase());

        if ("SEMINAR".equalsIgnoreCase(category) && raw instanceof SeminarBooking b) {
            renderSeminarDetails(document, b);
        } else if ("ACCOMMODATION".equalsIgnoreCase(category) && raw instanceof AccommodationRequest a) {
            renderAccommodationDetails(document, a);
        } else if ("TRANSPORT".equalsIgnoreCase(category) && raw instanceof TransportRequest t) {
            renderTransportDetails(document, t);
        } else if ("STATIONERY".equalsIgnoreCase(category) && raw instanceof StationeryRequest s) {
            renderStationeryDetails(document, s);
        } else if ("MEALS".equalsIgnoreCase(category) && raw instanceof MealRequest m) {
            renderMealsDetails(document, m);
        } else {
            // General Fallback
            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 4.5f});
            table.setSpacingAfter(10);

            addGridRow2Col(table, "Service Description", item.getDetails());
            addGridRow2Col(table, "Service Date", formatCustomDate(item.getDate()));
            document.add(table);
        }
    }

    private void renderSeminarDetails(Document document, SeminarBooking b) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.3f, 1.7f, 1.3f, 1.7f});
        table.setSpacingAfter(10);

        String slotText = formatSlot(b.getSlot());
        String bookingTypeDisplay = b.getBookingType() != null ? b.getBookingType().replace("_", "-") : "ONE-TIME";
        if (Boolean.TRUE.equals(b.getIsRecurring())) {
            bookingTypeDisplay = "RECURRING (WEEKLY)";
        }

        String locationStr = b.getHallLocation() != null && !b.getHallLocation().isBlank()
                ? b.getHallLocation()
                : (b.getHallId() != null ? b.getHallId() : "Campus");

        addGridRow(table, "Hall Name", b.getHallName(), "Hall Location", locationStr);
        addGridRow(table, "Hall ID", b.getHallId(), "Time Slot", slotText);
        addGridRow(table, "Booking Date", formatCustomDate(b.getDate()), "Expected Participants", String.valueOf(b.getExpectedParticipants() != null ? b.getExpectedParticipants() : "N/A"));
        addGridRow(table, "Booking Type", bookingTypeDisplay, "Service Status", b.getStatus());

        if (b.getSeriesId() != null || Boolean.TRUE.equals(b.getIsRecurring())) {
            String occStr = (b.getOccurrenceIndex() != null && b.getTotalOccurrences() != null)
                    ? (b.getOccurrenceIndex() + " of " + b.getTotalOccurrences())
                    : "Series Booking";
            addGridRow(table, "Series ID", b.getSeriesId() != null ? b.getSeriesId() : "N/A", "Occurrence", occStr);

            String rangeStr = (b.getStartDate() != null && b.getEndDate() != null)
                    ? (formatCustomDate(b.getStartDate()) + " to " + formatCustomDate(b.getEndDate()))
                    : "N/A";
            String repeatDays = (b.getRecurrenceDays() != null && !b.getRecurrenceDays().isEmpty())
                    ? String.join(", ", b.getRecurrenceDays())
                    : "Weekly";
            addGridRow(table, "Date Range", rangeStr, "Repeat On", repeatDays);
        }

        addGridRowSpan(table, "Event Title", b.getEventTitle());
        addGridRowSpan(table, "Purpose of Booking", b.getPurpose());
        addGridRowSpan(table, "Additional Requirements", b.getAdditionalRequirements() != null && !b.getAdditionalRequirements().isBlank() ? b.getAdditionalRequirements() : "None");

        if (b.getCancellationReason() != null && !b.getCancellationReason().isBlank()) {
            addGridRowSpan(table, "Cancellation Reason", b.getCancellationReason());
        }
        if (b.getRescheduleReason() != null && !b.getRescheduleReason().isBlank()) {
            addGridRowSpan(table, "Reschedule Reason", b.getRescheduleReason());
        }

        document.add(table);
    }

    private void renderAccommodationDetails(Document document, AccommodationRequest a) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.3f, 1.7f, 1.3f, 1.7f});
        table.setSpacingAfter(10);

        String roomLocation = a.getRoomLocation() != null && !a.getRoomLocation().isBlank()
                ? a.getRoomLocation()
                : a.getHostel();

        addGridRow(table, "Hostel", a.getHostel(), "Room Type", a.getRoomType());
        addGridRow(table, "Allocated Room", a.getRoomId() != null ? a.getRoomId() : "Pending Allocation", "Room Location", roomLocation);
        addGridRow(table, "Check-in Date", formatCustomDate(a.getCheckInDate()), "Check-out Date", formatCustomDate(a.getCheckOutDate()));
        addGridRow(table, "Faculty / Guest Name", a.getFacultyOrGuestName() != null ? a.getFacultyOrGuestName() : "Department Guest", "Number of Guests", String.valueOf(a.getGuestsCount() != null ? a.getGuestsCount() : "N/A"));
        addGridRow(table, "Booking Type", a.getBookingType() != null ? a.getBookingType().replace("_", "-") : "ONE-TIME", "Service Status", a.getStatus());
        addGridRowSpan(table, "Purpose of Stay", a.getPurpose());
        addGridRowSpan(table, "Additional Requirements", a.getAdditionalNotes() != null && !a.getAdditionalNotes().isBlank() ? a.getAdditionalNotes() : "None");

        if (a.getCancellationReason() != null && !a.getCancellationReason().isBlank()) {
            addGridRowSpan(table, "Cancellation Reason", a.getCancellationReason());
        }
        if (a.getRescheduleReason() != null && !a.getRescheduleReason().isBlank()) {
            String reschedInfo = a.getRescheduleReason();
            if (a.getOriginalRoomId() != null) {
                reschedInfo += " (Rescheduled from " + a.getOriginalRoomId() + " [" + formatCustomDate(a.getOriginalCheckInDate()) + " to " + formatCustomDate(a.getOriginalCheckOutDate()) + "])";
            }
            addGridRowSpan(table, "Reschedule Details", reschedInfo);
        }

        document.add(table);
    }

    private void renderTransportDetails(Document document, TransportRequest t) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.3f, 1.7f, 1.3f, 1.7f});
        table.setSpacingAfter(10);

        addGridRow(table, "Vehicle / Trip Type", t.getTripType(), "Trip Nature", t.isRoundTrip() ? "Round Trip (Two Way)" : "One Way Trip");
        addGridRow(table, "Trip Date", formatCustomDate(t.getTripDate()), "Departure Time", t.getDepartureTime());
        addGridRow(table, "Pickup Location", t.getPickupLocation(), "Return Time", t.getReturnTime() != null ? t.getReturnTime() : "N/A");
        addGridRow(table, "Destination", t.getDestination(), "Passenger Count", String.valueOf(t.getExpectedPassengers() != null ? t.getExpectedPassengers() : "N/A"));
        addGridRow(table, "Allocated Vehicle", t.getVehicleName() != null ? t.getVehicleName() : "To be assigned by Transport Admin", "Vehicle ID", t.getVehicleId() != null ? t.getVehicleId() : "N/A");
        addGridRowSpan(table, "Purpose of Travel", t.getPurpose());
        addGridRowSpan(table, "Special Requirements", t.getAdditionalNotes() != null && !t.getAdditionalNotes().isBlank() ? t.getAdditionalNotes() : "None");

        document.add(table);
    }

    private void renderStationeryDetails(Document document, StationeryRequest s) throws DocumentException {
        // 1. Context details
        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);
        infoTable.setWidths(new float[]{1.3f, 4.7f});
        infoTable.setSpacingAfter(8);

        addGridRow2Col(infoTable, "Purpose of Request", s.getPurpose());
        addGridRow2Col(infoTable, "Special Notes / Instructions", s.getAdditionalNotes() != null && !s.getAdditionalNotes().isBlank() ? s.getAdditionalNotes() : "None");
        document.add(infoTable);

        // 2. Table of Requested Items (STRICTLY NO INVENTORY OR STOCK DATA)
        Paragraph itemTableTitle = new Paragraph("REQUESTED STATIONERY ITEMS", FONT_LABEL);
        itemTableTitle.setSpacingBefore(4);
        itemTableTitle.setSpacingAfter(4);
        document.add(itemTableTitle);

        PdfPTable itemTable = new PdfPTable(4);
        itemTable.setWidthPercentage(100);
        itemTable.setWidths(new float[]{0.8f, 3.2f, 1.5f, 1.2f});
        itemTable.setSpacingAfter(10);

        // Header
        addTableHeaderCell(itemTable, "S.No.");
        addTableHeaderCell(itemTable, "Item Name");
        addTableHeaderCell(itemTable, "Requested Quantity");
        addTableHeaderCell(itemTable, "Unit");

        List<StationeryRequest.RequestedItem> items = s.getItemsRequested();
        if (items != null && !items.isEmpty()) {
            int idx = 1;
            for (StationeryRequest.RequestedItem item : items) {
                Color rowBg = (idx % 2 == 1) ? Color.WHITE : BG_SECTION;
                addItemTableCell(itemTable, String.valueOf(idx++), rowBg, Element.ALIGN_CENTER);
                addItemTableCell(itemTable, item.getName(), rowBg, Element.ALIGN_LEFT);
                addItemTableCell(itemTable, String.valueOf(item.getQuantity()), rowBg, Element.ALIGN_CENTER);
                addItemTableCell(itemTable, item.getUnit() != null ? item.getUnit() : "pcs", rowBg, Element.ALIGN_CENTER);
            }
        } else {
            PdfPCell emptyCell = new PdfPCell(new Phrase("No items recorded in this request", FONT_VALUE));
            emptyCell.setColspan(4);
            emptyCell.setPadding(8);
            emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            itemTable.addCell(emptyCell);
        }

        document.add(itemTable);
    }

    private void renderMealsDetails(Document document, MealRequest m) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.3f, 1.7f, 1.3f, 1.7f});
        table.setSpacingAfter(8);

        String mealTypesStr = m.getMealTypes() != null ? String.join(", ", m.getMealTypes()) : "N/A";
        addGridRow(table, "Event / Occasion", m.getEventTitle(), "Event Date", formatCustomDate(m.getDate()));
        addGridRow(table, "Venue / Location", m.getVenue(), "Total Guest Count", String.valueOf(m.getTotalGuests() != null ? m.getTotalGuests() : "N/A"));
        addGridRow(table, "Selected Meal Types", mealTypesStr, "Service Status", m.getStatus());
        addGridRowSpan(table, "Dietary Requirements", m.getSpecialRequirements() != null && !m.getSpecialRequirements().isBlank() ? m.getSpecialRequirements() : "Standard catering required");
        addGridRowSpan(table, "Additional Instructions", m.getAdditionalNotes() != null && !m.getAdditionalNotes().isBlank() ? m.getAdditionalNotes() : "None");

        document.add(table);

        // Itemized Schedule if available
        if (m.getMealItems() != null && !m.getMealItems().isEmpty()) {
            Paragraph scheduleTitle = new Paragraph("MEAL SCHEDULE & MENU BREAKDOWN", FONT_LABEL);
            scheduleTitle.setSpacingBefore(4);
            scheduleTitle.setSpacingAfter(4);
            document.add(scheduleTitle);

            PdfPTable scheduleTable = new PdfPTable(5);
            scheduleTable.setWidthPercentage(100);
            scheduleTable.setWidths(new float[]{0.8f, 1.6f, 1.2f, 1.4f, 2.5f});
            scheduleTable.setSpacingAfter(10);

            addTableHeaderCell(scheduleTable, "S.No.");
            addTableHeaderCell(scheduleTable, "Meal Type");
            addTableHeaderCell(scheduleTable, "Guests");
            addTableHeaderCell(scheduleTable, "Preferred Time");
            addTableHeaderCell(scheduleTable, "Menu / Items Description");

            int idx = 1;
            for (MealRequest.MealItemDetail detail : m.getMealItems()) {
                Color rowBg = (idx % 2 == 1) ? Color.WHITE : BG_SECTION;
                addItemTableCell(scheduleTable, String.valueOf(idx++), rowBg, Element.ALIGN_CENTER);
                addItemTableCell(scheduleTable, detail.getMealType(), rowBg, Element.ALIGN_LEFT);
                addItemTableCell(scheduleTable, String.valueOf(detail.getGuestCount() != null ? detail.getGuestCount() : m.getTotalGuests()), rowBg, Element.ALIGN_CENTER);
                addItemTableCell(scheduleTable, detail.getPreferredTime() != null ? detail.getPreferredTime() : "Scheduled", rowBg, Element.ALIGN_CENTER);
                addItemTableCell(scheduleTable, detail.getDescription() != null ? detail.getDescription() : "Standard College Menu", rowBg, Element.ALIGN_LEFT);
            }
            document.add(scheduleTable);
        }
    }

    private void addApprovalSection(Document document, UnifiedRequestService.UnifiedRequestItem item) throws DocumentException {
        addSectionHeader(document, "3. OFFICIAL APPROVAL & AUTHORIZATION");

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.3f, 1.7f, 1.3f, 1.7f});
        table.setSpacingAfter(10);

        String approver = item.getApprovedBy();
        if (approver == null || approver.isBlank()) {
            approver = determineDefaultApprover(item.getServiceCategory());
        }

        String approvalDate;
        if (item.getApprovedAt() != null) {
            approvalDate = item.getApprovedAt().format(DATE_TIME_FORMATTER);
        } else if (item.getCreatedAt() != null) {
            approvalDate = item.getCreatedAt().format(DATE_TIME_FORMATTER);
        } else {
            approvalDate = LocalDateTime.now().format(DATE_TIME_FORMATTER);
        }

        String remarks = item.getAdminRemarks();
        if (remarks == null || remarks.isBlank()) {
            remarks = "Approved as requested. Authorized for official service delivery.";
        }

        addGridRow(table, "Approval Status", item.getStatus() != null ? item.getStatus().toUpperCase() : "APPROVED", "Approved By", approver);
        addGridRow(table, "Approved Date & Time", approvalDate, "Authority Level", "Institutional Administrator");
        addGridRowSpan(table, "Administrator Remarks", remarks);

        document.add(table);
    }

    private void addSignaturesSection(Document document) throws DocumentException {
        PdfPTable sigTable = new PdfPTable(2);
        sigTable.setWidthPercentage(100);
        sigTable.setWidths(new float[]{1f, 1f});
        sigTable.setSpacingBefore(18);
        sigTable.setKeepTogether(true);

        // Requester block
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        Paragraph leftSign = new Paragraph("\n\n___________________________________\nDepartment In-Charge / Requester\nNarasaraopeta Engineering College", FONT_VALUE);
        leftCell.addElement(leftSign);
        sigTable.addCell(leftCell);

        // Admin block
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph rightSign = new Paragraph("\n\n___________________________________\nAdministrative Officer / Authorised Signatory\nNarasaraopeta Engineering College", FONT_VALUE);
        rightSign.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(rightSign);
        sigTable.addCell(rightCell);

        document.add(sigTable);
    }

    // Helper: Section Banner
    private void addSectionHeader(Document document, String title) throws DocumentException {
        PdfPTable sectionTable = new PdfPTable(1);
        sectionTable.setWidthPercentage(100);
        sectionTable.setSpacingBefore(4);
        sectionTable.setSpacingAfter(4);

        PdfPCell cell = new PdfPCell(new Phrase(title, FONT_SECTION_HEADER));
        cell.setBackgroundColor(PRIMARY_NAVY);
        cell.setPaddingTop(4);
        cell.setPaddingBottom(4);
        cell.setPaddingLeft(6);
        cell.setBorder(Rectangle.NO_BORDER);
        sectionTable.addCell(cell);

        document.add(sectionTable);
    }

    // Helper: 4-column key-value row
    private void addGridRow(PdfPTable table, String label1, String value1, String label2, String value2) {
        PdfPCell c1 = new PdfPCell(new Phrase(label1, FONT_LABEL));
        c1.setBackgroundColor(BG_HEADER);
        c1.setBorderColor(BORDER_GRAY);
        c1.setPadding(4);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(value1 != null ? value1 : "—", FONT_VALUE));
        c2.setBorderColor(BORDER_GRAY);
        c2.setPadding(4);
        table.addCell(c2);

        PdfPCell c3 = new PdfPCell(new Phrase(label2, FONT_LABEL));
        c3.setBackgroundColor(BG_HEADER);
        c3.setBorderColor(BORDER_GRAY);
        c3.setPadding(4);
        table.addCell(c3);

        PdfPCell c4 = new PdfPCell(new Phrase(value2 != null ? value2 : "—", FONT_VALUE));
        c4.setBorderColor(BORDER_GRAY);
        c4.setPadding(4);
        table.addCell(c4);
    }

    // Helper: 2-column key-value row
    private void addGridRow2Col(PdfPTable table, String label, String value) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, FONT_LABEL));
        c1.setBackgroundColor(BG_HEADER);
        c1.setBorderColor(BORDER_GRAY);
        c1.setPadding(4);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(value != null && !value.isBlank() ? value : "—", FONT_VALUE));
        c2.setBorderColor(BORDER_GRAY);
        c2.setPadding(4);
        table.addCell(c2);
    }

    // Helper: Row spanning full width
    private void addGridRowSpan(PdfPTable table, String label, String value) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, FONT_LABEL));
        c1.setBackgroundColor(BG_HEADER);
        c1.setBorderColor(BORDER_GRAY);
        c1.setPadding(4);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(value != null && !value.isBlank() ? value : "—", FONT_VALUE));
        c2.setColspan(3);
        c2.setBorderColor(BORDER_GRAY);
        c2.setPadding(4);
        table.addCell(c2);
    }

    private void addTableHeaderCell(PdfPTable table, String title) {
        PdfPCell cell = new PdfPCell(new Phrase(title, FONT_TABLE_HEADER));
        cell.setBackgroundColor(SECONDARY_BLUE);
        cell.setBorderColor(SECONDARY_BLUE);
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    private void addItemTableCell(PdfPTable table, String text, Color bg, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", FONT_VALUE));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(BORDER_GRAY);
        cell.setPadding(4);
        cell.setHorizontalAlignment(alignment);
        table.addCell(cell);
    }

    private String formatCustomDate(String d) {
        if (d == null || d.isBlank()) return "—";
        try {
            if (d.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
                String[] parts = d.split("-");
                return parts[2] + "-" + parts[1] + "-" + parts[0];
            }
        } catch (Exception ignored) {}
        return d;
    }

    private String formatSlot(String slot) {
        if (slot == null) return "—";
        return switch (slot.toUpperCase()) {
            case "FORENOON" -> "FORENOON (09:00 AM - 12:00 PM)";
            case "AFTERNOON" -> "AFTERNOON (12:00 PM - 04:00 PM)";
            case "FULL_DAY" -> "FULL DAY (09:00 AM - 04:00 PM)";
            default -> slot;
        };
    }

    private String determineDefaultApprover(String serviceCategory) {
        if (serviceCategory == null) return "Administrative Office";
        return switch (serviceCategory.toUpperCase()) {
            case "SEMINAR" -> "Seminar Hall Admin";
            case "ACCOMMODATION" -> "Accommodation Admin";
            case "TRANSPORT" -> "Transport Admin";
            case "STATIONERY" -> "Stationery Admin";
            case "MEALS" -> "Snacks & Meals Admin";
            default -> "Administrative Office";
        };
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

            // 1. Try Classpath
            ClassPathResource res = new ClassPathResource("NEClogo.png");
            if (res.exists()) {
                try (InputStream is = res.getInputStream()) {
                    rawBytes = is.readAllBytes();
                }
            }

            // 2. Fallback to filesystem
            if (rawBytes == null || rawBytes.length == 0) {
                Path directPath = Paths.get("src/main/resources/NEClogo.png");
                if (Files.exists(directPath)) {
                    rawBytes = Files.readAllBytes(directPath);
                } else {
                    Path rootPath = Paths.get("../NEClogo.png");
                    if (Files.exists(rootPath)) {
                        rawBytes = Files.readAllBytes(rootPath);
                    }
                }
            }

            if (rawBytes != null && rawBytes.length > 0) {
                // Try direct OpenPDF Image instantiation
                try {
                    Image directImg = Image.getInstance(rawBytes);
                    cachedLogoPngBytes = rawBytes;
                    return directImg;
                } catch (Exception notDirectlySupported) {
                    // Raw bytes are WebP; decode using ImageIO (supported via TwelveMonkeys ImageIO-WebP)
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
            logger.warn("Could not load NEClogo.png: " + e.getMessage());
        }
        return null;
    }

    // Page Event for Footer: "College Department Services Management System | Request ID: X | Generated On: ... | Page X of Y"
    private static class HeaderFooterPageEvent extends PdfPageEventHelper {
        private final String requestId;
        private PdfTemplate totalPagesTemplate;
        private BaseFont baseFont;

        public HeaderFooterPageEvent(String requestId) {
            this.requestId = requestId;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalPagesTemplate = writer.getDirectContent().createTemplate(30, 16);
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                logger.warn("Error creating page event template: " + e.getMessage());
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();

            // Footer line
            cb.setColorStroke(BORDER_GRAY);
            cb.setLineWidth(0.5f);
            cb.moveTo(36, 32);
            cb.lineTo(document.getPageSize().getWidth() - 36, 32);
            cb.stroke();

            // Footer text
            String leftText = "College Department Services Management System • NEC";
            String centerText = "Request ID: " + (requestId != null ? requestId : "—");
            String genDate = LocalDateTime.now().format(DATE_TIME_FORMATTER);
            String pageText = "Generated: " + genDate + "   Page " + writer.getPageNumber() + " of ";

            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                    new Phrase(leftText, FONT_FOOTER), 36, 20, 0);

            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                    new Phrase(centerText, FONT_FOOTER), document.getPageSize().getWidth() / 2, 20, 0);

            float rightX = document.getPageSize().getWidth() - 36 - 15;
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                    new Phrase(pageText, FONT_FOOTER), rightX, 20, 0);

            // Append the template for total page count
            if (totalPagesTemplate != null) {
                cb.addTemplate(totalPagesTemplate, rightX, 20);
            }
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (totalPagesTemplate != null && baseFont != null) {
                totalPagesTemplate.beginText();
                totalPagesTemplate.setFontAndSize(baseFont, 7.5f);
                totalPagesTemplate.setColorFill(TEXT_MUTED);
                totalPagesTemplate.setTextMatrix(0, 0);
                totalPagesTemplate.showText(String.valueOf(writer.getPageNumber() - 1));
                totalPagesTemplate.endText();
            }
        }
    }
}
