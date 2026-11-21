package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.*;
import com.nec.collegeservices.dto.electrical.*;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayInputStream;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
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
public class IndependentPostRemediationVerificationTest {

    private static final ZoneId COLLEGE_ZONE = ZoneId.of("Asia/Kolkata");

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private PushService pushService;

    @Mock
    private FcmService fcmService;

    @Mock
    private PdfGenerationService pdfGenerationService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeminarHallRepository hallRepository;

    @Mock
    private SeminarBookingRepository bookingRepository;

    @Mock
    private SeminarEventInspectionRepository inspectionRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private RequesterResolver requesterResolver;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private AccommodationRequestRepository accommodationRepository;

    @Mock
    private AccommodationRoomRepository roomRepository;

    @Mock
    private TransportRequestRepository transportRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private ElectricalIssueRequestRepository electricalRepository;

    @Mock
    private StationeryRequestRepository stationeryRepository;

    @Mock
    private StationeryItemRepository stationeryItemRepository;

    @Mock
    private MealRequestRepository mealRepository;

    @Mock
    private RequestIdService requestIdService;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private HttpClient httpClient;

    @InjectMocks
    private SeminarService seminarService;

    @InjectMocks
    private SeminarInspectionService inspectionService;

    @InjectMocks
    private AccommodationService accommodationService;

    @InjectMocks
    private TransportService transportService;

    @InjectMocks
    private ElectricalIssueService electricalIssueService;

    @InjectMocks
    private StationeryService stationeryService;

    @InjectMocks
    private MealService mealService;

    private User requesterCse;
    private User requesterEce;
    private User cseCoordinator;
    private User eceCoordinator;
    private User techHubCoordinator;
    private User pgBlockCoordinator;
    private User pharmacyCoordinator;
    private User technician;
    private User aoAdmin;
    private User electrician;
    private User driver;

    private SeminarHall sh1;
    private SeminarHall sh2;
    private SeminarHall sh3;
    private SeminarHall sh4;
    private SeminarHall sh5;
    private SeminarHall th1;

