package com.nec.collegeservices.service;

import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class AdminSelfApprovalTest {

    // Seminar Service Mocks
    @Mock private SeminarBookingRepository seminarBookingRepository;
    @Mock private SeminarHallRepository seminarHallRepository;
    @Mock private NotificationService notificationService;
    @Mock private RequesterResolver requesterResolver;
    @Mock private AuthService authService;
    @Mock private RequestIdService requestIdService;
    @Mock private UserRepository userRepository;

    @InjectMocks private SeminarService seminarService;

    // Transport Service Mocks
    @Mock private VehicleRepository vehicleRepository;
    @Mock private TransportRequestRepository transportRequestRepository;
    @InjectMocks private TransportService transportService;

    // Meal Service Mocks
    @Mock private MealRequestRepository mealRequestRepository;
    @InjectMocks private MealService mealService;

    // Stationery Service Mocks
    @Mock private StationeryRequestRepository stationeryRequestRepository;
    @InjectMocks private StationeryService stationeryService;

    // Accommodation Service Mocks
    @Mock private AccommodationRequestRepository accommodationRequestRepository;
    @Mock private AccommodationRoomRepository roomRepository;
    @InjectMocks private AccommodationService accommodationService;

    @BeforeEach
    void setUp() {
        when(seminarBookingRepository.save(any(SeminarBooking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transportRequestRepository.save(any(TransportRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mealRequestRepository.save(any(MealRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(stationeryRequestRepository.save(any(StationeryRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(accommodationRequestRepository.save(any(AccommodationRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("1. Seminar: Authorized Admin who created booking can approve their own request")
    void testSeminarAdminCanApproveOwnBooking() {
        User seminarAdmin = User.builder()
                .userId("admin_sem")
                .name("Seminar Admin")
                .role("SEMINAR_ADMIN")
                .roles(List.of("SEMINAR_ADMIN"))
                .active(true)
                .build();

        SeminarBooking booking = SeminarBooking.builder()
                .id("SEM_001")
                .bookingId("CSE-SEM-001")
                .hallId("SH-1")
                .hallName("Seminar Hall 1")
                .requesterUserId("admin_sem")
                .requestedBy("Seminar Admin")
                .department("CSE")
                .date("2026-11-15")
                .slot("FORENOON")
                .status("PENDING")
                .build();

        when(seminarBookingRepository.findById("SEM_001")).thenReturn(Optional.of(booking));
        when(seminarBookingRepository.findActiveBookingsForHallAndDate(anyString(), anyString())).thenReturn(Collections.emptyList());

        SeminarBooking result = seminarService.approveBooking("SEM_001", seminarAdmin);

        assertNotNull(result);
        assertEquals("APPROVED", result.getStatus());
        assertEquals("Seminar Admin", result.getApprovedBy());
    }

    @Test
    @DisplayName("1b. Seminar: AO Admin in ADMIN department can approve their own request (e.g. AO-SEM-0038)")
    void testAOAdminCanApproveOwnSeminarBooking() {
        User aoAdmin = User.builder()
                .userId("AO001")
                .name("Administrative Officer")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        SeminarBooking booking = SeminarBooking.builder()
                .id("SEM_AO_038")
                .bookingId("AO-SEM-0038")
                .hallId("SH-2")
                .hallName("Seminar Hall 2")
                .requesterUserId("AO001")
                .requestedBy("Administrative Officer")
                .department("ADMIN")
                .date("2026-11-20")
                .slot("FORENOON")
                .status("PENDING")
                .build();

        when(seminarBookingRepository.findById("SEM_AO_038")).thenReturn(Optional.of(booking));
        when(seminarBookingRepository.findActiveBookingsForHallAndDate(anyString(), anyString())).thenReturn(Collections.emptyList());

        SeminarBooking result = seminarService.approveBooking("SEM_AO_038", aoAdmin);

        assertNotNull(result);
        assertEquals("APPROVED", result.getStatus());
        assertEquals("Administrative Officer", result.getApprovedBy());
    }

    @Test
    @DisplayName("2. Seminar: Non-admin requester attempting self-approval is rejected")
    void testSeminarNonAdminCannotApproveOwnBooking() {
        User regularUser = User.builder()
                .userId("faculty_01")
                .name("Regular Faculty")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .active(true)
                .build();

        SeminarBooking booking = SeminarBooking.builder()
                .id("SEM_002")
                .bookingId("CSE-SEM-002")
                .hallId("SH-1")
                .requesterUserId("faculty_01")
                .requestedBy("Regular Faculty")
                .status("PENDING")
                .build();

        when(seminarBookingRepository.findById("SEM_002")).thenReturn(Optional.of(booking));

        // Non-admin lacks hall authorization -> AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> seminarService.approveBooking("SEM_002", regularUser));
    }

    @Test
    @DisplayName("3. Seminar: Booking conflict check on approval still blocks conflicting slots")
    void testSeminarApprovalConflictPreventionStillWorks() {
        User seminarAdmin = User.builder()
                .userId("admin_sem")
                .name("Seminar Admin")
                .role("SEMINAR_ADMIN")
                .roles(List.of("SEMINAR_ADMIN"))
                .active(true)
                .build();

        SeminarBooking booking = SeminarBooking.builder()
                .id("SEM_003")
                .bookingId("CSE-SEM-003")
                .hallId("SH-1")
                .hallName("Seminar Hall 1")
                .requesterUserId("admin_sem")
                .date("2026-11-15")
                .slot("FULL_DAY")
                .status("PENDING")
                .build();

        SeminarBooking existingApproved = SeminarBooking.builder()
                .id("SEM_EXISTING")
                .bookingId("CSE-SEM-EXISTING")
                .hallId("SH-1")
                .date("2026-11-15")
                .slot("FORENOON")
                .status("APPROVED")
                .build();

        when(seminarBookingRepository.findById("SEM_003")).thenReturn(Optional.of(booking));
        when(seminarBookingRepository.findActiveBookingsForHallAndDate(anyString(), anyString()))
                .thenReturn(List.of(existingApproved));

        assertThrows(ConflictException.class, () -> seminarService.approveBooking("SEM_003", seminarAdmin));
    }

    @Test
    @DisplayName("4. Transport: Authorized Admin who created transport request can approve their own request")
    void testTransportAdminCanApproveOwnRequest() {
        User transportAdmin = User.builder()
                .userId("admin_trans")
                .name("Transport Incharge")
                .role("TRANSPORT_ADMIN")
                .roles(List.of("TRANSPORT_ADMIN"))
                .active(true)
                .build();
        when(authService.getCurrentUser()).thenReturn(transportAdmin);

        TransportRequest req = TransportRequest.builder()
                .id("TR_001")
                .requestId("REQ-TR-001")
                .requesterUserId("admin_trans")
                .requestedBy("Transport Incharge")
                .department("ADMIN")
                .tripDate("2026-11-20")
                .status("PENDING")
                .build();

        when(transportRequestRepository.findById("TR_001")).thenReturn(Optional.of(req));

        TransportRequest result = transportService.approveRequest("TR_001");

        assertNotNull(result);
        assertEquals("APPROVED", result.getStatus());
        assertEquals("Transport Incharge", result.getApprovedBy());
    }

    @Test
    @DisplayName("5. Transport: Non-admin requester cannot self-approve transport request")
    void testTransportNonAdminCannotSelfApprove() {
        User faculty = User.builder()
                .userId("faculty_02")
                .name("Faculty User")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .active(true)
                .build();
        when(authService.getCurrentUser()).thenReturn(faculty);

        TransportRequest req = TransportRequest.builder()
                .id("TR_002")
                .requestId("REQ-TR-002")
                .requesterUserId("faculty_02")
                .requestedBy("Faculty User")
                .status("PENDING")
                .build();

        when(transportRequestRepository.findById("TR_002")).thenReturn(Optional.of(req));

        assertThrows(BadRequestException.class, () -> transportService.approveRequest("TR_002"));
    }

    @Test
    @DisplayName("6. Meals: Authorized Admin who created meal request can approve their own request")
    void testMealAdminCanApproveOwnRequest() {
        User mealAdmin = User.builder()
                .userId("admin_meals")
                .name("Meals Manager")
                .role("MEALS_ADMIN")
                .roles(List.of("MEALS_ADMIN"))
                .active(true)
                .build();
        when(authService.getCurrentUser()).thenReturn(mealAdmin);

        MealRequest req = MealRequest.builder()
                .id("MEAL_001")
                .requestId("REQ-MEAL-001")
                .requesterUserId("admin_meals")
                .requestedBy("Meals Manager")
                .department("ADMIN")
                .status("PENDING")
                .build();

        when(mealRequestRepository.findById("MEAL_001")).thenReturn(Optional.of(req));

        MealRequest result = mealService.approveRequest("MEAL_001");

        assertNotNull(result);
        assertEquals("APPROVED", result.getStatus());
        assertEquals("Meals Manager", result.getApprovedBy());
    }

    @Test
    @DisplayName("7. Meals: Non-admin requester cannot self-approve meal request")
    void testMealNonAdminCannotSelfApprove() {
        User faculty = User.builder()
                .userId("faculty_03")
                .name("Faculty Member")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .active(true)
                .build();
        when(authService.getCurrentUser()).thenReturn(faculty);

        MealRequest req = MealRequest.builder()
                .id("MEAL_002")
                .requestId("REQ-MEAL-002")
                .requesterUserId("faculty_03")
                .requestedBy("Faculty Member")
                .status("PENDING")
                .build();

        when(mealRequestRepository.findById("MEAL_002")).thenReturn(Optional.of(req));

        assertThrows(BadRequestException.class, () -> mealService.approveRequest("MEAL_002"));
    }

    @Test
    @DisplayName("8. Stationery: Authorized Admin who created stationery request can approve their own request")
    void testStationeryAdminCanApproveOwnRequest() {
        User stationeryAdmin = User.builder()
                .userId("admin_stat")
                .name("Stationery Head")
                .role("STATIONERY_ADMIN")
                .roles(List.of("STATIONERY_ADMIN"))
                .active(true)
                .build();
        when(authService.getCurrentUser()).thenReturn(stationeryAdmin);

        StationeryRequest req = StationeryRequest.builder()
                .id("STAT_001")
                .requestId("REQ-STAT-001")
                .requesterUserId("admin_stat")
                .requestedBy("Stationery Head")
                .department("ADMIN")
                .status("PENDING")
                .build();

        when(stationeryRequestRepository.findById("STAT_001")).thenReturn(Optional.of(req));

        StationeryRequest result = stationeryService.approveRequest("STAT_001", "Approved for office use");

        assertNotNull(result);
        assertEquals("APPROVED", result.getStatus());
        assertEquals("Stationery Head", result.getApprovedBy());
    }

    @Test
    @DisplayName("9. Stationery: Non-admin requester cannot self-approve stationery request")
    void testStationeryNonAdminCannotSelfApprove() {
        User faculty = User.builder()
                .userId("faculty_04")
                .name("Department Faculty")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .active(true)
                .build();
        when(authService.getCurrentUser()).thenReturn(faculty);

        StationeryRequest req = StationeryRequest.builder()
                .id("STAT_002")
                .requestId("REQ-STAT-002")
                .requesterUserId("faculty_04")
                .requestedBy("Department Faculty")
                .status("PENDING")
                .build();

        when(stationeryRequestRepository.findById("STAT_002")).thenReturn(Optional.of(req));

        assertThrows(BadRequestException.class, () -> stationeryService.approveRequest("STAT_002", ""));
    }

    @Test
    @DisplayName("10. Accommodation: Authorized Hostel/AO Admin who created request can approve their own request")
    void testAccommodationAdminCanApproveOwnRequest() {
        User aoAdmin = User.builder()
                .userId("admin_ao")
                .name("Administrative Officer")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .active(true)
                .build();

        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC_001")
                .requestId("REQ-ACC-001")
                .requesterUserId("admin_ao")
                .requestedBy("Administrative Officer")
                .department("ADMIN")
                .hostel("Boys Hostel")
                .roomId("RM-101")
                .checkInDate("2026-11-01")
                .checkOutDate("2026-11-03")
                .status("PENDING_AO_APPROVAL")
                .build();

        when(accommodationRequestRepository.findById("ACC_001")).thenReturn(Optional.of(req));
        when(accommodationRequestRepository.findActiveBookingsForRoom(anyString())).thenReturn(Collections.emptyList());

        AccommodationRequest result = accommodationService.approveRequest("ACC_001", aoAdmin);

        assertNotNull(result);
        assertEquals("APPROVED", result.getStatus());
        assertEquals("Administrative Officer", result.getApprovedBy());
    }

    @Test
    @DisplayName("11. Accommodation: Non-admin requester cannot self-approve accommodation request")
    void testAccommodationNonAdminCannotSelfApprove() {
        User faculty = User.builder()
                .userId("faculty_05")
                .name("Visiting Faculty")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .active(true)
                .build();

        AccommodationRequest req = AccommodationRequest.builder()
                .id("ACC_002")
                .requestId("REQ-ACC-002")
                .requesterUserId("faculty_05")
                .requestedBy("Visiting Faculty")
                .hostel("Boys Hostel")
                .status("PENDING")
                .build();

        when(accommodationRequestRepository.findById("ACC_002")).thenReturn(Optional.of(req));

        assertThrows(BadRequestException.class, () -> accommodationService.approveRequest("ACC_002", faculty));
    }
}
