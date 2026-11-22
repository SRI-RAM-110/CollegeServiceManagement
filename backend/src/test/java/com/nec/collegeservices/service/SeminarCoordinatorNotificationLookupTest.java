package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.SeminarCancelRequestDTO;
import com.nec.collegeservices.dto.SeminarRescheduleRequestDTO;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.SeminarEquipmentChecklistRepository;
import com.nec.collegeservices.repository.SeminarHallRepository;
import com.nec.collegeservices.repository.UserRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class SeminarCoordinatorNotificationLookupTest {

    @Mock private SeminarBookingRepository bookingRepository;
    @Mock private SeminarHallRepository hallRepository;
    @Mock private NotificationService notificationService;
    @Mock private RequesterResolver requesterResolver;
    @Mock private AuthService authService;
    @Mock private RequestIdService requestIdService;
    @Mock private UserRepository userRepository;
    @Mock private SeminarEquipmentChecklistRepository checklistRepository;

    @InjectMocks private SeminarService seminarService;

    private User aoAdmin;
    private User vicePrincipalUser;
    private User requesterUser;
    private SeminarHall hallSH4;
    private SeminarHall hallSH1;

    @BeforeEach
    void setUp() {
        aoAdmin = User.builder()
                .userId("ao")
                .name("AO Admin")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .active(true)
                .build();

        vicePrincipalUser = User.builder()
                .userId("viceprincipal")
                .name("Dr. D. Suneel")
                .email("viceprincipal@nrtec.in")
                .role("SEMINAR_COORDINATOR")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .department("ADMIN")
                .assignedHallIds(List.of("SH-4", "Block 4 Seminar Hall"))
                .active(true)
                .build();

        requesterUser = User.builder()
                .userId("csehod")
                .name("Dr. K. Lakshmi")
                .email("csehod@nrtec.in")
                .role("HOD")
                .roles(List.of("HOD"))
                .department("CSE")
                .active(true)
                .build();

        // SH-4: Document _id is an ObjectId, hallId business key is "SH-4"
        hallSH4 = SeminarHall.builder()
                .id("6ab3eeae344f5a1ef4f8ef9a") // MongoDB ObjectId
                .hallId("SH-4")                 // Business identifier
                .name("Block 4 Seminar Hall")
                .location("Block 4 - 3rd Floor")
                .status("Available")
                .coordinatorUserIds(List.of("viceprincipal"))
                .build();

        hallSH1 = SeminarHall.builder()
                .id("673da87224f8d9b1392dfb11")
                .hallId("SH-1")
                .name("CSE Seminar Hall")
                .location("Block 1 - 1st Floor")
                .status("Available")
                .coordinatorUserIds(List.of("csehod"))
                .build();

        // Crucial: In MongoDB Atlas, findById("SH-4") returns empty because _id is an ObjectId!
        // getHallById uses findByHallIdIgnoreCase("SH-4") which returns the hall document.
        when(hallRepository.findById("SH-4")).thenReturn(Optional.empty());
        when(hallRepository.findByHallIdIgnoreCase("SH-4")).thenReturn(Optional.of(hallSH4));
        when(hallRepository.findByHallId("SH-4")).thenReturn(Optional.of(hallSH4));

        when(hallRepository.findById("SH-1")).thenReturn(Optional.empty());
        when(hallRepository.findByHallIdIgnoreCase("SH-1")).thenReturn(Optional.of(hallSH1));
        when(hallRepository.findByHallId("SH-1")).thenReturn(Optional.of(hallSH1));

        when(userRepository.findAll()).thenReturn(List.of(aoAdmin, vicePrincipalUser, requesterUser));
        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(inv -> inv.getArgument(0));
        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenReturn("csehod");
    }

    @Test
    @DisplayName("1. approveBooking resolves SH-4 via business key and notifies assigned coordinator (viceprincipal)")
    void testApproveBookingNotifiesCoordinatorUsingBusinessKey() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("BOOKING_OBJ_01")
                .bookingId("AO-SEM-0025")
                .hallId("SH-4") // Business key, NOT ObjectId
                .hallName("Block 4 Seminar Hall")
                .date("2026-11-25")
                .slot("Morning")
                .status("PENDING")
                .department("CSE")
                .eventTitle("AI Workshop")
                .requestedBy("Dr. K. Lakshmi")
                .requesterUserId("csehod")
                .build();

        when(bookingRepository.findById("AO-SEM-0025")).thenReturn(Optional.of(booking));
        when(bookingRepository.findByBookingId("AO-SEM-0025")).thenReturn(Optional.of(booking));

        seminarService.approveBooking("AO-SEM-0025", aoAdmin);

        // 1. Verify coordinator notification was sent to viceprincipal
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("viceprincipal"),
                eq("Seminar Booking Confirmed"),
                contains("Booking for Block 4 Seminar Hall on 2026-11-25 (Morning) has been approved and confirmed (AO-SEM-0025)."),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("AO-SEM-0025")
        );

        // 2. Verify requester notification was also sent
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("csehod"),
                eq("Seminar Request Approved"),
                contains("has been approved and confirmed!"),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("AO-SEM-0025")
        );
    }

    @Test
    @DisplayName("2. rejectBooking resolves SH-4 via business key and notifies assigned coordinator (viceprincipal)")
    void testRejectBookingNotifiesCoordinatorUsingBusinessKey() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("BOOKING_OBJ_02")
                .bookingId("AO-SEM-0034")
                .hallId("SH-4")
                .hallName("Block 4 Seminar Hall")
                .date("2026-11-28")
                .slot("Full Day")
                .status("PENDING")
                .department("CSE")
                .eventTitle("Faculty Development")
                .requestedBy("Dr. K. Lakshmi")
                .requesterUserId("csehod")
                .build();

        when(bookingRepository.findById("AO-SEM-0034")).thenReturn(Optional.of(booking));
        when(bookingRepository.findByBookingId("AO-SEM-0034")).thenReturn(Optional.of(booking));

        seminarService.rejectBooking("AO-SEM-0034", "Maintenance scheduled", aoAdmin);

        // 1. Verify coordinator notification was sent to viceprincipal
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("viceprincipal"),
                eq("Seminar Request Rejected"),
                contains("Booking request for Block 4 Seminar Hall on 2026-11-28 was rejected (AO-SEM-0034)."),
                eq("Seminar Hall"),
                eq("DANGER"),
                eq("AO-SEM-0034")
        );

        // 2. Verify requester notification was also sent
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("csehod"),
                eq("Seminar Request Rejected"),
                contains("was rejected. Reason: Maintenance scheduled"),
                eq("Seminar Hall"),
                eq("DANGER"),
                eq("AO-SEM-0034")
        );
    }

    @Test
    @DisplayName("3. approveCancellation resolves SH-4 via business key and notifies assigned coordinator (viceprincipal)")
    void testApproveCancellationNotifiesCoordinatorUsingBusinessKey() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("BOOKING_OBJ_03")
                .bookingId("AO-SEM-0035")
                .hallId("SH-4")
                .hallName("Block 4 Seminar Hall")
                .date("2026-11-29")
                .slot("Afternoon")
                .status("CANCELLATION_REQUESTED")
                .cancellationScope("THIS_OCCURRENCE")
                .department("CSE")
                .eventTitle("Alumni Interaction")
                .requestedBy("Dr. K. Lakshmi")
                .requesterUserId("csehod")
                .build();

        when(bookingRepository.findById("AO-SEM-0035")).thenReturn(Optional.of(booking));
        when(bookingRepository.findByBookingId("AO-SEM-0035")).thenReturn(Optional.of(booking));

        seminarService.approveCancellation("AO-SEM-0035", aoAdmin);

        // 1. Verify coordinator notification was sent to viceprincipal
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("viceprincipal"),
                eq("Seminar Cancellation Approved"),
                contains("Cancellation for Block 4 Seminar Hall on 2026-11-29 (AO-SEM-0035) was approved."),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("AO-SEM-0035")
        );

        // 2. Verify requester notification was also sent
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("csehod"),
                eq("Cancellation Approved"),
                contains("Your cancellation for Block 4 Seminar Hall on 2026-11-29 has been approved."),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("AO-SEM-0035")
        );
    }

    @Test
    @DisplayName("4. Missing hall records are handled safely without NullPointerException")
    void testMissingHallHandledSafely() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("BOOKING_MISSING_HALL")
                .bookingId("SEM-MISSING-01")
                .hallId("NON_EXISTENT_HALL")
                .hallName("Unknown Hall")
                .date("2026-12-01")
                .slot("Morning")
                .status("PENDING")
                .department("CSE")
                .requesterUserId("csehod")
                .build();

        when(bookingRepository.findById("SEM-MISSING-01")).thenReturn(Optional.of(booking));
        when(bookingRepository.findByBookingId("SEM-MISSING-01")).thenReturn(Optional.of(booking));
        when(hallRepository.findById("NON_EXISTENT_HALL")).thenReturn(Optional.empty());
        when(hallRepository.findByHallIdIgnoreCase("NON_EXISTENT_HALL")).thenReturn(Optional.empty());

        // Approve should complete without throwing exception
        assertDoesNotThrow(() -> seminarService.approveBooking("SEM-MISSING-01", aoAdmin));

        // Coordinator notification should not be sent for non-existent hall
        verify(notificationService, never()).sendNotification(
                eq("SEMINAR_COORDINATOR"), any(), any(), any(), any(), any(), any(), any()
        );

        // Requester notification must still be delivered
        verify(notificationService).sendNotification(
                eq("DEPARTMENT_USER"),
                eq("CSE"),
                eq("csehod"),
                eq("Seminar Request Approved"),
                anyString(),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("SEM-MISSING-01")
        );
    }

    @Test
    @DisplayName("5. Coordinator resolved via user.assignedHallIds when hall.coordinatorUserIds is empty")
    void testCoordinatorResolvedViaUserAssignedHalls() {
        // Hall has empty coordinatorUserIds
        SeminarHall hallNoDirectCoords = SeminarHall.builder()
                .id("6ab3eeae344f5a1ef4f8ef9b")
                .hallId("SH-4")
                .name("Block 4 Seminar Hall")
                .status("Available")
                .coordinatorUserIds(List.of()) // Empty direct list
                .build();

        when(hallRepository.findByHallIdIgnoreCase("SH-4")).thenReturn(Optional.of(hallNoDirectCoords));

        SeminarBooking booking = SeminarBooking.builder()
                .id("BOOKING_OBJ_05")
                .bookingId("AO-SEM-0099")
                .hallId("SH-4")
                .hallName("Block 4 Seminar Hall")
                .date("2026-11-30")
                .slot("Morning")
                .status("PENDING")
                .department("CSE")
                .requesterUserId("csehod")
                .build();

        when(bookingRepository.findById("AO-SEM-0099")).thenReturn(Optional.of(booking));

        seminarService.approveBooking("AO-SEM-0099", aoAdmin);

        // vicePrincipalUser has assignedHallIds: ["SH-4"], should still be resolved!
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("viceprincipal"),
                eq("Seminar Booking Confirmed"),
                anyString(),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("AO-SEM-0099")
        );
    }

    @Test
    @DisplayName("6. Rescheduling behavior remains unchanged and notifies both old and new hall coordinators")
    void testReschedulingBehaviorUnchanged() {
        SeminarBooking original = SeminarBooking.builder()
                .id("B_ORIG_RESCHED")
                .bookingId("SEM-RESCHED-01")
                .hallId("SH-4") // Original hall: SH-4 (viceprincipal)
                .hallName("Block 4 Seminar Hall")
                .date("2026-11-20")
                .slot("Morning")
                .status("RESCHEDULE_REQUESTED")
                .rescheduledHallId("SH-1") // Target hall: SH-1 (csehod)
                .rescheduledDate("2026-11-25")
                .rescheduledSlot("Afternoon")
                .department("CSE")
                .eventTitle("Advanced Java")
                .requestedBy("Dr. K. Lakshmi")
                .requesterUserId("csehod")
                .build();

        when(bookingRepository.findById("SEM-RESCHED-01")).thenReturn(Optional.of(original));
        when(bookingRepository.findByBookingId("SEM-RESCHED-01")).thenReturn(Optional.of(original));
        when(requestIdService.generateRequestId(any(), any(), any())).thenReturn("SEM-RESCHED-02");

        seminarService.approveReschedule("SEM-RESCHED-01", aoAdmin);

        // 1. Target hall (SH-1) coordinator (csehod) notified of reschedule approval
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("csehod"),
                eq("Seminar Reschedule Approved"),
                contains("Booking rescheduled to CSE Seminar Hall"),
                eq("Seminar Hall"),
                eq("SUCCESS"),
                eq("SEM-RESCHED-02")
        );

        // 2. Old hall (SH-4) coordinator (viceprincipal) notified that booking was moved
        verify(notificationService).sendNotification(
                eq("SEMINAR_COORDINATOR"),
                eq("ADMIN"),
                eq("viceprincipal"),
                eq("Seminar Booking Moved"),
                contains("previously at Block 4 Seminar Hall was rescheduled to CSE Seminar Hall"),
                eq("Seminar Hall"),
                eq("INFO"),
                eq("SEM-RESCHED-01")
        );
    }
}
