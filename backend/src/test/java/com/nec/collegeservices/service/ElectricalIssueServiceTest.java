package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.electrical.*;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.ElectricalIssueRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.ElectricalIssueRequestRepository;
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
import org.springframework.security.access.AccessDeniedException;

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
public class ElectricalIssueServiceTest {

    @Mock
    private ElectricalIssueRequestRepository repository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RequestIdService requestIdService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuthService authService;

    @InjectMocks
    private ElectricalIssueService electricalIssueService;

    private User technician;
    private User electrician1;
    private User electrician2;
    private User aoAdmin;
    private User departmentUser;
    private CreateElectricalIssueDTO validCreateDto;

    @BeforeEach
    void setUp() {
        technician = User.builder()
                .userId("tech_ece")
                .name("K. Murugan")
                .department("ECE")
                .role("SEMINAR_TECHNICIAN")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .phone("9876543210")
                .active(true)
                .build();

        electrician1 = User.builder()
                .userId("elec_01")
                .name("R. Ramanathan")
                .department("MAINTENANCE")
                .role("ELECTRICIAN")
                .roles(List.of("ELECTRICIAN"))
                .phone("9842100001")
                .active(true)
                .build();

        electrician2 = User.builder()
                .userId("elec_02")
                .name("S. Suresh")
                .department("MAINTENANCE")
                .role("ELECTRICIAN")
                .roles(List.of("ELECTRICIAN"))
                .phone("9842100002")
                .active(true)
                .build();

        aoAdmin = User.builder()
                .userId("ao_admin_01")
                .name("Dr. Administrative Officer")
                .department("ADMIN")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .phone("9842199999")
                .active(true)
                .build();

        departmentUser = User.builder()
                .userId("prof_cse")
                .name("Prof. CSE")
                .department("CSE")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .phone("9842111111")
                .active(true)
                .build();

        validCreateDto = CreateElectricalIssueDTO.builder()
                .locationType("Academic Block")
                .buildingName("Main Block")
                .floor("2nd Floor")
                .roomNumber("MB-204")
                .specificLocation("Near Projector Panel")
                .issueCategory("Short Circuit / Sparking")
                .priority("HIGH")
                .description("Sparking detected in 15A modular switchboard")
                .photoUrl("https://assets.nec.edu/photos/spark-01.jpg")
                .build();

        when(requestIdService.generateRequestId(eq("ELEC"), any(User.class), anyString()))
                .thenReturn("ECE-ELEC-0001");

        when(repository.save(any(ElectricalIssueRequest.class)))
                .thenAnswer(invocation -> {
                    ElectricalIssueRequest r = invocation.getArgument(0);
                    if (r.getId() == null) r.setId("mongo-id-" + System.currentTimeMillis());
                    return r;
                });
    }

    @Test
    @DisplayName("Create Request - Auto-assigned when exactly one active electrician exists")
    void testCreateRequest_SingleElectrician_AutoAssigned() {
        when(userRepository.findAll()).thenReturn(List.of(electrician1, technician, departmentUser));
        when(repository.existsByRequestId("ECE-ELEC-0001")).thenReturn(false);

        ElectricalIssueResponseDTO result = electricalIssueService.createRequest(validCreateDto, technician);

        assertNotNull(result);
        assertEquals("ECE-ELEC-0001", result.getRequestId());
        assertEquals("ASSIGNED", result.getStatus());
        assertEquals("elec_01", result.getAssignedElectricianId());
        assertEquals("R. Ramanathan", result.getAssignedElectricianName());
        assertEquals("tech_ece", result.getReportedByUserId());

        // Verify status history has SUBMITTED and ASSIGNED
        assertEquals(2, result.getStatusHistory().size());
        assertEquals("SUBMITTED", result.getStatusHistory().get(0).getStatus());
        assertEquals("ASSIGNED", result.getStatusHistory().get(1).getStatus());

        // Verify notification dispatched to assigned electrician
        verify(notificationService, atLeastOnce()).sendNotification(
                eq("ELECTRICIAN"), isNull(), eq("elec_01"), anyString(), anyString(), eq("Electrical Service"), eq("ASSIGNMENT"), eq("ECE-ELEC-0001")
        );
    }

