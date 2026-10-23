package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.report.ReportDataDTO;
import com.nec.collegeservices.dto.report.ReportFilterRequest;
import com.nec.collegeservices.dto.report.UserReportPermissionsDTO;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ReportServiceMultiFilterTest {

    @Mock
    private SeminarBookingRepository seminarBookingRepository;

    @Mock
    private AccommodationRequestRepository accommodationRequestRepository;

    @Mock
    private TransportRequestRepository transportRequestRepository;

    @Mock
    private StationeryRequestRepository stationeryRequestRepository;

    @Mock
    private MealRequestRepository mealRequestRepository;

    @Mock
    private SeminarHallRepository seminarHallRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PdfReportGenerator pdfReportGenerator;

    @Mock
    private ExcelReportGenerator excelReportGenerator;

    @InjectMocks
    private ReportService reportService;

    private User aoAdminUser;
    private User deptUser;

    @BeforeEach
    public void setup() {
        aoAdminUser = User.builder()
                .userId("AO001")
                .name("Administrative Officer")
                .role("AO_ADMIN")
                .department("ADMIN")
                .build();

        deptUser = User.builder()
                .userId("CSE001")
                .name("CSE Faculty")
                .role("DEPARTMENT_USER")
                .department("CSE")
                .build();

        // Sample Seminar Bookings
        SeminarBooking sem1 = SeminarBooking.builder()
                .bookingId("SH-001")
                .department("CSE")
                .eventTitle("AI Symposium")
                .hallId("SH-1")
                .hallName("Seminar Hall 1")
                .status("APPROVED")
                .date("2026-10-25")
                .slot("FORENOON")
                .expectedParticipants(100)
                .requestedBy("Prof. Rao")
                .requesterUserId("CSE001")
                .createdAt(LocalDateTime.now())
                .build();

        SeminarBooking sem2 = SeminarBooking.builder()
                .bookingId("SH-002")
                .department("ECE")
                .eventTitle("Robotics Workshop")
                .hallId("SH-2")
                .hallName("Seminar Hall 2")
                .status("PENDING")
                .date("2026-10-26")
                .slot("AFTERNOON")
                .expectedParticipants(80)
                .requestedBy("Dr. Kumar")
                .requesterUserId("ECE001")
                .createdAt(LocalDateTime.now())
                .build();

        when(seminarBookingRepository.findAll()).thenReturn(List.of(sem1, sem2));

        // Sample Accommodation
        AccommodationRequest acc1 = AccommodationRequest.builder()
                .requestId("ACC-001")
                .department("CSE")
                .purpose("Guest Lecture")
                .hostel("Girls Hostel")
                .roomType("AC Room")
                .roomId("GH-AC-1")
                .status("APPROVED")
                .checkInDate("2026-10-25")
                .checkOutDate("2026-10-27")
                .guestsCount(2)
                .requestedBy("Prof. Rao")
                .requesterUserId("CSE001")
                .createdAt(LocalDateTime.now())
                .build();

        AccommodationRequest acc2 = AccommodationRequest.builder()
                .requestId("ACC-002")
                .department("MECH")
                .purpose("Conference Chief Guest")
                .hostel("Boys Hostel")
                .roomType("Non-AC Room")
                .status("REJECTED")
                .checkInDate("2026-10-28")
                .guestsCount(1)
                .requestedBy("Prof. Reddy")
                .requesterUserId("MECH001")
                .createdAt(LocalDateTime.now())
                .build();

        when(accommodationRequestRepository.findAll()).thenReturn(List.of(acc1, acc2));

        // Sample Transport
        TransportRequest trans1 = TransportRequest.builder()
                .requestId("TR-001")
                .department("EEE")
                .purpose("Industrial Visit")
                .tripType("ROUND_TRIP")
                .vehicleName("College Bus 1")
                .status("PENDING")
                .tripDate("2026-10-25")
                .expectedPassengers(45)
                .requestedBy("Prof. Prasad")
                .requesterUserId("EEE001")
                .createdAt(LocalDateTime.now())
                .build();

        when(transportRequestRepository.findAll()).thenReturn(List.of(trans1));

        // Sample Stationery
        StationeryRequest stat1 = StationeryRequest.builder()
                .requestId("ST-001")
                .department("CSE")
                .purpose("Exam Papers")
                .status("APPROVED")
                .itemsRequested(List.of(
                        StationeryRequest.RequestedItem.builder().name("A4 Paper").quantity(10).unit("Reams").build()
                ))
                .requestedBy("Prof. Rao")
                .requesterUserId("CSE001")
                .createdAt(LocalDateTime.now())
                .build();

        when(stationeryRequestRepository.findAll()).thenReturn(List.of(stat1));

        // Sample Meals
        MealRequest meal1 = MealRequest.builder()
                .requestId("ML-001")
                .department("CSE")
                .eventTitle("AI Faculty Lunch")
                .venue("Guest Dining Hall")
                .mealTypes(List.of("Lunch", "Tea / Coffee"))
                .totalGuests(30)
                .serviceTime("AFTERNOON")
                .status("APPROVED")
                .date("2026-10-25")
                .requestedBy("Prof. Rao")
                .requesterUserId("CSE001")
                .createdAt(LocalDateTime.now())
                .build();

        when(mealRequestRepository.findAll()).thenReturn(List.of(meal1));

        // Halls
        SeminarHall hall1 = SeminarHall.builder().hallId("SH-1").name("Seminar Hall 1").build();
        SeminarHall hall2 = SeminarHall.builder().hallId("SH-2").name("Seminar Hall 2").build();
        when(seminarHallRepository.findAll()).thenReturn(List.of(hall1, hall2));
        when(seminarHallRepository.findByHallId("SH-1")).thenReturn(Optional.of(hall1));
    }

    @Test
    @DisplayName("Scenario 1: All services, departments, and statuses selected (unfiltered)")
    public void testAllSelected() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("SEMINAR_HALL", "ACCOMMODATION", "TRANSPORT", "STATIONERY", "MEALS"))
                .departments(List.of("CSE", "ECE", "EEE", "MECH"))
                .statuses(List.of("APPROVED", "PENDING", "REJECTED", "CANCELLED", "UNDER_REVIEW", "COMPLETED"))
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, aoAdminUser);

        assertNotNull(data);
        assertEquals(7, data.getSummary().getTotalRequests()); // 2 sem + 2 acc + 1 trans + 1 stat + 1 meal
        assertEquals(4, data.getSummary().getApproved()); // sem1, acc1, stat1, meal1
        assertEquals(2, data.getSummary().getPending()); // sem2, trans1
        assertEquals(1, data.getSummary().getRejected()); // acc2
        assertEquals(7, data.getDetailedRecords().size());
    }

    @Test
    @DisplayName("Scenario 2: One service, one department, and one status selected")
    public void testSingleSelection() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("ACCOMMODATION"))
                .departments(List.of("CSE"))
                .statuses(List.of("APPROVED"))
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, aoAdminUser);

        assertNotNull(data);
        assertEquals(1, data.getSummary().getTotalRequests());
        assertEquals(1, data.getSummary().getApproved());
        assertEquals("ACC-001", data.getDetailedRecords().get(0).getRequestId());
    }

    @Test
    @DisplayName("Scenario 3: Multiple services, departments, and statuses simultaneously")
    public void testMultiSelectionSimultaneously() {
        // Services: Accommodation and Transport
        // Departments: CSE and EEE
        // Statuses: APPROVED and PENDING
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("ACCOMMODATION", "TRANSPORT"))
                .departments(List.of("CSE", "EEE"))
                .statuses(List.of("APPROVED", "PENDING"))
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, aoAdminUser);

        assertNotNull(data);
        // ACC-001 (CSE, APPROVED) matches
        // TR-001 (EEE, PENDING) matches
        // ACC-002 (MECH, REJECTED) does not match dept or status
        // SEM items not included in services
        assertEquals(2, data.getSummary().getTotalRequests());
        assertEquals(1, data.getSummary().getApproved());
        assertEquals(1, data.getSummary().getPending());
        assertTrue(data.getDetailedRecords().stream().anyMatch(r -> r.getRequestId().equals("ACC-001")));
        assertTrue(data.getDetailedRecords().stream().anyMatch(r -> r.getRequestId().equals("TR-001")));
    }

    @Test
    @DisplayName("Scenario 4 & 5: Clear Selection (empty list) treated as unfiltered without error")
    public void testClearedSelectionTreatedAsUnfiltered() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of()) // Cleared
                .departments(List.of()) // Cleared
                .statuses(List.of()) // Cleared
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, aoAdminUser);

        assertNotNull(data);
        // Empty should be treated as unfiltered, returning all 7 requests
        assertEquals(7, data.getSummary().getTotalRequests());
    }

    @Test
    @DisplayName("Scenario 7: Resource / Facility filtering with Seminar Hall")
    public void testSeminarHallResourceFilter() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("SEMINAR_HALL"))
                .hallId("SH-1")
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, aoAdminUser);

        assertNotNull(data);
        assertEquals(1, data.getSummary().getTotalRequests());
        assertEquals("SH-001", data.getDetailedRecords().get(0).getRequestId());
    }

    @Test
    @DisplayName("Scenario 8: No matching records returns empty list without error")
    public void testNoMatchingRecords() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("TRANSPORT"))
                .departments(List.of("MECH")) // MECH has no transport
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, aoAdminUser);

        assertNotNull(data);
        assertEquals(0, data.getSummary().getTotalRequests());
        assertEquals(0, data.getDetailedRecords().size());
    }

    @Test
    @DisplayName("Scenario 9: Consistency between summary cards, breakdown, and export calls")
    public void testExportConsistency() {
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("STATIONERY", "MEALS"))
                .departments(List.of("CSE"))
                .statuses(List.of("APPROVED"))
                .dateRangeType("ALL")
                .build();

        byte[] dummyPdf = new byte[]{1, 2, 3};
        byte[] dummyExcel = new byte[]{4, 5, 6};
        when(pdfReportGenerator.generatePdf(any(ReportDataDTO.class))).thenReturn(dummyPdf);
        when(excelReportGenerator.generateExcel(any(ReportDataDTO.class))).thenReturn(dummyExcel);

        byte[] pdf = reportService.generateReportPdf(filter, aoAdminUser);
        byte[] excel = reportService.generateReportExcel(filter, aoAdminUser);

        assertArrayEquals(dummyPdf, pdf);
        assertArrayEquals(dummyExcel, excel);
    }

    @Test
    @DisplayName("Scenario 11: Department User is strictly constrained to their department")
    public void testDepartmentUserIsolation() {
        // Dept user tries to request ECE department
        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("SEMINAR_HALL"))
                .departments(List.of("ECE"))
                .dateRangeType("ALL")
                .build();

        // Enforced internally to CSE
        ReportDataDTO data = reportService.generateReportData(filter, deptUser);

        assertNotNull(data);
        // Only CSE seminar booking SH-001 should be returned, ECE booking SH-002 must not leak
        assertEquals(1, data.getSummary().getTotalRequests());
        assertEquals("CSE", data.getDetailedRecords().get(0).getDepartment());
    }

    @Test
    @DisplayName("Permissions: All supported services exposed to all reporting users")
    public void testUserPermissionsExposesAllServices() {
        UserReportPermissionsDTO perms = reportService.getUserPermissions(deptUser);
        assertNotNull(perms);
        assertTrue(perms.getAllowedServices().contains("ACCOMMODATION"));
        assertTrue(perms.getAllowedServices().contains("SEMINAR_HALL"));
        assertTrue(perms.getAllowedServices().contains("TRANSPORT"));
        assertTrue(perms.getAllowedServices().contains("STATIONERY"));
        assertTrue(perms.getAllowedServices().contains("MEALS"));
    }

    @Test
    @DisplayName("Scenario 12: AO Admin accommodation requests awaiting forwarding are properly counted in pending and breakdown")
    public void testAoAdminAccommodationPendingWorkflow() {
        AccommodationRequest pendingAo = AccommodationRequest.builder()
                .requestId("ACC-AO-001")
                .department("CSE")
                .purpose("Guest Lecture")
                .hostel("Boys Hostel")
                .roomType("AC Room")
                .roomId("BH-AC-1")
                .status("PENDING_AO_APPROVAL")
                .aoApprovalStatus("PENDING")
                .checkInDate("2026-10-25")
                .checkOutDate("2026-10-27")
                .guestsCount(1)
                .requestedBy("Prof. Rao")
                .requesterUserId("CSE001")
                .createdAt(LocalDateTime.now())
                .build();

        AccommodationRequest forwardedBoys = AccommodationRequest.builder()
                .requestId("ACC-FWD-002")
                .department("ECE")
                .purpose("Workshop Guest")
                .hostel("Boys Hostel")
                .roomType("AC Room")
                .roomId("BH-AC-2")
                .status("FORWARDED_TO_BOYS_ADMIN")
                .aoApprovalStatus("FORWARDED")
                .forwardedTo("BOYS_HOSTEL_ADMIN")
                .checkInDate("2026-10-25")
                .checkOutDate("2026-10-27")
                .guestsCount(1)
                .requestedBy("Dr. Kumar")
                .requesterUserId("ECE001")
                .createdAt(LocalDateTime.now())
                .build();

        AccommodationRequest approvedAcc = AccommodationRequest.builder()
                .requestId("ACC-APP-003")
                .department("EEE")
                .purpose("Visiting Professor")
                .hostel("Girls Hostel")
                .roomType("AC Room")
                .roomId("GH-AC-1")
                .status("APPROVED")
                .checkInDate("2026-10-25")
                .checkOutDate("2026-10-27")
                .guestsCount(1)
                .requestedBy("Prof. Prasad")
                .requesterUserId("EEE001")
                .createdAt(LocalDateTime.now())
                .build();

        when(accommodationRequestRepository.findAll()).thenReturn(List.of(pendingAo, forwardedBoys, approvedAcc));

        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("ACCOMMODATION"))
                .departments(List.of("ALL"))
                .statuses(List.of("ALL"))
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, aoAdminUser);

        assertNotNull(data);
        assertEquals(3, data.getSummary().getTotalRequests());
        assertEquals(1, data.getSummary().getApproved());
        assertEquals(2, data.getSummary().getPending()); // pendingAo + forwardedBoys
        assertEquals(0, data.getSummary().getRejected());
        assertEquals(0, data.getSummary().getCancelled());

        // Granular workflow breakdown verification
        assertEquals(1, data.getSummary().getPendingAoReview());
        assertEquals(1, data.getSummary().getPendingHostelReview());
        assertEquals(0, data.getSummary().getPendingGeneral());

        // Sum agreement
        assertEquals(data.getSummary().getTotalRequests(),
                data.getSummary().getApproved() + data.getSummary().getPending() + data.getSummary().getRejected() + data.getSummary().getCancelled());

        // Detailed records workflowStage check
        ReportDataDTO.ReportRecordDTO aoRec = data.getDetailedRecords().stream()
                .filter(r -> r.getRequestId().equals("ACC-AO-001")).findFirst().orElse(null);
        assertNotNull(aoRec);
        assertEquals("AWAITING_AO_FORWARDING", aoRec.getWorkflowStage());

        ReportDataDTO.ReportRecordDTO fwdRec = data.getDetailedRecords().stream()
                .filter(r -> r.getRequestId().equals("ACC-FWD-002")).findFirst().orElse(null);
        assertNotNull(fwdRec);
        assertEquals("FORWARDED_HOSTEL_ADMIN", fwdRec.getWorkflowStage());
    }

    @Test
    @DisplayName("Scenario 13: Hostel Admin cannot see requests awaiting AO Admin forwarding")
    public void testHostelAdminCannotSeeAoPendingRequests() {
        AccommodationRequest pendingAo = AccommodationRequest.builder()
                .requestId("ACC-AO-001")
                .department("CSE")
                .purpose("Guest Lecture")
                .hostel("Boys Hostel")
                .status("PENDING_AO_APPROVAL")
                .aoApprovalStatus("PENDING")
                .checkInDate("2026-10-25")
                .checkOutDate("2026-10-27")
                .createdAt(LocalDateTime.now())
                .build();

        AccommodationRequest forwardedBoys = AccommodationRequest.builder()
                .requestId("ACC-FWD-002")
                .department("ECE")
                .purpose("Workshop Guest")
                .hostel("Boys Hostel")
                .status("FORWARDED_TO_BOYS_ADMIN")
                .aoApprovalStatus("FORWARDED")
                .forwardedTo("BOYS_HOSTEL_ADMIN")
                .checkInDate("2026-10-25")
                .checkOutDate("2026-10-27")
                .createdAt(LocalDateTime.now())
                .build();

        when(accommodationRequestRepository.findAll()).thenReturn(List.of(pendingAo, forwardedBoys));

        User boysAdmin = User.builder()
                .userId("BH001")
                .name("Boys Hostel Admin")
                .role("BOYS_HOSTEL_ADMIN")
                .servicePermissions(List.of("ACCOMMODATION_ADMIN"))
                .assignedHostels(List.of("Boys Hostel"))
                .build();

        ReportFilterRequest filter = ReportFilterRequest.builder()
                .services(List.of("ACCOMMODATION"))
                .departments(List.of("ALL"))
                .statuses(List.of("ALL"))
                .dateRangeType("ALL")
                .build();

        ReportDataDTO data = reportService.generateReportData(filter, boysAdmin);

        assertNotNull(data);
        // Boys Admin must ONLY see the forwarded request ACC-FWD-002, NOT ACC-AO-001
        assertEquals(1, data.getSummary().getTotalRequests());
        assertEquals("ACC-FWD-002", data.getDetailedRecords().get(0).getRequestId());
    }
}
