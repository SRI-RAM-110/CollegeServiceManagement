package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.SeminarInspectionSubmitDTO;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CoordinatorAndInspectionRemediationTest {

    private static final ZoneId COLLEGE_ZONE = ZoneId.of("Asia/Kolkata");

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeminarHallRepository hallRepository;

    @Mock
    private SeminarBookingRepository bookingRepository;

    @Mock
    private SeminarEventInspectionRepository inspectionRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private PdfGenerationService pdfGenerationService;

    @Mock
    private EmailLogRepository emailLogRepository;

    @InjectMocks
    private SeminarService seminarService;

    @InjectMocks
    private SeminarInspectionService inspectionService;

    @BeforeEach
    void setUp() {
        // Set clock to fixed time
        Instant fixedInstant = LocalDate.of(2026, 11, 21).atTime(18, 0).atZone(COLLEGE_ZONE).toInstant();
        Clock fixedClock = Clock.fixed(fixedInstant, COLLEGE_ZONE);
        seminarService.setClock(fixedClock);
        inspectionService.setClock(fixedClock);
    }

    @Test
    @DisplayName("Should resolve coordinator via user.assignedHallIds when hall.coordinatorUserIds is empty")
    void testBidirectionalCoordinatorResolutionFallback() {
        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Block 2 Seminar hall")
                .coordinatorUserIds(Collections.emptyList())
                .build();

        User coordinator = User.builder()
                .userId("csehod")
                .name("Dr. K. S. Reddy")
                .email("csehod@nrtec.in")
                .roles(List.of("HOD", "SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-1"))
                .active(true)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(coordinator));

        Set<String> resolved = seminarService.getCoordinatorUserIdsForHall(hall);

        assertNotNull(resolved);
        assertEquals(1, resolved.size());
        assertTrue(resolved.contains("csehod"));
    }

    @Test
    @DisplayName("Should stamp inspecting technician on post-event inspection if technicianUserId was null")
    void testPostEventInspectionStampsTechnician() {
        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-POST-1")
                .bookingId("SEM-1001")
                .occurrenceDate("2026-11-21")
                .slot("MORNING")
                .hallId("SH-1")
                .hallName("Block 2 Seminar hall")
                .overallStatus("POST_EVENT_PENDING")
                .preEventStatus("COMPLETED")
                .postEventStatus("PENDING")
                .technicianUserId(null)
                .preEventInspection(SeminarEventInspection.InspectionChecklist.builder()
                        .issuesIdentified(false)
                        .build())
                .build();

        User technician = User.builder()
                .userId("seminar_tech1")
                .name("M. K. Rao")
                .email("seminartech1@nrtec.in")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .assignedHallIds(List.of("SH-1"))
                .active(true)
                .build();

        when(inspectionRepository.findById("INSP-POST-1")).thenReturn(Optional.of(insp));
        when(inspectionRepository.save(any(SeminarEventInspection.class))).thenAnswer(i -> i.getArgument(0));

        SeminarInspectionSubmitDTO dto = new SeminarInspectionSubmitDTO();
        dto.setItems(List.of(
                new SeminarEventInspection.InspectionItem("MIC", "Wireless Mic", "AV", "WORKING", null, null)
        ));
        dto.setEventConducted(true);
        dto.setDamageIdentified(false);
        dto.setOverallNotes("All clean and verified.");

        SeminarEventInspection result = inspectionService.submitPostEventInspection("INSP-POST-1", dto, technician);

        assertNotNull(result);
        assertEquals("seminar_tech1", result.getTechnicianUserId());
        assertEquals("M. K. Rao", result.getTechnicianName());
        assertEquals("COMPLETED", result.getPostEventStatus());
        assertEquals("COMPLETED", result.getOverallStatus());
    }

    @Test
    @DisplayName("EmailService should skip generic notification email for Seminar Event Inspection Report")
    void testEmailServiceSkipsInspectionReportGenericEmail() {
        EmailService realEmailService = new EmailService();
        ReflectionTestUtils.setField(realEmailService, "mailEnabled", true);

        Notification notification = Notification.builder()
                .id("NOTIF-INSP-01")
                .title("Seminar Event Inspection Report: Block 2 Seminar hall")
                .message("The official report is available.")
                .recipientUserId("csehod")
                .build();

        // Should return early and not throw any exception or attempt user resolution
        assertDoesNotThrow(() -> realEmailService.processAndSendNotificationEmail(notification));
    }
}
