package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.SeminarInspectionSubmitDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.SeminarEventInspection;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.SeminarEventInspectionRepository;
import com.nec.collegeservices.repository.SeminarHallRepository;
import com.nec.collegeservices.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class SeminarInspectionServiceTest {

    private static final ZoneId COLLEGE_ZONE = ZoneId.of("Asia/Kolkata");

    @Mock
    private SeminarEventInspectionRepository inspectionRepository;

    @Mock
    private SeminarBookingRepository bookingRepository;

    @Mock
    private SeminarHallRepository hallRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PdfGenerationService pdfGenerationService;

    @Mock
    private EmailService emailService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private SeminarInspectionService inspectionService;

    private User adminUser;
    private User techUser;
    private User coordUser;
    private User deptUser;
    private SeminarHall hall;
    private SeminarBooking booking;

    @BeforeEach
    public void setup() {
        // Mock Clock set to 2026-11-20 17:00:00 IST (after event conclusion)
        Instant fixedInstant = LocalDate.of(2026, 11, 20)
                .atTime(17, 0)
                .atZone(COLLEGE_ZONE)
                .toInstant();
        inspectionService.setClock(Clock.fixed(fixedInstant, COLLEGE_ZONE));

        adminUser = new User();
        adminUser.setUserId("ADM-001");
        adminUser.setName("AO Administrator");
        adminUser.setRole("AO_ADMIN");
        adminUser.setRoles(List.of("AO_ADMIN"));
        adminUser.setEmail("admin@nec.edu.in");
        adminUser.setActive(true);

        techUser = new User();
        techUser.setUserId("TECH-001");
        techUser.setName("Ramesh Technician");
        techUser.setRole("SEMINAR_TECHNICIAN");
        techUser.setRoles(List.of("SEMINAR_TECHNICIAN"));
        techUser.setAssignedHallIds(List.of("HALL-01"));
        techUser.setEmail("tech@nec.edu.in");
        techUser.setActive(true);

        coordUser = new User();
        coordUser.setUserId("COORD-001");
        coordUser.setName("Dr. Suresh Coordinator");
        coordUser.setRole("SEMINAR_COORDINATOR");
        coordUser.setRoles(List.of("SEMINAR_COORDINATOR"));
        coordUser.setAssignedHallIds(List.of("HALL-01"));
        coordUser.setEmail("coord@nec.edu.in");
        coordUser.setActive(true);

        deptUser = new User();
        deptUser.setUserId("CSE-001");
        deptUser.setName("CSE Department User");
        deptUser.setRole("USER");
        deptUser.setRoles(List.of("USER"));
        deptUser.setDepartment("Computer Science and Engineering");
        deptUser.setEmail("cse@nec.edu.in");
        deptUser.setActive(true);

        hall = new SeminarHall();
        hall.setHallId("HALL-01");
        hall.setName("Visvesvaraya Seminar Hall");
        hall.setLocation("Main Block, 2nd Floor");
        hall.setCoordinatorUserIds(List.of("COORD-001"));
        hall.setActive(true);

        booking = new SeminarBooking();
        booking.setBookingId("SR-9999");
        booking.setHallId("HALL-01");
        booking.setHallName("Visvesvaraya Seminar Hall");
        booking.setHallLocation("Main Block, 2nd Floor");
        booking.setEventTitle("AI & Robotics National Symposium");
        booking.setPurpose("Annual technical conference");
        booking.setDate("2026-11-20");
        booking.setSlot("FORENOON");
        booking.setDepartment("Computer Science and Engineering");
        booking.setRequesterUserId("CSE-001");
        booking.setRequestedBy("CSE Department User");
        booking.setStatus("APPROVED");

        when(hallRepository.findByHallId("HALL-01")).thenReturn(Optional.of(hall));
        when(userRepository.findByUserId("COORD-001")).thenReturn(Optional.of(coordUser));
        when(userRepository.findByUserId("TECH-001")).thenReturn(Optional.of(techUser));
        when(userRepository.findByUserId("CSE-001")).thenReturn(Optional.of(deptUser));
        when(userRepository.findAll()).thenReturn(List.of(adminUser, techUser, coordUser, deptUser));

        when(inspectionRepository.save(any(SeminarEventInspection.class))).thenAnswer(inv -> {
            SeminarEventInspection item = inv.getArgument(0);
            if (item.getId() == null) item.setId(UUID.randomUUID().toString());
            return item;
        });

        when(pdfGenerationService.generateInspectionReportPdf(any())).thenReturn(new byte[]{1, 2, 3, 4});
    }

    @Test
    @DisplayName("Should create single inspection record on single-date booking approval")
    public void testCreateInspectionsForSingleDateBooking() {
        when(inspectionRepository.findByBookingIdAndOccurrenceDate(eq("SR-9999"), eq("2026-11-20")))
                .thenReturn(Optional.empty());

        List<SeminarEventInspection> created = inspectionService.createInspectionsForApprovedBooking(booking);

        assertNotNull(created);
        assertEquals(1, created.size());

        SeminarEventInspection insp = created.get(0);
        assertEquals("SR-9999", insp.getBookingId());
        assertEquals("2026-11-20", insp.getOccurrenceDate());
        assertEquals("HALL-01", insp.getHallId());
        assertEquals("PRE_EVENT_PENDING", insp.getOverallStatus());
        assertEquals("PENDING", insp.getPreEventStatus());
        assertEquals("PENDING", insp.getPostEventStatus());

        // 20 pre-event items, 18 post-event items
        assertNotNull(insp.getPreEventInspection());
        assertEquals(20, insp.getPreEventInspection().getItems().size());
        assertNotNull(insp.getPostEventInspection());
        assertEquals(18, insp.getPostEventInspection().getItems().size());

        verify(inspectionRepository, times(1)).save(any(SeminarEventInspection.class));
    }

    @Test
    @DisplayName("Should create multiple inspection records for multi-date booking occurrences")
    public void testCreateInspectionsForMultiDateBooking() {
        booking.setBookingType("MULTI_DAY");
        booking.setDates(List.of("2026-11-20", "2026-11-21", "2026-11-22"));

        when(inspectionRepository.findByBookingIdAndOccurrenceDate(anyString(), anyString()))
                .thenReturn(Optional.empty());

        List<SeminarEventInspection> created = inspectionService.createInspectionsForApprovedBooking(booking);

        assertEquals(3, created.size());
        assertEquals("2026-11-20", created.get(0).getOccurrenceDate());
        assertEquals(1, created.get(0).getOccurrenceIndex());
        assertEquals("2026-11-21", created.get(1).getOccurrenceDate());
        assertEquals(2, created.get(1).getOccurrenceIndex());
        assertEquals("2026-11-22", created.get(2).getOccurrenceDate());
        assertEquals(3, created.get(2).getOccurrenceIndex());

        verify(inspectionRepository, times(3)).save(any(SeminarEventInspection.class));
    }

    @Test
    @DisplayName("Should prevent duplicate inspection records on repeated approval calls")
    public void testDuplicatePreventionOnApproval() {
        SeminarEventInspection existing = SeminarEventInspection.builder()
                .id("INSP-EXISTING")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .overallStatus("PRE_EVENT_PENDING")
                .build();

        when(inspectionRepository.findByBookingIdAndOccurrenceDate(eq("SR-9999"), eq("2026-11-20")))
                .thenReturn(Optional.of(existing));

        List<SeminarEventInspection> result = inspectionService.createInspectionsForApprovedBooking(booking);

        assertTrue(result.isEmpty());
        verify(inspectionRepository, never()).save(any(SeminarEventInspection.class));
    }

    @Test
    @DisplayName("Should reject pre-event inspection if defective item has missing remarks")
    public void testPreEventValidationFailsWithoutRemarksForDefect() {
        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-001")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .hallId("HALL-01")
                .overallStatus("PRE_EVENT_PENDING")
                .preEventStatus("PENDING")
                .technicianUserId("TECH-001")
                .build();

        when(inspectionRepository.findById("INSP-001")).thenReturn(Optional.of(insp));

        SeminarInspectionSubmitDTO dto = new SeminarInspectionSubmitDTO();
        SeminarEventInspection.InspectionItem item1 = new SeminarEventInspection.InspectionItem(
                "PROJECTOR_WORKING", "Projector working", "AV", "NOT_WORKING", "", null
        );
        dto.setItems(List.of(item1));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                inspectionService.submitPreEventInspection("INSP-001", dto, techUser)
        );

        assertTrue(ex.getMessage().contains("requires specific remarks"));
    }

    @Test
    @DisplayName("Should complete pre-event inspection when valid checklist is submitted")
    public void testSubmitPreEventInspectionSuccess() {
        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-001")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .hallId("HALL-01")
                .overallStatus("PRE_EVENT_PENDING")
                .preEventStatus("PENDING")
                .technicianUserId("TECH-001")
                .build();

        when(inspectionRepository.findById("INSP-001")).thenReturn(Optional.of(insp));

        SeminarInspectionSubmitDTO dto = new SeminarInspectionSubmitDTO();
        SeminarEventInspection.InspectionItem item1 = new SeminarEventInspection.InspectionItem(
                "PROJECTOR_WORKING", "Projector working", "AV", "WORKING", null, null
        );
        SeminarEventInspection.InspectionItem item2 = new SeminarEventInspection.InspectionItem(
                "MIC_1", "Microphone", "AV", "NOT_WORKING", "Battery drained; spare requested", null
        );
        dto.setItems(List.of(item1, item2));
        dto.setOverallNotes("Hall arrangement completed.");

        SeminarEventInspection result = inspectionService.submitPreEventInspection("INSP-001", dto, techUser);

        assertEquals("COMPLETED", result.getPreEventStatus());
        assertEquals("POST_EVENT_PENDING", result.getOverallStatus());
        assertTrue(Boolean.TRUE.equals(result.getPreEventInspection().getIssuesIdentified()));
        assertEquals(2, result.getPreEventInspection().getItems().size());
        assertEquals("TECH-001", result.getPreEventInspection().getInspectedByUserId());

        verify(inspectionRepository, times(1)).save(any(SeminarEventInspection.class));
    }

    @Test
    @DisplayName("Should block post-event inspection if pre-event is not completed")
    public void testPostEventBlockedIfPreEventNotCompleted() {
        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-001")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .hallId("HALL-01")
                .overallStatus("PRE_EVENT_PENDING")
                .preEventStatus("PENDING")
                .postEventStatus("PENDING")
                .slot("FORENOON")
                .technicianUserId("TECH-001")
                .build();

        when(inspectionRepository.findById("INSP-001")).thenReturn(Optional.of(insp));

        SeminarInspectionSubmitDTO dto = new SeminarInspectionSubmitDTO();
        dto.setItems(List.of(new SeminarEventInspection.InspectionItem("K1", "Item", "C", "WORKING", null, null)));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                inspectionService.submitPostEventInspection("INSP-001", dto, techUser)
        );

        assertTrue(ex.getMessage().contains("Pre-event inspection must be completed"));
    }

    @Test
    @DisplayName("Should block post-event inspection before event conclusion time in Asia/Kolkata")
    public void testPostEventBlockedBeforeEventConclusionTime() {
        // Clock is at 10:30 AM IST on event date (Forenoon ends at 12:00 PM)
        Instant clockAt1030 = LocalDate.of(2026, 11, 20)
                .atTime(10, 30)
                .atZone(COLLEGE_ZONE)
                .toInstant();
        inspectionService.setClock(Clock.fixed(clockAt1030, COLLEGE_ZONE));

        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-001")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .hallId("HALL-01")
                .overallStatus("POST_EVENT_PENDING")
                .preEventStatus("COMPLETED")
                .postEventStatus("PENDING")
                .slot("FORENOON")
                .technicianUserId("TECH-001")
                .build();

        when(inspectionRepository.findById("INSP-001")).thenReturn(Optional.of(insp));

        SeminarInspectionSubmitDTO dto = new SeminarInspectionSubmitDTO();
        dto.setItems(List.of(new SeminarEventInspection.InspectionItem("K1", "Item", "C", "WORKING", null, null)));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                inspectionService.submitPostEventInspection("INSP-001", dto, techUser)
        );

        assertTrue(ex.getMessage().contains("cannot be completed before the event has concluded"));
    }

    @Test
    @DisplayName("Should complete post-event inspection, generate PDF, and distribute to Coordinator, Technician, and Department")
    public void testSubmitPostEventInspectionSuccessAndAutomatedDistribution() {
        // Clock is at 17:00 PM IST (after Forenoon conclusion)
        Instant clockAt1700 = LocalDate.of(2026, 11, 20)
                .atTime(17, 0)
                .atZone(COLLEGE_ZONE)
                .toInstant();
        inspectionService.setClock(Clock.fixed(clockAt1700, COLLEGE_ZONE));

        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-001")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .hallId("HALL-01")
                .hallName("Visvesvaraya Seminar Hall")
                .hallLocation("Main Block")
                .eventTitle("AI & Robotics Symposium")
                .overallStatus("POST_EVENT_PENDING")
                .preEventStatus("COMPLETED")
                .postEventStatus("PENDING")
                .slot("FORENOON")
                .coordinatorUserId("COORD-001")
                .technicianUserId("TECH-001")
                .requesterUserId("CSE-001")
                .department("Computer Science and Engineering")
                .build();

        when(inspectionRepository.findById("INSP-001")).thenReturn(Optional.of(insp));
        when(emailService.sendEmailWithAttachment(anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn(true);

        SeminarInspectionSubmitDTO dto = new SeminarInspectionSubmitDTO();
        dto.setItems(List.of(
                new SeminarEventInspection.InspectionItem("KEYS_RETURNED", "Keys returned", "Security", "WORKING", null, null)
        ));
        dto.setEventConducted(true);
        dto.setDamageIdentified(false);
        dto.setOverallNotes("All equipment accounted for and hall secured.");

        SeminarEventInspection result = inspectionService.submitPostEventInspection("INSP-001", dto, techUser);

        assertEquals("COMPLETED", result.getPostEventStatus());
        assertEquals("COMPLETED", result.getOverallStatus());
        assertNotNull(result.getFinalSummary());
        assertTrue(Boolean.TRUE.equals(result.getFinalSummary().getEventConducted()));
        assertFalse(Boolean.TRUE.equals(result.getFinalSummary().getDamageIdentified()));

        // Verify PDF was generated
        verify(pdfGenerationService, atLeastOnce()).generateInspectionReportPdf(any(SeminarEventInspection.class));

        // Verify email distribution with PDF attachment was called for recipients
        verify(emailService, atLeast(1)).sendEmailWithAttachment(
                anyString(), anyList(), contains("Inspection Report"), anyString(), anyString(), contains(".pdf"), any(), eq("SR-9999")
        );

        // Verify in-app notifications sent to all 3 roles
        verify(notificationService, atLeast(3)).sendNotification(
                anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), eq("SUCCESS"), eq("SR-9999")
        );
    }

    @Test
    @DisplayName("Should block PDF report download if inspection is not yet completed")
    public void testGenerateReportPdfBlockedIfIncomplete() {
        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-001")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .overallStatus("PRE_EVENT_PENDING")
                .preEventStatus("PENDING")
                .postEventStatus("PENDING")
                .technicianUserId("TECH-001")
                .build();

        when(inspectionRepository.findById("INSP-001")).thenReturn(Optional.of(insp));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                inspectionService.generateInspectionReportPdf("INSP-001", techUser)
        );

        assertTrue(ex.getMessage().contains("BOTH pre-event and post-event"));
    }

    @Test
    @DisplayName("Should mark overallStatus to CANCELLED on booking cancellation")
    public void testHandleBookingCancellation() {
        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-001")
                .bookingId("SR-9999")
                .occurrenceDate("2026-11-20")
                .overallStatus("PRE_EVENT_PENDING")
                .build();

        when(inspectionRepository.findByBookingId("SR-9999")).thenReturn(List.of(insp));

        inspectionService.handleBookingCancellation("SR-9999");

        assertEquals("CANCELLED", insp.getOverallStatus());
        verify(inspectionRepository, times(1)).save(insp);
    }
}
