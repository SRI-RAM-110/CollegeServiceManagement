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
import com.nec.collegeservices.dto.AccommodationDualRequestDTO;
import com.nec.collegeservices.dto.AccommodationRequestDTO;
import com.nec.collegeservices.model.AccommodationRequest;
import com.nec.collegeservices.model.AccommodationRoom;
import com.nec.collegeservices.repository.AccommodationRequestRepository;
import com.nec.collegeservices.repository.AccommodationRoomRepository;
import com.nec.collegeservices.service.AccommodationService;
import com.nec.collegeservices.service.AdminUserService;
import com.nec.collegeservices.dto.UserDTO;
import java.time.LocalDateTime;
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

    @Autowired
    private AccommodationService accommodationService;

    @Autowired
    private AccommodationRequestRepository accommodationRequestRepository;

    @Autowired
    private AccommodationRoomRepository accommodationRoomRepository;

    @Autowired
    private AdminUserService adminUserService;

    @Test
    void testContextLoads() {
        assertNotNull(userRepository);
        assertTrue(userRepository.count() > 0, "Users should be seeded");
    }

    @Test
    @WithMockUser(username = "AO001", roles = {"AO_ADMIN"})
    void testUserManagementUserListAndUserDTOConstructors() throws Exception {
        // 1. Verify direct service call works and existing records are preserved
        List<UserDTO> users = adminUserService.getUsers(null, null, null, null, null);
        assertNotNull(users);
        assertFalse(users.isEmpty(), "User repository records must be preserved and non-empty");

        // 2. Verify backward-compatible 15-argument constructor
        UserDTO legacyDto = new UserDTO(
                "test-id", "TEST_USER", "Test Name", "test@nec.edu", "9876543210",
                "CSE", "Assistant Professor", "DEPARTMENT_USER",
                List.of("DEPARTMENT_USER"), List.of(), List.of(),
                true, false, LocalDateTime.now(), LocalDateTime.now()
        );
        assertNotNull(legacyDto);
        assertEquals("TEST_USER", legacyDto.getUserId());
        assertNotNull(legacyDto.getAssignedHostels());
        assertTrue(legacyDto.getAssignedHostels().isEmpty());

        // 3. Verify new 16-argument constructor with assignedHostels
        UserDTO modernDto = new UserDTO(
                "test-id-2", "BOYS_ADMIN", "Boys Admin", "boys@nec.edu", "9876543211",
                "HOSTEL", "Hostel Admin", "ACCOMMODATION_ADMIN",
                List.of("ACCOMMODATION_ADMIN"), List.of("ACCOMMODATION_ADMIN"), List.of(),
                List.of("Boys Hostel"), true, false, LocalDateTime.now(), LocalDateTime.now()
        );
        assertNotNull(modernDto);
        assertEquals(List.of("Boys Hostel"), modernDto.getAssignedHostels());

        // 4. Verify Builder pattern
        UserDTO builderDto = UserDTO.builder()
                .userId("BUILDER_USER")
                .name("Builder User")
                .build();
        assertNotNull(builderDto);
        assertEquals("BUILDER_USER", builderDto.getUserId());

        // 5. Verify /api/admin/users REST endpoint through MockMvc
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(users.size()));
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

    @Test
    void testMealsSingleDateSubmitWorks() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        String futureDate = java.time.LocalDate.now().plusDays(5).toString();

        com.nec.collegeservices.dto.MealRequestDTO dto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Single Date HOD Meeting")
                .date(futureDate)
                .bookingType("ONE_TIME")
                .venue("CSE Conference Room")
                .mealTypes(List.of("Lunch"))
                .totalGuests(15)
                .mealItems(List.of(
                        com.nec.collegeservices.dto.MealRequestDTO.MealItemDetailDTO.builder()
                                .mealType("Lunch")
                                .guestCount(15)
                                .preferredTime("01:00 PM")
                                .description("Executive Lunch")
                                .build()
                ))
                .build();

        com.nec.collegeservices.model.MealRequest created = mealService.createRequest(dto, cseUser);
        assertNotNull(created);
        assertNotNull(created.getRequestId());
        assertEquals(futureDate, created.getDate());
        assertEquals("PENDING", created.getStatus());
        assertEquals("ONE_TIME", created.getBookingType());
        assertNull(created.getSeriesId());

        mealRequestRepository.delete(created);
    }

    @Test
    void testMealsMultipleDatesSubmitSavesAllDates() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        String day1 = java.time.LocalDate.now().plusDays(10).toString();
        String day2 = java.time.LocalDate.now().plusDays(11).toString();
        String day3 = java.time.LocalDate.now().plusDays(12).toString();
        List<String> dates = List.of(day1, day2, day3);

        com.nec.collegeservices.dto.MealRequestDTO dto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("3-Day International Tech Symposium")
                .date(day1)
                .startDate(day1)
                .endDate(day3)
                .bookingType("MULTI_DAY")
                .dates(dates)
                .venue("Main Auditorium Lawn")
                .mealTypes(List.of("Breakfast", "Lunch"))
                .totalGuests(50)
                .mealItems(List.of(
                        com.nec.collegeservices.dto.MealRequestDTO.MealItemDetailDTO.builder()
                                .mealType("Breakfast")
                                .guestCount(50)
                                .preferredTime("08:30 AM")
                                .description("Buffet")
                                .build(),
                        com.nec.collegeservices.dto.MealRequestDTO.MealItemDetailDTO.builder()
                                .mealType("Lunch")
                                .guestCount(50)
                                .preferredTime("01:00 PM")
                                .description("Full Course")
                                .build()
                ))
                .build();

        com.nec.collegeservices.model.MealRequest primary = mealService.createRequest(dto, cseUser);
        assertNotNull(primary);
        assertNotNull(primary.getSeriesId());
        assertTrue(primary.getSeriesId().startsWith("SM-SERIES-"));
        assertEquals(1, primary.getOccurrenceIndex());
        assertEquals(3, primary.getTotalOccurrences());
        assertEquals(dates, primary.getDates());
        assertEquals(day1, primary.getDate());

        // Verify that all 3 occurrences were saved in the repository
        List<com.nec.collegeservices.model.MealRequest> seriesRequests = mealRequestRepository.findBySeriesId(primary.getSeriesId());
        assertEquals(3, seriesRequests.size());
        assertEquals(day1, seriesRequests.get(0).getDate());
        assertEquals(day2, seriesRequests.get(1).getDate());
        assertEquals(day3, seriesRequests.get(2).getDate());

        // Cleanup
        mealRequestRepository.deleteAll(seriesRequests);
    }

    @Test
    void testMealsBulkAvailabilityCheck() {
        String day1 = java.time.LocalDate.now().plusDays(14).toString();
        String day2 = java.time.LocalDate.now().plusDays(15).toString();

        com.nec.collegeservices.dto.MealBulkAvailabilityRequestDTO bulkDto = com.nec.collegeservices.dto.MealBulkAvailabilityRequestDTO.builder()
                .dates(List.of(day1, day2))
                .bookingType("MULTI_DAY")
                .venue("Dining Hall")
                .mealTypes(List.of("Dinner"))
                .build();

        java.util.Map<String, Object> result = mealService.checkBulkAvailability(bulkDto);
        assertNotNull(result);
        assertEquals(2, result.get("totalDates"));
        assertEquals(2, result.get("availableCount"));
        assertEquals(0, result.get("conflictCount"));
        List<?> occurrences = (List<?>) result.get("occurrences");
        assertEquals(2, occurrences.size());
    }


    @Test
    void testMealsRefreshmentsServiceTimePreserved() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        String futureDate = java.time.LocalDate.now().plusDays(18).toString();

        // 1. Missing serviceTime should fail validation
        com.nec.collegeservices.dto.MealRequestDTO invalidDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Faculty Evening Tea")
                .date(futureDate)
                .venue("Staff Lounge")
                .mealTypes(List.of("Tea / Coffee", "Snacks"))
                .totalGuests(20)
                .serviceTime(null)
                .build();

        assertThrows(com.nec.collegeservices.exception.BadRequestException.class,
                () -> mealService.createRequest(invalidDto, cseUser),
                "Missing serviceTime for refreshments must throw BadRequestException");

        // 2. Valid FORENOON serviceTime should succeed
        com.nec.collegeservices.dto.MealRequestDTO validDto = com.nec.collegeservices.dto.MealRequestDTO.builder()
                .eventTitle("Faculty Morning Refreshments")
                .date(futureDate)
                .venue("Staff Lounge")
                .mealTypes(List.of("Tea / Coffee", "Snacks"))
                .totalGuests(20)
                .serviceTime("FORENOON")
                .build();

        com.nec.collegeservices.model.MealRequest created = mealService.createRequest(validDto, cseUser);
        assertNotNull(created);
        assertEquals("FORENOON", created.getServiceTime());

        mealRequestRepository.delete(created);
    }

    // =========================================================================
    // ACCOMMODATION HOSTEL SELECTION & TWO-LEVEL APPROVAL WORKFLOW TESTS
    // =========================================================================

    private AccommodationRoom ensureTestRoom(String roomId, String hostel, String roomType) {
        return accommodationRoomRepository.findByRoomId(roomId)
                .orElseGet(() -> accommodationRoomRepository.save(AccommodationRoom.builder()
                        .roomId(roomId)
                        .hostel(hostel)
                        .roomType(roomType)
                        .capacity(2)
                        .available(true)
                        .status("Available")
                        .location(hostel + " - Floor 1")
                        .build()));
    }

    private User createOrGetHostelAdmin(String userId, String name, String hostel) {
        return userRepository.findByUserId(userId).map(u -> {
            u.setAssignedHostels(List.of(hostel));
            return userRepository.save(u);
        }).orElseGet(() -> userRepository.save(User.builder()
                .userId(userId)
                .name(name)
                .role("ACCOMMODATION_ADMIN")
                .roles(List.of("ACCOMMODATION_ADMIN"))
                .assignedHostels(List.of(hostel))
                .department("ADMIN")
                .email(userId.toLowerCase() + "@nrtec.local")
                .active(true)
                .build()));
    }

    @Test
    void testAccommodation_Scenario1_BoysHostelOnlyFlow() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoUser = userRepository.findByUserId("AO001").orElseThrow();
        User boysAdmin = createOrGetHostelAdmin("ACC_BOYS_TEST", "Boys Hostel Admin", "Boys Hostel");
        User girlsAdmin = createOrGetHostelAdmin("ACC_GIRLS_TEST", "Girls Hostel Admin", "Girls Hostel");
        ensureTestRoom("BH-TEST-101", "Boys Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(25).toString();
        String outDate = java.time.LocalDate.now().plusDays(26).toString();

        AccommodationRequestDTO dto = AccommodationRequestDTO.builder()
                .hostel("Boys Hostel")
                .roomId("BH-TEST-101")
                .checkInDate(inDate)
                .checkOutDate(outDate)
                .guestsCount(2)
                .purpose("Guest Lecture by Male Faculty")
                .facultyOrGuestName("Dr. Arun")
                .selectionMode("BOYS")
                .build();

        // 1. Submit Request
        AccommodationRequest req = accommodationService.createRequest(dto, cseUser);
        assertNotNull(req);
        assertEquals("PENDING_AO_APPROVAL", req.getStatus());
        assertEquals("Boys Hostel", req.getHostel());

        // 2. Verify Boys Admin cannot see it before AO Approval
        List<AccommodationRequest> boysAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, boysAdmin);
        assertFalse(boysAdminView.stream().anyMatch(r -> r.getRequestId().equals(req.getRequestId())),
                "Boys Admin must NOT see request while PENDING_AO_APPROVAL");

        // 3. Verify AO Admin sees it and Approves
        List<AccommodationRequest> aoView = accommodationService.getAllRequests(null, null, null, null, null, null, aoUser);
        assertTrue(aoView.stream().anyMatch(r -> r.getRequestId().equals(req.getRequestId())),
                "AO Admin must see request for approval");

        AccommodationRequest aoApproved = accommodationService.aoForwardRequest(req.getRequestId(), "AO Forwarded for Boys", aoUser);
        assertEquals("FORWARDED_TO_BOYS_ADMIN", aoApproved.getStatus());

        // 4. Verify Boys Admin can now see it, Girls Admin cannot
        boysAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, boysAdmin);
        assertTrue(boysAdminView.stream().anyMatch(r -> r.getRequestId().equals(req.getRequestId())),
                "Boys Admin must receive request after AO Approval");

        List<AccommodationRequest> girlsAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, girlsAdmin);
        assertFalse(girlsAdminView.stream().anyMatch(r -> r.getRequestId().equals(req.getRequestId())),
                "Girls Admin must NOT receive Boys Hostel request");

        // 5. Boys Admin Approves
        AccommodationRequest finalApproved = accommodationService.approveRequest(req.getRequestId(), boysAdmin);
        assertEquals("APPROVED", finalApproved.getStatus());

        // Cleanup
        accommodationRequestRepository.delete(finalApproved);
    }

    @Test
    void testAccommodation_Scenario2_GirlsHostelOnlyFlow() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoUser = userRepository.findByUserId("AO001").orElseThrow();
        User boysAdmin = createOrGetHostelAdmin("ACC_BOYS_TEST", "Boys Hostel Admin", "Boys Hostel");
        User girlsAdmin = createOrGetHostelAdmin("ACC_GIRLS_TEST", "Girls Hostel Admin", "Girls Hostel");
        ensureTestRoom("GH-TEST-101", "Girls Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(27).toString();
        String outDate = java.time.LocalDate.now().plusDays(28).toString();

        AccommodationRequestDTO dto = AccommodationRequestDTO.builder()
                .hostel("Girls Hostel")
                .roomId("GH-TEST-101")
                .checkInDate(inDate)
                .checkOutDate(outDate)
                .guestsCount(1)
                .purpose("Guest Lecture by Female Scientist")
                .facultyOrGuestName("Dr. Shreya")
                .selectionMode("GIRLS")
                .build();

        // 1. Submit Request
        AccommodationRequest req = accommodationService.createRequest(dto, cseUser);
        assertNotNull(req);
        assertEquals("PENDING_AO_APPROVAL", req.getStatus());
        assertEquals("Girls Hostel", req.getHostel());

        // 2. Verify Girls Admin cannot see it before AO Approval
        List<AccommodationRequest> girlsAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, girlsAdmin);
        assertFalse(girlsAdminView.stream().anyMatch(r -> r.getRequestId().equals(req.getRequestId())),
                "Girls Admin must NOT see request while PENDING_AO_APPROVAL");

        // 3. AO Admin Forwards to Girls Hostel Admin
        AccommodationRequest aoApproved = accommodationService.aoForwardRequest(req.getRequestId(), "AO Forwarded for Girls", aoUser);
        assertEquals("FORWARDED_TO_GIRLS_ADMIN", aoApproved.getStatus());

        // 4. Verify Girls Admin can now see it, Boys Admin cannot
        girlsAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, girlsAdmin);
        assertTrue(girlsAdminView.stream().anyMatch(r -> r.getRequestId().equals(req.getRequestId())),
                "Girls Admin must receive request after AO Approval");

        List<AccommodationRequest> boysAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, boysAdmin);
        assertFalse(boysAdminView.stream().anyMatch(r -> r.getRequestId().equals(req.getRequestId())),
                "Boys Admin must NOT receive Girls Hostel request");

        // 5. Girls Admin Approves
        AccommodationRequest finalApproved = accommodationService.approveRequest(req.getRequestId(), girlsAdmin);
        assertEquals("APPROVED", finalApproved.getStatus());

        // Cleanup
        accommodationRequestRepository.delete(finalApproved);
    }

    @Test
    void testAccommodation_Scenario3_BothHostelsCreatesSeparateRequestsUnderParent() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        ensureTestRoom("BH-TEST-101", "Boys Hostel", "AC Room");
        ensureTestRoom("GH-TEST-101", "Girls Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(30).toString();
        String outDate = java.time.LocalDate.now().plusDays(31).toString();

        AccommodationRequestDTO boysDto = AccommodationRequestDTO.builder()
                .hostel("Boys Hostel")
                .roomId("BH-TEST-101")
                .checkInDate(inDate)
                .checkOutDate(outDate)
                .guestsCount(2)
                .purpose("Male Participants for Hackathon")
                .facultyOrGuestName("Male Delegate")
                .build();

        AccommodationRequestDTO girlsDto = AccommodationRequestDTO.builder()
                .hostel("Girls Hostel")
                .roomId("GH-TEST-101")
                .checkInDate(inDate)
                .checkOutDate(outDate)
                .guestsCount(2)
                .purpose("Female Participants for Hackathon")
                .facultyOrGuestName("Female Delegate")
                .build();

        AccommodationDualRequestDTO dualDto = AccommodationDualRequestDTO.builder()
                .selectionMode("BOTH")
                .boysRequest(boysDto)
                .girlsRequest(girlsDto)
                .build();

        java.util.Map<String, Object> result = accommodationService.createDualRequest(dualDto, cseUser);
        assertNotNull(result);
        String parentRequestId = (String) result.get("parentRequestId");
        assertNotNull(parentRequestId);
        assertTrue(parentRequestId.startsWith("ACC-PARENT-"));

        AccommodationRequest boysReq = (AccommodationRequest) result.get("boysRequest");
        AccommodationRequest girlsReq = (AccommodationRequest) result.get("girlsRequest");

        assertNotNull(boysReq);
        assertNotNull(girlsReq);
        assertNotEquals(boysReq.getRequestId(), girlsReq.getRequestId());

        assertEquals(parentRequestId, boysReq.getParentRequestId());
        assertEquals(parentRequestId, girlsReq.getParentRequestId());
        assertEquals("Boys Hostel", boysReq.getHostel());
        assertEquals("Girls Hostel", girlsReq.getHostel());
        assertEquals("PENDING_AO_APPROVAL", boysReq.getStatus());
        assertEquals("PENDING_AO_APPROVAL", girlsReq.getStatus());

        List<AccommodationRequest> children = accommodationRequestRepository.findByParentRequestId(parentRequestId);
        assertEquals(2, children.size(), "Must find exactly 2 separate requests under the parent request");

        // Cleanup
        accommodationRequestRepository.deleteAll(children);
    }

    @Test
    void testAccommodation_Scenario4_AOApprovesBoysAndRejectsGirls() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoUser = userRepository.findByUserId("AO001").orElseThrow();
        User boysAdmin = createOrGetHostelAdmin("ACC_BOYS_TEST", "Boys Hostel Admin", "Boys Hostel");
        User girlsAdmin = createOrGetHostelAdmin("ACC_GIRLS_TEST", "Girls Hostel Admin", "Girls Hostel");
        ensureTestRoom("BH-TEST-101", "Boys Hostel", "AC Room");
        ensureTestRoom("GH-TEST-101", "Girls Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(33).toString();
        String outDate = java.time.LocalDate.now().plusDays(34).toString();

        AccommodationDualRequestDTO dualDto = AccommodationDualRequestDTO.builder()
                .selectionMode("BOTH")
                .boysRequest(AccommodationRequestDTO.builder()
                        .roomId("BH-TEST-101").checkInDate(inDate).checkOutDate(outDate).guestsCount(1).purpose("Test Boys").facultyOrGuestName("Guest A").build())
                .girlsRequest(AccommodationRequestDTO.builder()
                        .roomId("GH-TEST-101").checkInDate(inDate).checkOutDate(outDate).guestsCount(1).purpose("Test Girls").facultyOrGuestName("Guest B").build())
                .build();

        java.util.Map<String, Object> result = accommodationService.createDualRequest(dualDto, cseUser);
        AccommodationRequest boysReq = (AccommodationRequest) result.get("boysRequest");
        AccommodationRequest girlsReq = (AccommodationRequest) result.get("girlsRequest");

        // AO Forwards Boys, Rejects Girls
        AccommodationRequest boysApproved = accommodationService.aoForwardRequest(boysReq.getRequestId(), "AO Allowed Boys", aoUser);
        AccommodationRequest girlsRejected = accommodationService.aoRejectRequest(girlsReq.getRequestId(), "AO Denied Girls due to maintenance", aoUser);

        assertEquals("FORWARDED_TO_BOYS_ADMIN", boysApproved.getStatus());
        assertEquals("AO_REJECTED", girlsRejected.getStatus());

        // Verify Boys reaches only Boys Admin
        List<AccommodationRequest> boysAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, boysAdmin);
        assertTrue(boysAdminView.stream().anyMatch(r -> r.getRequestId().equals(boysReq.getRequestId())),
                "Boys request must reach Boys Hostel Admin");

        // Verify Girls stops and does NOT reach Girls Admin
        List<AccommodationRequest> girlsAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, girlsAdmin);
        assertFalse(girlsAdminView.stream().anyMatch(r -> r.getRequestId().equals(girlsReq.getRequestId())),
                "Rejected Girls request must STOP and NOT reach Girls Hostel Admin");

        // Cleanup
        accommodationRequestRepository.delete(boysApproved);
        accommodationRequestRepository.delete(girlsRejected);
    }

    @Test
    void testAccommodation_Scenario5_AORejectsBoysAndApprovesGirls() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoUser = userRepository.findByUserId("AO001").orElseThrow();
        User boysAdmin = createOrGetHostelAdmin("ACC_BOYS_TEST", "Boys Hostel Admin", "Boys Hostel");
        User girlsAdmin = createOrGetHostelAdmin("ACC_GIRLS_TEST", "Girls Hostel Admin", "Girls Hostel");
        ensureTestRoom("BH-TEST-101", "Boys Hostel", "AC Room");
        ensureTestRoom("GH-TEST-101", "Girls Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(36).toString();
        String outDate = java.time.LocalDate.now().plusDays(37).toString();

        AccommodationDualRequestDTO dualDto = AccommodationDualRequestDTO.builder()
                .selectionMode("BOTH")
                .boysRequest(AccommodationRequestDTO.builder()
                        .roomId("BH-TEST-101").checkInDate(inDate).checkOutDate(outDate).guestsCount(1).purpose("Test Boys").facultyOrGuestName("Guest A").build())
                .girlsRequest(AccommodationRequestDTO.builder()
                        .roomId("GH-TEST-101").checkInDate(inDate).checkOutDate(outDate).guestsCount(1).purpose("Test Girls").facultyOrGuestName("Guest B").build())
                .build();

        java.util.Map<String, Object> result = accommodationService.createDualRequest(dualDto, cseUser);
        AccommodationRequest boysReq = (AccommodationRequest) result.get("boysRequest");
        AccommodationRequest girlsReq = (AccommodationRequest) result.get("girlsRequest");

        // AO Rejects Boys, Forwards Girls
        AccommodationRequest boysRejected = accommodationService.aoRejectRequest(boysReq.getRequestId(), "AO Denied Boys", aoUser);
        AccommodationRequest girlsApproved = accommodationService.aoForwardRequest(girlsReq.getRequestId(), "AO Allowed Girls", aoUser);

        assertEquals("AO_REJECTED", boysRejected.getStatus());
        assertEquals("FORWARDED_TO_GIRLS_ADMIN", girlsApproved.getStatus());

        // Verify Girls reaches Girls Admin
        List<AccommodationRequest> girlsAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, girlsAdmin);
        assertTrue(girlsAdminView.stream().anyMatch(r -> r.getRequestId().equals(girlsReq.getRequestId())),
                "Girls request must reach Girls Hostel Admin");

        // Verify Boys stops and does NOT reach Boys Admin
        List<AccommodationRequest> boysAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, boysAdmin);
        assertFalse(boysAdminView.stream().anyMatch(r -> r.getRequestId().equals(boysReq.getRequestId())),
                "Rejected Boys request must STOP and NOT reach Boys Hostel Admin");

        // Cleanup
        accommodationRequestRepository.delete(boysRejected);
        accommodationRequestRepository.delete(girlsApproved);
    }

    @Test
    void testAccommodation_Scenario6_AOApprovesBothReachesRespectiveAdmins() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoUser = userRepository.findByUserId("AO001").orElseThrow();
        User boysAdmin = createOrGetHostelAdmin("ACC_BOYS_TEST", "Boys Hostel Admin", "Boys Hostel");
        User girlsAdmin = createOrGetHostelAdmin("ACC_GIRLS_TEST", "Girls Hostel Admin", "Girls Hostel");
        ensureTestRoom("BH-TEST-101", "Boys Hostel", "AC Room");
        ensureTestRoom("GH-TEST-101", "Girls Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(39).toString();
        String outDate = java.time.LocalDate.now().plusDays(40).toString();

        AccommodationDualRequestDTO dualDto = AccommodationDualRequestDTO.builder()
                .selectionMode("BOTH")
                .boysRequest(AccommodationRequestDTO.builder()
                        .roomId("BH-TEST-101").checkInDate(inDate).checkOutDate(outDate).guestsCount(1).purpose("Test Boys").facultyOrGuestName("Guest A").build())
                .girlsRequest(AccommodationRequestDTO.builder()
                        .roomId("GH-TEST-101").checkInDate(inDate).checkOutDate(outDate).guestsCount(1).purpose("Test Girls").facultyOrGuestName("Guest B").build())
                .build();

        java.util.Map<String, Object> result = accommodationService.createDualRequest(dualDto, cseUser);
        AccommodationRequest boysReq = (AccommodationRequest) result.get("boysRequest");
        AccommodationRequest girlsReq = (AccommodationRequest) result.get("girlsRequest");

        // AO Forwards Both
        AccommodationRequest boysAO = accommodationService.aoForwardRequest(boysReq.getRequestId(), "AO Allowed Boys", aoUser);
        AccommodationRequest girlsAO = accommodationService.aoForwardRequest(girlsReq.getRequestId(), "AO Allowed Girls", aoUser);

        assertEquals("FORWARDED_TO_BOYS_ADMIN", boysAO.getStatus());
        assertEquals("FORWARDED_TO_GIRLS_ADMIN", girlsAO.getStatus());

        // Verify Boys reaches only Boys Admin
        List<AccommodationRequest> boysAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, boysAdmin);
        assertTrue(boysAdminView.stream().anyMatch(r -> r.getRequestId().equals(boysReq.getRequestId())));
        assertFalse(boysAdminView.stream().anyMatch(r -> r.getRequestId().equals(girlsReq.getRequestId())),
                "Boys Admin must NOT see Girls request");

        // Verify Girls reaches only Girls Admin
        List<AccommodationRequest> girlsAdminView = accommodationService.getAllRequests(null, null, null, null, null, null, girlsAdmin);
        assertTrue(girlsAdminView.stream().anyMatch(r -> r.getRequestId().equals(girlsReq.getRequestId())));
        assertFalse(girlsAdminView.stream().anyMatch(r -> r.getRequestId().equals(boysReq.getRequestId())),
                "Girls Admin must NOT see Boys request");

        // Level 2 approval by respective admins
        AccommodationRequest boysFinal = accommodationService.approveRequest(boysReq.getRequestId(), boysAdmin);
        AccommodationRequest girlsFinal = accommodationService.approveRequest(girlsReq.getRequestId(), girlsAdmin);

        assertEquals("APPROVED", boysFinal.getStatus());
        assertEquals("APPROVED", girlsFinal.getStatus());

        // Cleanup
        accommodationRequestRepository.delete(boysFinal);
        accommodationRequestRepository.delete(girlsFinal);
    }

    @Test
    void testAccommodation_Scenario7_ExistingSingleHostelRequestBackwardCompatible() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoUser = userRepository.findByUserId("AO001").orElseThrow();
        User boysAdmin = createOrGetHostelAdmin("ACC_BOYS_TEST", "Boys Hostel Admin", "Boys Hostel");
        ensureTestRoom("BH-TEST-101", "Boys Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(42).toString();
        String outDate = java.time.LocalDate.now().plusDays(43).toString();

        // Legacy format without selectionMode or parentRequestId
        AccommodationRequestDTO legacyDto = AccommodationRequestDTO.builder()
                .hostel("Boys Hostel")
                .roomType("AC Room")
                .roomId("BH-TEST-101")
                .checkInDate(inDate)
                .checkOutDate(outDate)
                .guestsCount(1)
                .purpose("Legacy Single Request Flow")
                .facultyOrGuestName("Legacy Guest")
                .build();

        AccommodationRequest created = accommodationService.createRequest(legacyDto, cseUser);
        assertNotNull(created);
        assertNull(created.getParentRequestId(), "Single request should have null parentRequestId");
        assertEquals("PENDING_AO_APPROVAL", created.getStatus());

        // Step 1: AO Admin forwards to Boys Hostel Admin
        AccommodationRequest aoApproved = accommodationService.aoForwardRequest(created.getRequestId(), "AO Allowed", aoUser);
        assertEquals("FORWARDED_TO_BOYS_ADMIN", aoApproved.getStatus());

        // Step 2: Boys Hostel Admin approves
        AccommodationRequest finalApproved = accommodationService.approveRequest(created.getRequestId(), boysAdmin);
        assertEquals("APPROVED", finalApproved.getStatus());

        // Cleanup
        accommodationRequestRepository.delete(finalApproved);
    }

    @Test
    void testAccommodation_Scenario8_AODirectApproveFlow() {
        User cseUser = userRepository.findByUserId("CSE001").orElseThrow();
        User aoUser = userRepository.findByUserId("AO001").orElseThrow();
        User boysAdmin = createOrGetHostelAdmin("ACC_BOYS_TEST", "Boys Hostel Admin", "Boys Hostel");
        User girlsAdmin = createOrGetHostelAdmin("ACC_GIRLS_TEST", "Girls Hostel Admin", "Girls Hostel");
        ensureTestRoom("BH-TEST-101", "Boys Hostel", "AC Room");

        String inDate = java.time.LocalDate.now().plusDays(45).toString();
        String outDate = java.time.LocalDate.now().plusDays(46).toString();

        AccommodationRequestDTO dto = AccommodationRequestDTO.builder()
                .hostel("Boys Hostel")
                .roomType("AC Room")
                .roomId("BH-TEST-101")
                .checkInDate(inDate)
                .checkOutDate(outDate)
                .guestsCount(1)
                .purpose("AO Direct Approve Flow")
                .facultyOrGuestName("VIP Guest")
                .build();

        AccommodationRequest created = accommodationService.createRequest(dto, cseUser);
        assertNotNull(created);
        assertEquals("PENDING_AO_APPROVAL", created.getStatus());

        // AO Admin directly approves request
        AccommodationRequest directApproved = accommodationService.aoDirectApproveRequest(created.getRequestId(), "VIP Direct Approval by AO", aoUser);
        assertNotNull(directApproved);
        assertEquals("APPROVED", directApproved.getStatus());
        assertEquals("DIRECT_APPROVE", directApproved.getAoAction());

        // Respective Hostel Admin should see it as already approved, cannot re-approve
        org.junit.jupiter.api.Assertions.assertThrows(com.nec.collegeservices.exception.BadRequestException.class, () -> {
            accommodationService.approveRequest(created.getRequestId(), boysAdmin);
        });

        // Cleanup
        accommodationRequestRepository.delete(directApproved);
    }
}
