package com.nec.collegeservices;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.dto.LoginRequest;
import com.nec.collegeservices.dto.SeminarBookingRequestDTO;
import com.nec.collegeservices.dto.StationeryRequestDTO;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.StationeryItem;
import com.nec.collegeservices.model.StationeryRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.StationeryItemRepository;
import com.nec.collegeservices.repository.UserRepository;
import com.nec.collegeservices.service.SeminarService;
import com.nec.collegeservices.service.StationeryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CollegeServicesApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SeminarService seminarService;

    @Autowired
    private SeminarBookingRepository seminarBookingRepository;

    @Autowired
    private StationeryService stationeryService;

    @Autowired
    private StationeryItemRepository stationeryItemRepository;

    @Test
    void testContextLoads() {
        assertNotNull(userRepository);
        assertTrue(userRepository.count() > 0, "Users should be seeded");
    }

    @Test
    void testLoginSuccess() throws Exception {
        LoginRequest login = new LoginRequest("CSE001", "dept123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.userId").value("CSE001"))
                .andExpect(jsonPath("$.data.role").value("DEPARTMENT_USER"))
                .andExpect(jsonPath("$.data.department").value("CSE"));
    }

    @Test
    void testLoginFailure() throws Exception {
        LoginRequest login = new LoginRequest("CSE001", "wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(username = "SEM001", roles = {"SEMINAR_ADMIN"})
    void testServiceAdminRestrictionReturns403() throws Exception {
        // SEMINAR_ADMIN attempting to access /api/transport/requests should receive 403 Forbidden!
        mockMvc.perform(get("/api/transport/requests"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testSeminarSlotConflictPrevention() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();

        // 1. Create a Forenoon booking on a test date
        String testDate = "2026-10-15";
        seminarBookingRepository.findByHallIdAndDate("SH-1", testDate).forEach(seminarBookingRepository::delete);

        SeminarBookingRequestDTO forenoonDto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(testDate)
                .slot("FORENOON")
                .eventTitle("AI Workshop")
                .purpose("Guest seminar")
                .expectedParticipants(150)
                .build();

        SeminarBooking forenoonBooking = seminarService.createBooking(forenoonDto, cseUser);
        assertNotNull(forenoonBooking);

        // 2. Attempt to book FULL_DAY on the same hall & date -> Must throw ConflictException!
        SeminarBookingRequestDTO fullDayDto = SeminarBookingRequestDTO.builder()
                .hallId("SH-1")
                .date(testDate)
                .slot("FULL_DAY")
                .eventTitle("Robotics Bootcamp")
                .purpose("Hands-on lab")
                .expectedParticipants(100)
                .build();

        assertThrows(RuntimeException.class, () -> seminarService.createBooking(fullDayDto, cseUser),
                "Should fail because Forenoon is already active on the same date/hall");

        // Clean up test booking
        seminarBookingRepository.delete(forenoonBooking);
    }

    @Test
    void testStationeryRequestLifecycleWorkflow() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();

        // Create stationery request for 50 packs (without any stock limit checks)
        StationeryRequestDTO reqDto = StationeryRequestDTO.builder()
                .items(List.of(new StationeryRequestDTO.ItemRequestItem("ST-01", 50)))
                .purpose("Unit Test Lab Usage")
                .additionalNotes("Faculty requirement")
                .build();

        StationeryRequest req = stationeryService.createRequest(reqDto, cseUser);
        assertNotNull(req);
        assertEquals("PENDING", req.getStatus());
        assertEquals(1, req.getItemsRequested().size());
        assertEquals(50, req.getItemsRequested().get(0).getQuantity());

        // Under Review transition
        StationeryRequest underReview = stationeryService.markUnderReview(req.getRequestId(), "Checking vendor availability");
        assertEquals("UNDER_REVIEW", underReview.getStatus());

        // Approve request (without stock deduction)
        StationeryRequest approved = stationeryService.approveRequest(req.getRequestId(), "Approved for distribution");
        assertEquals("APPROVED", approved.getStatus());

        // Mark ready for collection
        StationeryRequest ready = stationeryService.markReadyForCollection(req.getRequestId(), "Ready at Room 102");
        assertEquals("READY_FOR_COLLECTION", ready.getStatus());

        // Mark collected
        StationeryRequest collected = stationeryService.markCollected(req.getRequestId(), "Received by CSE Lab tech");
        assertEquals("COLLECTED", collected.getStatus());
    }
}
