package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.*;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProjectWideEmailRemediationTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeminarHallRepository hallRepository;

    @Mock
    private SeminarBookingRepository bookingRepository;

    @Mock
    private AccommodationRoomRepository roomRepository;

    @Mock
    private AccommodationRequestRepository accommodationRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private TransportRequestRepository transportRepository;

    @Mock
    private MealRequestRepository mealRepository;

    @Mock
    private StationeryRequestRepository stationeryRepository;

    @Mock
    private RequestIdService requestIdService;

    @Mock
    private RequesterResolver requesterResolver;

    @Mock
    private AuthService authService;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private EmailDeduplicationService deduplicationService;

    @Mock
    private EmailRecipientValidator emailRecipientValidator;

    private SeminarService seminarService;
    private AccommodationService accommodationService;
    private TransportService transportService;
    private MealService mealService;
    private UnifiedRequestService unifiedRequestService;
    private EmailService emailService;

    private User requesterUser;
    private User aoUser;

    @BeforeEach
    void setUp() {
        requesterUser = User.builder()
                .userId("PROF_CSE")
                .name("Prof. CSE")
                .email("prof_cse@nrtec.in")
                .department("CSE")
                .role("DEPARTMENT_USER")
                .active(true)
                .build();

        aoUser = User.builder()
                .userId("ao")
                .name("Administrative Officer")
                .email("ao@nrtec.in")
                .department("ADMIN")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .active(true)
                .build();

        seminarService = new SeminarService();
        ReflectionTestUtils.setField(seminarService, "hallRepository", hallRepository);
        ReflectionTestUtils.setField(seminarService, "bookingRepository", bookingRepository);
        ReflectionTestUtils.setField(seminarService, "notificationService", notificationService);
        ReflectionTestUtils.setField(seminarService, "requestIdService", requestIdService);
        ReflectionTestUtils.setField(seminarService, "requesterResolver", requesterResolver);
        ReflectionTestUtils.setField(seminarService, "authService", authService);
        ReflectionTestUtils.setField(seminarService, "userRepository", userRepository);

        accommodationService = new AccommodationService();
        ReflectionTestUtils.setField(accommodationService, "roomRepository", roomRepository);
        ReflectionTestUtils.setField(accommodationService, "requestRepository", accommodationRepository);
        ReflectionTestUtils.setField(accommodationService, "notificationService", notificationService);
        ReflectionTestUtils.setField(accommodationService, "requestIdService", requestIdService);
        ReflectionTestUtils.setField(accommodationService, "requesterResolver", requesterResolver);
        ReflectionTestUtils.setField(accommodationService, "authService", authService);

        transportService = new TransportService();
        ReflectionTestUtils.setField(transportService, "vehicleRepository", vehicleRepository);
        ReflectionTestUtils.setField(transportService, "requestRepository", transportRepository);
        ReflectionTestUtils.setField(transportService, "notificationService", notificationService);
        ReflectionTestUtils.setField(transportService, "requestIdService", requestIdService);
        ReflectionTestUtils.setField(transportService, "requesterResolver", requesterResolver);
        ReflectionTestUtils.setField(transportService, "authService", authService);
        ReflectionTestUtils.setField(transportService, "userRepository", userRepository);

        mealService = new MealService();
        ReflectionTestUtils.setField(mealService, "mealRequestRepository", mealRepository);
        ReflectionTestUtils.setField(mealService, "notificationService", notificationService);
        ReflectionTestUtils.setField(mealService, "requestIdService", requestIdService);
        ReflectionTestUtils.setField(mealService, "requesterResolver", requesterResolver);
        ReflectionTestUtils.setField(mealService, "authService", authService);
        ReflectionTestUtils.setField(mealService, "userRepository", userRepository);

        unifiedRequestService = new UnifiedRequestService();
        ReflectionTestUtils.setField(unifiedRequestService, "seminarBookingRepository", bookingRepository);
        ReflectionTestUtils.setField(unifiedRequestService, "accommodationRequestRepository", accommodationRepository);
        ReflectionTestUtils.setField(unifiedRequestService, "transportRequestRepository", transportRepository);
        ReflectionTestUtils.setField(unifiedRequestService, "stationeryRequestRepository", stationeryRepository);
        ReflectionTestUtils.setField(unifiedRequestService, "mealRequestRepository", mealRepository);
        ReflectionTestUtils.setField(unifiedRequestService, "vehicleRepository", vehicleRepository);
        ReflectionTestUtils.setField(unifiedRequestService, "notificationService", notificationService);
        ReflectionTestUtils.setField(unifiedRequestService, "userRepository", userRepository);
        ReflectionTestUtils.setField(unifiedRequestService, "requesterResolver", requesterResolver);

        when(stationeryRepository.findById(any())).thenReturn(Optional.empty());
        when(stationeryRepository.findByRequestId(any())).thenReturn(Optional.empty());

        emailService = new EmailService();
        emailService.setMailSender(mailSender);
        ReflectionTestUtils.setField(emailService, "emailLogRepository", emailLogRepository);
        ReflectionTestUtils.setField(emailService, "userRepository", userRepository);
        ReflectionTestUtils.setField(emailService, "deduplicationService", deduplicationService);
        ReflectionTestUtils.setField(emailService, "mailFrom", "collegeservices@nrtec.in");
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
    }

    // =========================================================================
    // 1. SEMINAR BOOKING NO LONGER EMITS REDUNDANT SEMINAR_ADMIN
    // =========================================================================
    @Test
    @DisplayName("1. Seminar booking does not emit redundant SEMINAR_ADMIN, routes to AO_ADMIN ('ao')")
    void test1_SeminarBooking_NoRedundantSeminarAdmin() {
        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .coordinatorUserIds(List.of("csehod"))
                .active(true)
                .build();
        when(hallRepository.findById("SH-1")).thenReturn(Optional.of(hall));
        when(hallRepository.findByHallId("SH-1")).thenReturn(Optional.of(hall));
        when(bookingRepository.findActiveBookingsForHallAndDate(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("CSE-SEM-0001");
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeminarBookingRequestDTO dto = new SeminarBookingRequestDTO();
        dto.setHallId("SH-1");
        dto.setDate(LocalDate.now().plusDays(2).toString());
        dto.setSlot("FORENOON");
        dto.setEventTitle("Tech Symposium");

        seminarService.createBooking(dto, requesterUser);

        // Verifies AO_ADMIN ("ao") was notified
        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("New Seminar Hall Request"),
                anyString(),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("CSE-SEM-0001")
        );

        // Verifies SEMINAR_ADMIN was NEVER notified
        verify(notificationService, never()).sendNotification(
                eq("SEMINAR_ADMIN"),
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
    }

    // =========================================================================
    // 2. SEMINAR CANCELLATION REACHES AO ("ao")
    // =========================================================================
    @Test
    @DisplayName("2. Seminar cancellation alert reaches AO_ADMIN ('ao')")
    void test2_SeminarCancellation_ReachesAo() {
        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .coordinatorUserIds(List.of("csehod"))
                .active(true)
                .build();
        SeminarBooking booking = SeminarBooking.builder()
                .id("B001")
                .bookingId("CSE-SEM-0001")
                .hallId("SH-1")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .requestedBy("PROF_CSE")
                .status("APPROVED")
                .date(LocalDate.now().plusDays(3).toString())
                .slot("FORENOON")
                .build();

        when(bookingRepository.findById("B001")).thenReturn(Optional.of(booking));
        when(hallRepository.findByHallId("SH-1")).thenReturn(Optional.of(hall));
        when(hallRepository.findById("SH-1")).thenReturn(Optional.of(hall));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeminarCancelRequestDTO cancelDto = SeminarCancelRequestDTO.builder()
                .reason("Program cancelled due to rain")
                .build();

        seminarService.cancelBooking("B001", cancelDto, requesterUser);

        // AO must be notified
        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("Seminar Cancellation Requested"),
                contains("Program cancelled due to rain"),
                eq("Seminar Hall"),
                eq("WARNING"),
                eq("CSE-SEM-0001")
        );
    }

    // =========================================================================
    // 3. SEMINAR RESCHEDULE REACHES AO ("ao")
    // =========================================================================
    @Test
    @DisplayName("3. Seminar reschedule request reaches AO_ADMIN ('ao')")
    void test3_SeminarReschedule_ReachesAo() {
        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .active(true)
                .build();
        SeminarBooking booking = SeminarBooking.builder()
                .id("B002")
                .bookingId("CSE-SEM-0002")
                .hallId("SH-1")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .requestedBy("PROF_CSE")
                .status("APPROVED")
                .date(LocalDate.now().plusDays(3).toString())
                .slot("FORENOON")
                .build();

        when(bookingRepository.findById("B002")).thenReturn(Optional.of(booking));
        when(hallRepository.findByHallIdIgnoreCase("SH-1")).thenReturn(Optional.of(hall));
        when(hallRepository.findAll()).thenReturn(List.of(hall));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeminarRescheduleRequestDTO reschedDto = SeminarRescheduleRequestDTO.builder()
                .newHallId("SH-1")
                .newDate(LocalDate.now().plusDays(5).toString())
                .newSlot("AFTERNOON")
                .reason("Speaker unavailable")
                .build();

        seminarService.requestReschedule("B002", reschedDto, requesterUser);

        // AO must be notified
        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("Seminar Reschedule Requested"),
                contains("Seminar Hall 1"),
                eq("Seminar Hall"),
                eq("WARNING"),
                eq("CSE-SEM-0002")
        );
    }

    // =========================================================================
    // 4. ACCOMMODATION CANCELLATION ALERT REACHES AO ("ao")
    // =========================================================================
    @Test
    @DisplayName("4. Accommodation cancellation alert reaches AO_ADMIN ('ao')")
    void test4_AccommodationCancellation_ReachesAo() {
        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC001")
                .requestId("CSE-ACC-0001")
                .roomId("R101")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .requestedBy("PROF_CSE")
                .status("APPROVED")
                .hostel("Guest House")
                .checkInDate(LocalDate.now().plusDays(2).toString())
                .build();

        when(accommodationRepository.findById("ACC001")).thenReturn(Optional.of(req));
        when(accommodationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AccommodationCancelRequestDTO cancelDto = AccommodationCancelRequestDTO.builder()
                .reason("Visit postponed")
                .build();

        accommodationService.cancelRequest("ACC001", cancelDto, requesterUser);

        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("Accommodation Cancellation Requested"),
                contains("Visit postponed"),
                eq("Accommodation"),
                eq("WARNING"),
                eq("CSE-ACC-0001")
        );
    }

    // =========================================================================
    // 5. ACCOMMODATION RESCHEDULE ALERT REACHES AO ("ao")
    // =========================================================================
    @Test
    @DisplayName("5. Accommodation reschedule alert reaches AO_ADMIN ('ao')")
    void test5_AccommodationReschedule_ReachesAo() {
        AccommodationRoom room102 = AccommodationRoom.builder()
                .roomId("R102")
                .hostel("Guest House")
                .active(true)
                .build();

        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC002")
                .requestId("CSE-ACC-0002")
                .roomId("R102")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .requestedBy("PROF_CSE")
                .status("APPROVED")
                .hostel("Guest House")
                .checkInDate(LocalDate.now().plusDays(2).toString())
                .checkOutDate(LocalDate.now().plusDays(4).toString())
                .build();

        when(accommodationRepository.findById("ACC002")).thenReturn(Optional.of(req));
        when(roomRepository.findByRoomId("R102")).thenReturn(Optional.of(room102));
        when(roomRepository.findById("R102")).thenReturn(Optional.of(room102));
        when(accommodationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AccommodationRescheduleRequestDTO reschedDto = AccommodationRescheduleRequestDTO.builder()
                .targetRoomId("R102")
                .targetCheckInDate(LocalDate.now().plusDays(4).toString())
                .targetCheckOutDate(LocalDate.now().plusDays(6).toString())
                .reason("Flight delayed")
                .build();

        accommodationService.requestReschedule("ACC002", reschedDto, requesterUser);

        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("Accommodation Reschedule Requested"),
                contains("R102"),
                eq("Accommodation"),
                eq("WARNING"),
                eq("CSE-ACC-0002")
        );
    }

    // =========================================================================
    // 6. BOYS HOSTEL WARDEN ROUTING INTACT (BOYS_HOSTEL_ADMIN)
    // =========================================================================
    @Test
    @DisplayName("6. Boys Hostel routes to BOYS_HOSTEL_ADMIN")
    void test6_BoysHostelRouting_Intact() {
        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC003")
                .requestId("CSE-ACC-0003")
                .roomId("BH-101")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .status("PENDING")
                .hostel("Boys Hostel")
                .checkInDate(LocalDate.now().plusDays(2).toString())
                .build();

        when(accommodationRepository.findById("ACC003")).thenReturn(Optional.of(req));
        when(accommodationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        accommodationService.aoForwardRequest("ACC003", "Forwarding to warden", aoUser);

        verify(notificationService).sendNotification(
                eq("BOYS_HOSTEL_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Accommodation Request Forwarded"),
                contains("Boys Hostel"),
                eq("Accommodation"),
                eq("INFO"),
                eq("CSE-ACC-0003")
        );
    }

    // =========================================================================
    // 7. GIRLS HOSTEL WARDEN ROUTING INTACT (GIRLS_HOSTEL_ADMIN)
    // =========================================================================
    @Test
    @DisplayName("7. Girls Hostel routes to GIRLS_HOSTEL_ADMIN")
    void test7_GirlsHostelRouting_Intact() {
        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC004")
                .requestId("CSE-ACC-0004")
                .roomId("GH-101")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .status("PENDING")
                .hostel("Girls Hostel")
                .checkInDate(LocalDate.now().plusDays(2).toString())
                .build();

        when(accommodationRepository.findById("ACC004")).thenReturn(Optional.of(req));
        when(accommodationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        accommodationService.aoForwardRequest("ACC004", "Forwarding to warden", aoUser);

        verify(notificationService).sendNotification(
                eq("GIRLS_HOSTEL_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Accommodation Request Forwarded"),
                contains("Girls Hostel"),
                eq("Accommodation"),
                eq("INFO"),
                eq("CSE-ACC-0004")
        );
    }

    // =========================================================================
    // 8. GUEST HOUSE ROUTES TO AO ("ao") AND NEVER TO GIRLS HOSTEL WARDEN
    // =========================================================================
    @Test
    @DisplayName("8. Guest House routes to AO_ADMIN ('ao') and NEVER to GIRLS_HOSTEL_ADMIN")
    void test8_GuestHouseRouting_ToAoNeverGirlsHostel() {
        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC005")
                .requestId("CSE-ACC-0005")
                .roomId("GH-GUEST-1")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .status("PENDING")
                .hostel("Guest House")
                .checkInDate(LocalDate.now().plusDays(2).toString())
                .build();

        when(accommodationRepository.findById("ACC005")).thenReturn(Optional.of(req));
        when(accommodationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        accommodationService.aoForwardRequest("ACC005", "Forwarding guest house request", aoUser);

        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("New Accommodation Request Forwarded"),
                contains("Guest House"),
                eq("Accommodation"),
                eq("INFO"),
                eq("CSE-ACC-0005")
        );

        verify(notificationService, never()).sendNotification(
                eq("GIRLS_HOSTEL_ADMIN"),
                any(),
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
    }

    // =========================================================================
    // 9. CANTEEN APPROVAL ALERT REACHES AO ("ao") WHEN NO CANTEEN INCHARGE
    // =========================================================================
    @Test
    @DisplayName("9. Canteen approval alert routes to AO_ADMIN ('ao') when no canteen in-charge exists")
    void test9_CanteenApprovalFallback_ToAo() {
        MealRequest req = MealRequest.builder()
                .id("M001")
                .requestId("CSE-MEAL-0001")
                .date(LocalDate.now().plusDays(2).toString())
                .mealTypes(List.of("Breakfast", "Lunch"))
                .totalGuests(30)
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .build();

        when(mealRepository.findById("M001")).thenReturn(Optional.of(req));
        when(userRepository.findAll()).thenReturn(Collections.emptyList()); // No canteen user
        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenReturn("PROF_CSE");
        when(mealRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mealService.approveRequest("M001");

        // AO must receive the catering arrangement order
        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("New Catering Arrangement Order"),
                contains("Approved catering arrangement order"),
                eq("Snacks & Meals"),
                eq("INFO"),
                eq("CSE-MEAL-0001")
        );
    }

    // =========================================================================
    // 10. CANTEEN CANCELLATION PRESERVES MEALS_ADMIN WITHOUT DUPLICATE AO ALERT
    // =========================================================================
    @Test
    @DisplayName("10. Canteen cancellation notifies MEALS_ADMIN without duplicate AO alert")
    void test10_CanteenCancellation_SingleAoAdminNotification() {
        MealRequest req = MealRequest.builder()
                .id("M002")
                .requestId("CSE-MEAL-0002")
                .date(LocalDate.now().plusDays(2).toString())
                .status("APPROVED")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .build();

        when(mealRepository.findById("M002")).thenReturn(Optional.of(req));
        when(userRepository.findAll()).thenReturn(Collections.emptyList()); // No canteen user
        when(mealRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        unifiedRequestService.cancelApprovedRequest("M002", "Catering cancelled", aoUser);

        // Exactly one MEALS_ADMIN notification dispatched
        verify(notificationService, times(1)).sendNotification(
                eq("MEALS_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("Meal Arrangement Request Cancelled"),
                anyString(),
                eq("Snacks & Meals"),
                eq("WARNING"),
                eq("CSE-MEAL-0002")
        );

        // No secondary orphaned CANTEEN_INCHARGE or redundant AO_ADMIN notification
        verify(notificationService, never()).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("Catering Arrangement Cancelled"),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    // =========================================================================
    // 11. DRIVER DISPATCH ALERT REACHES AO ("ao") WITHOUT DRIVER USER ACCOUNT
    // =========================================================================
    @Test
    @DisplayName("11. Driver dispatch alert routes to AO_ADMIN ('ao') when vehicle assigned without registered driver account")
    void test11_DriverDispatchFallback_ToAo() {
        Vehicle vehicle = Vehicle.builder()
                .vehicleId("V-01")
                .driverName("K. Venkatesh")
                .driverPhone("9876543210")
                .active(true)
                .build();
        TransportRequest req = TransportRequest.builder()
                .id("T001")
                .requestId("CSE-TRN-0001")
                .vehicleId("V-01")
                .destination("Guest Pickup")
                .tripDate(LocalDate.now().plusDays(2).toString())
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .build();

        when(transportRepository.findById("T001")).thenReturn(Optional.of(req));
        when(vehicleRepository.findByVehicleId("V-01")).thenReturn(Optional.of(vehicle));
        when(userRepository.findAll()).thenReturn(Collections.emptyList()); // No registered driver user
        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenReturn("PROF_CSE");
        when(transportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        transportService.approveRequest("T001");

        // AO must receive the manual driver dispatch required notification
        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("Transport Driver Dispatch Required"),
                contains("K. Venkatesh"),
                eq("Transport"),
                eq("INFO"),
                eq("CSE-TRN-0001")
        );
    }

    // =========================================================================
    // 12. ME, MECH, MECHANICAL ALL RESOLVE MECHHOD
    // =========================================================================
    @Test
    @DisplayName("12. ME, MECH, MECHANICAL all normalize to ME")
    void test12_DepartmentNormalization_MechanicalToME() {
        assertEquals("ME", emailService.normalizeDepartmentCode("ME"));
        assertEquals("ME", emailService.normalizeDepartmentCode("mech"));
        assertEquals("ME", emailService.normalizeDepartmentCode("MECH"));
        assertEquals("ME", emailService.normalizeDepartmentCode("Mechanical"));
        assertEquals("ME", emailService.normalizeDepartmentCode("MECHANICAL"));
        assertEquals("ME", emailService.normalizeDepartmentCode(" me "));
    }

    // =========================================================================
    // 13. OTHER DEPARTMENT CODES UNAFFECTED
    // =========================================================================
    @Test
    @DisplayName("13. Other department codes (CSE, ECE, CSDS, etc.) remain unaffected")
    void test13_DepartmentNormalization_OtherCodesUnaffected() {
        assertEquals("CSE", emailService.normalizeDepartmentCode("CSE"));
        assertEquals("ECE", emailService.normalizeDepartmentCode("ECE"));
        assertEquals("EEE", emailService.normalizeDepartmentCode("EEE"));
        assertEquals("CIVIL", emailService.normalizeDepartmentCode("CIVIL"));
        assertEquals("CSDS", emailService.normalizeDepartmentCode("CSDS"));
        assertEquals("IT", emailService.normalizeDepartmentCode("IT"));
        assertEquals("MCA", emailService.normalizeDepartmentCode("MCA"));
        assertEquals("MBA", emailService.normalizeDepartmentCode("MBA"));
        assertNull(emailService.normalizeDepartmentCode(null));
        assertEquals("", emailService.normalizeDepartmentCode("   "));
    }

    // =========================================================================
    // 14. MISSING PRIMARY RECIPIENTS WRITE SKIPPED_NO_RECIPIENTS LOG
    // =========================================================================
    @Test
    @DisplayName("14. Missing primary recipients write SKIPPED_NO_RECIPIENTS in EmailLog instead of silent drop")
    void test14_MissingRecipients_WritesSkippedLog() {
        Notification notification = Notification.builder()
                .id("NOTIF-ORPHAN")
                .recipientRole("UNKNOWN_ORPHAN_ROLE")
                .recipientDept("UNKNOWN_DEPT")
                .title("Test Orphan Alert")
                .message("This has no recipients")
                .service("General")
                .build();

        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        emailService.processAndSendNotificationEmail(notification);

        ArgumentCaptor<EmailLog> captor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(captor.capture());

        EmailLog savedLog = captor.getValue();
        assertEquals(EmailLog.STATUS_SKIPPED_NO_RECIPIENTS, savedLog.getStatus());
        assertEquals("NOTIF-ORPHAN", savedLog.getNotificationId());
        assertTrue(savedLog.getErrorMessage().contains("No active registered recipient"));
        verify(mailSender, never()).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    // =========================================================================
    // 15. LOGGING FAILURE DOES NOT CAUSE ACCIDENTAL EMAIL DISPATCH
    // =========================================================================
    @Test
    @DisplayName("15. Logging failure does not cause accidental email dispatch")
    void test15_LoggingFailure_NoAccidentalDispatch() {
        Notification notification = Notification.builder()
                .id("NOTIF-FAIL")
                .recipientRole("NONEXISTENT")
                .recipientDept("ADMIN")
                .title("Failure Test")
                .message("No recipients")
                .build();

        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(emailLogRepository.save(any())).thenThrow(new RuntimeException("DB down"));

        // Must not crash or accidentally send email
        assertDoesNotThrow(() -> emailService.processAndSendNotificationEmail(notification));
        verify(mailSender, never()).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    // =========================================================================
    // 16. NO DUPLICATE AO NOTIFICATIONS ON UNIFIED CANCELLATIONS
    // =========================================================================
    @Test
    @DisplayName("16. Transport unified cancellation sends single TRANSPORT_ADMIN alert, no duplicate AO alert")
    void test16_TransportUnifiedCancellation_NoDuplicateAo() {
        TransportRequest req = TransportRequest.builder()
                .id("T002")
                .requestId("CSE-TRN-0002")
                .destination("Hyderabad Airport")
                .tripDate(LocalDate.now().plusDays(2).toString())
                .status("APPROVED")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .vehicleId("V-02")
                .build();

        when(transportRepository.findById("T002")).thenReturn(Optional.of(req));
        when(vehicleRepository.findByVehicleId("V-02")).thenReturn(Optional.empty()); // No vehicle/driver
        when(transportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        unifiedRequestService.cancelApprovedRequest("T002", "Flight cancelled", aoUser);

        // Exactly one TRANSPORT_ADMIN notification dispatched
        verify(notificationService, times(1)).sendNotification(
                eq("TRANSPORT_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("Transport Request Cancelled"),
                anyString(),
                eq("Transport"),
                eq("WARNING"),
                eq("CSE-TRN-0002")
        );

        // No secondary AO alert dispatched
        verify(notificationService, never()).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                eq("ao"),
                eq("Transport Request Cancelled"),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    // =========================================================================
    // 17. EXISTING AO_ADMIN ISOLATION PRESERVED
    // =========================================================================
    @Test
    @DisplayName("17. Existing AO_ADMIN isolation preserved")
    void test17_AoAdminIsolation_Preserved() {
        assertTrue(aoUser.hasRole("AO_ADMIN"));
        assertEquals("AO_ADMIN", aoUser.getRole());
        assertEquals("ao", aoUser.getUserId());
    }

    // =========================================================================
    // 18. COORDINATOR LOOKUP CONTINUES WORKING VIA getHallById
    // =========================================================================
    @Test
    @DisplayName("18. Coordinator lookup resolves business hall identifier (e.g. SH-4) and notifies coordinator")
    void test18_CoordinatorLookup_BusinessIdentifier() {
        SeminarHall hall = SeminarHall.builder()
                .id("665a1b2c3d4e5f6789012345") // ObjectId string
                .hallId("SH-4")
                .name("Pharma Block Seminar Hall")
                .coordinatorUserIds(List.of("viceprincipal"))
                .active(true)
                .build();

        SeminarBooking booking = SeminarBooking.builder()
                .id("B003")
                .bookingId("PHARM-SEM-0001")
                .hallId("SH-4") // Business identifier, not ObjectId!
                .hallName("Pharma Block Seminar Hall")
                .department("PHARMACY")
                .requesterUserId("PHARM001")
                .requestedBy("PHARM001")
                .status("PENDING")
                .date(LocalDate.now().plusDays(2).toString())
                .slot("AFTERNOON")
                .build();

        when(bookingRepository.findById("B003")).thenReturn(Optional.of(booking));
        when(hallRepository.findByHallIdIgnoreCase("SH-4")).thenReturn(Optional.of(hall));
        when(hallRepository.findAll()).thenReturn(List.of(hall));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        seminarService.approveBooking("B003", aoUser);

        // Coordinator viceprincipal MUST be notified
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("viceprincipal"),
                eq("Seminar Booking Confirmed"),
                contains("Pharma Block Seminar Hall"),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("PHARM-SEM-0001")
        );
    }

    // =========================================================================
    // 19. EMAIL LOG SKIPPED_NO_RECIPIENTS CONSTANT VERIFICATION
    // =========================================================================
    @Test
    @DisplayName("19. EmailLog contains STATUS_SKIPPED_NO_RECIPIENTS constant")
    void test19_EmailLogConstant_Exists() {
        assertEquals("SKIPPED_NO_RECIPIENTS", EmailLog.STATUS_SKIPPED_NO_RECIPIENTS);
    }

    // =========================================================================
    // 20. AMBIGUOUS STATUS CONTRACT PRESERVED
    // =========================================================================
    @Test
    @DisplayName("20. Provider timeout status remains AMBIGUOUS")
    void test20_AmbiguousStatus_Preserved() {
        assertEquals("AMBIGUOUS", EmailDeduplicationClaim.STATUS_AMBIGUOUS);
    }
}