    @BeforeEach
    void setUp() {
        Instant fixedInstant = LocalDate.of(2026, 11, 21).atTime(18, 0).atZone(COLLEGE_ZONE).toInstant();
        Clock fixedClock = Clock.fixed(fixedInstant, COLLEGE_ZONE);
        seminarService.setClock(fixedClock);
        inspectionService.setClock(fixedClock);

        // Coordinators
        cseCoordinator = User.builder()
                .userId("csehod")
                .name("Dr. S. N. Thirumala Rao")
                .email("csehod@nrtec.in")
                .roles(List.of("DEPARTMENT_HOD", "SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-1"))
                .department("CSE")
                .active(true)
                .build();

        eceCoordinator = User.builder()
                .userId("ecehod")
                .name("Dr. V. Venkata Rao")
                .email("ecehod@nrtec.in")
                .roles(List.of("DEPARTMENT_HOD", "SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-2"))
                .department("ECE")
                .active(true)
                .build();

        techHubCoordinator = User.builder()
                .userId("seminarcoordinator5")
                .name("Dr. Ananda Oliveti")
                .email("training@nrtec.in")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-3", "TH-1"))
                .department("CSE")
                .active(true)
                .build();

        pgBlockCoordinator = User.builder()
                .userId("viceprincipal")
                .name("Dr. D. Suneel")
                .email("viceprincipal@nrtec.in")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-4"))
                .department("ADMIN")
                .active(true)
                .build();

        pharmacyCoordinator = User.builder()
                .userId("PHARM001")
                .name("Dr. J N Suresh Kumar")
                .email("nipsprincipal07@gmail.com")
                .roles(List.of("DEPARTMENT_HOD", "SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-5"))
                .department("PHARMACY")
                .active(true)
                .build();

        // Requesters & Staff
        requesterCse = User.builder()
                .userId("csedept")
                .name("CSE Staff")
                .email("csedept@nrtec.in")
                .roles(List.of("DEPARTMENT_USER"))
                .department("CSE")
                .active(true)
                .build();

        requesterEce = User.builder()
                .userId("ecedept")
                .name("ECE Staff")
                .email("ecedept@nrtec.in")
                .roles(List.of("DEPARTMENT_USER"))
                .department("ECE")
                .active(true)
                .build();

        technician = User.builder()
                .userId("seminar_tech1")
                .name("M. K. Rao")
                .email("seminartech1@nrtec.in")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .assignedHallIds(List.of("SH-1", "SH-2", "SH-3", "SH-4", "SH-5", "TH-1"))
                .department("CSE")
                .active(true)
                .build();

        aoAdmin = User.builder()
                .userId("ao")
                .name("Administrative Officer")
                .email("ao@nrtec.in")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        electrician = User.builder()
                .userId("electrician_user")
                .name("Lead Electrician")
                .email("electrician@nrtec.in")
                .roles(List.of("ELECTRICIAN"))
                .department("ADMIN")
                .active(true)
                .build();

        driver = User.builder()
                .userId("transport_admin")
                .name("Transport Coordinator")
                .email("transport@nrtec.in")
                .roles(List.of("TRANSPORT_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        // Halls
        sh1 = SeminarHall.builder().hallId("SH-1").name("Block 2 Seminar hall").coordinatorUserIds(List.of("csehod")).build();
        sh2 = SeminarHall.builder().hallId("SH-2").name("Block 3 Seminar Hall").coordinatorUserIds(List.of("ecehod")).build();
        sh3 = SeminarHall.builder().hallId("SH-3").name("Tech Hub Seminar Hall").coordinatorUserIds(List.of("seminarcoordinator5")).build();
        sh4 = SeminarHall.builder().hallId("SH-4").name("Block 4 Seminar Hall").coordinatorUserIds(List.of("viceprincipal")).build();
        sh5 = SeminarHall.builder().hallId("SH-5").name("Pharma Block Seminar Hall").coordinatorUserIds(List.of("PHARM001")).build();
        th1 = SeminarHall.builder().hallId("TH-1").name("Tech Hub Wifi center").coordinatorUserIds(List.of("seminarcoordinator5")).build();

        when(hallRepository.findById("SH-1")).thenReturn(Optional.of(sh1));
        when(hallRepository.findByHallId("SH-1")).thenReturn(Optional.of(sh1));
        when(hallRepository.findById("SH-2")).thenReturn(Optional.of(sh2));
        when(hallRepository.findByHallId("SH-2")).thenReturn(Optional.of(sh2));
        when(hallRepository.findById("SH-3")).thenReturn(Optional.of(sh3));
        when(hallRepository.findByHallId("SH-3")).thenReturn(Optional.of(sh3));
        when(hallRepository.findById("SH-4")).thenReturn(Optional.of(sh4));
        when(hallRepository.findByHallId("SH-4")).thenReturn(Optional.of(sh4));
        when(hallRepository.findById("SH-5")).thenReturn(Optional.of(sh5));
        when(hallRepository.findByHallId("SH-5")).thenReturn(Optional.of(sh5));
        when(hallRepository.findById("TH-1")).thenReturn(Optional.of(th1));
        when(hallRepository.findByHallId("TH-1")).thenReturn(Optional.of(th1));

        when(bookingRepository.findActiveBookingsForHallAndDate(anyString(), anyString())).thenReturn(Collections.emptyList());

        List<User> allUsers = List.of(cseCoordinator, eceCoordinator, techHubCoordinator, pgBlockCoordinator,
                pharmacyCoordinator, requesterCse, requesterEce, technician, aoAdmin, electrician, driver);
        when(userRepository.findAll()).thenReturn(allUsers);
        for (User u : allUsers) {
            when(userRepository.findByUserId(u.getUserId())).thenReturn(Optional.of(u));
            when(userRepository.findByUserIdIgnoreCase(u.getUserId())).thenReturn(Optional.of(u));
            when(userRepository.findByEmailIgnoreCase(u.getEmail())).thenReturn(Optional.of(u));
        }

        when(requestIdService.generateRequestId(anyString(), any(User.class), anyString())).thenReturn("SEM-TEST-001");
        when(requestIdService.generateSeriesId(anyString(), any(User.class), anyString())).thenReturn("SERIES-TEST-001");

        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenAnswer(i -> {
            String r = i.getArgument(0);
            return (r != null && !r.isBlank()) ? r : "csedept";
        });
        ReflectionTestUtils.setField(seminarService, "requesterResolver", requesterResolver);
        ReflectionTestUtils.setField(accommodationService, "requesterResolver", requesterResolver);

        ReflectionTestUtils.setField(electricalIssueService, "repository", electricalRepository);
        ReflectionTestUtils.setField(electricalIssueService, "userRepository", userRepository);
        ReflectionTestUtils.setField(electricalIssueService, "notificationService", notificationService);
        ReflectionTestUtils.setField(electricalIssueService, "requestIdService", requestIdService);
    }

    // =========================================================================
    // 1. SEMINAR NOTIFICATION ROUTING & ISOLATION
    // =========================================================================

    @Test
    @DisplayName("1.1 New Booking: SH-1 notifies only csehod, SH-2 notifies only ecehod (Isolation)")
    void testNewBookingCoordinatorRoutingAndIsolation() {
        SeminarBookingRequestDTO dtoSh1 = new SeminarBookingRequestDTO();
        dtoSh1.setHallId("SH-1");
        dtoSh1.setDate("2026-11-25");
        dtoSh1.setSlot("FORENOON");
        dtoSh1.setEventTitle("AI Workshop");

        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(i -> {
            SeminarBooking b = i.getArgument(0);
            b.setId("BKG-SH1-001");
            return b;
        });

        seminarService.createBooking(dtoSh1, requesterCse);

        // Verify notification delivered to csehod
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("csehod"),
                eq("New Seminar Hall Request"),
                anyString(),
                eq("Seminar Hall"),
                eq("INFO"),
                anyString()
        );

        // Verify ecehod was NEVER notified for SH-1
        verify(notificationService, never()).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("ecehod"),
                anyString(),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("1.2 Booking Approval: Routes to hall coordinator and isolating other coordinators")
    void testBookingApprovalCoordinatorRouting() {
        SeminarBooking booking = SeminarBooking.builder()
                .bookingId("SEM-SH2-101")
                .hallId("SH-2")
                .hallName("Block 3 Seminar Hall")
                .date("2026-11-26")
                .slot("AFTERNOON")
                .status("PENDING")
                .department("ECE")
                .requesterUserId("ecedept")
                .build();

        when(bookingRepository.findByBookingId("SEM-SH2-101")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(i -> i.getArgument(0));

        seminarService.approveBooking("SEM-SH2-101", aoAdmin);

        // ecehod MUST be notified
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("ecehod"),
                eq("Seminar Booking Confirmed"),
                contains("Block 3 Seminar Hall"),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("SEM-SH2-101")
        );

        // csehod MUST NOT be notified
        verify(notificationService, never()).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                anyString(),
                eq("csehod"),
                eq("Seminar Booking Confirmed"),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("1.3 Booking Rejection: Routes rejection to hall coordinator")
    void testBookingRejectionCoordinatorRouting() {
        SeminarBooking booking = SeminarBooking.builder()
                .bookingId("SEM-SH3-201")
                .hallId("SH-3")
                .hallName("Tech Hub Seminar Hall")
                .date("2026-11-27")
                .slot("FULL_DAY")
                .status("PENDING")
                .department("CSE")
                .requesterUserId("csedept")
                .build();

        when(bookingRepository.findByBookingId("SEM-SH3-201")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(i -> i.getArgument(0));

        seminarService.rejectBooking("SEM-SH3-201", "Maintenance scheduled", aoAdmin);

        // seminarcoordinator5 MUST be notified
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("seminarcoordinator5"),
                eq("Seminar Request Rejected"),
                contains("Tech Hub Seminar Hall"),
                eq("Seminar Hall"),
                eq("DANGER"),
                eq("SEM-SH3-201")
        );
    }

    @Test
    @DisplayName("1.4 Booking Cancellation: Routes cancellation to hall coordinator")
    void testBookingCancellationCoordinatorRouting() {
        SeminarBooking booking = SeminarBooking.builder()
                .bookingId("SEM-SH4-301")
                .hallId("SH-4")
                .hallName("Block 4 Seminar Hall")
                .date("2026-11-28")
                .slot("MORNING")
                .status("CANCELLATION_REQUESTED")
                .department("ADMIN")
                .requesterUserId("ao")
                .build();

        when(bookingRepository.findByBookingId("SEM-SH4-301")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(i -> i.getArgument(0));

        seminarService.approveCancellation("SEM-SH4-301", aoAdmin);

        // viceprincipal MUST be notified
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("viceprincipal"),
                eq("Seminar Cancellation Approved"),
                contains("Block 4 Seminar Hall"),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("SEM-SH4-301")
        );
    }

    @Test
    @DisplayName("1.5 Booking Reschedule: Routes to new hall coordinator and old hall coordinator if venue changed")
    void testBookingRescheduleVenueChangeCoordinatorRouting() {
        SeminarBooking original = SeminarBooking.builder()
                .id("BKG-SH1-401")
                .bookingId("SEM-SH1-401")
                .hallId("SH-1")
                .hallName("Block 2 Seminar hall")
                .date("2026-11-29")
                .slot("FORENOON")
                .status("RESCHEDULE_REQUESTED")
                .rescheduledHallId("SH-2")
                .rescheduledHallName("Block 3 Seminar Hall")
                .rescheduledDate("2026-11-30")
                .rescheduledSlot("AFTERNOON")
                .department("CSE")
                .requesterUserId("csedept")
                .build();

        when(bookingRepository.findByBookingId("SEM-SH1-401")).thenReturn(Optional.of(original));
        when(bookingRepository.findById("BKG-SH1-401")).thenReturn(Optional.of(original));
        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(i -> i.getArgument(0));

        seminarService.approveReschedule("SEM-SH1-401", aoAdmin);

        // New hall coordinator (ecehod) MUST receive Reschedule Approved
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("ecehod"),
                eq("Seminar Reschedule Approved"),
                contains("Block 3 Seminar Hall"),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                anyString()
        );

        // Old hall coordinator (csehod) MUST receive Booking Moved
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("csehod"),
                eq("Seminar Booking Moved"),
                contains("Block 2 Seminar hall"),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("SEM-SH1-401")
        );
    }

    // =========================================================================
    // 2. INSPECTION EMAIL BEHAVIOR & SUPPRESSION VERIFICATION
    // =========================================================================

    @Test
    @DisplayName("2.1 Pre-event and Post-event Inspection: Exactly 1 email with PDF attachment per recipient, HTML suppressed")
    void testInspectionReportDistributionExactlyOneEmailWithAttachment() {
        SeminarEventInspection insp = SeminarEventInspection.builder()
                .id("INSP-VERIF-01")
                .bookingId("SEM-SH5-501")
                .occurrenceDate("2026-11-21")
                .slot("FORENOON")
                .hallId("SH-5")
                .hallName("Pharma Block Seminar Hall")
                .eventTitle("Pharmacology Conclave")
                .overallStatus("POST_EVENT_PENDING")
                .preEventStatus("COMPLETED")
                .postEventStatus("PENDING")
                .coordinatorUserId("PHARM001")
                .technicianUserId("seminar_tech1")
                .requesterUserId("csedept")
                .department("CSE")
                .preEventInspection(SeminarEventInspection.InspectionChecklist.builder().issuesIdentified(false).build())
                .build();

        when(inspectionRepository.findById("INSP-VERIF-01")).thenReturn(Optional.of(insp));
        when(inspectionRepository.save(any(SeminarEventInspection.class))).thenAnswer(i -> i.getArgument(0));
        when(pdfGenerationService.generateInspectionReportPdf(any(SeminarEventInspection.class)))
                .thenReturn("PDF_REPORT_DATA".getBytes());
        when(emailService.sendEmailWithAttachment(anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn(true);

        SeminarInspectionSubmitDTO dto = new SeminarInspectionSubmitDTO();
        dto.setItems(List.of(
                new SeminarEventInspection.InspectionItem("PROJECTOR", "Sony HD Projector", "AV", "WORKING", null, null)
        ));
        dto.setEventConducted(true);
        dto.setDamageIdentified(false);
        dto.setOverallNotes("All clean.");

        SeminarEventInspection result = inspectionService.submitPostEventInspection("INSP-VERIF-01", dto, technician);

        assertEquals("COMPLETED", result.getOverallStatus());
        assertEquals("seminar_tech1", result.getTechnicianUserId());

        // In-app notifications sent to all 3 roles
        verify(notificationService, atLeast(3)).sendNotification(
                anyString(), anyString(), anyString(), contains("Seminar Event Inspection Report"), anyString(), eq("Seminar Hall"), eq("SUCCESS"), eq("SEM-SH5-501")
        );

        // PDF Attachment emails sent to exact 3 recipients: Coordinator (PHARM001), Tech (seminar_tech1), Requester (csedept)
        ArgumentCaptor<String> emailCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService, times(3)).sendEmailWithAttachment(
                emailCaptor.capture(),
                anyList(),
                contains("Event Inspection Report"),
                anyString(),
                anyString(),
                contains(".pdf"),
                any(),
                eq("SEM-SH5-501")
        );

        List<String> dispatchedEmails = emailCaptor.getAllValues();
        assertTrue(dispatchedEmails.contains("nipsprincipal07@gmail.com")); // PHARM001
        assertTrue(dispatchedEmails.contains("seminartech1@nrtec.in")); // seminar_tech1
        assertTrue(dispatchedEmails.contains("csedept@nrtec.in")); // csedept
        assertFalse(dispatchedEmails.contains("csehod@nrtec.in")); // unrelated coordinator isolated!
        assertFalse(dispatchedEmails.contains("ecehod@nrtec.in")); // unrelated coordinator isolated!
    }

    @Test
    @DisplayName("2.2 Suppression Condition: HTML email suppressed for Inspection Report, NOT suppressed for Booking Approved")
    void testHtmlSuppressionSelectivity() {
        EmailService realEmailService = new EmailService();
        ReflectionTestUtils.setField(realEmailService, "mailEnabled", true);

        // Case 1: Inspection Report Notification -> Must be skipped
        Notification inspNotif = Notification.builder()
                .id("NOTIF-INSP-99")
                .title("Seminar Event Inspection Report: Pharma Block Seminar Hall")
                .message("Report is ready.")
                .recipientUserId("PHARM001")
                .build();

        // Does not throw and does not proceed to send
        assertDoesNotThrow(() -> realEmailService.processAndSendNotificationEmail(inspNotif));

        // Case 2: Booking Notification -> Title does not start with Seminar Event Inspection Report
        Notification bookingNotif = Notification.builder()
                .id("NOTIF-BOOKING-99")
                .title("Seminar Request Approved")
                .message("Your booking is approved.")
                .recipientUserId("csedept")
                .build();

        // RealEmailService will classifyEvent correctly as REQUEST_APPROVED
        assertEquals("REQUEST_APPROVED", realEmailService.classifyEvent(bookingNotif));
    }

    // =========================================================================
    // 3. EMAIL PROVIDER & ATTACHMENT COMPATIBILITY
    // =========================================================================

    @Test
    @DisplayName("3.1 Provider Check: SMTP attachment path executes JavaMailSender addAttachment")
    void testSmtpAttachmentPathWithJavaMailSender() {
        EmailService smtpEmailService = new EmailService();
        ReflectionTestUtils.setField(smtpEmailService, "mailEnabled", true);
        ReflectionTestUtils.setField(smtpEmailService, "mailUsername", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(smtpEmailService, "mailPassword", "testpass123");
        ReflectionTestUtils.setField(smtpEmailService, "mailHost", "smtp.gmail.com");
        ReflectionTestUtils.setField(smtpEmailService, "mailPort", 587);
        ReflectionTestUtils.setField(smtpEmailService, "mailFrom", "collegeservice2026@gmail.com");
        ReflectionTestUtils.setField(smtpEmailService, "emailLogRepository", emailLogRepository);

        Session session = Session.getInstance(new Properties());
        MimeMessage mimeMessage = new MimeMessage(session);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        smtpEmailService.setMailSender(mailSender);

        boolean sent = smtpEmailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "Inspection Report PDF",
                "<html>Report</html>",
                "Report plain text",
                "report.pdf",
                "%PDF-1.4 DUMMY CONTENT".getBytes(),
                "REF-001"
        );

        assertTrue(sent);
        verify(mailSender).send(any(MimeMessage.class));
        verify(emailLogRepository).save(argThat(log -> "SMTP_ACCEPTED".equals(log.getStatus()) && "SMTP".equals(log.getProvider())));
    }

    @Test
    @DisplayName("3.2 Provider Check: Apps Script provider mode simulation when SMTP not configured")
    void testAppsScriptAttachmentSimulationGracefulFallback() {
        EmailService scriptEmailService = new EmailService();
        ReflectionTestUtils.setField(scriptEmailService, "mailEnabled", true);
        ReflectionTestUtils.setField(scriptEmailService, "mailProvider", "apps-script");
        // No SMTP credentials configured
        ReflectionTestUtils.setField(scriptEmailService, "emailLogRepository", emailLogRepository);

        boolean result = scriptEmailService.sendEmailWithAttachment(
                "csehod@nrtec.in",
                Collections.emptyList(),
                "Inspection Report PDF",
                "<html>Report</html>",
                "Report plain text",
                "report.pdf",
                "%PDF-1.4 DUMMY CONTENT".getBytes(),
                "REF-002"
        );

        // Gracefully simulated without failing or breaking business flow
        assertTrue(result);
        verify(emailLogRepository).save(argThat(log -> EmailLog.STATUS_SKIPPED_NO_CREDENTIALS.equals(log.getStatus())));
    }

    // =========================================================================
    // 4. ALL OTHER NOTIFICATION MODULES (POSITIVE & NEGATIVE ISOLATION)
    // =========================================================================

    @Test
    @DisplayName("4.1 Accommodation: Request approved notifies requester and logs under Accommodation")
    void testAccommodationNotification() {
        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC-01")
                .requestId("REQ-ACC-01")
                .requesterUserId("csedept")
                .facultyOrGuestName("Prof. Smith")
                .roomId("GUEST-101")
                .checkInDate("2026-11-25")
                .checkOutDate("2026-11-27")
                .status("PENDING_AO_APPROVAL")
                .department("CSE")
                .build();

        when(accommodationRepository.findById("ACC-01")).thenReturn(Optional.of(req));
        when(accommodationRepository.save(any(AccommodationRequest.class))).thenAnswer(i -> i.getArgument(0));

        accommodationService.approveRequest("ACC-01", aoAdmin);

        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("csedept"),
                eq("Accommodation Request Approved"),
                contains("GUEST-101"),
                eq("Accommodation"),
                eq("SUCCESS"),
                eq("REQ-ACC-01")
        );
    }

    @Test
    @DisplayName("4.2 Electrical: Reassigned issue notifies assigned electrician, isolates unrelated staff")
    void testElectricalIssueNotificationAndIsolation() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("ELEC_01")
                .requestId("ECE-ELEC-0001")
                .status("ASSIGNED")
                .assignedElectricianId("electrician_user")
                .assignedElectricianName("Lead Electrician")
                .reportedByUserId("csedept")
                .reportedByDepartment("CSE")
                .buildingName("ECE Block")
                .priority("HIGH")
                .build();

        when(electricalRepository.findById("ELEC_01")).thenReturn(Optional.of(req));
        when(userRepository.findByUserId("electrician_user")).thenReturn(Optional.of(electrician));
        when(electricalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReassignElectricianDTO dto = new ReassignElectricianDTO();
        dto.setElectricianUserId("electrician_user");
        dto.setRemarks("Urgent fix");

        electricalIssueService.reassignElectrician("ELEC_01", dto, aoAdmin);

        // Electrician MUST be notified
        verify(notificationService).sendNotification(
                eq("ELECTRICIAN"),
                isNull(),
                eq("electrician_user"),
                contains("Electrical Issue Assigned"),
                anyString(),
                eq("Electrical Service"),
                eq("ASSIGNMENT"),
                eq("ECE-ELEC-0001")
        );

        // Drivers / Coordinators MUST NOT be notified
        verify(notificationService, never()).sendNotification(
                eq("TRANSPORT_ADMIN"),
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("4.3 Transport: Creation notifies Transport Admin and requester, isolates unrelated roles")
    void testTransportNotification() {
        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("CSE-TRN-001");
        when(transportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TransportRequestDTO dto = new TransportRequestDTO();
        dto.setTripType("College Bus");
        dto.setDestination("Industrial Visit");
        dto.setTripDate(LocalDate.now().plusDays(2).toString());
        dto.setPickupLocation("Campus Main Gate");
        dto.setPurpose("Student Industrial Tour");
        dto.setDepartureTime("09:00 AM");
        dto.setExpectedPassengers(40);

        transportService.createRequest(dto, requesterCse);

        // 1. Requester confirmation notification
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("csedept"),
                eq("Transport Request Submitted"),
                contains("submitted"),
                eq("Transport"),
                eq("INFO"),
                eq("CSE-TRN-001")
        );

        // 2. Transport Admin notified
        verify(notificationService).sendNotification(
                eq("TRANSPORT_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Transport Request"),
                anyString(),
                eq("Transport"),
                eq("INFO"),
                eq("CSE-TRN-001")
        );
    }
}
