package com.nec.collegeservices;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ResourceManagementIntegrationVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SeminarHallRepository hallRepository;

    @Autowired
    private AccommodationRoomRepository roomRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private StationeryItemRepository itemRepository;

    @Autowired
    private SeminarBookingRepository bookingRepository;

    @Autowired
    private AccommodationRequestRepository accommodationRequestRepository;

    @Autowired
    private TransportRequestRepository transportRequestRepository;

    @Autowired
    private StationeryRequestRepository stationeryRequestRepository;

    @BeforeEach
    void setUpTestUsers() {
        saveOrUpdateUser("ao_user", "AO_ADMIN", List.of("AO_ADMIN"));
        saveOrUpdateUser("creator_user", "CREATOR", List.of("CREATOR"));
        saveOrUpdateUser("mod_user", "SEMINAR_ADMIN", List.of("SEMINAR_ADMIN", "TRANSPORT_ADMIN", "DEPARTMENT_USER"));
        saveOrUpdateUser("super_ao_user", "AO_ADMIN", List.of("AO_ADMIN", "CREATOR"));
        saveOrUpdateUser("ao_seminar_admin", "AO_ADMIN", List.of("AO_ADMIN", "SEMINAR_ADMIN"));
        saveOrUpdateUser("creator_seminar_user", "CREATOR", List.of("CREATOR", "SEMINAR_ADMIN"));
    }

    private void saveOrUpdateUser(String userId, String role, List<String> roles) {
        User u = userRepository.findByUserId(userId).orElse(new User());
        u.setUserId(userId);
        u.setEmail(userId + "@nrtec.edu");
        u.setRole(role);
        u.setRoles(roles);
        u.setActive(true);
        userRepository.save(u);
    }

    // =========================================================================
    // 1. AUTHORIZATION CONSISTENCY ACROSS ROLES & MULTI-ROLE COMBINATIONS
    // =========================================================================

    @Test
    @DisplayName("Auth: AO_ADMIN alone has full access to all resource management endpoints")
    @WithMockUser(username = "ao_user", roles = {"AO_ADMIN"})
    void testAOAdminHasAccess() throws Exception {
        mockMvc.perform(get("/api/seminar/halls/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/accommodation/rooms/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport/vehicles/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/stationery/items/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Auth: CREATOR alone is denied (HTTP 403) from resource management endpoints")
    @WithMockUser(username = "creator_user", roles = {"CREATOR"})
    void testCreatorAloneIsDenied() throws Exception {
        mockMvc.perform(get("/api/seminar/halls/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/accommodation/rooms/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/transport/vehicles/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/stationery/items/all"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Auth: Module administrators and department users are denied (HTTP 403)")
    @WithMockUser(username = "mod_user", roles = {"SEMINAR_ADMIN", "TRANSPORT_ADMIN", "DEPARTMENT_USER"})
    void testModuleAdminAndDeptUserDenied() throws Exception {
        mockMvc.perform(get("/api/seminar/halls/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/accommodation/rooms/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/transport/vehicles/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/stationery/items/all"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Auth: Multi-role user with AO_ADMIN and CREATOR has access (AO_ADMIN takes precedence)")
    @WithMockUser(username = "super_ao_user", roles = {"AO_ADMIN", "CREATOR"})
    void testMultiRoleAOAdminAndCreatorHasAccess() throws Exception {
        mockMvc.perform(get("/api/seminar/halls/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/accommodation/rooms/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport/vehicles/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/stationery/items/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Auth: Multi-role user with AO_ADMIN and SEMINAR_ADMIN has access")
    @WithMockUser(username = "ao_seminar_admin", roles = {"AO_ADMIN", "SEMINAR_ADMIN"})
    void testMultiRoleAOAdminAndSeminarAdminHasAccess() throws Exception {
        mockMvc.perform(get("/api/seminar/halls/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/accommodation/rooms/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport/vehicles/all"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/stationery/items/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Auth: Multi-role user with CREATOR and SEMINAR_ADMIN without AO_ADMIN is denied (HTTP 403)")
    @WithMockUser(username = "creator_seminar_user", roles = {"CREATOR", "SEMINAR_ADMIN"})
    void testMultiRoleCreatorAndSeminarAdminWithoutAOAdminIsDenied() throws Exception {
        mockMvc.perform(get("/api/seminar/halls/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/accommodation/rooms/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/transport/vehicles/all"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/stationery/items/all"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 2. SEMINAR HALLS CRUD & PERSISTENCE
    // =========================================================================

    @Test
    @DisplayName("Seminar Halls: Create, Edit, Toggle Active, and Query persistence")
    @WithMockUser(username = "ao_user", roles = {"AO_ADMIN"})
    void testSeminarHallLifecycle() throws Exception {
        String hallId = "TEST-SH-99";
        hallRepository.deleteById(hallId);

        // 1. Create Hall
        SeminarHall hall = SeminarHall.builder()
                .hallId(hallId)
                .name("Test Innovation Auditorium")
                .location("Block 5 - 4th Floor")
                .capacity(450)
                .status("Available")
                .active(true)
                .coordinatorUserIds(List.of("coord_test1"))
                .ccEmails(List.of("test@nrtec.ac.in"))
                .build();

        mockMvc.perform(post("/api/seminar/halls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(hall)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hallId").value(hallId))
                .andExpect(jsonPath("$.data.name").value("Test Innovation Auditorium"))
                .andExpect(jsonPath("$.data.active").value(true));

        // 2. Edit Hall
        hall.setName("Test Innovation Auditorium Updated");
        hall.setCapacity(500);
        mockMvc.perform(put("/api/seminar/halls/" + hallId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(hall)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Test Innovation Auditorium Updated"))
                .andExpect(jsonPath("$.data.capacity").value(500));

        // 3. Toggle Active -> Inactive
        mockMvc.perform(patch("/api/seminar/halls/" + hallId + "/toggle-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        // 4. Verify Active filter excludes inactive hall
        mockMvc.perform(get("/api/seminar/halls/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.hallId == '" + hallId + "')]").doesNotExist());

        // 5. Toggle Inactive -> Active
        mockMvc.perform(patch("/api/seminar/halls/" + hallId + "/toggle-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(true));

        // 6. Clean up: Delete hall
        mockMvc.perform(delete("/api/seminar/halls/" + hallId))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 3. ACCOMMODATION ROOMS CRUD & PERSISTENCE
    // =========================================================================

    @Test
    @DisplayName("Accommodation Rooms: Create, Edit, Toggle Active, and Query persistence")
    @WithMockUser(username = "ao_user", roles = {"AO_ADMIN"})
    void testAccommodationRoomLifecycle() throws Exception {
        String roomId = "TEST-GH-88";
        roomRepository.deleteById(roomId);

        // 1. Create Room
        AccommodationRoom room = AccommodationRoom.builder()
                .roomId(roomId)
                .hostel("Girls Hostel")
                .roomType("VIP Suite")
                .capacity(3)
                .status("Available")
                .active(true)
                .build();

        mockMvc.perform(post("/api/accommodation/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(room)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomId").value(roomId))
                .andExpect(jsonPath("$.data.hostel").value("Girls Hostel"))
                .andExpect(jsonPath("$.data.active").value(true));

        // 2. Edit Room
        room.setRoomType("Deluxe VIP Suite");
        room.setStatus("Maintenance");
        mockMvc.perform(put("/api/accommodation/rooms/" + roomId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(room)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomType").value("Deluxe VIP Suite"))
                .andExpect(jsonPath("$.data.status").value("Maintenance"));

        // 3. Toggle Active -> Inactive
        mockMvc.perform(patch("/api/accommodation/rooms/" + roomId + "/toggle-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        // 4. Clean up: Delete room
        mockMvc.perform(delete("/api/accommodation/rooms/" + roomId))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 4. TRANSPORT VEHICLES CRUD & PERSISTENCE
    // =========================================================================

    @Test
    @DisplayName("Transport Vehicles: Add, Edit, Toggle Active, and Query persistence")
    @WithMockUser(username = "ao_user", roles = {"AO_ADMIN"})
    void testTransportVehicleLifecycle() throws Exception {
        String vehicleId = "TEST-V-77";
        vehicleRepository.deleteById(vehicleId);

        // 1. Add Vehicle
        Vehicle vehicle = Vehicle.builder()
                .vehicleId(vehicleId)
                .name("Test Campus Shuttle")
                .type("Minibus")
                .registrationNumber("AP39 TT 7777")
                .capacity(25)
                .driverName("Suresh Babu")
                .driverPhone("9876543210")
                .status("AVAILABLE")
                .active(true)
                .build();

        mockMvc.perform(post("/api/transport/vehicles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(vehicle)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vehicleId").value(vehicleId))
                .andExpect(jsonPath("$.data.name").value("Test Campus Shuttle"))
                .andExpect(jsonPath("$.data.active").value(true));

        // 2. Edit Vehicle
        vehicle.setName("Test Campus Shuttle Express");
        vehicle.setStatus("MAINTENANCE");
        mockMvc.perform(put("/api/transport/vehicles/" + vehicleId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(vehicle)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Test Campus Shuttle Express"))
                .andExpect(jsonPath("$.data.status").value("MAINTENANCE"));

        // 3. Toggle Active -> Inactive
        mockMvc.perform(patch("/api/transport/vehicles/" + vehicleId + "/toggle-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        // 4. Clean up: Delete vehicle
        mockMvc.perform(delete("/api/transport/vehicles/" + vehicleId))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 5. STATIONERY ITEMS CRUD & PERSISTENCE (NO STOCK / INVENTORY)
    // =========================================================================

    @Test
    @DisplayName("Stationery Catalog: Create, Edit, Toggle Active, and Query persistence")
    @WithMockUser(username = "ao_user", roles = {"AO_ADMIN"})
    void testStationeryItemLifecycle() throws Exception {
        String itemId = "TEST-ST-66";
        itemRepository.deleteById(itemId);

        // 1. Create Item
        StationeryItem item = StationeryItem.builder()
                .itemId(itemId)
                .name("Test Graph Notebooks (Pack of 5)")
                .category("Paper")
                .unit("packs")
                .description("A4 size 80 GSM grid graph sheets for lab submissions")
                .active(true)
                .build();

        mockMvc.perform(post("/api/stationery/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(item)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.itemId").value(itemId))
                .andExpect(jsonPath("$.data.name").value("Test Graph Notebooks (Pack of 5)"))
                .andExpect(jsonPath("$.data.active").value(true));

        // 2. Edit Item
        item.setName("Test Graph Notebooks (Pack of 10)");
        item.setUnit("box");
        mockMvc.perform(put("/api/stationery/items/" + itemId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(item)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Test Graph Notebooks (Pack of 10)"))
                .andExpect(jsonPath("$.data.unit").value("box"));

        // 3. Toggle Active -> Inactive
        mockMvc.perform(patch("/api/stationery/items/" + itemId + "/toggle-active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        // 4. Clean up: Delete item
        mockMvc.perform(delete("/api/stationery/items/" + itemId))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 6. SAFE-DELETE REFERENTIAL INTEGRITY PROTECTION
    // =========================================================================

    @Test
    @DisplayName("Safe Delete: Hall with existing booking cannot be deleted (HTTP 400 Bad Request)")
    @WithMockUser(username = "ao_user", roles = {"AO_ADMIN"})
    void testSafeDeleteReferencedHallBlocked() throws Exception {
        // Seed a temporary hall and a temporary booking referencing it
        String hallId = "REF-SH-01";
        hallRepository.findByHallIdIgnoreCase(hallId).ifPresent(hallRepository::delete);
        bookingRepository.findByBookingId("BK-REF-99").ifPresent(bookingRepository::delete);

        hallRepository.save(SeminarHall.builder().hallId(hallId).name("Referenced Hall").active(true).build());
        bookingRepository.save(SeminarBooking.builder().bookingId("BK-REF-99").hallId(hallId).eventTitle("Symposium").build());

        try {
            mockMvc.perform(delete("/api/seminar/halls/" + hallId))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("historical booking records exist")));
        } finally {
            bookingRepository.findByBookingId("BK-REF-99").ifPresent(bookingRepository::delete);
            hallRepository.findByHallIdIgnoreCase(hallId).ifPresent(hallRepository::delete);
        }
    }
}
