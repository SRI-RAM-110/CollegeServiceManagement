package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.SeminarInspectionSubmitDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.SeminarEventInspection;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.SeminarEventInspectionRepository;
import com.nec.collegeservices.repository.SeminarHallRepository;
import com.nec.collegeservices.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;

@Service
public class SeminarInspectionService {

    private static final Logger log = LoggerFactory.getLogger(SeminarInspectionService.class);
    public static final ZoneId COLLEGE_ZONE = ZoneId.of("Asia/Kolkata");

    private Clock clock = Clock.system(COLLEGE_ZONE);

    public void setClock(Clock clock) {
        this.clock = clock != null ? clock : Clock.system(COLLEGE_ZONE);
    }

    private LocalDate getToday() {
        return LocalDate.now(clock.getZone().equals(COLLEGE_ZONE) ? clock : clock.withZone(COLLEGE_ZONE));
    }

    private LocalTime getNowTime() {
        return LocalTime.now(clock.getZone().equals(COLLEGE_ZONE) ? clock : clock.withZone(COLLEGE_ZONE));
    }

    @Autowired
    private SeminarEventInspectionRepository inspectionRepository;

    @Autowired
    private SeminarBookingRepository bookingRepository;

    @Autowired
    private SeminarHallRepository hallRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PdfGenerationService pdfGenerationService;

    // =========================================================================
    // 1. AUTOMATIC INSPECTION INITIALIZATION ON APPROVAL
    // =========================================================================

    public List<SeminarEventInspection> createInspectionsForApprovedBooking(SeminarBooking booking) {
        if (booking == null || booking.getBookingId() == null) {
            return Collections.emptyList();
        }

        SeminarHall hall = hallRepository.findById(booking.getHallId())
                .or(() -> hallRepository.findByHallId(booking.getHallId()))
                .orElse(null);

        // Resolve Assigned Coordinator
        User coordinator = resolveAssignedCoordinator(hall);
        // Resolve Assigned Technician
        User technician = resolveAssignedTechnician(booking.getHallId());

        List<SeminarEventInspection> created = new ArrayList<>();

        if (booking.getOccurrences() != null && !booking.getOccurrences().isEmpty()) {
            for (SeminarBooking.Occurrence occ : booking.getOccurrences()) {
                String occDate = occ.getDate() != null ? occ.getDate().trim() : booking.getDate();
                if (occDate == null || occDate.isBlank()) continue;

                // Duplicate prevention: check if inspection already exists
                Optional<SeminarEventInspection> existing = inspectionRepository.findByBookingIdAndOccurrenceDate(
                        booking.getBookingId(), occDate
                );
                if (existing.isPresent()) {
                    continue;
                }

                SeminarEventInspection insp = buildNewInspection(
                        booking, hall, occDate, occ.getIndex(), coordinator, technician
                );
                created.add(inspectionRepository.save(insp));
            }
        } else if (booking.getDates() != null && !booking.getDates().isEmpty()) {
            int idx = 1;
            for (String occDate : booking.getDates()) {
                if (occDate == null || occDate.isBlank()) continue;
                String trimmedDate = occDate.trim();
                Optional<SeminarEventInspection> existing = inspectionRepository.findByBookingIdAndOccurrenceDate(
                        booking.getBookingId(), trimmedDate
                );
                if (existing.isPresent()) {
                    continue;
                }
                SeminarEventInspection insp = buildNewInspection(
                        booking, hall, trimmedDate, idx++, coordinator, technician
                );
                created.add(inspectionRepository.save(insp));
            }
        } else {
            String date = booking.getDate() != null ? booking.getDate().trim() : booking.getStartDate();
            if (date != null && !date.isBlank()) {
                Optional<SeminarEventInspection> existing = inspectionRepository.findByBookingIdAndOccurrenceDate(
                        booking.getBookingId(), date
                );
                if (existing.isEmpty()) {
                    SeminarEventInspection insp = buildNewInspection(
                            booking, hall, date, 1, coordinator, technician
                    );
                    created.add(inspectionRepository.save(insp));
                }
            }
        }

        return created;
    }

