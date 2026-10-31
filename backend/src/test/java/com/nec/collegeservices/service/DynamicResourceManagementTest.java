package com.nec.collegeservices.service;

import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class DynamicResourceManagementTest {

    // Seminar Mocks
    @Mock
    private SeminarHallRepository hallRepository;
    @Mock
    private SeminarBookingRepository bookingRepository;
    @InjectMocks
    private SeminarService seminarService;

    // Accommodation Mocks
    @Mock
    private AccommodationRoomRepository roomRepository;
    @Mock
    private AccommodationRequestRepository requestRepository;
    @InjectMocks
    private AccommodationService accommodationService;

    // Transport Mocks
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private TransportRequestRepository transportRequestRepository;
    @InjectMocks
    private TransportService transportService;

    // Stationery Mocks
    @Mock
    private StationeryItemRepository itemRepository;
    @Mock
    private StationeryRequestRepository stationeryRequestRepository;
    @InjectMocks
    private StationeryService stationeryService;

    private User aoAdmin;
    private User creatorUser;
    private User seminarAdmin;
    private User accommodationAdmin;
    private User transportAdmin;
    private User stationeryAdmin;
    private User departmentUser;

    @BeforeEach
    void setUp() {
        aoAdmin = User.builder().userId("AO001").roles(List.of("AO_ADMIN")).role("AO_ADMIN").department("ADMIN")
                .build();
        creatorUser = User.builder().userId("CREATOR001").roles(List.of("CREATOR")).role("CREATOR").department("ADMIN")
                .build();
        seminarAdmin = User.builder().userId("SA001").roles(List.of("SEMINAR_ADMIN")).role("SEMINAR_ADMIN")
                .department("ADMIN").build();
        accommodationAdmin = User.builder().userId("AA001").roles(List.of("ACCOMMODATION_ADMIN"))
                .role("ACCOMMODATION_ADMIN").department("ADMIN").build();
        transportAdmin = User.builder().userId("TA001").roles(List.of("TRANSPORT_ADMIN")).role("TRANSPORT_ADMIN")
                .department("ADMIN").build();
        stationeryAdmin = User.builder().userId("STA001").roles(List.of("STATIONERY_ADMIN")).role("STATIONERY_ADMIN")
                .department("ADMIN").build();
        departmentUser = User.builder().userId("DEPT001").roles(List.of("DEPARTMENT_USER")).role("DEPARTMENT_USER")
                .department("CSE").build();

        when(hallRepository.save(any(SeminarHall.class))).thenAnswer(i -> i.getArgument(0));
        when(roomRepository.save(any(AccommodationRoom.class))).thenAnswer(i -> i.getArgument(0));
        when(vehicleRepository.save(any(Vehicle.class))).thenAnswer(i -> i.getArgument(0));
        when(itemRepository.save(any(StationeryItem.class))).thenAnswer(i -> i.getArgument(0));
    }

    // ==========================================
    // 1. SEMINAR HALLS
    // ==========================================

    @Test
    @DisplayName("Seminar: AO_ADMIN can create hall with valid fields and audit metadata")
    void testCreateSeminarHallByAOAdmin() {
        SeminarHall hall = SeminarHall.builder()
                .hallId("SH-07")
                .name("New Auditorium")
                .capacity(500)
                .location("Block 4 - 3rd Floor")
                .build();

        when(hallRepository.existsByHallIdIgnoreCase("SH-07")).thenReturn(false);
        when(hallRepository.existsByNameIgnoreCase("New Auditorium")).thenReturn(false);

        SeminarHall created = seminarService.createHall(hall, aoAdmin);
        assertNotNull(created);
        assertEquals("SH-07", created.getHallId());
        assertTrue(created.isActive());
        assertEquals("AO001", created.getCreatedBy());
        assertNotNull(created.getCreatedAt());
        verify(hallRepository, times(1)).save(any(SeminarHall.class));
    }

    @Test
    @DisplayName("Seminar: Non-AO_ADMIN (e.g. CREATOR, SEMINAR_ADMIN, DEPARTMENT_USER) receives AccessDeniedException on create")
    void testCreateSeminarHallByUnauthorizedRolesThrows403() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-07").name("New Auditorium").build();

        assertThrows(AccessDeniedException.class, () -> seminarService.createHall(hall, creatorUser));
        assertThrows(AccessDeniedException.class, () -> seminarService.createHall(hall, seminarAdmin));
        assertThrows(AccessDeniedException.class, () -> seminarService.createHall(hall, departmentUser));
        assertThrows(AccessDeniedException.class, () -> seminarService.createHall(hall, null));
    }

    @Test
    @DisplayName("Seminar: CREATOR cannot create, update, toggle, delete halls or assign coordinators (403 Forbidden)")
    void testCreatorCannotManageSeminarHalls() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-99").name("Temp Hall").build();
        when(hallRepository.findByHallIdIgnoreCase("SH-99")).thenReturn(Optional.of(hall));

        assertThrows(AccessDeniedException.class, () -> seminarService.createHall(hall, creatorUser));
        assertThrows(AccessDeniedException.class, () -> seminarService.updateHall("SH-99", hall, creatorUser));
        assertThrows(AccessDeniedException.class, () -> seminarService.toggleHallActive("SH-99", creatorUser));
        assertThrows(AccessDeniedException.class, () -> seminarService.deleteHall("SH-99", creatorUser));
        assertThrows(AccessDeniedException.class,
                () -> seminarService.assignCoordinators("SH-99", List.of("C1"), creatorUser));
        assertThrows(AccessDeniedException.class,
                () -> seminarService.updateHallCcEmails("SH-99", List.of("test@nrtec.ac.in"), creatorUser));
    }

    @Test
    @DisplayName("Seminar: Duplicate hallId or name throws ConflictException")
    void testCreateSeminarHallDuplicateValidation() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-01").name("Duplicate Hall").build();
        when(hallRepository.existsByHallIdIgnoreCase("SH-01")).thenReturn(true);

        assertThrows(ConflictException.class, () -> seminarService.createHall(hall, aoAdmin));

        SeminarHall hall2 = SeminarHall.builder().hallId("SH-08").name("Seminar Hall 1").build();
        when(hallRepository.existsByHallIdIgnoreCase("SH-08")).thenReturn(false);
        when(hallRepository.existsByNameIgnoreCase("Seminar Hall 1")).thenReturn(true);

        assertThrows(ConflictException.class, () -> seminarService.createHall(hall2, aoAdmin));
    }

    @Test
    @DisplayName("Seminar: Delete fails with BadRequestException if historical bookings exist")
    void testDeleteSeminarHallReferencedFails() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-01").name("Seminar Hall 1").build();
        when(hallRepository.findByHallIdIgnoreCase("SH-01")).thenReturn(Optional.of(hall));
        when(bookingRepository.existsByHallId("SH-01")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> seminarService.deleteHall("SH-01", aoAdmin));
        assertTrue(ex.getMessage().contains("historical booking records exist"));
        verify(hallRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Seminar: Delete succeeds when no historical bookings exist")
    void testDeleteSeminarHallWithoutBookingsSucceeds() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-99").name("Temporary Hall").build();
        when(hallRepository.findByHallIdIgnoreCase("SH-99")).thenReturn(Optional.of(hall));
        when(bookingRepository.existsByHallId("SH-99")).thenReturn(false);
        when(bookingRepository.existsByHallIdIn(anyList())).thenReturn(false);

        seminarService.deleteHall("SH-99", aoAdmin);
        verify(hallRepository, times(1)).delete(hall);
    }

    @Test
    @DisplayName("Seminar: Dynamic lookup finds hall by name or ID case-insensitively")
    void testDynamicHallLookup() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-02").name("Seminar Hall 2").build();
        when(hallRepository.findByHallIdIgnoreCase("sh-02")).thenReturn(Optional.of(hall));
        when(hallRepository.findByNameIgnoreCase("seminar hall 2")).thenReturn(Optional.of(hall));

        Optional<SeminarHall> byId = seminarService.getHallById("sh-02");
        assertTrue(byId.isPresent());
        assertEquals("SH-02", byId.get().getHallId());

        Optional<SeminarHall> byName = seminarService.getHallById("seminar hall 2");
        assertTrue(byName.isPresent());
        assertEquals("Seminar Hall 2", byName.get().getName());
    }

    // ==========================================
    // 2. ACCOMMODATION ROOMS
    // ==========================================

    @Test
    @DisplayName("Accommodation: AO_ADMIN can create room; non-AO receives 403")
    void testAccommodationRoomAuthorization() {
        AccommodationRoom room = AccommodationRoom.builder()
                .roomId("GH-AC-05")
                .hostel("Girls Hostel")
                .roomType("AC Room")
                .capacity(2)
                .build();

        when(roomRepository.existsByRoomIdIgnoreCase("GH-AC-05")).thenReturn(false);

        AccommodationRoom created = accommodationService.createRoom(room, aoAdmin);
        assertNotNull(created);
        assertEquals("GH-AC-05", created.getRoomId());
        assertEquals("AO001", created.getCreatedBy());

        // Non-AO admin (e.g. ACCOMMODATION_ADMIN) must be rejected with 403
        assertThrows(AccessDeniedException.class, () -> accommodationService.createRoom(room, accommodationAdmin));
        assertThrows(AccessDeniedException.class, () -> accommodationService.createRoom(room, creatorUser));
        assertThrows(AccessDeniedException.class, () -> accommodationService.createRoom(room, departmentUser));
    }

    @Test
    @DisplayName("Accommodation: CREATOR cannot create, update, toggle, or delete rooms (403 Forbidden)")
    void testCreatorCannotManageAccommodationRooms() {
        AccommodationRoom room = AccommodationRoom.builder().roomId("GH-AC-99").hostel("Girls Hostel").build();
        when(roomRepository.findByRoomIdIgnoreCase("GH-AC-99")).thenReturn(Optional.of(room));

        assertThrows(AccessDeniedException.class, () -> accommodationService.createRoom(room, creatorUser));
        assertThrows(AccessDeniedException.class, () -> accommodationService.updateRoom("GH-AC-99", room, creatorUser));
        assertThrows(AccessDeniedException.class, () -> accommodationService.toggleRoomActive("GH-AC-99", creatorUser));
        assertThrows(AccessDeniedException.class,
                () -> accommodationService.updateRoomStatus("GH-AC-99", "Maintenance", creatorUser));
        assertThrows(AccessDeniedException.class, () -> accommodationService.deleteRoom("GH-AC-99", creatorUser));
    }

    @Test
    @DisplayName("Accommodation: Delete room fails if historical request records exist")
    void testDeleteAccommodationRoomReferencedFails() {
        AccommodationRoom room = AccommodationRoom.builder().roomId("GH-AC-1").hostel("Girls Hostel").build();
        when(roomRepository.findByRoomIdIgnoreCase("GH-AC-1")).thenReturn(Optional.of(room));
        when(requestRepository.existsByRoomId("GH-AC-1")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> accommodationService.deleteRoom("GH-AC-1", aoAdmin));
        assertTrue(ex.getMessage().contains("historical request records reference it"));
        verify(roomRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Accommodation: Active rooms filter respects active flag and status")
    void testAccommodationActiveRoomsFilter() {
        AccommodationRoom activeRoom = AccommodationRoom.builder().roomId("R1").hostel("Girls Hostel").active(true)
                .status("Available").build();
        AccommodationRoom inactiveRoom = AccommodationRoom.builder().roomId("R2").hostel("Girls Hostel").active(false)
                .status("Available").build();

        when(roomRepository.findByHostel("Girls Hostel")).thenReturn(List.of(activeRoom, inactiveRoom));

        List<AccommodationRoom> activeList = accommodationService.getActiveRooms("Girls Hostel");
        assertEquals(1, activeList.size());
        assertEquals("R1", activeList.get(0).getRoomId());
    }

    // ==========================================
    // 3. TRANSPORT VEHICLES
    // ==========================================

    @Test
    @DisplayName("Transport: AO_ADMIN can add vehicle; TRANSPORT_ADMIN receives 403")
    void testTransportVehicleAuthorization() {
        Vehicle vehicle = Vehicle.builder()
                .vehicleId("V-10")
                .name("College Bus 10")
                .type("College Bus")
                .registrationNumber("AP39 AB 9999")
                .capacity(50)
                .build();

        when(vehicleRepository.existsByVehicleIdIgnoreCase("V-10")).thenReturn(false);
        when(vehicleRepository.existsByRegistrationNumberIgnoreCase("AP39 AB 9999")).thenReturn(false);

        Vehicle created = transportService.addVehicle(vehicle, aoAdmin);
        assertNotNull(created);
        assertEquals("V-10", created.getVehicleId());
        assertEquals("AO001", created.getCreatedBy());

        // TRANSPORT_ADMIN and CREATOR must be rejected with 403
        assertThrows(AccessDeniedException.class, () -> transportService.addVehicle(vehicle, creatorUser));
        assertThrows(AccessDeniedException.class, () -> transportService.addVehicle(vehicle, transportAdmin));
        assertThrows(AccessDeniedException.class, () -> transportService.addVehicle(vehicle, departmentUser));
    }

    @Test
    @DisplayName("Transport: CREATOR cannot add, update, toggle, or delete vehicles (403 Forbidden)")
    void testCreatorCannotManageVehicles() {
        Vehicle vehicle = Vehicle.builder().vehicleId("V-99").name("Temp Van").build();
        when(vehicleRepository.findByVehicleIdIgnoreCase("V-99")).thenReturn(Optional.of(vehicle));

        assertThrows(AccessDeniedException.class, () -> transportService.addVehicle(vehicle, creatorUser));
        assertThrows(AccessDeniedException.class, () -> transportService.updateVehicle("V-99", vehicle, creatorUser));
        assertThrows(AccessDeniedException.class,
                () -> transportService.updateVehicleStatus("V-99", "MAINTENANCE", creatorUser));
        assertThrows(AccessDeniedException.class, () -> transportService.toggleVehicleActive("V-99", creatorUser));
        assertThrows(AccessDeniedException.class, () -> transportService.deleteVehicle("V-99", creatorUser));
    }

    @Test
    @DisplayName("Transport: Duplicate registration number throws ConflictException")
    void testTransportDuplicateRegistration() {
        Vehicle vehicle = Vehicle.builder()
                .vehicleId("V-11")
                .name("College Bus 11")
                .registrationNumber("AP39 AB 1234")
                .build();

        when(vehicleRepository.existsByVehicleIdIgnoreCase("V-11")).thenReturn(false);
        when(vehicleRepository.existsByRegistrationNumberIgnoreCase("AP39 AB 1234")).thenReturn(true);

        assertThrows(ConflictException.class, () -> transportService.addVehicle(vehicle, aoAdmin));
    }

    @Test
    @DisplayName("Transport: Delete vehicle fails if historical transport requests exist")
    void testDeleteVehicleReferencedFails() {
        Vehicle vehicle = Vehicle.builder().vehicleId("V-01").name("College Bus 1").build();
        when(vehicleRepository.findByVehicleIdIgnoreCase("V-01")).thenReturn(Optional.of(vehicle));
        when(transportRequestRepository.existsByVehicleId("V-01")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> transportService.deleteVehicle("V-01", aoAdmin));
        assertTrue(ex.getMessage().contains("historical transport requests exist"));
        verify(vehicleRepository, never()).delete(any());
    }

    // ==========================================
    // 4. STATIONERY ITEMS (STRICTLY REQUEST-ONLY)
    // ==========================================

    @Test
    @DisplayName("Stationery: AO_ADMIN can create item; STATIONERY_ADMIN receives 403")
    void testStationeryItemAuthorization() {
        StationeryItem item = StationeryItem.builder()
                .itemId("ST-09")
                .name("Highlighter Set (5 colors)")
                .category("Writing")
                .unit("packs")
                .build();

        when(itemRepository.existsByItemIdIgnoreCase("ST-09")).thenReturn(false);
        when(itemRepository.existsByNameIgnoreCase("Highlighter Set (5 colors)")).thenReturn(false);

        StationeryItem created = stationeryService.createItem(item, aoAdmin);
        assertNotNull(created);
        assertEquals("ST-09", created.getItemId());
        assertEquals("AO001", created.getCreatedBy());

        // STATIONERY_ADMIN and CREATOR must be rejected with 403
        assertThrows(AccessDeniedException.class, () -> stationeryService.createItem(item, creatorUser));
        assertThrows(AccessDeniedException.class, () -> stationeryService.createItem(item, stationeryAdmin));
        assertThrows(AccessDeniedException.class, () -> stationeryService.createItem(item, departmentUser));
    }

    @Test
    @DisplayName("Stationery: CREATOR cannot create, update, toggle, or delete items (403 Forbidden)")
    void testCreatorCannotManageStationeryItems() {
        StationeryItem item = StationeryItem.builder().itemId("ST-99").name("Temp Pen").build();
        when(itemRepository.findByItemIdIgnoreCase("ST-99")).thenReturn(Optional.of(item));

        assertThrows(AccessDeniedException.class, () -> stationeryService.createItem(item, creatorUser));
        assertThrows(AccessDeniedException.class, () -> stationeryService.updateItem("ST-99", item, creatorUser));
        assertThrows(AccessDeniedException.class, () -> stationeryService.toggleItemActive("ST-99", creatorUser));
        assertThrows(AccessDeniedException.class, () -> stationeryService.deleteItem("ST-99", creatorUser));
    }

    @Test
    @DisplayName("Stationery: Delete fails if historical requisition requests reference the item")
    void testDeleteStationeryItemReferencedFails() {
        StationeryItem item = StationeryItem.builder().itemId("ST-01").name("A4 Paper").build();
        when(itemRepository.findByItemIdIgnoreCase("ST-01")).thenReturn(Optional.of(item));
        when(stationeryRequestRepository.existsByItemsRequestedItemId("ST-01")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> stationeryService.deleteItem("ST-01", aoAdmin));
        assertTrue(ex.getMessage().contains("historical requisition requests reference it"));
        verify(itemRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Stationery: Duplicate item name or ID throws ConflictException")
    void testStationeryDuplicateValidation() {
        StationeryItem item = StationeryItem.builder().itemId("ST-01").name("A4 Paper").build();
        when(itemRepository.existsByItemIdIgnoreCase("ST-01")).thenReturn(true);

        assertThrows(ConflictException.class, () -> stationeryService.createItem(item, aoAdmin));

        StationeryItem item2 = StationeryItem.builder().itemId("ST-99").name("A4 Paper").build();
        when(itemRepository.existsByItemIdIgnoreCase("ST-99")).thenReturn(false);
        when(itemRepository.existsByNameIgnoreCase("A4 Paper")).thenReturn(true);

        assertThrows(ConflictException.class, () -> stationeryService.createItem(item2, aoAdmin));
    }
}
