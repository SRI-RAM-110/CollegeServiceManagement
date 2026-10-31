package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ResourceControllersTest {

    @Mock
    private SeminarService seminarService;
    @Mock
    private AccommodationService accommodationService;
    @Mock
    private TransportService transportService;
    @Mock
    private StationeryService stationeryService;
    @Mock
    private AuthService authService;

    @InjectMocks
    private SeminarController seminarController;
    @InjectMocks
    private AccommodationController accommodationController;
    @InjectMocks
    private TransportController transportController;
    @InjectMocks
    private StationeryController stationeryController;

    private User aoAdmin;

    @BeforeEach
    void setUp() {
        aoAdmin = User.builder().userId("AO001").roles(List.of("AO_ADMIN")).role("AO_ADMIN").build();
        when(authService.getCurrentUser()).thenReturn(aoAdmin);
    }

    @Test
    @DisplayName("SeminarController: active halls endpoint returns active halls")
    void testSeminarControllerActiveHalls() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-01").name("Seminar Hall 1").active(true).build();
        when(seminarService.getActiveHalls()).thenReturn(List.of(hall));

        ResponseEntity<ApiResponse<List<SeminarHall>>> response = seminarController.getActiveHalls();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getData().size());
        assertEquals("SH-01", response.getBody().getData().get(0).getHallId());
    }

    @Test
    @DisplayName("SeminarController: create, toggle, and delete hall")
    void testSeminarControllerCRUD() {
        SeminarHall hall = SeminarHall.builder().hallId("SH-10").name("New Hall").build();
        when(seminarService.createHall(any(SeminarHall.class), eq(aoAdmin))).thenReturn(hall);
        when(seminarService.toggleHallActive(eq("SH-10"), eq(aoAdmin))).thenReturn(hall);

        ResponseEntity<ApiResponse<SeminarHall>> createResp = seminarController.createHall(hall);
        assertEquals(HttpStatus.OK, createResp.getStatusCode());
        assertEquals("SH-10", createResp.getBody().getData().getHallId());

        ResponseEntity<ApiResponse<SeminarHall>> toggleResp = seminarController.toggleHallStatus("SH-10");
        assertEquals(HttpStatus.OK, toggleResp.getStatusCode());

        ResponseEntity<ApiResponse<Void>> deleteResp = seminarController.deleteHall("SH-10");
        assertEquals(HttpStatus.OK, deleteResp.getStatusCode());
        verify(seminarService, times(1)).deleteHall("SH-10", aoAdmin);
    }

    @Test
    @DisplayName("AccommodationController: active rooms and CRUD")
    void testAccommodationControllerCRUD() {
        AccommodationRoom room = AccommodationRoom.builder().roomId("GH-AC-10").hostel("Girls Hostel").build();
        when(accommodationService.getActiveRooms("Girls Hostel")).thenReturn(List.of(room));
        when(accommodationService.createRoom(any(AccommodationRoom.class), eq(aoAdmin))).thenReturn(room);

        ResponseEntity<ApiResponse<List<AccommodationRoom>>> listResp = accommodationController.getActiveRooms("Girls Hostel");
        assertEquals(HttpStatus.OK, listResp.getStatusCode());
        assertEquals(1, listResp.getBody().getData().size());

        ResponseEntity<ApiResponse<AccommodationRoom>> createResp = accommodationController.createRoom(room);
        assertEquals(HttpStatus.OK, createResp.getStatusCode());
        assertEquals("GH-AC-10", createResp.getBody().getData().getRoomId());

        ResponseEntity<ApiResponse<Void>> deleteResp = accommodationController.deleteRoom("GH-AC-10");
        assertEquals(HttpStatus.OK, deleteResp.getStatusCode());
        verify(accommodationService, times(1)).deleteRoom("GH-AC-10", aoAdmin);
    }

    @Test
    @DisplayName("TransportController: active vehicles and CRUD")
    void testTransportControllerCRUD() {
        Vehicle vehicle = Vehicle.builder().vehicleId("V-20").name("Bus 20").build();
        when(transportService.getActiveVehicles(null)).thenReturn(List.of(vehicle));
        when(transportService.addVehicle(any(Vehicle.class), eq(aoAdmin))).thenReturn(vehicle);

        ResponseEntity<ApiResponse<List<Vehicle>>> listResp = transportController.getActiveVehicles(null);
        assertEquals(HttpStatus.OK, listResp.getStatusCode());
        assertEquals(1, listResp.getBody().getData().size());

        ResponseEntity<ApiResponse<Vehicle>> createResp = transportController.addVehicle(vehicle);
        assertEquals(HttpStatus.OK, createResp.getStatusCode());
        assertEquals("V-20", createResp.getBody().getData().getVehicleId());

        ResponseEntity<ApiResponse<Void>> deleteResp = transportController.deleteVehicle("V-20");
        assertEquals(HttpStatus.OK, deleteResp.getStatusCode());
        verify(transportService, times(1)).deleteVehicle("V-20", aoAdmin);
    }

    @Test
    @DisplayName("StationeryController: active items and CRUD")
    void testStationeryControllerCRUD() {
        StationeryItem item = StationeryItem.builder().itemId("ST-50").name("Desk Organizer").build();
        when(stationeryService.getActiveItems()).thenReturn(List.of(item));
        when(stationeryService.createItem(any(StationeryItem.class), eq(aoAdmin))).thenReturn(item);

        ResponseEntity<ApiResponse<List<StationeryItem>>> listResp = stationeryController.getActiveItems();
        assertEquals(HttpStatus.OK, listResp.getStatusCode());
        assertEquals(1, listResp.getBody().getData().size());

        ResponseEntity<ApiResponse<StationeryItem>> createResp = stationeryController.createItem(item);
        assertEquals(HttpStatus.OK, createResp.getStatusCode());
        assertEquals("ST-50", createResp.getBody().getData().getItemId());

        ResponseEntity<ApiResponse<Void>> deleteResp = stationeryController.deleteItem("ST-50");
        assertEquals(HttpStatus.OK, deleteResp.getStatusCode());
        verify(stationeryService, times(1)).deleteItem("ST-50", aoAdmin);
    }
}
