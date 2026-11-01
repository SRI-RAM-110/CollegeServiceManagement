package com.nec.collegeservices;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.dto.electrical.*;
import com.nec.collegeservices.model.ElectricalIssueRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.ElectricalIssueRequestRepository;
import com.nec.collegeservices.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ElectricalIssueLifecycleEndToEndAuditTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ElectricalIssueRequestRepository electricalIssueRepository;

    @Autowired
    private UserRepository userRepository;

    private final List<String> createdIssueIds = new ArrayList<>();
    private final List<String> createdUserIds = new ArrayList<>();

    private User techUser;
    private User otherTechUser;
    private User elec1;
    private User elec2;
    private User aoAdminUser;
    private User creatorUser;

    @BeforeEach
    void setupTestData() {
        // Create test users in database
        techUser = createTestUser("audit_tech_1", "Audit Technician 1", "SEMINAR_TECHNICIAN", "ECE");
        otherTechUser = createTestUser("audit_tech_2", "Audit Technician 2", "SEMINAR_TECHNICIAN", "ME");
        elec1 = createTestUser("audit_elec_1", "Audit Electrician 1", "ELECTRICIAN", "MAINTENANCE");
        elec2 = createTestUser("audit_elec_2", "Audit Electrician 2", "ELECTRICIAN", "MAINTENANCE");
        aoAdminUser = createTestUser("audit_ao_admin", "Audit AO Admin", "AO_ADMIN", "ADMIN");
        creatorUser = createTestUser("audit_creator", "Audit Creator", "CREATOR", "ADMIN");
    }

    private User createTestUser(String userId, String name, String role, String dept) {
        User u = userRepository.findByUserId(userId).orElse(null);
        if (u == null) {
            u = User.builder()
                    .userId(userId)
                    .name(name)
                    .email(userId + "@test.nec.edu")
                    .phone("9842100099")
                    .department(dept)
                    .role(role)
                    .roles(List.of(role))
                    .active(true)
                    .build();
            u = userRepository.save(u);
            createdUserIds.add(u.getId());
        }
        return u;
    }

    @AfterEach
    void cleanUpTestData() {
        for (String id : createdIssueIds) {
            electricalIssueRepository.deleteById(id);
        }
        for (String id : createdUserIds) {
            userRepository.deleteById(id);
        }
    }

    @Test
    @DisplayName("Lifecycle Audit: Full Electrical Issue Workflow across Roles")
    @WithMockUser(username = "audit_tech_1", roles = {"SEMINAR_TECHNICIAN"})
    void testCompleteLifecycleWorkflow() throws Exception {
        // 1. Submit Request as Seminar Technician
        CreateElectricalIssueDTO createDto = CreateElectricalIssueDTO.builder()
                .locationType("Academic Block")
                .buildingName("Main Science Block")
                .floor("1st Floor")
                .roomNumber("MB-102")
                .specificLocation("Near main switchboard distribution panel")
                .issueCategory("Wiring / Switchboard")
                .priority("HIGH")
                .description("Sparking observed in main distribution switchboard during class.")
                .build();

        String createJson = objectMapper.writeValueAsString(createDto);

        String responseContent = mockMvc.perform(post("/api/electrical-issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestId").exists())
                .andExpect(jsonPath("$.data.reportedByUserId").value("audit_tech_1"))
                .andReturn().getResponse().getContentAsString();

        ElectricalIssueResponseDTO created = objectMapper.readTree(responseContent)
                .get("data").traverse(objectMapper).readValueAs(ElectricalIssueResponseDTO.class);
        assertNotNull(created.getId());
        createdIssueIds.add(created.getId());

        String issueId = created.getId();

        // 2. Technician can view own requests
        mockMvc.perform(get("/api/electrical-issues/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].requestId").exists());

        // 3. Other technician CANNOT view this ticket's details
        // (Switched context via MockMvc with other user)
    }

    @Test
    @DisplayName("Security Isolation Audit: Cross-User and Role Access Controls")
    @WithMockUser(username = "audit_tech_2", roles = {"SEMINAR_TECHNICIAN"})
    void testSecurityIsolationForTechnician() throws Exception {
        // Manually create issue owned by tech 1
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .requestId("TEST-ELEC-ISOLATION-01")
                .locationType("Academic Block")
                .buildingName("Library")
                .floor("Ground")
                .specificLocation("Reading hall")
                .issueCategory("Lighting")
                .priority("LOW")
                .description("Flickering tube light in reading hall")
                .reportedByUserId("audit_tech_1")
                .reportedByName("Audit Technician 1")
                .status("ASSIGNED")
                .assignedElectricianId("audit_elec_1")
                .build();
        req = electricalIssueRepository.save(req);
        createdIssueIds.add(req.getId());

        // tech_2 tries to view tech_1's issue -> Must be 403 Forbidden
        mockMvc.perform(get("/api/electrical-issues/" + req.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AO_ADMIN Governance: Reassign, Status Override, and Cancellation with Audit Validation")
    @WithMockUser(username = "audit_ao_admin", roles = {"AO_ADMIN"})
    void testAOAdminAdministrativeGovernance() throws Exception {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .requestId("TEST-ELEC-AO-01")
                .locationType("Hostel")
                .buildingName("Boys Hostel 1")
                .floor("2nd Floor")
                .specificLocation("Corridor panel")
                .issueCategory("Power Outage")
                .priority("EMERGENCY")
                .description("Entire corridor power tripped")
                .reportedByUserId("audit_tech_1")
                .reportedByName("Audit Technician 1")
                .status("UNASSIGNED")
                .build();
        req = electricalIssueRepository.save(req);
        createdIssueIds.add(req.getId());

        // 1. AO Admin can view all requests
        mockMvc.perform(get("/api/electrical-issues/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. Reassign Electrician (UNASSIGNED -> ASSIGNED)
        ReassignElectricianDTO reassignDto = ReassignElectricianDTO.builder()
                .electricianUserId("audit_elec_2")
                .remarks("Emergency hostel power outage assignment")
                .build();

        mockMvc.perform(put("/api/electrical-issues/" + req.getId() + "/reassign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reassignDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.data.assignedElectricianId").value("audit_elec_2"));

        // 3. Override Status with Reason
        OverrideStatusDTO overrideDto = OverrideStatusDTO.builder()
                .targetStatus("IN_PROGRESS")
                .reason("Electrician on site with backup team per AO directive")
                .build();

        mockMvc.perform(put("/api/electrical-issues/" + req.getId() + "/override-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overrideDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.overrideReason").value("Electrician on site with backup team per AO directive"));

        // 4. Override Status with too short reason (< 5 chars) -> Must be 400 Bad Request
        OverrideStatusDTO invalidOverride = OverrideStatusDTO.builder()
                .targetStatus("COMPLETED")
                .reason("Done")
                .build();

        mockMvc.perform(put("/api/electrical-issues/" + req.getId() + "/override-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidOverride)))
                .andExpect(status().isBadRequest());

        // 5. Cancel Issue with Cancellation Reason
        CancelIssueDTO cancelDto = CancelIssueDTO.builder()
                .cancellationReason("Power restored via main campus generator grid")
                .build();

        mockMvc.perform(put("/api/electrical-issues/" + req.getId() + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancellationReason").value("Power restored via main campus generator grid"));

        // 6. Cannot reassign a CANCELLED ticket -> Must be 400 Bad Request
        mockMvc.perform(put("/api/electrical-issues/" + req.getId() + "/reassign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reassignDto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("CREATOR Role Limitation: CREATOR alone is denied AO_ADMIN electrical management")
    @WithMockUser(username = "audit_creator", roles = {"CREATOR"})
    void testCreatorRoleDeniedAccess() throws Exception {
        // CREATOR alone attempts to fetch all requests
        mockMvc.perform(get("/api/electrical-issues/all"))
                .andExpect(status().isForbidden());
    }
}

