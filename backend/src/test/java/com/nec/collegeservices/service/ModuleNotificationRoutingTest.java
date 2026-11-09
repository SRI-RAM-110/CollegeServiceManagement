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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ModuleNotificationRoutingTest {

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
    private StationeryRequestRepository stationeryRepository;

    @Mock
    private StationeryItemRepository stationeryItemRepository;

    @Mock
    private MealRequestRepository mealRepository;

    @Mock
    private ElectricalIssueRequestRepository electricalRepository;

    @Mock
    private RequestIdService requestIdService;

    @Mock
    private RequesterResolver requesterResolver;

    @Mock
    private AuthService authService;

    @Mock
    private JavaMailSender mockMailSender; // strictly mocked: never real SMTP!

    private SeminarService seminarService;
    private AccommodationService accommodationService;
    private TransportService transportService;
    private StationeryService stationeryService;
    private MealService mealService;
    private ElectricalIssueService electricalIssueService;
    private UnifiedRequestService unifiedRequestService;

    private User requesterUser;
    private User semCoordinator;
    private User aoAdmin;
    private User semAdmin;
    private User driverUser;
    private User canteenUser;
    private User electrician1;
    private User electrician2;

    @BeforeEach
    void setUp() {
        requesterUser = User.builder()
                .userId("PROF_CSE")
                .name("Prof. CSE Requester")
                .email("prof_cse@nrtec.in")
                .department("CSE")
                .role("DEPARTMENT_USER")
                .active(true)
                .build();

        semCoordinator = User.builder()
                .userId("COORD_SH1")
                .name("SH1 Coordinator")
                .email("coord_sh1@nrtec.in")
                .department("ADMIN")
                .role("SEMINAR_COORDINATOR")
                .active(true)
                .build();

        aoAdmin = User.builder()
                .userId("AO001")
                .name("AO Admin")
                .email("ao@nrtec.in")
                .department("ADMIN")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .active(true)
                .build();

        semAdmin = User.builder()
                .userId("SEM001")
                .name("Seminar Admin")
                .email("seminar@nrtec.in")
                .department("ADMIN")
                .role("SEMINAR_ADMIN")
                .roles(List.of("SEMINAR_ADMIN"))
                .active(true)
                .build();

        driverUser = User.builder()
                .userId("DRV001")
                .name("R. Prasad")
                .phone("9876543210")
                .email("prasad@nrtec.in")
                .department("ADMIN")
                .role("DRIVER")
                .active(true)
                .build();

        canteenUser = User.builder()
                .userId("CANT001")
                .name("Canteen Incharge")
                .phone("9876543299")
                .email("canteen@nrtec.in")
                .department("CANTEEN")
                .role("CANTEEN_INCHARGE")
                .active(true)
                .build();

        electrician1 = User.builder()
                .userId("ELEC001")
                .name("E. Electrician One")
                .phone("9876543288")
                .email("elec1@nrtec.in")
                .department("ADMIN")
                .role("ELECTRICIAN")
                .active(true)
                .build();

        electrician2 = User.builder()
                .userId("ELEC002")
                .name("E. Electrician Two")
                .phone("9876543277")
                .email("elec2@nrtec.in")
                .department("ADMIN")
                .role("ELECTRICIAN")
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

        stationeryService = new StationeryService();
        ReflectionTestUtils.setField(stationeryService, "itemRepository", stationeryItemRepository);
        ReflectionTestUtils.setField(stationeryService, "requestRepository", stationeryRepository);
        ReflectionTestUtils.setField(stationeryService, "notificationService", notificationService);
        ReflectionTestUtils.setField(stationeryService, "requestIdService", requestIdService);
        ReflectionTestUtils.setField(stationeryService, "requesterResolver", requesterResolver);
        ReflectionTestUtils.setField(stationeryService, "authService", authService);

        mealService = new MealService();
        ReflectionTestUtils.setField(mealService, "mealRequestRepository", mealRepository);
        ReflectionTestUtils.setField(mealService, "notificationService", notificationService);
        ReflectionTestUtils.setField(mealService, "requestIdService", requestIdService);
        ReflectionTestUtils.setField(mealService, "requesterResolver", requesterResolver);
        ReflectionTestUtils.setField(mealService, "authService", authService);
        ReflectionTestUtils.setField(mealService, "userRepository", userRepository);

        electricalIssueService = new ElectricalIssueService();
        ReflectionTestUtils.setField(electricalIssueService, "repository", electricalRepository);
        ReflectionTestUtils.setField(electricalIssueService, "userRepository", userRepository);
        ReflectionTestUtils.setField(electricalIssueService, "requestIdService", requestIdService);
        ReflectionTestUtils.setField(electricalIssueService, "notificationService", notificationService);
        ReflectionTestUtils.setField(electricalIssueService, "authService", authService);
    }

    // =========================================================================
    // 1. SEMINAR NOTIFICATIONS (STAGE 2A, 2C)
    // =========================================================================

    @Test
    @DisplayName("Seminar: Submission notifies original requester, hall coordinator, and seminar admin")
    void testSeminarSubmission_NotifiesRequesterAndCoordinatorAndAdmin() {
        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .coordinatorUserIds(List.of("COORD_SH1"))
                .active(true)
                .build();
        when(hallRepository.findById("SH-1")).thenReturn(Optional.of(hall));
        when(hallRepository.findByHallId("SH-1")).thenReturn(Optional.of(hall));
        when(bookingRepository.findActiveBookingsForHallAndDate(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("CSE-SEM-0101");
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SeminarBookingRequestDTO dto = new SeminarBookingRequestDTO();
        dto.setHallId("SH-1");
        dto.setDate("2026-11-20");
        dto.setSlot("FORENOON");
        dto.setEventTitle("AI Workshop");

        seminarService.createBooking(dto, requesterUser);

        // 1. Requester confirmation notification
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Seminar Request Submitted"),
                contains("submitted"),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("CSE-SEM-0101")
        );

        // 2. Hall coordinator notification
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("COORD_SH1"),
                eq("New Seminar Hall Request"),
                anyString(),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("CSE-SEM-0101")
        );

        // 3. Seminar admin notification
        verify(notificationService).sendNotification(
                eq("SEMINAR_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Seminar Hall Request"),
                anyString(),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("CSE-SEM-0101")
        );
    }

    @Test
    @DisplayName("Seminar: Approval notifies requester, hall coordinator, and requester department HOD")
    void testSeminarApproval_NotifiesRequesterCoordinatorAndDeptHod() {
        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .coordinatorUserIds(List.of("COORD_SH1"))
                .active(true)
                .build();
        SeminarBooking booking = SeminarBooking.builder()
                .id("B001")
                .bookingId("CSE-SEM-0101")
                .hallId("SH-1")
                .hallName("Seminar Hall 1")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .date("2026-11-20")
                .slot("FORENOON")
                .status("PENDING")
                .build();

        when(bookingRepository.findById("B001")).thenReturn(Optional.of(booking));
        when(hallRepository.findById("SH-1")).thenReturn(Optional.of(hall));
        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenReturn("PROF_CSE");
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        seminarService.approveBooking("B001", semAdmin);

        // 1. Requester notified
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Seminar Request Approved"),
                anyString(),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("CSE-SEM-0101")
        );

        // 2. Department HOD for CSE notified
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_HOD"),
                eq("CSE"),
                isNull(),
                contains("Seminar Request Approved"),
                anyString(),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("CSE-SEM-0101")
        );

        // 3. Hall coordinator notified
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("COORD_SH1"),
                eq("Seminar Booking Confirmed"),
                anyString(),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("CSE-SEM-0101")
        );
    }

    // =========================================================================
    // 2. ACCOMMODATION NOTIFICATIONS (STAGE 2A, 2D)
    // =========================================================================

    @Test
    @DisplayName("Accommodation: Submission notifies original requester and AO_ADMIN")
    void testAccommodationSubmission_NotifiesRequesterAndAoAdmin() {
        AccommodationRoom room = AccommodationRoom.builder()
                .roomId("R-101")
                .hostel("Boys Hostel")
                .roomType("AC Single")
                .active(true)
                .build();
        when(roomRepository.findByRoomId("R-101")).thenReturn(Optional.of(room));
        when(accommodationRepository.findActiveBookingsForRoom(anyString())).thenReturn(Collections.emptyList());
        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("CSE-ACC-001");
        when(accommodationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AccommodationRequestDTO dto = new AccommodationRequestDTO();
        dto.setRoomId("R-101");
        dto.setCheckInDate("2026-11-20");
        dto.setCheckOutDate("2026-11-22");
        dto.setGuestsCount(1);
        dto.setHostel("Boys Hostel");
        dto.setPurpose("Guest Lecture Accommodations");

        accommodationService.doCreateSingleRequest(dto, requesterUser, null);

        // 1. Requester confirmation notification
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Accommodation Request Submitted"),
                contains("submitted"),
                eq("Accommodation"),
                eq("INFO"),
                eq("CSE-ACC-001")
        );

        // 2. AO Admin notification
        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Accommodation Request"),
                anyString(),
                eq("Accommodation"),
                eq("INFO"),
                eq("CSE-ACC-001")
        );
    }

    @Test
    @DisplayName("Accommodation: Forwarding notifies ONLY the selected hostel warden (not all wardens)")
    void testAccommodationForwarding_NotifiesOnlySelectedHostelWarden() {
        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC001")
                .requestId("CSE-ACC-001")
                .hostel("Boys Hostel")
                .roomId("R-101")
                .status("PENDING_AO_APPROVAL")
                .department("CSE")
                .build();
        when(accommodationRepository.findById("ACC001")).thenReturn(Optional.of(req));
        when(accommodationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        accommodationService.aoForwardRequest("ACC001", "Forwarding for room check", aoAdmin);

        // Verify sent to BOYS_HOSTEL_ADMIN only
        verify(notificationService).sendNotification(
                eq("BOYS_HOSTEL_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Accommodation Request Forwarded"),
                anyString(),
                eq("Accommodation"),
                eq("INFO"),
                eq("CSE-ACC-001")
        );

        // Must NOT send to GIRLS_HOSTEL_ADMIN
        verify(notificationService, never()).sendNotification(
                eq("GIRLS_HOSTEL_ADMIN"),
                any(),
                any(),
                anyString(),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    // =========================================================================
    // 3. TRANSPORT NOTIFICATIONS (STAGE 2A, 2B, 2E)
    // =========================================================================

    @Test
    @DisplayName("Transport: Submission notifies requester and Transport Admin, NO duplicate AO_ADMIN")
    void testTransportSubmission_NotifiesRequesterAndAdmin_NoDuplicateAo() {
        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("CSE-TRN-001");
        when(transportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TransportRequestDTO dto = new TransportRequestDTO();
        dto.setTripType("College Bus");
        dto.setDestination("Industrial Visit");
        dto.setTripDate("2026-11-20");
        dto.setPickupLocation("Campus Main Gate");
        dto.setPurpose("Student Industrial Tour");
        dto.setDepartureTime("09:00 AM");
        dto.setExpectedPassengers(40);

        transportService.createRequest(dto, requesterUser);

        // 1. Requester confirmation notification
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
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

        // 3. Redundant AO_ADMIN notification trigger REMOVED
        verify(notificationService, never()).sendNotification(
                eq("AO_ADMIN"),
                any(),
                any(),
                eq("New Transport Request"),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("Transport: Approval notifies requester and assigned driver")
    void testTransportApproval_NotifiesRequesterAndDriver() {
        Vehicle vehicle = Vehicle.builder()
                .vehicleId("V-01")
                .driverName("R. Prasad")
                .driverPhone("9876543210")
                .active(true)
                .build();
        TransportRequest req = TransportRequest.builder()
                .id("T001")
                .requestId("CSE-TRN-001")
                .vehicleId("V-01")
                .destination("Industrial Visit")
                .tripDate("2026-11-20")
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .build();

        when(transportRepository.findById("T001")).thenReturn(Optional.of(req));
        when(vehicleRepository.findByVehicleId("V-01")).thenReturn(Optional.of(vehicle));
        when(userRepository.findAll()).thenReturn(List.of(driverUser));
        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenReturn("PROF_CSE");
        when(transportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        transportService.approveRequest("T001");

        // 1. Requester notified
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Transport Request Approved"),
                anyString(),
                eq("Transport"),
                eq("SUCCESS"),
                eq("CSE-TRN-001")
        );

        // 2. Assigned driver notified
        verify(notificationService).sendNotification(
                eq("DRIVER"),
                eq("ADMIN"),
                eq("DRV001"),
                eq("Transport Trip Assigned"),
                anyString(),
                eq("Transport"),
                eq("INFO"),
                eq("CSE-TRN-001")
        );
    }

    // =========================================================================
    // 4. STATIONERY NOTIFICATIONS (STAGE 2A, 2B, 2F)
    // =========================================================================

    @Test
    @DisplayName("Stationery: Submission notifies requester and Stationery Admin, NO duplicate AO_ADMIN")
    void testStationerySubmission_NotifiesRequesterAndAdmin_NoDuplicateAo() {
        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("CSE-STA-001");
        when(stationeryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StationeryItem item = StationeryItem.builder().itemId("ITEM-1").name("Notebook").unit("pcs").active(true).build();
        when(stationeryItemRepository.findByItemId("ITEM-1")).thenReturn(Optional.of(item));

        StationeryRequestDTO dto = new StationeryRequestDTO();
        dto.setPurpose("Midterm Examination Papers");
        StationeryRequestDTO.ItemRequestItem ir = new StationeryRequestDTO.ItemRequestItem();
        ir.setItemId("ITEM-1");
        ir.setQuantity(5);
        dto.setItems(List.of(ir));

        stationeryService.createRequest(dto, requesterUser);

        // 1. Requester notified
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Stationery Request Submitted"),
                contains("submitted"),
                eq("Stationery"),
                eq("INFO"),
                eq("CSE-STA-001")
        );

        // 2. Stationery Admin notified
        verify(notificationService).sendNotification(
                eq("STATIONERY_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Stationery Request"),
                anyString(),
                eq("Stationery"),
                eq("INFO"),
                eq("CSE-STA-001")
        );

        // 3. Redundant AO_ADMIN notification trigger REMOVED
        verify(notificationService, never()).sendNotification(
                eq("AO_ADMIN"),
                any(),
                any(),
                eq("New Stationery Request"),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    // =========================================================================
    // 5. SNACKS & MEALS NOTIFICATIONS (STAGE 2A, 2B, 2G)
    // =========================================================================

    @Test
    @DisplayName("Meals: Submission notifies requester and Meals Admin, NO duplicate AO_ADMIN")
    void testMealsSubmission_NotifiesRequesterAndAdmin_NoDuplicateAo() {
        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("CSE-MEAL-001");
        when(mealRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MealRequestDTO dto = new MealRequestDTO();
        dto.setEventTitle("Alumni Meet Catering");
        dto.setVenue("Campus Auditorium");
        dto.setDate("2026-11-20");
        dto.setMealTypes(List.of("Breakfast", "Lunch"));
        dto.setTotalGuests(50);

        mealService.createRequest(dto, requesterUser);

        // 1. Requester notified
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Meal Arrangement Request Submitted"),
                contains("submitted"),
                eq("Snacks & Meals"),
                eq("INFO"),
                eq("CSE-MEAL-001")
        );

        // 2. Meals Admin notified
        verify(notificationService).sendNotification(
                eq("MEALS_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("New Meal Arrangement Request"),
                anyString(),
                eq("Snacks & Meals"),
                eq("INFO"),
                eq("CSE-MEAL-001")
        );

        // 3. Redundant AO_ADMIN notification trigger REMOVED
        verify(notificationService, never()).sendNotification(
                eq("AO_ADMIN"),
                any(),
                any(),
                eq("New Meal Arrangement Request"),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("Meals: Approval notifies requester and catering in-charge")
    void testMealsApproval_NotifiesRequesterAndCateringIncharge() {
        MealRequest req = MealRequest.builder()
                .id("M001")
                .requestId("CSE-MEAL-001")
                .date("2026-11-20")
                .mealTypes(List.of("Lunch"))
                .totalGuests(100)
                .department("CSE")
                .requesterUserId("PROF_CSE")
                .build();

        when(mealRepository.findById("M001")).thenReturn(Optional.of(req));
        when(userRepository.findAll()).thenReturn(List.of(canteenUser));
        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenReturn("PROF_CSE");
        when(mealRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mealService.approveRequest("M001");

        // 1. Requester notified
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Meals Request Approved"),
                anyString(),
                eq("Snacks & Meals"),
                eq("SUCCESS"),
                eq("CSE-MEAL-001")
        );

        // 2. Catering in-charge notified
        verify(notificationService).sendNotification(
                eq("CANTEEN_INCHARGE"),
                eq("CANTEEN"),
                eq("CANT001"),
                eq("New Catering Arrangement Order"),
                contains("100"),
                eq("Snacks & Meals"),
                eq("INFO"),
                eq("CSE-MEAL-001")
        );
    }

    // =========================================================================
    // 6. ELECTRICAL ISSUE NOTIFICATIONS (STAGE 2H)
    // =========================================================================

    @Test
    @DisplayName("Electrical: Creation notifies reporter and assigned Electrician (without SEMINAR_TECHNICIAN hardcoding)")
    void testElectricalCreation_NotifiesReporterAndElectrician() {
        User techReporter = User.builder()
                .userId("TECH_ECE")
                .name("ECE Technician")
                .email("tech_ece@nrtec.in")
                .department("ECE")
                .role("SEMINAR_TECHNICIAN")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .active(true)
                .build();

        when(requestIdService.generateRequestId(anyString(), any(), anyString())).thenReturn("ECE-ELEC-0001");
        when(electricalRepository.existsByRequestId("ECE-ELEC-0001")).thenReturn(false);
        when(userRepository.findAll()).thenReturn(List.of(electrician1));
        when(userRepository.findByUserId("TECH_ECE")).thenReturn(Optional.of(techReporter));
        when(electricalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateElectricalIssueDTO dto = CreateElectricalIssueDTO.builder()
                .locationType("Academic Block")
                .buildingName("Main Block")
                .floor("2nd Floor")
                .roomNumber("MB-201")
                .specificLocation("Room 201 Near Projector Panel")
                .issueCategory("Short Circuit / Sparking")
                .priority("HIGH")
                .description("Sparking detected in 15A modular switchboard")
                .build();

        electricalIssueService.createRequest(dto, techReporter);

        // 1. Reporter notified with their actual role (SEMINAR_TECHNICIAN), resolved from user record
        verify(notificationService).sendNotification(
                eq("SEMINAR_TECHNICIAN"),
                eq("ECE"),
                eq("TECH_ECE"),
                eq("Electrical Issue Reported"),
                contains("received"),
                eq("Electrical Service"),
                eq("INFO"),
                eq("ECE-ELEC-0001")
        );

        // 2. Assigned electrician notified
        verify(notificationService).sendNotification(
                eq("ELECTRICIAN"),
                isNull(),
                eq("ELEC001"),
                contains("New Electrical Issue Assigned"),
                anyString(),
                eq("Electrical Service"),
                eq("ASSIGNMENT"),
                eq("ECE-ELEC-0001")
        );
    }

    @Test
    @DisplayName("Electrical: Reassignment notifies newly assigned electrician, previous electrician, and reporter")
    void testElectricalReassignment_NotifiesBothElectriciansAndReporter() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("ELEC_01")
                .requestId("ECE-ELEC-0001")
                .status("ASSIGNED")
                .assignedElectricianId("ELEC001")
                .assignedElectricianName("E. Electrician One")
                .reportedByUserId("PROF_CSE")
                .reportedByDepartment("CSE")
                .buildingName("Main Block")
                .priority("HIGH")
                .build();

        when(electricalRepository.findById("ELEC_01")).thenReturn(Optional.of(req));
        when(userRepository.findByUserId("ELEC002")).thenReturn(Optional.of(electrician2));
        when(userRepository.findByUserId("PROF_CSE")).thenReturn(Optional.of(requesterUser));
        when(electricalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReassignElectricianDTO dto = new ReassignElectricianDTO();
        dto.setElectricianUserId("ELEC002");
        dto.setRemarks("Electrician One on leave");

        electricalIssueService.reassignElectrician("ELEC_01", dto, aoAdmin);

        // 1. Newly assigned electrician notified
        verify(notificationService).sendNotification(
                eq("ELECTRICIAN"),
                isNull(),
                eq("ELEC002"),
                contains("Electrical Issue Assigned"),
                anyString(),
                eq("Electrical Service"),
                eq("ASSIGNMENT"),
                eq("ECE-ELEC-0001")
        );

        // 2. Previous electrician notified of reassignment away
        verify(notificationService).sendNotification(
                eq("ELECTRICIAN"),
                isNull(),
                eq("ELEC001"),
                eq("Electrical Issue Reassigned Away"),
                contains("reassigned to E. Electrician Two"),
                eq("Electrical Service"),
                eq("INFO"),
                eq("ECE-ELEC-0001")
        );

        // 3. Reporter notified with their actual resolved role
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("PROF_CSE"),
                eq("Electrician Reassigned"),
                anyString(),
                eq("Electrical Service"),
                eq("STATUS_UPDATE"),
                eq("ECE-ELEC-0001")
        );
    }

    @Test
    @DisplayName("Electrical: Reopening notifies assigned electrician AND AO_ADMIN")
    void testElectricalReopen_NotifiesElectricianAndAoAdmin() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("ELEC_01")
                .requestId("ECE-ELEC-0001")
                .status("COMPLETED")
                .assignedElectricianId("ELEC001")
                .reportedByUserId("PROF_CSE")
                .reportedByDepartment("CSE")
                .buildingName("Main Block")
                .build();

        when(electricalRepository.findById("ELEC_01")).thenReturn(Optional.of(req));
        when(electricalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReopenIssueDTO dto = new ReopenIssueDTO();
        dto.setReopenReason("Lights still flickering after fix");

        electricalIssueService.reopenRequest("ELEC_01", dto, aoAdmin);

        // 1. Assigned electrician alerted
        verify(notificationService).sendNotification(
                eq("ELECTRICIAN"),
                isNull(),
                eq("ELEC001"),
                eq("Electrical Issue Reopened"),
                anyString(),
                eq("Electrical Service"),
                eq("ALERT"),
                eq("ECE-ELEC-0001")
        );

        // 2. AO Admin alerted
        verify(notificationService).sendNotification(
                eq("AO_ADMIN"),
                eq("ADMIN"),
                isNull(),
                eq("Electrical Issue Reopened"),
                anyString(),
                eq("Electrical Service"),
                eq("ALERT"),
                eq("ECE-ELEC-0001")
        );
    }
}

