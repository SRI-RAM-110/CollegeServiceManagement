package com.nec.collegeservices.service;

import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.SeminarHallRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class SeminarCoordinatorHallConditionTest {

    @Mock
    private SeminarHallRepository hallRepository;

    @Mock
    private SeminarBookingRepository bookingRepository;

    @InjectMocks
    private SeminarService seminarService;

    private User coordinatorUser;
    private User otherCoordinator;
    private User aoAdmin;
    private User seminarAdmin;
    private User departmentUser;
    private SeminarHall hall1;
    private SeminarHall hall2;

    @BeforeEach
    void setUp() {
        // Coordinator assigned to SH-1 (via assignedHallIds)
        coordinatorUser = User.builder()
                .userId("COORD01")
                .name("Dr. Coordinator One")
                .role("SEMINAR_COORDINATOR")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .department("CSE")
                .assignedHallIds(List.of("SH-1"))
                .build();

        // Another coordinator assigned only to SH-2
        otherCoordinator = User.builder()
                .userId("COORD02")
                .name("Dr. Coordinator Two")
                .role("SEMINAR_COORDINATOR")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .department("ECE")
                .assignedHallIds(List.of("SH-2"))
                .build();

        // AO Admin
        aoAdmin = User.builder()
                .userId("AO001")
                .name("AO Admin")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .build();

        // Seminar Admin
        seminarAdmin = User.builder()
                .userId("SA001")
                .name("Seminar Admin")
                .role("SEMINAR_ADMIN")
                .roles(List.of("SEMINAR_ADMIN"))
                .department("ADMIN")
                .build();

        // Department User (regular faculty)
        departmentUser = User.builder()
                .userId("FAC01")
                .name("Faculty Member")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .department("CSE")
                .build();

        hall1 = SeminarHall.builder()
                .id("mongo-id-sh1")
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .location("Block 3 - Ground Floor")
                .capacity(250)
                .facilities(List.of("Projector", "AC", "Audio System"))
                .status("Available")
                .active(true)
                .coordinatorUserIds(new ArrayList<>(List.of("COORD01")))
                .ccEmails(new ArrayList<>(List.of("coord01@nec.edu.in")))
                .build();

        hall2 = SeminarHall.builder()
                .id("mongo-id-sh2")
                .hallId("SH-2")
                .name("Seminar Hall 2")
                .location("Block 2 - 1st Floor")
                .capacity(150)
                .facilities(List.of("Projector", "Audio System"))
                .status("Available")
                .active(true)
                .coordinatorUserIds(new ArrayList<>(List.of("COORD02")))
                .ccEmails(new ArrayList<>(List.of("coord02@nec.edu.in")))
                .build();

        when(hallRepository.findByHallIdIgnoreCase("SH-1")).thenReturn(Optional.of(hall1));
        when(hallRepository.findByHallIdIgnoreCase("SH-2")).thenReturn(Optional.of(hall2));
        when(hallRepository.save(any(SeminarHall.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Coordinator can successfully modify condition of their assigned seminar hall")
    void testCoordinatorModifiesAssignedHallCondition() {
        SeminarHall updated = seminarService.updateHallCondition("SH-1", "Under Maintenance", false, coordinatorUser);

        assertNotNull(updated);
        assertEquals("Under Maintenance", updated.getStatus());
        assertFalse(updated.getActive());
        assertEquals("COORD01", updated.getUpdatedBy());
        assertNotNull(updated.getUpdatedAt());

        // Verify existing properties are completely preserved
        assertEquals("SH-1", updated.getHallId());
        assertEquals("Seminar Hall 1", updated.getName());
        assertEquals("Block 3 - Ground Floor", updated.getLocation());
        assertEquals(250, updated.getCapacity());
        assertEquals(List.of("Projector", "AC", "Audio System"), updated.getFacilities());
        assertEquals(List.of("coord01@nec.edu.in"), updated.getCcEmails());

        verify(hallRepository, times(1)).save(hall1);
    }

    @Test
    @DisplayName("Coordinator cannot modify condition of an unassigned seminar hall (throws 403 AccessDeniedException)")
    void testCoordinatorCannotModifyUnassignedHallThrows403() {
        // COORD01 tries to modify SH-2 which is assigned to COORD02
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                seminarService.updateHallCondition("SH-2", "Under Maintenance", false, coordinatorUser));

        assertTrue(ex.getMessage().contains("not assigned to seminar hall"));
        verify(hallRepository, never()).save(hall2);
    }

    @Test
    @DisplayName("AO_ADMIN and SEMINAR_ADMIN can modify condition of any seminar hall")
    void testAdminsCanModifyHallCondition() {
        // AO Admin modifies SH-1
        SeminarHall updatedByAO = seminarService.updateHallCondition("SH-1", "Reserved", true, aoAdmin);
        assertEquals("Reserved", updatedByAO.getStatus());
        assertTrue(updatedByAO.getActive());
        assertEquals("AO001", updatedByAO.getUpdatedBy());

        // Seminar Admin modifies SH-2
        SeminarHall updatedBySA = seminarService.updateHallCondition("SH-2", "Under Maintenance", false, seminarAdmin);
        assertEquals("Under Maintenance", updatedBySA.getStatus());
        assertFalse(updatedBySA.getActive());
        assertEquals("SA001", updatedBySA.getUpdatedBy());
    }

    @Test
    @DisplayName("Department user without coordinator or admin role is rejected (throws 403)")
    void testDepartmentUserCannotModifyConditionThrows403() {
        assertThrows(AccessDeniedException.class, () ->
                seminarService.updateHallCondition("SH-1", "Available", true, departmentUser));

        assertThrows(AccessDeniedException.class, () ->
                seminarService.updateHallCondition("SH-1", "Available", true, null));
    }

    @Test
    @DisplayName("Invalid status option throws BadRequestException (Allowed: Available, Under Maintenance, Reserved)")
    void testInvalidStatusThrowsBadRequestException() {
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                seminarService.updateHallCondition("SH-1", "OUT_OF_ORDER", true, coordinatorUser));

        assertTrue(ex.getMessage().contains("Invalid operational status"));
    }

    @Test
    @DisplayName("Partial update: modifying only active state preserves existing status")
    void testModifyOnlyActivePreservesStatus() {
        SeminarHall updated = seminarService.updateHallCondition("SH-1", null, false, coordinatorUser);
        assertNotNull(updated);
        assertEquals("Available", updated.getStatus()); // unchanged
        assertFalse(updated.getActive()); // updated
    }

    @Test
    @DisplayName("Partial update: modifying only status preserves existing active state")
    void testModifyOnlyStatusPreservesActive() {
        SeminarHall updated = seminarService.updateHallCondition("SH-1", "Reserved", null, coordinatorUser);
        assertNotNull(updated);
        assertEquals("Reserved", updated.getStatus()); // updated
        assertTrue(updated.getActive()); // unchanged
    }

    @Test
    @DisplayName("Non-existent hall ID throws ResourceNotFoundException")
    void testNonExistentHallThrowsNotFound() {
        when(hallRepository.findByHallIdIgnoreCase("SH-UNKNOWN")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                seminarService.updateHallCondition("SH-UNKNOWN", "Available", true, coordinatorUser));
    }
}

