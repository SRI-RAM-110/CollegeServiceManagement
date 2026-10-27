package com.nec.collegeservices.service;

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

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class SeminarNotificationLifecycleTest {

    @Mock private SeminarBookingRepository bookingRepository;
    @Mock private SeminarHallRepository seminarHallRepository;
    @Mock private NotificationService notificationService;
    @Mock private RequesterResolver requesterResolver;
    @Mock private AuthService authService;
    @Mock private RequestIdService requestIdService;
    @Mock private UserRepository userRepository;
    @Mock private SeminarEquipmentChecklistRepository checklistRepository;

    @InjectMocks private SeminarService seminarService;

    private User adminUser;
    private User activeTechH1;
    private User activeTechH2;
    private User inactiveTechH1;
    private User unassignedTech;
    private User activeGenOp;
    private User inactiveGenOp;

    private SeminarHall hall1;
    private SeminarHall hall2;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .userId("ao_admin_01")
                .name("AO Admin")
                .roles(List.of("AO_ADMIN", "SEMINAR_ADMIN"))
                .active(true)
                .build();

        activeTechH1 = User.builder()
                .userId("tech_01")
                .name("Technician One")
                .email("tech1@nrtec.in")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .assignedHallIds(List.of("HALL_01"))
                .active(true)
                .build();

        activeTechH2 = User.builder()
                .userId("tech_02")
                .name("Technician Two")
                .email("tech2@nrtec.in")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .assignedHallIds(List.of("HALL_02"))
                .active(true)
                .build();

        inactiveTechH1 = User.builder()
                .userId("tech_inactive")
                .name("Inactive Tech")
                .email("inactive_tech@nrtec.in")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .assignedHallIds(List.of("HALL_01"))
                .active(false)
                .build();

        unassignedTech = User.builder()
                .userId("tech_unassigned")
                .name("Unassigned Tech")
                .email("unassigned@nrtec.in")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .assignedHallIds(List.of("HALL_99"))
                .active(true)
                .build();

        activeGenOp = User.builder()
                .userId("gen_op_01")
                .name("Generator Operator")
                .email("gen_op@nrtec.in")
                .roles(List.of("GENERATOR_OPERATOR"))
                .active(true)
                .build();

        inactiveGenOp = User.builder()
                .userId("gen_op_inactive")
                .name("Inactive Generator Operator")
                .email("gen_op_inactive@nrtec.in")
                .roles(List.of("GENERATOR_OPERATOR"))
                .active(false)
                .build();

        hall1 = SeminarHall.builder()
                .id("H1_ID")
                .hallId("HALL_01")
                .name("APJ Abdul Kalam Seminar Hall")
                .location("Block A - 2nd Floor")
                .status("Available")
                .build();

        hall2 = SeminarHall.builder()
                .id("H2_ID")
                .hallId("HALL_02")
                .name("Sir CV Raman Seminar Hall")
                .location("Block B - Ground Floor")
                .status("Available")
                .build();

        when(seminarHallRepository.findByHallId("HALL_01")).thenReturn(Optional.of(hall1));
        when(seminarHallRepository.findById("HALL_01")).thenReturn(Optional.of(hall1));
        when(seminarHallRepository.findByHallId("HALL_02")).thenReturn(Optional.of(hall2));
        when(seminarHallRepository.findById("HALL_02")).thenReturn(Optional.of(hall2));
        when(seminarHallRepository.findAll()).thenReturn(List.of(hall1, hall2));

        when(userRepository.findAll()).thenReturn(List.of(
                adminUser, activeTechH1, activeTechH2, inactiveTechH1, unassignedTech, activeGenOp, inactiveGenOp
        ));

        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(inv -> inv.getArgument(0));
        when(requesterResolver.resolveRequesterUserId(any(), any(), any())).thenReturn("requester_01");
        when(requestIdService.generateRequestId(any(), any(), any())).thenReturn("SEM-2002");
    }

    @Test
    @DisplayName("1. Assigned active technicians receive notifications after reschedule approval")
    void testAssignedActiveTechniciansReceiveRescheduleNotification() {
        SeminarBooking original = SeminarBooking.builder()
                .id("B_ORIG_ID")
                .bookingId("SEM-1001")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .hallLocation(hall1.getLocation())
                .date("2026-11-10")
                .slot("FORENOON")
                .status("RESCHEDULE_REQUESTED")
                .rescheduledHallId("HALL_02")
                .rescheduledDate("2026-11-15")
                .rescheduledSlot("AFTERNOON")
                .department("CSE")
                .eventTitle("AI Symposium")
                .requestedBy("Prof. Rao")
                .requesterUserId("rao_01")
                .build();

        when(bookingRepository.findById("SEM-1001")).thenReturn(Optional.of(original));
        when(bookingRepository.findByBookingId("SEM-1001")).thenReturn(Optional.of(original));

        seminarService.approveReschedule("SEM-1001", adminUser);

        // Verify target hall technician (activeTechH2) received reschedule alert
        verify(notificationService).sendNotification(
                eq("SEMINAR_TECHNICIAN"),
                any(),
                eq("tech_02"),
                eq("Seminar Equipment Schedule Updated - Rescheduled"),
                contains("Sir CV Raman Seminar Hall"),
                eq("Seminar Equipment"),
                eq("WARNING"),
                anyString()
        );

        // Verify original hall technician (activeTechH1) received alert that setup is no longer required there
        verify(notificationService).sendNotification(
                eq("SEMINAR_TECHNICIAN"),
                any(),
                eq("tech_01"),
                eq("Seminar Equipment Setup No Longer Required - Rescheduled"),
                contains("Equipment setup is no longer required at APJ Abdul Kalam Seminar Hall"),
                eq("Seminar Equipment"),
                eq("INFO"),
                eq("SEM-1001")
        );
    }

    @Test
    @DisplayName("2. Assigned active technicians receive notifications after cancellation approval")
    void testAssignedActiveTechnicianReceivesCancellationNotification() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("B_CANCEL_ID")
                .bookingId("SEM-1003")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .hallLocation(hall1.getLocation())
                .date("2026-11-12")
                .slot("FULL_DAY")
                .status("CANCELLATION_REQUESTED")
                .cancellationScope("THIS_OCCURRENCE")
                .department("ECE")
                .eventTitle("VLSI Workshop")
                .requestedBy("Dr. Reddy")
                .requesterUserId("reddy_01")
                .build();

        when(bookingRepository.findById("SEM-1003")).thenReturn(Optional.of(booking));
        when(bookingRepository.findByBookingId("SEM-1003")).thenReturn(Optional.of(booking));

        seminarService.approveCancellation("SEM-1003", adminUser);

        verify(notificationService).sendNotification(
                eq("SEMINAR_TECHNICIAN"),
                any(),
                eq("tech_01"),
                eq("Seminar Booking Cancelled - Equipment Setup Not Required"),
                contains("Equipment setup is no longer required for this event"),
                eq("Seminar Equipment"),
                eq("INFO"),
                eq("SEM-1003")
        );
    }

    @Test
    @DisplayName("3. Unassigned or inactive technicians are not notified")
    void testUnassignedOrInactiveTechniciansNotNotified() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("B_CANCEL_ID")
                .bookingId("SEM-1004")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .date("2026-11-12")
                .slot("FULL_DAY")
                .status("CANCELLATION_REQUESTED")
                .department("ECE")
                .build();

        when(bookingRepository.findById("SEM-1004")).thenReturn(Optional.of(booking));

        seminarService.approveCancellation("SEM-1004", adminUser);

        // Neither tech_inactive nor tech_unassigned should ever receive a notification
        verify(notificationService, never()).sendNotification(
                eq("SEMINAR_TECHNICIAN"), any(), eq("tech_inactive"), any(), any(), any(), any(), any()
        );
        verify(notificationService, never()).sendNotification(
                eq("SEMINAR_TECHNICIAN"), any(), eq("tech_unassigned"), any(), any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("4. Active Generator Operators are notified when an approved booking is added to schedule")
    void testActiveGeneratorOperatorNotifiedOnApproval() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("B_APPR_ID")
                .bookingId("SEM-1005")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .hallLocation(hall1.getLocation())
                .date("2026-11-18")
                .slot("FORENOON")
                .status("PENDING")
                .department("IT")
                .eventTitle("Cloud Computing Hands-on")
                .requestedBy("Prof. Varma")
                .requesterUserId("varma_01")
                .build();

        when(bookingRepository.findById("SEM-1005")).thenReturn(Optional.of(booking));

        seminarService.approveBooking("SEM-1005", adminUser);

        // Active generator operator receives notification
        verify(notificationService).sendNotification(
                eq("GENERATOR_OPERATOR"),
                any(),
                eq("gen_op_01"),
                eq("New Seminar Approved - Generator Schedule Updated"),
                contains("New approved seminar added to generator schedule"),
                eq("Generator Service"),
                eq("SUCCESS"),
                eq("SEM-1005")
        );

        // Inactive operator must NOT receive notification
        verify(notificationService, never()).sendNotification(
                eq("GENERATOR_OPERATOR"), any(), eq("gen_op_inactive"), any(), any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("5. Generator Operators are notified when an approved booking is rescheduled")
    void testGeneratorOperatorNotifiedOnReschedule() {
        SeminarBooking original = SeminarBooking.builder()
                .id("B_ORIG_ID")
                .bookingId("SEM-1006")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .date("2026-11-10")
                .slot("FORENOON")
                .status("RESCHEDULE_REQUESTED")
                .rescheduledHallId("HALL_02")
                .rescheduledDate("2026-11-20")
                .rescheduledSlot("AFTERNOON")
                .department("MECH")
                .eventTitle("Robotics Expo")
                .build();

        when(bookingRepository.findById("SEM-1006")).thenReturn(Optional.of(original));

        seminarService.approveReschedule("SEM-1006", adminUser);

        verify(notificationService).sendNotification(
                eq("GENERATOR_OPERATOR"),
                any(),
                eq("gen_op_01"),
                eq("Seminar Schedule Changed - Generator Schedule Updated"),
                contains("Approved seminar rescheduled"),
                eq("Generator Service"),
                eq("WARNING"),
                anyString()
        );
    }

    @Test
    @DisplayName("6. Generator Operators are notified when an approved booking is cancelled")
    void testGeneratorOperatorNotifiedOnCancellation() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("B_CANCEL_ID")
                .bookingId("SEM-1007")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .date("2026-11-25")
                .slot("FULL_DAY")
                .status("CANCELLATION_REQUESTED")
                .department("CIVIL")
                .eventTitle("Smart Cities Conference")
                .build();

        when(bookingRepository.findById("SEM-1007")).thenReturn(Optional.of(booking));

        seminarService.approveCancellation("SEM-1007", adminUser);

        verify(notificationService).sendNotification(
                eq("GENERATOR_OPERATOR"),
                any(),
                eq("gen_op_01"),
                eq("Seminar Cancelled - Generator Schedule Updated"),
                contains("Generator support is no longer required"),
                eq("Generator Service"),
                eq("INFO"),
                eq("SEM-1007")
        );
    }

    @Test
    @DisplayName("7. Pending and rejected bookings do not trigger Generator Operator notifications")
    void testPendingAndRejectedBookingsDoNotNotifyGeneratorOperator() {
        SeminarBooking booking = SeminarBooking.builder()
                .id("B_REJ_ID")
                .bookingId("SEM-1008")
                .hallId("HALL_01")
                .status("PENDING")
                .department("CSE")
                .build();

        when(bookingRepository.findById("SEM-1008")).thenReturn(Optional.of(booking));

        // Reject booking
        seminarService.rejectBooking("SEM-1008", "Capacity exceeded", adminUser);

        verify(notificationService, never()).sendNotification(
                eq("GENERATOR_OPERATOR"), any(), any(), any(), any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("8. Duplicate notifications are prevented when technician is assigned to multiple halls")
    void testDuplicateNotificationsPreventedForMultiHallTechnician() {
        // Multi-hall technician assigned to BOTH Hall 1 and Hall 2
        User multiHallTech = User.builder()
                .userId("tech_multi")
                .name("Multi Hall Tech")
                .email("multi@nrtec.in")
                .roles(List.of("SEMINAR_TECHNICIAN"))
                .assignedHallIds(List.of("HALL_01", "HALL_02"))
                .active(true)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(multiHallTech, activeGenOp));

        SeminarBooking original = SeminarBooking.builder()
                .id("B_ORIG_MULTI")
                .bookingId("SEM-1009")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .date("2026-11-10")
                .slot("FORENOON")
                .status("RESCHEDULE_REQUESTED")
                .rescheduledHallId("HALL_02")
                .rescheduledDate("2026-11-20")
                .rescheduledSlot("AFTERNOON")
                .department("CSDS")
                .eventTitle("Data Engineering Summit")
                .build();

        when(bookingRepository.findById("SEM-1009")).thenReturn(Optional.of(original));

        seminarService.approveReschedule("SEM-1009", adminUser);

        // multiHallTech should receive exactly ONE notification for this reschedule, not two
        verify(notificationService, times(1)).sendNotification(
                eq("SEMINAR_TECHNICIAN"),
                any(),
                eq("tech_multi"),
                anyString(),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("9. Recurring/multi-day affected dates are accurately represented in notifications")
    void testRecurringMultiDayAffectedDatesAccurate() {
        SeminarBooking recurringParent = SeminarBooking.builder()
                .id("B_REC_PARENT")
                .bookingId("SEM-REC-1010")
                .hallId("HALL_01")
                .hallName(hall1.getName())
                .date("2026-11-01")
                .startDate("2026-11-01")
                .endDate("2026-11-29")
                .dates(List.of("2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"))
                .slot("FORENOON")
                .status("CANCELLATION_REQUESTED")
                .cancellationScope("ENTIRE_SERIES")
                .seriesId("SERIES_REC_01")
                .department("CSE")
                .eventTitle("Weekly Coding Dojo")
                .build();

        when(bookingRepository.findById("SEM-REC-1010")).thenReturn(Optional.of(recurringParent));
        when(bookingRepository.findBySeriesId("SERIES_REC_01")).thenReturn(List.of(recurringParent));

        seminarService.approveCancellation("SEM-REC-1010", adminUser);

        ArgumentCaptor<String> techMsgCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).sendNotification(
                eq("SEMINAR_TECHNICIAN"),
                any(),
                eq("tech_01"),
                anyString(),
                techMsgCaptor.capture(),
                anyString(),
                anyString(),
                anyString()
        );

        assertTrue(techMsgCaptor.getValue().contains("5 occurrences") || techMsgCaptor.getValue().contains("2026-11-01 to 2026-11-29"),
                "Message must clearly communicate recurrence / multi-day occurrence span: " + techMsgCaptor.getValue());

        ArgumentCaptor<String> genMsgCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).sendNotification(
                eq("GENERATOR_OPERATOR"),
                any(),
                eq("gen_op_01"),
                anyString(),
                genMsgCaptor.capture(),
                anyString(),
                anyString(),
                anyString()
        );

        assertTrue(genMsgCaptor.getValue().contains("5 occurrences") || genMsgCaptor.getValue().contains("2026-11-01 to 2026-11-29"),
                "Generator Operator message must clearly communicate recurrence span: " + genMsgCaptor.getValue());
    }
}
