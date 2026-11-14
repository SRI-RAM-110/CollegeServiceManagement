package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.SeminarBookingRequestDTO;
import com.nec.collegeservices.dto.SeminarBulkAvailabilityRequestDTO;
import com.nec.collegeservices.dto.SeminarRescheduleRequestDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.model.SeminarBooking;
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

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class SeminarBookingTimingAndDeadlineTest {

    @Mock
    private SeminarHallRepository hallRepository;

    @Mock
    private SeminarBookingRepository bookingRepository;

    @Mock
    private RequesterResolver requesterResolver;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuthService authService;

    @Mock
    private RequestIdService requestIdService;

    @InjectMocks
    private SeminarService seminarService;

    private User requesterUser;
    private User coordinatorUser;
    private SeminarHall sampleHall;
    private final LocalDate testToday = LocalDate.of(2026, 11, 14);

    private void setMockTime(LocalDate date, LocalTime time) {
        Instant instant = date.atTime(time).atZone(SeminarService.COLLEGE_ZONE).toInstant();
        seminarService.setClock(Clock.fixed(instant, SeminarService.COLLEGE_ZONE));
    }

    @BeforeEach
    void setUp() {
        requesterUser = User.builder()
                .userId("CSE001")
                .name("Dr. Requester")
                .role("DEPARTMENT_STAFF")
                .department("CSE")
                .build();

        coordinatorUser = User.builder()
                .userId("COORD01")
                .name("Prof. Coordinator")
                .role("SEMINAR_COORDINATOR")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .department("ECE")
                .assignedHallIds(List.of("SH-1"))
                .build();

        sampleHall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .location("Mechanical Block, Ground Floor")
                .capacity(150)
                .status("Available")
                .build();

        when(hallRepository.findByHallId("SH-1")).thenReturn(Optional.of(sampleHall));
        when(hallRepository.findById("SH-1")).thenReturn(Optional.of(sampleHall));
        when(bookingRepository.findByHallIdAndDate(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(bookingRepository.save(any(SeminarBooking.class))).thenAnswer(inv -> inv.getArgument(0));

        // Default mock time: 08:30 AM on testToday
        setMockTime(testToday, LocalTime.of(8, 30));
    }

    @Test
    @DisplayName("Verify slot start and end times meet new requirements")
    void testSlotTimes() {
        // Forenoon: 09:00 AM - 12:00 PM
        assertEquals(LocalTime.of(9, 0), SeminarService.getSlotStartTime("FORENOON"));
        assertEquals(LocalTime.of(12, 0), SeminarService.getSlotEndTime("FORENOON"));

        // Afternoon: 01:00 PM - 04:00 PM (13:00 - 16:00)
        assertEquals(LocalTime.of(13, 0), SeminarService.getSlotStartTime("AFTERNOON"));
        assertEquals(LocalTime.of(16, 0), SeminarService.getSlotEndTime("AFTERNOON"));

        // Full Day: 09:00 AM - 04:00 PM (09:00 - 16:00)
        assertEquals(LocalTime.of(9, 0), SeminarService.getSlotStartTime("FULL_DAY"));
        assertEquals(LocalTime.of(16, 0), SeminarService.getSlotEndTime("FULL_DAY"));
    }

    @Test
    @DisplayName("Verify same-day booking deadlines")
    void testSameDayBookingDeadlines() {
        assertEquals(LocalTime.of(10, 0), SeminarService.getSameDayBookingDeadline("FORENOON"));
        assertEquals(LocalTime.of(14, 0), SeminarService.getSameDayBookingDeadline("AFTERNOON"));
        assertEquals(LocalTime.of(10, 0), SeminarService.getSameDayBookingDeadline("FULL_DAY"));
    }

    @Test
    @DisplayName("Verify exact same-day deadline rejection messages")
    void testSameDayRejectionMessages() {
        assertEquals(
                "Forenoon booking closed. Same-day booking deadline was 10:00 AM.",
                SeminarService.getSameDayDeadlineRejectionMessage("FORENOON")
        );
        assertEquals(
                "Afternoon booking closed. Same-day booking deadline was 02:00 PM.",
                SeminarService.getSameDayDeadlineRejectionMessage("AFTERNOON")
        );
        assertEquals(
                "Full Day booking closed. Same-day booking deadline was 10:00 AM.",
                SeminarService.getSameDayDeadlineRejectionMessage("FULL_DAY")
        );
    }

    @Test
    @DisplayName("Same-day Forenoon booking before 10:00 AM succeeds")
    void testSameDayForenoonBeforeDeadlineAccepted() {
        // 09:30 AM
        setMockTime(testToday, LocalTime.of(9, 30));

        SeminarBookingRequestDTO dto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(testToday.toString())
                .slot("FORENOON")
                .eventTitle("Morning Workshop")
                .purpose("AI Seminar")
                .expectedParticipants(60)
                .build();

        SeminarBooking booking = seminarService.createBooking(dto, requesterUser);
        assertNotNull(booking);
        assertEquals("FORENOON", booking.getSlot());
        assertEquals("PENDING", booking.getStatus());
    }

    @Test
    @DisplayName("Same-day Forenoon booking at or after 10:00 AM is rejected with exact message")
    void testSameDayForenoonAfterDeadlineRejected() {
        // Exactly 10:00 AM
        setMockTime(testToday, LocalTime.of(10, 0));

        SeminarBookingRequestDTO dto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(testToday.toString())
                .slot("FORENOON")
                .eventTitle("Late Morning Workshop")
                .purpose("AI Seminar")
                .expectedParticipants(60)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> seminarService.createBooking(dto, requesterUser));
        assertEquals("Forenoon booking closed. Same-day booking deadline was 10:00 AM.", ex.getMessage());
    }

    @Test
    @DisplayName("Same-day Full Day booking at 10:00 AM is rejected with exact message")
    void testSameDayFullDayAfterDeadlineRejected() {
        // 10:01 AM
        setMockTime(testToday, LocalTime.of(10, 1));

        SeminarBookingRequestDTO dto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(testToday.toString())
                .slot("FULL_DAY")
                .eventTitle("Full Day Symposium")
                .purpose("Annual Meet")
                .expectedParticipants(80)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> seminarService.createBooking(dto, requesterUser));
        assertEquals("Full Day booking closed. Same-day booking deadline was 10:00 AM.", ex.getMessage());
    }

    @Test
    @DisplayName("Same-day Afternoon booking before 02:00 PM succeeds")
    void testSameDayAfternoonBeforeDeadlineAccepted() {
        // 01:45 PM (13:45)
        setMockTime(testToday, LocalTime.of(13, 45));

        SeminarBookingRequestDTO dto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(testToday.toString())
                .slot("AFTERNOON")
                .eventTitle("Afternoon Session")
                .purpose("Guest Lecture")
                .expectedParticipants(75)
                .build();

        SeminarBooking booking = seminarService.createBooking(dto, requesterUser);
        assertNotNull(booking);
        assertEquals("AFTERNOON", booking.getSlot());
        assertEquals("PENDING", booking.getStatus());
    }

    @Test
    @DisplayName("Same-day Afternoon booking at or after 02:00 PM is rejected with exact message")
    void testSameDayAfternoonAfterDeadlineRejected() {
        // Exactly 02:00 PM (14:00)
        setMockTime(testToday, LocalTime.of(14, 0));

        SeminarBookingRequestDTO dto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(testToday.toString())
                .slot("AFTERNOON")
                .eventTitle("Late Afternoon Session")
                .purpose("Guest Lecture")
                .expectedParticipants(75)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> seminarService.createBooking(dto, requesterUser));
        assertEquals("Afternoon booking closed. Same-day booking deadline was 02:00 PM.", ex.getMessage());
    }

    @Test
    @DisplayName("Advance booking for future date succeeds regardless of time of day")
    void testFutureBookingAcceptedAtAnyTime() {
        // Current time is 11:30 PM (23:30) on today
        setMockTime(testToday, LocalTime.of(23, 30));

        LocalDate futureDate = testToday.plusDays(5);
        SeminarBookingRequestDTO dto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(futureDate.toString())
                .slot("FORENOON")
                .eventTitle("Future Conference")
                .purpose("Research Presentation")
                .expectedParticipants(100)
                .build();

        SeminarBooking booking = seminarService.createBooking(dto, requesterUser);
        assertNotNull(booking);
        assertEquals("FORENOON", booking.getSlot());
        assertEquals("PENDING", booking.getStatus());
    }

    @Test
    @DisplayName("Rescheduling to same day after deadline is rejected with exact message")
    void testRescheduleToSameDayAfterDeadlineRejected() {
        // 10:30 AM
        setMockTime(testToday, LocalTime.of(10, 30));

        SeminarBooking existingBooking = SeminarBooking.builder()
                .id("BOOK-001")
                .bookingId("BK-20261114-001")
                .hallId("SH-1")
                .date(testToday.plusDays(3).toString())
                .slot("AFTERNOON")
                .status("APPROVED")
                .requestedBy(requesterUser.getName())
                .requesterUserId(requesterUser.getUserId())
                .build();

        when(bookingRepository.findById("BOOK-001")).thenReturn(Optional.of(existingBooking));

        SeminarRescheduleRequestDTO rescheduleDTO = SeminarRescheduleRequestDTO.builder()
                .newHallId("SH-1")
                .newDate(testToday.toString())
                .newSlot("FORENOON")
                .reason("Urgent change needed")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> seminarService.requestReschedule("BOOK-001", rescheduleDTO, requesterUser));
        assertEquals("Forenoon booking closed. Same-day booking deadline was 10:00 AM.", ex.getMessage());
    }

    @Test
    @DisplayName("Rescheduling to future date succeeds regardless of current time")
    void testRescheduleToFutureDateAccepted() {
        // 03:00 PM (15:00)
        setMockTime(testToday, LocalTime.of(15, 0));

        SeminarBooking existingBooking = SeminarBooking.builder()
                .id("BOOK-002")
                .bookingId("BK-20261114-002")
                .hallId("SH-1")
                .date(testToday.plusDays(1).toString())
                .slot("FORENOON")
                .status("BOOKED")
                .requestedBy(requesterUser.getName())
                .requesterUserId(requesterUser.getUserId())
                .build();

        when(bookingRepository.findById("BOOK-002")).thenReturn(Optional.of(existingBooking));

        SeminarRescheduleRequestDTO rescheduleDTO = SeminarRescheduleRequestDTO.builder()
                .newHallId("SH-1")
                .newDate(testToday.plusDays(4).toString())
                .newSlot("FORENOON")
                .reason("Speaker availability shifted")
                .build();

        SeminarBooking rescheduled = seminarService.requestReschedule("BOOK-002", rescheduleDTO, requesterUser);
        assertNotNull(rescheduled);
        assertEquals("RESCHEDULE_REQUESTED", rescheduled.getStatus());
        assertEquals("FORENOON", rescheduled.getRescheduledSlot());
    }

    @Test
    @DisplayName("Coordinator approval after deadline succeeds for previously submitted booking")
    void testCoordinatorApprovalAfterDeadlineSucceeds() {
        // Current time is 11:30 AM (well after 10:00 AM deadline)
        setMockTime(testToday, LocalTime.of(11, 30));

        SeminarBooking pendingBooking = SeminarBooking.builder()
                .id("BOOK-PENDING-001")
                .bookingId("BK-20261114-003")
                .hallId("SH-1")
                .date(testToday.toString())
                .slot("FORENOON")
                .status("PENDING")
                .requestedBy("Dr. Requester")
                .requesterUserId("CSE001")
                .build();

        when(bookingRepository.findById("BOOK-PENDING-001")).thenReturn(Optional.of(pendingBooking));

        SeminarBooking approved = seminarService.approveBooking("BOOK-PENDING-001", coordinatorUser);
        assertNotNull(approved);
        assertEquals("APPROVED", approved.getStatus());
    }

    @Test
    @DisplayName("Slot availability check marks passed slots as PASSED on same-day after deadline")
    void testGetAvailabilityMarksPassedSlots() {
        // 11:00 AM (past Forenoon/Full Day deadline of 10:00, but before Afternoon deadline of 14:00)
        setMockTime(testToday, LocalTime.of(11, 0));

        Map<String, Object> avail = seminarService.getAvailability("SH-1", testToday.toString());
        assertNotNull(avail);
        @SuppressWarnings("unchecked")
        Map<String, String> slots = (Map<String, String>) avail.get("slots");
        assertEquals("PASSED", slots.get("FORENOON"));
        assertEquals("PASSED", slots.get("FULL_DAY"));
        assertEquals("AVAILABLE", slots.get("AFTERNOON"));
    }

    @Test
    @DisplayName("Bulk availability check reports exact cutoff rejection reason when past deadline")
    void testCheckBulkAvailabilityReportsCutoffReason() {
        // 02:30 PM (14:30) (past Afternoon deadline)
        setMockTime(testToday, LocalTime.of(14, 30));

        SeminarBulkAvailabilityRequestDTO dto = SeminarBulkAvailabilityRequestDTO.builder()
                .hallId("SH-1")
                .slot("AFTERNOON")
                .dates(List.of(testToday.toString()))
                .build();

        Map<String, Object> result = seminarService.checkBulkAvailability(dto);
        assertNotNull(result);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> occurrences = (List<Map<String, Object>>) result.get("occurrences");
        assertFalse(occurrences.isEmpty());
        assertEquals("UNAVAILABLE", occurrences.get(0).get("status"));
        assertEquals("Afternoon booking closed. Same-day booking deadline was 02:00 PM.", occurrences.get(0).get("conflictReason"));
    }
}
