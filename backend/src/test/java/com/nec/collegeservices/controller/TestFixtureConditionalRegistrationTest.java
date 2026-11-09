package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.AccommodationRequestDTO;
import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.SeminarBookingRequestDTO;
import com.nec.collegeservices.model.AccommodationRequest;
import com.nec.collegeservices.model.AccommodationRoom;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AccommodationService;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.SeminarService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TestFixtureConditionalRegistrationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(TestFixtureController.class);

    @Test
    @DisplayName("Property Absent: TestFixtureController is NOT registered by default")
    void testFixtureController_absentProperty_notRegistered() {
        contextRunner.run(context -> {
            assertThat(context).doesNotHaveBean(TestFixtureController.class);
        });
    }

    @Test
    @DisplayName("Property False: TestFixtureController is NOT registered when explicitly disabled")
    void testFixtureController_falseProperty_notRegistered() {
        contextRunner.withPropertyValues("app.test-fixtures.enabled=false").run(context -> {
            assertThat(context).doesNotHaveBean(TestFixtureController.class);
        });
    }

    @Test
    @DisplayName("Property True: TestFixtureController is registered when explicitly enabled")
    void testFixtureController_trueProperty_registered() {
        contextRunner.withPropertyValues("app.test-fixtures.enabled=true").run(context -> {
            assertThat(context).hasSingleBean(TestFixtureController.class);
        });
    }

    @Test
    @DisplayName("Security: PreAuthorize annotations require CREATOR or AO_ADMIN on both endpoints")
    void testPreAuthorizeAnnotations_enforcedOnEndpoints() throws NoSuchMethodException {
        Method seminarMethod = TestFixtureController.class.getMethod(
                "createPendingSeminarBookingTestFixture", SeminarBookingRequestDTO.class);
        PreAuthorize seminarAuth = seminarMethod.getAnnotation(PreAuthorize.class);
        assertNotNull(seminarAuth);
        assertEquals("hasAnyRole('CREATOR', 'AO_ADMIN')", seminarAuth.value());

        Method accMethod = TestFixtureController.class.getMethod(
                "createPendingAccommodationBookingTestFixture", AccommodationRequestDTO.class);
        PreAuthorize accAuth = accMethod.getAnnotation(PreAuthorize.class);
        assertNotNull(accAuth);
        assertEquals("hasAnyRole('CREATOR', 'AO_ADMIN')", accAuth.value());
    }

    @Test
    @DisplayName("Execution When Enabled: Non-admin invocation triggers AccessDeniedException")
    void testNonAdminInvocation_denied() {
        AuthService authService = mock(AuthService.class);
        SeminarService seminarService = mock(SeminarService.class);
        AccommodationService accommodationService = mock(AccommodationService.class);

        TestFixtureController controller = new TestFixtureController(seminarService, accommodationService, authService);

        User normalFaculty = User.builder()
                .userId("CSE001")
                .role("DEPARTMENT_USER")
                .roles(List.of("DEPARTMENT_USER"))
                .department("CSE")
                .build();
        when(authService.getCurrentUser()).thenReturn(normalFaculty);
        when(seminarService.createPendingBookingTestFixture(any(), eq(normalFaculty)))
                .thenThrow(new AccessDeniedException("Only Administrator can invoke test fixture."));

        assertThrows(AccessDeniedException.class, () ->
                controller.createPendingSeminarBookingTestFixture(new SeminarBookingRequestDTO()));
    }

    @Test
    @DisplayName("Execution When Enabled: AO_ADMIN invocation succeeds")
    void testAdminInvocation_succeeds() {
        AuthService authService = mock(AuthService.class);
        SeminarService seminarService = mock(SeminarService.class);
        AccommodationService accommodationService = mock(AccommodationService.class);

        TestFixtureController controller = new TestFixtureController(seminarService, accommodationService, authService);

        User aoAdmin = User.builder()
                .userId("AO001")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .name("Administrative Officer")
                .build();
        when(authService.getCurrentUser()).thenReturn(aoAdmin);

        SeminarBooking mockBooking = SeminarBooking.builder().bookingId("SEM-FIX-001").status("PENDING").build();
        when(seminarService.createPendingBookingTestFixture(any(), eq(aoAdmin))).thenReturn(mockBooking);

        ResponseEntity<ApiResponse<SeminarBooking>> response =
                controller.createPendingSeminarBookingTestFixture(new SeminarBookingRequestDTO());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SEM-FIX-001", response.getBody().getData().getBookingId());

        AccommodationRequest mockAcc = AccommodationRequest.builder().requestId("ACC-FIX-001").status("PENDING").build();
        when(accommodationService.createPendingBookingTestFixture(any(), eq(aoAdmin))).thenReturn(mockAcc);

        ResponseEntity<ApiResponse<AccommodationRequest>> accResponse =
                controller.createPendingAccommodationBookingTestFixture(new AccommodationRequestDTO());

        assertEquals(HttpStatus.OK, accResponse.getStatusCode());
        assertNotNull(accResponse.getBody());
        assertEquals("ACC-FIX-001", accResponse.getBody().getData().getRequestId());
    }

    @Test
    @DisplayName("Normal Endpoints Unaffected: SeminarController & AccommodationController remain available")
    void testNormalControllers_remainAvailable() {
        SeminarService seminarService = mock(SeminarService.class);
        when(seminarService.getActiveHalls()).thenReturn(List.of(SeminarHall.builder().hallId("SH-1").build()));
        SeminarController seminarController = new SeminarController();
        org.springframework.test.util.ReflectionTestUtils.setField(seminarController, "seminarService", seminarService);

        ResponseEntity<ApiResponse<List<SeminarHall>>> hallsResponse = seminarController.getActiveHalls();
        assertEquals(HttpStatus.OK, hallsResponse.getStatusCode());
        assertEquals(1, hallsResponse.getBody().getData().size());

        AccommodationService accService = mock(AccommodationService.class);
        when(accService.getActiveRooms(null)).thenReturn(List.of(AccommodationRoom.builder().roomId("GH-AC-1").build()));
        AccommodationController accController = new AccommodationController();
        org.springframework.test.util.ReflectionTestUtils.setField(accController, "accommodationService", accService);

        ResponseEntity<ApiResponse<List<AccommodationRoom>>> roomsResponse = accController.getActiveRooms(null);
        assertEquals(HttpStatus.OK, roomsResponse.getStatusCode());
        assertEquals(1, roomsResponse.getBody().getData().size());
    }
}
