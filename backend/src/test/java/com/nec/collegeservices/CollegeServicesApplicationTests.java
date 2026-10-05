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

    @Autowired
    private com.nec.collegeservices.service.MealService mealService;

    @Autowired
    private com.nec.collegeservices.repository.MealRequestRepository mealRequestRepository;

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

    @Test
    void testMealServiceTimeValidationAndCreation() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        String futureDate = java.time.LocalDate.now().plusDays(5).toString();

        // 1. Snacks only + FORENOON -> SUCCESS
        com.nec.collegeservices.dto.MealRequestDTO dto1 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Snacks Forenoon Event")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Snacks"))
                .serviceTime("FORENOON")
                .totalGuests(20)
                .build();
        com.nec.collegeservices.model.MealRequest res1 = mealService.createRequest(dto1, cseUser);
        assertNotNull(res1);
        assertEquals("FORENOON", res1.getServiceTime());
        mealRequestRepository.delete(res1);

        // 2. Snacks only + AFTERNOON -> SUCCESS
        com.nec.collegeservices.dto.MealRequestDTO dto2 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Snacks Afternoon Event")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Snacks"))
                .serviceTime("AFTERNOON")
                .totalGuests(20)
                .build();
        com.nec.collegeservices.model.MealRequest res2 = mealService.createRequest(dto2, cseUser);
        assertNotNull(res2);
        assertEquals("AFTERNOON", res2.getServiceTime());
        mealRequestRepository.delete(res2);

        // 3. Tea/Coffee only + FORENOON -> SUCCESS
        com.nec.collegeservices.dto.MealRequestDTO dto3 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Tea Forenoon Event")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Tea / Coffee"))
                .serviceTime("FORENOON")
                .totalGuests(15)
                .build();
        com.nec.collegeservices.model.MealRequest res3 = mealService.createRequest(dto3, cseUser);
        assertNotNull(res3);
        assertEquals("FORENOON", res3.getServiceTime());
        mealRequestRepository.delete(res3);

        // 4. Tea/Coffee only + AFTERNOON -> SUCCESS
        com.nec.collegeservices.dto.MealRequestDTO dto4 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Tea Afternoon Event")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Tea / Coffee"))
                .serviceTime("AFTERNOON")
                .totalGuests(15)
                .build();
        com.nec.collegeservices.model.MealRequest res4 = mealService.createRequest(dto4, cseUser);
        assertNotNull(res4);
        assertEquals("AFTERNOON", res4.getServiceTime());
        mealRequestRepository.delete(res4);

        // 5. Snacks + Tea/Coffee + FORENOON -> SUCCESS
        com.nec.collegeservices.dto.MealRequestDTO dto5 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Both Forenoon Event")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Snacks", "Tea / Coffee"))
                .serviceTime("FORENOON")
                .totalGuests(25)
                .build();
        com.nec.collegeservices.model.MealRequest res5 = mealService.createRequest(dto5, cseUser);
        assertNotNull(res5);
        assertEquals("FORENOON", res5.getServiceTime());
        mealRequestRepository.delete(res5);

        // 6. Snacks + Tea/Coffee + AFTERNOON -> SUCCESS
        com.nec.collegeservices.dto.MealRequestDTO dto6 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Both Afternoon Event")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Snacks", "Tea / Coffee"))
                .serviceTime("AFTERNOON")
                .totalGuests(25)
                .build();
        com.nec.collegeservices.model.MealRequest res6 = mealService.createRequest(dto6, cseUser);
        assertNotNull(res6);
        assertEquals("AFTERNOON", res6.getServiceTime());
        mealRequestRepository.delete(res6);

        // 7. Snacks selected + no service time -> THROW BadRequestException
        com.nec.collegeservices.dto.MealRequestDTO dto7 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Snacks Missing Service Time")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Snacks"))
                .totalGuests(25)
                .build();
        assertThrows(com.nec.collegeservices.exception.BadRequestException.class,
                () -> mealService.createRequest(dto7, cseUser),
                "Should fail when Snacks is selected without serviceTime");

        // 8. Tea/Coffee selected + no service time -> THROW BadRequestException
        com.nec.collegeservices.dto.MealRequestDTO dto8 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Tea Missing Service Time")
                .date(futureDate)
                .venue("ECE Hall")
                .mealTypes(List.of("Tea / Coffee"))
                .totalGuests(25)
                .build();
        assertThrows(com.nec.collegeservices.exception.BadRequestException.class,
                () -> mealService.createRequest(dto8, cseUser),
                "Should fail when Tea/Coffee is selected without serviceTime");

        // 9. Breakfast/Lunch/Dinner only -> SUCCESS without serviceTime
        com.nec.collegeservices.dto.MealRequestDTO dto9 = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Lunch Dinner Only")
                .date(futureDate)
                .venue("Faculty Dining")
                .mealTypes(List.of("Lunch", "Dinner"))
                .totalGuests(40)
                .build();
        com.nec.collegeservices.model.MealRequest res9 = mealService.createRequest(dto9, cseUser);
        assertNotNull(res9);
        assertNull(res9.getServiceTime());
        mealRequestRepository.delete(res9);
    }

    @Test
    void testMealsAdminApprovalWorkflow() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User mealsAdmin = userRepository.findByUserId("MEA001").orElseThrow();
        String futureDate = java.time.LocalDate.now().plusDays(4).toString();

        // 1. Create request as Department User
        com.nec.collegeservices.dto.MealRequestDTO createDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Original Guest Event")
                .date(futureDate)
                .venue("Campus Hall A")
                .mealTypes(List.of("Breakfast", "Lunch"))
                .totalGuests(30)
                .specialRequirements("Vegetarian meals")
                .build();
        com.nec.collegeservices.model.MealRequest req = mealService.createRequest(createDto, cseUser);
        assertNotNull(req);
        assertEquals("PENDING", req.getStatus());
        assertEquals(30, req.getTotalGuests());

        // 2. View details as Meals Admin
        com.nec.collegeservices.model.MealRequest viewReq = mealService.getRequestById(req.getRequestId(), mealsAdmin);
        assertNotNull(viewReq);
        assertEquals(req.getRequestId(), viewReq.getRequestId());
        assertNotNull(viewReq.getRequesterEmail());

        // 3. Edit request as Meals Admin: add Snacks & Tea/Coffee with FORENOON, change venue & guest count
        com.nec.collegeservices.dto.MealRequestDTO updateDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Updated Conference Lunch & Snacks")
                .date(futureDate)
                .venue("Campus Banquet Hall")
                .mealTypes(List.of("Lunch", "Snacks", "Tea / Coffee"))
                .serviceTime("FORENOON")
                .totalGuests(45)
                .specialRequirements("VIP special tea arrangement")
                .build();
        com.nec.collegeservices.model.MealRequest updated = mealService.updateRequest(req.getRequestId(), updateDto, mealsAdmin);
        assertNotNull(updated);
        assertEquals("Updated Conference Lunch & Snacks", updated.getEventTitle());
        assertEquals("Campus Banquet Hall", updated.getVenue());
        assertEquals(45, updated.getTotalGuests());
        assertEquals("FORENOON", updated.getServiceTime());
        assertTrue(updated.getMealTypes().contains("Snacks"));
        // Verify system-controlled identity fields remain unchanged
        assertEquals(req.getRequestId(), updated.getRequestId());
        assertEquals(req.getDepartment(), updated.getDepartment());
        assertEquals(req.getRequestedBy(), updated.getRequestedBy());
        assertEquals("PENDING", updated.getStatus());

        // 4. Approve request as Meals Admin
        com.nec.collegeservices.model.MealRequest approved = mealService.approveRequest(req.getRequestId());
        assertNotNull(approved);
        assertEquals("APPROVED", approved.getStatus());
        assertNotNull(approved.getApprovedAt());

        // 5. Attempting to approve an already approved request should fail
        assertThrows(com.nec.collegeservices.exception.BadRequestException.class,
                () -> mealService.approveRequest(req.getRequestId()),
                "Already approved request cannot be approved again");

        mealRequestRepository.delete(approved);
    }

    @Test
    void testAOAdminApprovalWorkflow() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoAdmin = userRepository.findByUserId("AO001").orElseThrow();
        String futureDate = java.time.LocalDate.now().plusDays(6).toString();

        // 1. Create request
        com.nec.collegeservices.dto.MealRequestDTO createDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("HOD Meeting Hospitality")
                .date(futureDate)
                .venue("Conference Room 1")
                .mealTypes(List.of("Lunch"))
                .totalGuests(20)
                .build();
        com.nec.collegeservices.model.MealRequest req = mealService.createRequest(createDto, cseUser);
        assertNotNull(req);

        // 2. View details as AO Admin
        com.nec.collegeservices.model.MealRequest viewReq = mealService.getRequestById(req.getRequestId(), aoAdmin);
        assertNotNull(viewReq);
        assertEquals("CSE", viewReq.getDepartment());

        // 3. Edit request as AO Admin: add Snacks with AFTERNOON
        com.nec.collegeservices.dto.MealRequestDTO updateDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Executive HOD Meeting Hospitality")
                .date(futureDate)
                .venue("Executive Board Room")
                .mealTypes(List.of("Lunch", "Snacks"))
                .serviceTime("AFTERNOON")
                .totalGuests(25)
                .specialRequirements("High-tea setup at 4 PM")
                .build();
        com.nec.collegeservices.model.MealRequest updated = mealService.updateRequest(req.getRequestId(), updateDto, aoAdmin);
        assertNotNull(updated);
        assertEquals("Executive HOD Meeting Hospitality", updated.getEventTitle());
        assertEquals("AFTERNOON", updated.getServiceTime());
        assertEquals(25, updated.getTotalGuests());

        // 4. Approve request as AO Admin
        com.nec.collegeservices.model.MealRequest approved = mealService.approveRequest(req.getRequestId());
        assertNotNull(approved);
        assertEquals("APPROVED", approved.getStatus());

        mealRequestRepository.delete(approved);
    }

    @Test
    void testAOAdminRejectWorkflow() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoAdmin = userRepository.findByUserId("AO001").orElseThrow();
        String futureDate = java.time.LocalDate.now().plusDays(7).toString();

        com.nec.collegeservices.dto.MealRequestDTO createDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Budget Review Catering")
                .date(futureDate)
                .venue("Room 205")
                .mealTypes(List.of("Lunch"))
                .totalGuests(15)
                .build();
        com.nec.collegeservices.model.MealRequest req = mealService.createRequest(createDto, cseUser);
        assertNotNull(req);

        // Reject request as AO Admin
        com.nec.collegeservices.model.MealRequest rejected = mealService.rejectRequest(req.getRequestId(), "Kitchen maintenance scheduled on this day");
        assertNotNull(rejected);
        assertEquals("REJECTED", rejected.getStatus());
        assertEquals("Kitchen maintenance scheduled on this day", rejected.getRejectionReason());

        mealRequestRepository.delete(rejected);
    }

    @Test
    void testDepartmentUserCannotAdministerMealRequests() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        String futureDate = java.time.LocalDate.now().plusDays(3).toString();

        com.nec.collegeservices.dto.MealRequestDTO createDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Dept Internal Discussion")
                .date(futureDate)
                .venue("Lab 3")
                .mealTypes(List.of("Lunch"))
                .totalGuests(10)
                .build();
        com.nec.collegeservices.model.MealRequest req = mealService.createRequest(createDto, cseUser);
        assertNotNull(req);

        // Department user attempts to update -> AccessDeniedException
        com.nec.collegeservices.dto.MealRequestDTO updateDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Hacked Event Title")
                .date(futureDate)
                .venue("Lab 3")
                .mealTypes(List.of("Lunch"))
                .totalGuests(50)
                .build();

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> mealService.updateRequest(req.getRequestId(), updateDto, cseUser),
                "Department user cannot edit meal requests");

        mealRequestRepository.delete(req);
    }
}
