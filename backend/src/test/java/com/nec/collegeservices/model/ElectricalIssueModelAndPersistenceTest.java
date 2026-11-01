package com.nec.collegeservices.model;

import com.nec.collegeservices.repository.ElectricalIssueRequestRepository;
import com.nec.collegeservices.service.RequestIdService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ElectricalIssueModelAndPersistenceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private ElectricalIssueRequestRepository repository;

    @InjectMocks
    private RequestIdService requestIdService;

    @Test
    @DisplayName("Verify Model initialization, builder, defaults, and field assignments")
    void testModelInitializationAndDefaults() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .requestId("CSE-ELEC-0001")
                .locationType("Academic Block")
                .buildingName("Main Block")
                .floor("2nd Floor")
                .roomNumber("MB-204")
                .specificLocation("Near Projector Console")
                .issueCategory("Short Circuit / Sparking")
                .priority("HIGH")
                .description("Socket sparking during heavy load")
                .photoUrl("https://assets.nec.edu/photos/elec-01.jpg")
                .reportedByUserId("tech_ece_01")
                .reportedByName("K. Murugan")
                .reportedByDepartment("ECE")
                .reportedByPhone("9876543210")
                .assignedElectricianId("electrician_user")
                .assignedElectricianName("Campus Electrician")
                .assignedElectricianPhone("9842100000")
                .build();

        assertNotNull(req);
        assertEquals("CSE-ELEC-0001", req.getRequestId());
        assertEquals("SUBMITTED", req.getStatus(), "Default status must be SUBMITTED");
        assertNotNull(req.getStatusHistory(), "Status history list should be initialized non-null");
        assertEquals(0, req.getStatusHistory().size());

        // Test field mutations and lifecycle timestamps
        LocalDateTime now = LocalDateTime.now();
        req.setStatus("IN_PROGRESS");
        req.setWorkRemarks("Replacing circuit breaker and rewiring conduit");
        req.setStartedAt(now);
        req.setAcceptedAt(now.minusMinutes(15));
        req.setResolutionRemarks("Completed replacement and load tested");
        req.setCompletedAt(now.plusHours(1));
        req.setRejectionReason(null);
        req.setReopenReason(null);

        assertEquals("IN_PROGRESS", req.getStatus());
        assertEquals("Replacing circuit breaker and rewiring conduit", req.getWorkRemarks());
        assertEquals("Completed replacement and load tested", req.getResolutionRemarks());
        assertEquals(now, req.getStartedAt());
        assertNotNull(req.getCompletedAt());
    }

    @Test
    @DisplayName("Verify Status and Priority validation logic and enumeration helpers")
    void testStatusAndPriorityValidation() {
        // Status validation
        assertTrue(ElectricalIssueRequest.Status.isValid("SUBMITTED"));
        assertTrue(ElectricalIssueRequest.Status.isValid("assigned"));
        assertTrue(ElectricalIssueRequest.Status.isValid("ACCEPTED"));
        assertTrue(ElectricalIssueRequest.Status.isValid("IN_PROGRESS"));
        assertTrue(ElectricalIssueRequest.Status.isValid("completed"));
        assertTrue(ElectricalIssueRequest.Status.isValid("REJECTED"));
        assertTrue(ElectricalIssueRequest.Status.isValid("REOPENED"));
        assertFalse(ElectricalIssueRequest.Status.isValid("INVALID_STATUS"));
        assertFalse(ElectricalIssueRequest.Status.isValid(null));
        assertFalse(ElectricalIssueRequest.Status.isValid("   "));

        // Priority validation
        assertTrue(ElectricalIssueRequest.Priority.isValid("LOW"));
        assertTrue(ElectricalIssueRequest.Priority.isValid("medium"));
        assertTrue(ElectricalIssueRequest.Priority.isValid("HIGH"));
        assertTrue(ElectricalIssueRequest.Priority.isValid("EMERGENCY"));
        assertFalse(ElectricalIssueRequest.Priority.isValid("CRITICAL"));
        assertFalse(ElectricalIssueRequest.Priority.isValid(null));

        // LocationType and IssueCategory helpers
        assertEquals("Academic Block", ElectricalIssueRequest.LocationType.ACADEMIC_BLOCK.getDisplayName());
        assertEquals("Power Outage", ElectricalIssueRequest.IssueCategory.POWER_OUTAGE.getDisplayName());
        assertEquals("Short Circuit / Sparking", ElectricalIssueRequest.IssueCategory.SHORT_CIRCUIT.getDisplayName());
    }

    @Test
    @DisplayName("Verify status history entry timeline and compatibility accessors")
    void testStatusHistoryTimeline() {
        ElectricalIssueRequest req = ElectricalIssueRequest.builder()
                .requestId("ECE-ELEC-0005")
                .statusHistory(new ArrayList<>())
                .build();

        req.addStatusHistory("SUBMITTED", "tech_user", "Issue submitted");
        req.addStatusHistory("ACCEPTED", "electrician_user", "Acknowledged ticket");

        List<ElectricalIssueRequest.StatusHistoryEntry> history = req.getStatusHistory();
        assertEquals(2, history.size());

        ElectricalIssueRequest.StatusHistoryEntry first = history.get(0);
        assertEquals("SUBMITTED", first.getStatus());
        assertEquals("tech_user", first.getUpdatedBy());
        assertEquals("tech_user", first.getActor()); // Compatibility check
        assertEquals("Issue submitted", first.getComments());
        assertEquals("Issue submitted", first.getComment()); // Compatibility check
        assertNotNull(first.getTimestamp());

        ElectricalIssueRequest.StatusHistoryEntry second = history.get(1);
        assertEquals("ACCEPTED", second.getStatus());
        assertEquals("electrician_user", second.getUpdatedBy());
    }

    @Test
    @DisplayName("Verify RequestIdService generation and prefix formatting for ELEC service")
    void testRequestIdServiceIntegration() {
        // Mock sequence return from MongoTemplate
        RequestIdSequence seq = new RequestIdSequence("ELEC", 42L);
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(RequestIdSequence.class)))
                .thenReturn(seq);

        User deptUser = User.builder().userId("prof_ece").department("ECE").role("DEPARTMENT_USER").build();
        User adminUser = User.builder().userId("ao_admin").role("AO_ADMIN").build();
        User noDeptUser = User.builder().userId("tech_staff").build();

        String id1 = requestIdService.generateRequestId("ELEC", deptUser, "ECE");
        assertEquals("ECE-ELEC-0042", id1);

        String id2 = requestIdService.generateRequestId("ELEC", adminUser, null);
        assertEquals("AO-ELEC-0042", id2);

        String id3 = requestIdService.generateRequestId("ELEC", noDeptUser, null);
        assertEquals("REQ-ELEC-0042", id3);

        String id4 = requestIdService.generateRequestId("ELEC", null, "CIVIL");
        assertEquals("CIVIL-ELEC-0042", id4);
    }

    @Test
    @DisplayName("Verify Repository method signatures and query behavior")
    void testRepositoryQuerySignatures() {
        ElectricalIssueRequest sample = ElectricalIssueRequest.builder()
                .id("mongo-id-123")
                .requestId("CSE-ELEC-0001")
                .reportedByUserId("tech_01")
                .assignedElectricianId("electrician_user")
                .status("SUBMITTED")
                .createdAt(LocalDateTime.now())
                .build();

        when(repository.findByRequestId("CSE-ELEC-0001")).thenReturn(Optional.of(sample));
        when(repository.existsByRequestId("CSE-ELEC-0001")).thenReturn(true);
        when(repository.findByReportedByUserId("tech_01")).thenReturn(List.of(sample));
        when(repository.findByAssignedElectricianId("electrician_user")).thenReturn(List.of(sample));
        when(repository.findByStatus("SUBMITTED")).thenReturn(List.of(sample));
        when(repository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sample));

        assertTrue(repository.existsByRequestId("CSE-ELEC-0001"));
        Optional<ElectricalIssueRequest> found = repository.findByRequestId("CSE-ELEC-0001");
        assertTrue(found.isPresent());
        assertEquals("CSE-ELEC-0001", found.get().getRequestId());

        List<ElectricalIssueRequest> myReports = repository.findByReportedByUserId("tech_01");
        assertEquals(1, myReports.size());

        List<ElectricalIssueRequest> assigned = repository.findByAssignedElectricianId("electrician_user");
        assertEquals(1, assigned.size());

        List<ElectricalIssueRequest> submitted = repository.findByStatus("SUBMITTED");
        assertEquals(1, submitted.size());

        List<ElectricalIssueRequest> all = repository.findAllByOrderByCreatedAtDesc();
        assertEquals(1, all.size());
    }
}