    @Test
    @DisplayName("Create Request - UNASSIGNED when zero active electricians exist")
    void testCreateRequest_ZeroElectricians_Unassigned() {
        when(userRepository.findAll()).thenReturn(List.of(technician, departmentUser));
        when(repository.existsByRequestId("ECE-ELEC-0001")).thenReturn(false);

        ElectricalIssueResponseDTO result = electricalIssueService.createRequest(validCreateDto, technician);

        assertNotNull(result);
        assertEquals("UNASSIGNED", result.getStatus());
        assertNull(result.getAssignedElectricianId());

        // Verify AO_ADMIN alerted
        verify(notificationService, atLeastOnce()).sendNotification(
                eq("AO_ADMIN"), eq("ADMIN"), isNull(), anyString(), anyString(), eq("Electrical Service"), eq("ALERT"), eq("ECE-ELEC-0001")
        );
    }

    @Test
    @DisplayName("Create Request - UNASSIGNED when multiple active electricians exist")
    void testCreateRequest_MultipleElectricians_Unassigned() {
        when(userRepository.findAll()).thenReturn(List.of(electrician1, electrician2, technician));
        when(repository.existsByRequestId("ECE-ELEC-0001")).thenReturn(false);

        ElectricalIssueResponseDTO result = electricalIssueService.createRequest(validCreateDto, technician);

        assertNotNull(result);
        assertEquals("UNASSIGNED", result.getStatus());
        assertNull(result.getAssignedElectricianId());

        // Verify AO_ADMIN alerted
        verify(notificationService, atLeastOnce()).sendNotification(
                eq("AO_ADMIN"), eq("ADMIN"), isNull(), anyString(), anyString(), eq("Electrical Service"), eq("ALERT"), eq("ECE-ELEC-0001")
        );
    }

    @Test
    @DisplayName("Create Request - Access Denied for unauthorized roles (Department User)")
    void testCreateRequest_UnauthorizedRole_AccessDenied() {
        assertThrows(AccessDeniedException.class, () ->
                electricalIssueService.createRequest(validCreateDto, departmentUser)
        );
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Create Request - Conflict Exception if Request ID already exists")
    void testCreateRequest_ConflictRequestId() {
        when(repository.existsByRequestId("ECE-ELEC-0001")).thenReturn(true);
        assertThrows(ConflictException.class, () ->
                electricalIssueService.createRequest(validCreateDto, technician)
        );
    }

    @Test
    @DisplayName("Create Request - Bad Request on missing fields or short description")
    void testCreateRequest_ValidationFailures() {
        CreateElectricalIssueDTO invalidDto = CreateElectricalIssueDTO.builder()
                .locationType("")
                .buildingName("Main Block")
                .floor("1")
                .specificLocation("Room 1")
                .issueCategory("Lighting")
                .priority("HIGH")
                .description("Short") // < 10 chars
                .build();

        assertThrows(BadRequestException.class, () ->
                electricalIssueService.createRequest(invalidDto, technician)
        );
    }

    @Test
    @DisplayName("Technician Isolation - Seminar Technician views only own requests")
    void testTechnicianRequestIsolation() {
        ElectricalIssueRequest req1 = ElectricalIssueRequest.builder()
                .requestId("ECE-ELEC-0001")
                .reportedByUserId("tech_ece")
                .build();

        when(repository.findByReportedByUserIdOrderByCreatedAtDesc("tech_ece"))
                .thenReturn(List.of(req1));

        List<ElectricalIssueResponseDTO> result = electricalIssueService.getMyRequests(technician);
        assertEquals(1, result.size());
        assertEquals("ECE-ELEC-0001", result.get(0).getRequestId());

        // Verify department user denied
        assertThrows(AccessDeniedException.class, () ->
                electricalIssueService.getMyRequests(departmentUser)
        );
    }

    @Test
    @DisplayName("Electrician Isolation - Electrician views only own assigned requests")
    void testElectricianRequestIsolation() {
        ElectricalIssueRequest req1 = ElectricalIssueRequest.builder()
                .requestId("ECE-ELEC-0001")
                .assignedElectricianId("elec_01")
                .status("ASSIGNED")
                .build();

        when(repository.findByAssignedElectricianIdOrderByCreatedAtDesc("elec_01"))
                .thenReturn(List.of(req1));

        List<ElectricalIssueResponseDTO> result = electricalIssueService.getAssignedRequests("ALL", electrician1);
        assertEquals(1, result.size());
        assertEquals("ECE-ELEC-0001", result.get(0).getRequestId());

        // Another electrician has 0
        when(repository.findByAssignedElectricianIdOrderByCreatedAtDesc("elec_02"))
                .thenReturn(Collections.emptyList());
        List<ElectricalIssueResponseDTO> result2 = electricalIssueService.getAssignedRequests("ALL", electrician2);
        assertTrue(result2.isEmpty());

        // Non-electrician denied
        assertThrows(AccessDeniedException.class, () ->
                electricalIssueService.getAssignedRequests("ALL", technician)
        );
    }

    @Test
    @DisplayName("Full Normal Lifecycle: ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED")
    void testNormalLifecycleFlow() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("req-101")
                .requestId("ECE-ELEC-0001")
                .assignedElectricianId("elec_01")
                .assignedElectricianName("R. Ramanathan")
                .reportedByUserId("tech_ece")
                .status("ASSIGNED")
                .statusHistory(new ArrayList<>())
                .build();

        when(repository.findByRequestId("ECE-ELEC-0001")).thenReturn(Optional.of(req));

        // 1. Accept Request
        ElectricalIssueResponseDTO accepted = electricalIssueService.acceptRequest("ECE-ELEC-0001", electrician1);
        assertEquals("ACCEPTED", accepted.getStatus());
        assertNotNull(accepted.getAcceptedAt());

        // 2. Start Repair
        ElectricalIssueResponseDTO started = electricalIssueService.startRepair("ECE-ELEC-0001", electrician1);
        assertEquals("IN_PROGRESS", started.getStatus());
        assertNotNull(started.getStartedAt());

        // 3. Update Remarks
        UpdateRemarksDTO remarksDto = UpdateRemarksDTO.builder().remarks("Replaced modular socket").build();
        ElectricalIssueResponseDTO remarked = electricalIssueService.updateRemarks("ECE-ELEC-0001", remarksDto, electrician1);
        assertEquals("Replaced modular socket", remarked.getWorkRemarks());

        // 4. Complete Request
        CompleteIssueDTO completeDto = CompleteIssueDTO.builder().resolutionRemarks("Full rewiring and load tested ok").build();
        ElectricalIssueResponseDTO completed = electricalIssueService.completeRequest("ECE-ELEC-0001", completeDto, electrician1);
        assertEquals("COMPLETED", completed.getStatus());
        assertEquals("Full rewiring and load tested ok", completed.getResolutionRemarks());
        assertNotNull(completed.getCompletedAt());
    }