    private SeminarEventInspection buildNewInspection(SeminarBooking booking, SeminarHall hall,
                                                      String date, Integer occIndex,
                                                      User coordinator, User technician) {
        return SeminarEventInspection.builder()
                .bookingId(booking.getBookingId())
                .occurrenceDate(date)
                .occurrenceIndex(occIndex)
                .hallId(booking.getHallId())
                .hallName(booking.getHallName() != null ? booking.getHallName() : (hall != null ? hall.getName() : booking.getHallId()))
                .hallLocation(booking.getHallLocation() != null ? booking.getHallLocation() : (hall != null ? hall.getLocation() : "Narasaraopeta Engineering College"))
                .eventTitle(booking.getEventTitle())
                .purpose(booking.getPurpose())
                .slot(booking.getSlot())
                .startTime(booking.getStartTime() != null ? booking.getStartTime() : (SeminarService.getSlotStartTime(booking.getSlot()) != null ? SeminarService.getSlotStartTime(booking.getSlot()).toString() : null))
                .endTime(booking.getEndTime() != null ? booking.getEndTime() : (SeminarService.getSlotEndTime(booking.getSlot()) != null ? SeminarService.getSlotEndTime(booking.getSlot()).toString() : null))
                .department(booking.getDepartment())
                .requesterUserId(booking.getRequesterUserId())
                .requestedBy(booking.getRequestedBy())
                .coordinatorUserId(coordinator != null ? coordinator.getUserId() : null)
                .coordinatorName(coordinator != null ? (coordinator.getName() != null ? coordinator.getName() : coordinator.getUserId()) : null)
                .technicianUserId(technician != null ? technician.getUserId() : null)
                .technicianName(technician != null ? (technician.getName() != null ? technician.getName() : technician.getUserId()) : null)
                .overallStatus("PRE_EVENT_PENDING")
                .preEventStatus("PENDING")
                .postEventStatus("PENDING")
                .preEventInspection(SeminarEventInspection.InspectionChecklist.builder()
                        .items(buildDefaultPreEventItems())
                        .issuesIdentified(false)
                        .build())
                .postEventInspection(SeminarEventInspection.InspectionChecklist.builder()
                        .items(buildDefaultPostEventItems())
                        .issuesIdentified(false)
                        .build())
                .finalSummary(SeminarEventInspection.FinalSummary.builder()
                        .eventConducted(true)
                        .damageIdentified(false)
                        .issuesIdentified(false)
                        .build())
                .reportMetadata(SeminarEventInspection.ReportMetadata.builder()
                        .reportGenerated(false)
                        .reportDistributed(false)
                        .distributionStatus("PENDING")
                        .build())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // =========================================================================
    // 2. CHECKLIST TEMPLATES (COMPREHENSIVE INSTITUTIONAL AUDIT)
    // =========================================================================

    public List<SeminarEventInspection.InspectionItem> buildDefaultPreEventItems() {
        List<SeminarEventInspection.InspectionItem> list = new ArrayList<>();

        // Hall Arrangement
        list.add(new SeminarEventInspection.InspectionItem("HALL_CLEANED", "Hall cleaned properly", "Hall Arrangement", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("CHAIRS_ARRANGED", "Chairs arranged according to requirements", "Hall Arrangement", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("TABLES_ARRANGED", "Tables arranged properly", "Hall Arrangement", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("PODIUM_STAGE", "Podium and stage prepared", "Hall Arrangement", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("SEATING_CAPACITY", "Seating capacity and arrangement verified", "Hall Arrangement", "WORKING", null, null));

        // Audio and Visual Equipment
        list.add(new SeminarEventInspection.InspectionItem("PROJECTOR_WORKING", "Projector working", "Audio and Visual Equipment", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("PROJECTION_SCREEN", "Projection screen working", "Audio and Visual Equipment", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("MICROPHONES_WORKING", "Microphones working (Handheld / Collar)", "Audio and Visual Equipment", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("SPEAKERS_WORKING", "Speakers working", "Audio and Visual Equipment", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("AUDIO_SYSTEM", "Audio system and amplifiers working", "Audio and Visual Equipment", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("DISPLAY_CONNECTIONS", "Display connections and HDMI cabling working", "Audio and Visual Equipment", "WORKING", null, null));

        // Electrical Facilities
        list.add(new SeminarEventInspection.InspectionItem("LIGHTS_WORKING", "Lights working", "Electrical Facilities", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("FANS_WORKING", "Fans working", "Electrical Facilities", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("AC_WORKING", "Air conditioning working", "Electrical Facilities", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("ELECTRICAL_SOCKETS", "Electrical sockets and power points working", "Electrical Facilities", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("POWER_SUPPLY", "Power supply and backup functioning", "Electrical Facilities", "WORKING", null, null));

        // Other Facilities
        list.add(new SeminarEventInspection.InspectionItem("WIFI_AVAILABLE", "Wi-Fi and internet connectivity available", "Other Facilities", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("DRINKING_WATER", "Drinking water arrangements completed", "Other Facilities", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("DOORS_WINDOWS", "Doors and windows functioning properly", "Other Facilities", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("EMERGENCY_EXITS", "Emergency exits accessible and clear", "Other Facilities", "WORKING", null, null));

        return list;
    }

    public List<SeminarEventInspection.InspectionItem> buildDefaultPostEventItems() {
        List<SeminarEventInspection.InspectionItem> list = new ArrayList<>();

        // Hall Condition
        list.add(new SeminarEventInspection.InspectionItem("HALL_CLEANED_POST", "Hall cleaned after the event", "Hall Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("CHAIRS_RETURNED", "Chairs returned to their proper arrangement", "Hall Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("TABLES_RETURNED", "Tables returned to their original positions", "Hall Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("PODIUM_STAGE_POST", "Podium and stage in proper condition", "Hall Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("NO_DAMAGE_STRUCTURE", "No damage to walls, doors, or windows", "Hall Condition", "WORKING", null, null));

        // Equipment Condition
        list.add(new SeminarEventInspection.InspectionItem("PROJECTOR_RETURNED", "Projector returned and functioning", "Equipment Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("SCREEN_CONDITION", "Projection screen in proper condition", "Equipment Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("MICROPHONES_RETURNED", "Microphones returned and accounted for", "Equipment Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("SPEAKERS_POST", "Speakers functioning and undamaged", "Equipment Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("AUDIO_RETURNED", "Audio equipment returned and stored", "Equipment Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("ELECTRICAL_POST", "Electrical equipment functioning", "Equipment Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("LIGHTS_FANS_POST", "Lights and fans functioning and turned off", "Equipment Condition", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("AC_POST", "Air conditioning functioning and turned off", "Equipment Condition", "WORKING", null, null));

        // Security and Closure
        list.add(new SeminarEventInspection.InspectionItem("KEYS_RETURNED", "Keys returned to security / in-charge", "Security and Closure", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("EQUIPMENT_ACCOUNTED", "All equipment accounted for", "Security and Closure", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("NO_MISSING_ITEMS", "No missing or misplaced items", "Security and Closure", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("DOORS_WINDOWS_SECURED", "Doors and windows secured and locked", "Security and Closure", "WORKING", null, null));
        list.add(new SeminarEventInspection.InspectionItem("HALL_READY_NEXT", "Hall ready for the next booking", "Security and Closure", "WORKING", null, null));

        return list;
    }

    // =========================================================================
    // 3. RETRIEVAL & ROLE-BASED ACCESS
    // =========================================================================

    public List<SeminarEventInspection> getInspections(User user, String status, String hallId) {
        List<SeminarEventInspection> all = inspectionRepository.findAll();

        return all.stream()
                .filter(i -> isUserAuthorizedToView(user, i))
                .filter(i -> hallId == null || hallId.isBlank() || hallId.equalsIgnoreCase(i.getHallId()))
                .filter(i -> {
                    if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) return true;
                    return status.equalsIgnoreCase(i.getOverallStatus())
                            || status.equalsIgnoreCase(i.getPreEventStatus())
                            || status.equalsIgnoreCase(i.getPostEventStatus());
                })
                .sorted(Comparator.comparing(SeminarEventInspection::getOccurrenceDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public SeminarEventInspection getInspectionById(String id, User user) {
        SeminarEventInspection insp = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Seminar event inspection not found: " + id));

        if (!isUserAuthorizedToView(user, insp)) {
            throw new AccessDeniedException("You are not authorized to view this event inspection.");
        }
        return insp;
    }

    public SeminarEventInspection getInspectionByBookingAndDate(String bookingId, String date, User user) {
        SeminarEventInspection insp = inspectionRepository.findByBookingIdAndOccurrenceDate(bookingId, date)
                .orElseThrow(() -> new ResourceNotFoundException("No inspection record found for booking " + bookingId + " on " + date));

        if (!isUserAuthorizedToView(user, insp)) {
            throw new AccessDeniedException("You are not authorized to view this event inspection.");
        }
        return insp;
    }

    private boolean isUserAuthorizedToView(User user, SeminarEventInspection insp) {
        if (user == null) return false;
        if (user.hasRole("AO_ADMIN") || user.hasRole("SEMINAR_ADMIN") || user.hasRole("CREATOR")) {
            return true;
        }
        // Seminar Coordinator
        if (user.hasRole("SEMINAR_COORDINATOR")) {
            if (insp.getCoordinatorUserId() != null && insp.getCoordinatorUserId().equalsIgnoreCase(user.getUserId())) {
                return true;
            }
            if (user.getAssignedHallIds() != null && user.getAssignedHallIds().contains(insp.getHallId())) {
                return true;
            }
        }
        // Seminar Technician
        if (user.hasRole("SEMINAR_TECHNICIAN")) {
            if (insp.getTechnicianUserId() != null && insp.getTechnicianUserId().equalsIgnoreCase(user.getUserId())) {
                return true;
            }
            if (user.getAssignedHallIds() != null && user.getAssignedHallIds().contains(insp.getHallId())) {
                return true;
            }
        }
        // Department Requester
        if (insp.getRequesterUserId() != null && insp.getRequesterUserId().equalsIgnoreCase(user.getUserId())) {
            return true;
        }
        if (user.getDepartment() != null && user.getDepartment().equalsIgnoreCase(insp.getDepartment())) {
            return true;
        }
        return false;
    }

    private void validateTechnicianExecutionAuth(User user, SeminarEventInspection insp) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if (user.hasRole("AO_ADMIN") || user.hasRole("SEMINAR_ADMIN") || user.hasRole("CREATOR")) {
            return;
        }
        if (!user.hasRole("SEMINAR_TECHNICIAN")) {
            throw new AccessDeniedException("Only designated Seminar Equipment Technicians can perform and submit inspections.");
        }
        if (user.getAssignedHallIds() != null && user.getAssignedHallIds().contains(insp.getHallId())) {
            return;
        }
        if (insp.getTechnicianUserId() != null && insp.getTechnicianUserId().equalsIgnoreCase(user.getUserId())) {
            return;
        }
        throw new AccessDeniedException("You are not assigned to inspect Seminar Hall: " + insp.getHallName());
    }

    // =========================================================================
    // 4. SUBMIT PRE-EVENT INSPECTION
    // =========================================================================

    public SeminarEventInspection submitPreEventInspection(String id, SeminarInspectionSubmitDTO dto, User user) {
        SeminarEventInspection insp = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event inspection not found: " + id));

        validateTechnicianExecutionAuth(user, insp);

        if ("CANCELLED".equalsIgnoreCase(insp.getOverallStatus())) {
            throw new BadRequestException("Cannot inspect a cancelled booking occurrence.");
        }

        if (dto == null || dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new BadRequestException("Inspection checklist items are required.");
        }

        // Validate items: Every item must have condition, and remarks are mandatory for defects/missing
        boolean issuesIdentified = false;
        for (SeminarEventInspection.InspectionItem item : dto.getItems()) {
            if (item.getCondition() == null || item.getCondition().isBlank()) {
                throw new BadRequestException("Item '" + item.getName() + "' requires a condition evaluation.");
            }
            String cond = item.getCondition().toUpperCase().trim();
            if ("NOT_WORKING".equals(cond) || "NOT_AVAILABLE".equals(cond)) {
                issuesIdentified = true;
                if (item.getRemarks() == null || item.getRemarks().trim().isBlank()) {
                    throw new BadRequestException("Item '" + item.getName() + "' is marked as " + cond + " and requires specific remarks explaining the defect or absence.");
                }
            }
        }

        SeminarEventInspection.InspectionChecklist pre = insp.getPreEventInspection() != null
                ? insp.getPreEventInspection()
                : new SeminarEventInspection.InspectionChecklist();

        pre.setInspectedByUserId(user.getUserId());
        pre.setInspectedByName(user.getName() != null ? user.getName() : user.getUserId());
        pre.setInspectedAt(LocalDateTime.now(clock));
        pre.setItems(dto.getItems());
        pre.setOverallNotes(dto.getOverallNotes());
        pre.setMaintenanceRequestId(dto.getMaintenanceRequestId());
        pre.setMaintenanceNotes(dto.getMaintenanceNotes());
        pre.setIssuesIdentified(issuesIdentified);

        insp.setPreEventInspection(pre);
        insp.setPreEventStatus("COMPLETED");

        // Technician stamp
        if (insp.getTechnicianUserId() == null) {
            insp.setTechnicianUserId(user.getUserId());
            insp.setTechnicianName(user.getName() != null ? user.getName() : user.getUserId());
        }

        if ("COMPLETED".equalsIgnoreCase(insp.getPostEventStatus())) {
            insp.setOverallStatus("COMPLETED");
        } else {
            insp.setOverallStatus("POST_EVENT_PENDING");
        }

        insp.setUpdatedAt(LocalDateTime.now(clock));
        return inspectionRepository.save(insp);
    }

    // =========================================================================
    // 5. SUBMIT POST-EVENT INSPECTION
    // =========================================================================

    public SeminarEventInspection submitPostEventInspection(String id, SeminarInspectionSubmitDTO dto, User user) {
        SeminarEventInspection insp = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event inspection not found: " + id));

        validateTechnicianExecutionAuth(user, insp);

        if ("CANCELLED".equalsIgnoreCase(insp.getOverallStatus())) {
            throw new BadRequestException("Cannot inspect a cancelled booking occurrence.");
        }

        // Rule: Pre-event inspection must be completed first
        if (!"COMPLETED".equalsIgnoreCase(insp.getPreEventStatus())) {
            throw new BadRequestException("Pre-event inspection must be completed before performing post-event inspection.");
        }

        // Rule: Post-event inspection cannot be completed before the event has actually concluded!
        LocalDate today = getToday();
        LocalTime now = getNowTime();
        LocalDate occDate = LocalDate.parse(insp.getOccurrenceDate().trim());

        if (today.isBefore(occDate)) {
            throw new BadRequestException("Post-event inspection cannot be completed before the scheduled event date (" + insp.getOccurrenceDate() + ").");
        }

        LocalTime sessionEndTime = SeminarService.getSlotEndTime(insp.getSlot());
        if (sessionEndTime == null) sessionEndTime = LocalTime.of(16, 0);

        if (today.isEqual(occDate) && now.isBefore(sessionEndTime)) {
            throw new BadRequestException("Post-event inspection cannot be completed before the event has concluded. Scheduled conclusion time is "
                    + sessionEndTime + " IST.");
        }

        if (dto == null || dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new BadRequestException("Post-event checklist items are required.");
        }

        // Validate items
        boolean issuesIdentified = false;
        for (SeminarEventInspection.InspectionItem item : dto.getItems()) {
            if (item.getCondition() == null || item.getCondition().isBlank()) {
                throw new BadRequestException("Item '" + item.getName() + "' requires a condition evaluation.");
            }
            String cond = item.getCondition().toUpperCase().trim();
            if ("NOT_WORKING".equals(cond) || "NOT_AVAILABLE".equals(cond)) {
                issuesIdentified = true;
                if (item.getRemarks() == null || item.getRemarks().trim().isBlank()) {
                    throw new BadRequestException("Item '" + item.getName() + "' is marked as " + cond + " and requires specific remarks explaining the defect, damage, or absence.");
                }
            }
        }

        SeminarEventInspection.InspectionChecklist post = insp.getPostEventInspection() != null
                ? insp.getPostEventInspection()
                : new SeminarEventInspection.InspectionChecklist();

        post.setInspectedByUserId(user.getUserId());
        post.setInspectedByName(user.getName() != null ? user.getName() : user.getUserId());
        post.setInspectedAt(LocalDateTime.now(clock));
        post.setItems(dto.getItems());
        post.setOverallNotes(dto.getOverallNotes());
        post.setMaintenanceRequestId(dto.getMaintenanceRequestId());
        post.setMaintenanceNotes(dto.getMaintenanceNotes());
        post.setIssuesIdentified(issuesIdentified);

        insp.setPostEventInspection(post);
        insp.setPostEventStatus("COMPLETED");
        insp.setOverallStatus("COMPLETED");

        boolean anyDamage = Boolean.TRUE.equals(dto.getDamageIdentified()) || issuesIdentified;
        boolean conducted = dto.getEventConducted() == null || Boolean.TRUE.equals(dto.getEventConducted());

        SeminarEventInspection.FinalSummary summary = insp.getFinalSummary() != null
                ? insp.getFinalSummary()
                : new SeminarEventInspection.FinalSummary();
        summary.setEventConducted(conducted);
        summary.setDamageIdentified(anyDamage);
        summary.setIssuesIdentified(anyDamage || Boolean.TRUE.equals(insp.getPreEventInspection().getIssuesIdentified()));
        summary.setTechnicianFinalRemarks(dto.getTechnicianFinalRemarks() != null ? dto.getTechnicianFinalRemarks() : dto.getOverallNotes());
        summary.setCompletedAt(LocalDateTime.now(clock));
        insp.setFinalSummary(summary);

        insp.setUpdatedAt(LocalDateTime.now(clock));

        // Save completed inspection
        SeminarEventInspection saved = inspectionRepository.save(insp);

        // Automatically trigger PDF generation & distribution
        distributeInspectionReport(saved);

        return saved;
    }

    // =========================================================================
    // 6. REPORT PDF GENERATION & AUTOMATED DISTRIBUTION
    // =========================================================================

    public byte[] generateInspectionReportPdf(String id, User user) {
        SeminarEventInspection insp = getInspectionById(id, user);

        if (!"COMPLETED".equalsIgnoreCase(insp.getPreEventStatus()) || !"COMPLETED".equalsIgnoreCase(insp.getPostEventStatus())) {
            throw new BadRequestException("Event Inspection Report can only be generated after BOTH pre-event and post-event inspections are completed.");
        }

        return pdfGenerationService.generateInspectionReportPdf(insp);
    }

    public void distributeInspectionReport(SeminarEventInspection inspection) {
        if (inspection == null || !"COMPLETED".equalsIgnoreCase(inspection.getOverallStatus())) {
            return;
        }

        // Duplicate prevention: If already successfully distributed, do not send duplicates
        if (inspection.getReportMetadata() != null && inspection.getReportMetadata().isReportDistributed()) {
            log.info("Report distribution already completed for inspection {}", inspection.getId());
            return;
        }

        try {
            byte[] pdfBytes = pdfGenerationService.generateInspectionReportPdf(inspection);

            SeminarEventInspection.ReportMetadata meta = inspection.getReportMetadata() != null
                    ? inspection.getReportMetadata()
                    : new SeminarEventInspection.ReportMetadata();

            meta.setReportGenerated(true);
            meta.setReportGeneratedAt(LocalDateTime.now(clock));

            String eventName = inspection.getEventTitle() != null ? inspection.getEventTitle() : "Seminar Event";
            String occInfo = inspection.getOccurrenceDate() + " (" + inspection.getSlot() + ")";
            String title = "Seminar Event Inspection Report: " + inspection.getHallName();
            String msg = "The official pre-event and post-event inspection report for '" + eventName + "' at "
                    + inspection.getHallName() + " on " + occInfo + " has been completed and is now available for download.";

            List<String> targetEmails = new ArrayList<>();
            List<String> targetUserIds = new ArrayList<>();

            // 1. Assigned Seminar Coordinator
            if (inspection.getCoordinatorUserId() != null) {
                targetUserIds.add(inspection.getCoordinatorUserId());
                notificationService.sendNotification(
                        "SEMINAR_COORDINATOR",
                        "ADMIN",
                        inspection.getCoordinatorUserId(),
                        title,
                        msg,
                        "Seminar Hall",
                        "SUCCESS",
                        inspection.getBookingId()
                );
                userRepository.findByUserId(inspection.getCoordinatorUserId()).ifPresent(u -> {
                    if (u.getEmail() != null && !u.getEmail().isBlank()) targetEmails.add(u.getEmail().trim());
                });
            }

            // 2. Seminar Technician
            if (inspection.getTechnicianUserId() != null) {
                targetUserIds.add(inspection.getTechnicianUserId());
                notificationService.sendNotification(
                        "SEMINAR_TECHNICIAN",
                        "ADMIN",
                        inspection.getTechnicianUserId(),
                        title,
                        msg,
                        "Seminar Hall",
                        "SUCCESS",
                        inspection.getBookingId()
                );
                userRepository.findByUserId(inspection.getTechnicianUserId()).ifPresent(u -> {
                    if (u.getEmail() != null && !u.getEmail().isBlank()) targetEmails.add(u.getEmail().trim());
                });
            }

            // 3. Department User / Requester
            if (inspection.getRequesterUserId() != null) {
                targetUserIds.add(inspection.getRequesterUserId());
                notificationService.sendNotification(
                        "DEPARTMENT_USER",
                        inspection.getDepartment(),
                        inspection.getRequesterUserId(),
                        title,
                        msg,
                        "Seminar Hall",
                        "SUCCESS",
                        inspection.getBookingId()
                );
                userRepository.findByUserId(inspection.getRequesterUserId()).ifPresent(u -> {
                    if (u.getEmail() != null && !u.getEmail().isBlank()) targetEmails.add(u.getEmail().trim());
                });
            }

            // Send Email with PDF Attachment
            String pdfFilename = "NEC_Inspection_Report_" + inspection.getBookingId() + "_" + inspection.getOccurrenceDate() + ".pdf";
            String emailHtml = buildReportEmailHtml(inspection);
            String emailText = buildReportEmailPlainText(inspection);

            boolean anySent = false;
            for (String email : targetEmails) {
                boolean sent = emailService.sendEmailWithAttachment(
                        email,
                        Collections.emptyList(),
                        "[NEC Inspection] Event Inspection Report — " + inspection.getHallName() + " (" + inspection.getBookingId() + ")",
                        emailHtml,
                        emailText,
                        pdfFilename,
                        pdfBytes,
                        inspection.getBookingId()
                );
                if (sent) anySent = true;
            }

            meta.setReportDistributed(true);
            meta.setDistributionStatus(anySent || targetEmails.isEmpty() ? "SENT" : "PARTIAL");
            meta.setDistributedAt(LocalDateTime.now(clock));
            meta.setDistributedToEmails(targetEmails);
            meta.setDistributedToUserIds(targetUserIds);
            meta.setDistributionError(null);

            inspection.setReportMetadata(meta);
            inspectionRepository.save(inspection);

        } catch (Exception e) {
            log.error("Failed to distribute inspection report for {}: {}", inspection.getId(), e.getMessage());
            SeminarEventInspection.ReportMetadata meta = inspection.getReportMetadata() != null
                    ? inspection.getReportMetadata()
                    : new SeminarEventInspection.ReportMetadata();
            meta.setDistributionStatus("FAILED");
            meta.setDistributionError(e.getMessage());
            inspection.setReportMetadata(meta);
            inspectionRepository.save(inspection);
        }
    }

    public SeminarEventInspection retryDistribution(String id, User user) {
        SeminarEventInspection insp = getInspectionById(id, user);

        if (!user.hasRole("AO_ADMIN") && !user.hasRole("SEMINAR_ADMIN") && !user.hasRole("SEMINAR_TECHNICIAN") && !user.hasRole("SEMINAR_COORDINATOR")) {
            throw new AccessDeniedException("Unauthorized to retry report distribution.");
        }

        if (!"COMPLETED".equalsIgnoreCase(insp.getOverallStatus())) {
            throw new BadRequestException("Cannot distribute report for an incomplete inspection.");
        }

        // Reset distributed flag to allow re-send
        if (insp.getReportMetadata() != null) {
            insp.getReportMetadata().setReportDistributed(false);
        }
        distributeInspectionReport(insp);
        return inspectionRepository.findById(id).orElse(insp);
    }

    public void handleBookingCancellation(String bookingId) {
        if (bookingId == null || bookingId.isBlank()) return;
        List<SeminarEventInspection> list = inspectionRepository.findByBookingId(bookingId);
        for (SeminarEventInspection insp : list) {
            insp.setOverallStatus("CANCELLED");
            insp.setUpdatedAt(LocalDateTime.now(clock));
            inspectionRepository.save(insp);
        }
    }

    // =========================================================================
    // 7. RESOLUTION & EMAIL TEMPLATES
    // =========================================================================

    private User resolveAssignedCoordinator(SeminarHall hall) {
        if (hall == null) return null;
        if (hall.getCoordinatorUserIds() != null && !hall.getCoordinatorUserIds().isEmpty()) {
            for (String coordId : hall.getCoordinatorUserIds()) {
                Optional<User> u = userRepository.findByUserId(coordId);
                if (u.isPresent() && Boolean.TRUE.equals(u.get().getActive())) {
                    return u.get();
                }
            }
        }
        // Fallback: search for active coordinator assigned to this hall
        return userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .filter(u -> u.hasRole("SEMINAR_COORDINATOR"))
                .filter(u -> u.getAssignedHallIds() != null && u.getAssignedHallIds().contains(hall.getHallId()))
                .findFirst()
                .orElse(null);
    }

    private User resolveAssignedTechnician(String hallId) {
        if (hallId == null) return null;
        return userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .filter(u -> u.hasRole("SEMINAR_TECHNICIAN"))
                .filter(u -> u.getAssignedHallIds() != null && u.getAssignedHallIds().contains(hallId))
                .findFirst()
                .orElse(null);
    }

    private String buildReportEmailHtml(SeminarEventInspection inspection) {
        String occIndex = inspection.getOccurrenceIndex() != null ? " (Session #" + inspection.getOccurrenceIndex() + ")" : "";
        return "<html><body style='font-family: Arial, sans-serif; color: #1e293b; background: #f8fafc; padding: 20px;'>"
                + "<div style='max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px;'>"
                + "<h2 style='color: #0f1e3c; margin-top: 0;'>NARASARAOPETA ENGINEERING COLLEGE</h2>"
                + "<h4 style='color: #0e7490; margin-top: -8px;'>Seminar Event Inspection Report</h4>"
                + "<p>Dear Team,</p>"
                + "<p>Both <strong>Pre-Event</strong> and <strong>Post-Event</strong> inspections have been completed and verified for the following seminar booking:</p>"
                + "<table style='width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;'>"
                + "<tr><td style='padding: 6px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: bold;'>Booking ID</td><td style='padding: 6px; border: 1px solid #cbd5e1;'>" + inspection.getBookingId() + occIndex + "</td></tr>"
                + "<tr><td style='padding: 6px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: bold;'>Event Title</td><td style='padding: 6px; border: 1px solid #cbd5e1;'>" + inspection.getEventTitle() + "</td></tr>"
                + "<tr><td style='padding: 6px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: bold;'>Venue</td><td style='padding: 6px; border: 1px solid #cbd5e1;'>" + inspection.getHallName() + " (" + inspection.getHallLocation() + ")</td></tr>"
                + "<tr><td style='padding: 6px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: bold;'>Date & Session</td><td style='padding: 6px; border: 1px solid #cbd5e1;'>" + inspection.getOccurrenceDate() + " • " + inspection.getSlot() + "</td></tr>"
                + "<tr><td style='padding: 6px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: bold;'>Department</td><td style='padding: 6px; border: 1px solid #cbd5e1;'>" + inspection.getDepartment() + "</td></tr>"
                + "<tr><td style='padding: 6px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: bold;'>Technician</td><td style='padding: 6px; border: 1px solid #cbd5e1;'>" + (inspection.getTechnicianName() != null ? inspection.getTechnicianName() : "Assigned Technician") + "</td></tr>"
                + "</table>"
                + "<p>The official comprehensive inspection report document has been generated and attached to this email as a PDF. You can also view and download it anytime from the NEC Service Management Portal.</p>"
                + "<p style='margin-top: 24px; font-size: 12px; color: #64748b;'>College Department Services Management System • Narasaraopeta Engineering College</p>"
                + "</div></body></html>";
    }

    private String buildReportEmailPlainText(SeminarEventInspection inspection) {
        return "NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)\n"
                + "Seminar Event Inspection Report\n\n"
                + "Pre-event and post-event inspections have been successfully completed.\n"
                + "Booking ID: " + inspection.getBookingId() + "\n"
                + "Event: " + inspection.getEventTitle() + "\n"
                + "Venue: " + inspection.getHallName() + "\n"
                + "Date: " + inspection.getOccurrenceDate() + " (" + inspection.getSlot() + ")\n"
                + "Department: " + inspection.getDepartment() + "\n\n"
                + "The official inspection PDF report is attached to this email and available on the portal.";
    }
}

