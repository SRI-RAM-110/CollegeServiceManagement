package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.electrical.*;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.ElectricalIssueService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ElectricalIssueControllerTest {

    @Mock
    private ElectricalIssueService electricalIssueService;

    @Mock
    private AuthService authService;

    @InjectMocks
    private ElectricalIssueController controller;

    private User technician;
    private User electrician;
    private User aoAdmin;
    private ElectricalIssueResponseDTO sampleResponse;

    @BeforeEach
    void setUp() {
        technician = User.builder()
                .userId("tech_ece")
                .name("K. Murugan")
                .role("SEMINAR_TECHNICIAN")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .department("ECE")
                .build();

        electrician = User.builder()
                .userId("elec_01")
                .name("R. Ramanathan")
                .role("ELECTRICIAN")
                .roles(List.of("ELECTRICIAN"))
                .department("MAINTENANCE")
                .build();

        aoAdmin = User.builder()
                .userId("ao_admin_01")
                .name("AO Admin")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .build();

        sampleResponse = ElectricalIssueResponseDTO.builder()
                .id("mongo-101")
                .requestId("ECE-ELEC-0001")
                .locationType("Academic Block")
                .buildingName("Main Block")
                .floor("2nd Floor")
                .roomNumber("MB-204")
                .specificLocation("Near Projector Console")
                .issueCategory("Short Circuit / Sparking")
                .priority("HIGH")
                .status("ASSIGNED")
                .assignedElectricianId("elec_01")
                .assignedElectricianName("R. Ramanathan")
                .reportedByUserId("tech_ece")
                .reportedByName("K. Murugan")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("POST /api/electrical-issues returns 201 Created")
    void testCreateRequest_Returns201() {
        when(authService.getCurrentUser()).thenReturn(technician);
        CreateElectricalIssueDTO dto = CreateElectricalIssueDTO.builder()
                .locationType("Academic Block")
                .buildingName("Main Block")
                .floor("2nd Floor")
                .roomNumber("MB-204")
                .specificLocation("Near Projector Console")
                .issueCategory("Short Circuit / Sparking")
                .priority("HIGH")
                .description("Sparking detected in modular socket")
                .build();

        when(electricalIssueService.createRequest(any(CreateElectricalIssueDTO.class), any(User.class)))
                .thenReturn(sampleResponse);

        ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> response = controller.createRequest(dto);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("ECE-ELEC-0001", response.getBody().getData().getRequestId());
    }

    @Test
    @DisplayName("GET /api/electrical-issues/my returns 200 OK")
    void testGetMyRequests_Returns200() {
        when(authService.getCurrentUser()).thenReturn(technician);
        when(electricalIssueService.getMyRequests(any(User.class)))
                .thenReturn(List.of(sampleResponse));

        ResponseEntity<ApiResponse<List<ElectricalIssueResponseDTO>>> response = controller.getMyRequests();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getData().size());
    }

    @Test
    @DisplayName("GET /api/electrical-issues/assigned returns 200 OK")
    void testGetAssignedRequests_Returns200() {
        when(authService.getCurrentUser()).thenReturn(electrician);
        when(electricalIssueService.getAssignedRequests(eq("ALL"), any(User.class)))
                .thenReturn(List.of(sampleResponse));

        ResponseEntity<ApiResponse<List<ElectricalIssueResponseDTO>>> response = controller.getAssignedRequests("ALL");

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getData().size());
    }

    @Test
    @DisplayName("GET /api/electrical-issues/all returns 200 OK")
    void testGetAllRequests_Returns200() {
        when(authService.getCurrentUser()).thenReturn(aoAdmin);
        when(electricalIssueService.getAllRequests(any(), any(), any(), any(User.class)))
                .thenReturn(List.of(sampleResponse));

        ResponseEntity<ApiResponse<List<ElectricalIssueResponseDTO>>> response =
                controller.getAllRequests("Main Block", "ASSIGNED", "HIGH");

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getData().size());
    }

    @Test
    @DisplayName("PUT /api/electrical-issues/{id}/accept returns 200 OK")
    void testAcceptRequest_Returns200() {
        when(authService.getCurrentUser()).thenReturn(electrician);
        sampleResponse.setStatus("ACCEPTED");
        when(electricalIssueService.acceptRequest(eq("ECE-ELEC-0001"), any(User.class)))
                .thenReturn(sampleResponse);

        ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> response = controller.acceptRequest("ECE-ELEC-0001");

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ACCEPTED", response.getBody().getData().getStatus());
    }

    @Test
    @DisplayName("PUT /api/electrical-issues/{id}/complete returns 200 OK")
    void testCompleteRequest_Returns200() {
        when(authService.getCurrentUser()).thenReturn(electrician);
        sampleResponse.setStatus("COMPLETED");
        CompleteIssueDTO dto = CompleteIssueDTO.builder().resolutionRemarks("Resolved").build();
        when(electricalIssueService.completeRequest(eq("ECE-ELEC-0001"), any(), any(User.class)))
                .thenReturn(sampleResponse);

        ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> response = controller.completeRequest("ECE-ELEC-0001", dto);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("COMPLETED", response.getBody().getData().getStatus());
    }

    @Test
    @DisplayName("POST /api/electrical-issues/{id}/reopen returns 200 OK")
    void testReopenRequest_Returns200() {
        when(authService.getCurrentUser()).thenReturn(technician);
        sampleResponse.setStatus("REOPENED");
        ReopenIssueDTO dto = ReopenIssueDTO.builder().reopenReason("Issue recurred").build();
        when(electricalIssueService.reopenRequest(eq("ECE-ELEC-0001"), any(), any(User.class)))
                .thenReturn(sampleResponse);

        ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> response = controller.reopenRequest("ECE-ELEC-0001", dto);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("REOPENED", response.getBody().getData().getStatus());
    }

    @Test
    @DisplayName("PUT /api/electrical-issues/{id}/reassign returns 200 OK")
    void testReassignRequest_Returns200() {
        when(authService.getCurrentUser()).thenReturn(aoAdmin);
        ReassignElectricianDTO dto = ReassignElectricianDTO.builder().electricianUserId("elec_02").build();
        when(electricalIssueService.reassignElectrician(eq("ECE-ELEC-0001"), any(), any(User.class)))
                .thenReturn(sampleResponse);

        ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> response = controller.reassignElectrician("ECE-ELEC-0001", dto);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("PUT /api/electrical-issues/{id}/cancel returns 200 OK")
    void testCancelRequest_Returns200() {
        when(authService.getCurrentUser()).thenReturn(aoAdmin);
        CancelIssueDTO dto = CancelIssueDTO.builder().cancellationReason("Cancelled").build();
        sampleResponse.setStatus("CANCELLED");
        when(electricalIssueService.cancelRequest(eq("ECE-ELEC-0001"), any(), any(User.class)))
                .thenReturn(sampleResponse);

        ResponseEntity<ApiResponse<ElectricalIssueResponseDTO>> response = controller.cancelRequest("ECE-ELEC-0001", dto);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("CANCELLED", response.getBody().getData().getStatus());
    }
}