    @Test
    @DisplayName("Invalid Transitions - Cannot start repair from ASSIGNED or complete from ACCEPTED")
    void testInvalidTransitions() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("req-101")
                .requestId("ECE-ELEC-0001")
                .assignedElectricianId("elec_01")
                .status("ASSIGNED")
                .build();

        when(repository.findByRequestId("ECE-ELEC-0001")).thenReturn(Optional.of(req));

        // Cannot start repair directly from ASSIGNED (must accept first)
        assertThrows(BadRequestException.class, () ->
                electricalIssueService.startRepair("ECE-ELEC-0001", electrician1)
        );

        // Cannot complete from ASSIGNED
        CompleteIssueDTO completeDto = CompleteIssueDTO.builder().resolutionRemarks("Done").build();
        assertThrows(BadRequestException.class, () ->
                electricalIssueService.completeRequest("ECE-ELEC-0001", completeDto, electrician1)
        );
    }

    @Test
    @DisplayName("Rejection Flow - Valid rejection and rejection denial on terminal state")
    void testRejectionFlow() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("req-101")
                .requestId("ECE-ELEC-0001")
                .assignedElectricianId("elec_01")
                .reportedByUserId("tech_ece")
                .status("ASSIGNED")
                .build();

        when(repository.findByRequestId("ECE-ELEC-0001")).thenReturn(Optional.of(req));

        RejectIssueDTO rejectDto = RejectIssueDTO.builder().rejectionReason("Duplicate issue reported").build();
        ElectricalIssueResponseDTO rejected = electricalIssueService.rejectRequest("ECE-ELEC-0001", rejectDto, electrician1);
        assertEquals("REJECTED", rejected.getStatus());
        assertEquals("Duplicate issue reported", rejected.getRejectionReason());

        // Cannot reject already rejected request
        assertThrows(BadRequestException.class, () ->
                electricalIssueService.rejectRequest("ECE-ELEC-0001", rejectDto, electrician1)
        );
    }

    @Test
    @DisplayName("Reopen Flow - Reporting technician can reopen COMPLETED issue")
    void testReopenFlow() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("req-101")
                .requestId("ECE-ELEC-0001")
                .reportedByUserId("tech_ece")
                .assignedElectricianId("elec_01")
                .status("COMPLETED")
                .build();

        when(repository.findByRequestId("ECE-ELEC-0001")).thenReturn(Optional.of(req));

        ReopenIssueDTO reopenDto = ReopenIssueDTO.builder().reopenReason("Socket sparking resumed during projector test").build();
        ElectricalIssueResponseDTO reopened = electricalIssueService.reopenRequest("ECE-ELEC-0001", reopenDto, technician);
        assertEquals("REOPENED", reopened.getStatus());
        assertEquals("Socket sparking resumed during projector test", reopened.getReopenReason());
        assertNotNull(reopened.getReopenedAt());

        // Another technician cannot reopen someone else's ticket
        User otherTech = User.builder().userId("other_tech").role("SEMINAR_TECHNICIAN").roles(List.of("SEMINAR_TECHNICIAN")).build();
        assertThrows(AccessDeniedException.class, () ->
                electricalIssueService.reopenRequest("ECE-ELEC-0001", reopenDto, otherTech)
        );
    }

    @Test
    @DisplayName("AO_ADMIN Reassignment and Cancellation")
    void testAdminReassignAndCancel() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("req-101")
                .requestId("ECE-ELEC-0001")
                .assignedElectricianId("elec_01")
                .status("ASSIGNED")
                .reportedByUserId("tech_ece")
                .build();

        when(repository.findByRequestId("ECE-ELEC-0001")).thenReturn(Optional.of(req));
        when(userRepository.findByUserId("elec_02")).thenReturn(Optional.of(electrician2));

        // Reassign to electrician2
        ReassignElectricianDTO reassignDto = ReassignElectricianDTO.builder()
                .electricianUserId("elec_02")
                .remarks("Emergency priority reallocation")
                .build();
        ElectricalIssueResponseDTO reassigned = electricalIssueService.reassignElectrician("ECE-ELEC-0001", reassignDto, aoAdmin);
        assertEquals("elec_02", reassigned.getAssignedElectricianId());
        assertEquals("S. Suresh", reassigned.getAssignedElectricianName());

        // Cancellation by Admin
        CancelIssueDTO cancelDto = CancelIssueDTO.builder().cancellationReason("Facility under renovation").build();
        ElectricalIssueResponseDTO cancelled = electricalIssueService.cancelRequest("ECE-ELEC-0001", cancelDto, aoAdmin);
        assertEquals("CANCELLED", cancelled.getStatus());
        assertEquals("Facility under renovation", cancelled.getCancellationReason());
    }

    @Test
    @DisplayName("AO_ADMIN Override Status with Audit Reason")
    void testAdminOverrideStatus() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .id("req-101")
                .requestId("ECE-ELEC-0001")
                .status("SUBMITTED")
                .build();

        when(repository.findByRequestId("ECE-ELEC-0001")).thenReturn(Optional.of(req));

        OverrideStatusDTO overrideDto = OverrideStatusDTO.builder()
                .targetStatus("COMPLETED")
                .reason("Resolved directly by external high-voltage contractor")
                .build();

        ElectricalIssueResponseDTO result = electricalIssueService.overrideStatus("ECE-ELEC-0001", overrideDto, aoAdmin);
        assertEquals("COMPLETED", result.getStatus());
        assertEquals("Resolved directly by external high-voltage contractor", result.getOverrideReason());
        assertEquals("ao_admin_01", result.getOverrideBy());
    }

    @Test
    @DisplayName("Notification Failure Resilience - Request succeeds even if notification throws")
    void testNotificationFailureResilience() {
        when(userRepository.findAll()).thenReturn(List.of(electrician1));
        when(repository.existsByRequestId("ECE-ELEC-0001")).thenReturn(false);

        // Force notification service to throw
        doThrow(new RuntimeException("SMTP Server Unreachable"))
                .when(notificationService)
                .sendNotification(anyString(), any(), any(), anyString(), anyString(), anyString(), anyString(), anyString());

        // Request must still succeed without bubbling up the notification exception
        ElectricalIssueResponseDTO result = electricalIssueService.createRequest(validCreateDto, technician);
        assertNotNull(result);
        assertEquals("ECE-ELEC-0001", result.getRequestId());
        assertEquals("ASSIGNED", result.getStatus());
    }
}

