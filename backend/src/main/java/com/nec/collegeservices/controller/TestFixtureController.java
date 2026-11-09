package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.AccommodationRequestDTO;
import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.SeminarBookingRequestDTO;
import com.nec.collegeservices.model.AccommodationRequest;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AccommodationService;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.SeminarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for test fixture endpoints used exclusively in development or isolated integration tests.
 * Conditionally registered ONLY when 'app.test-fixtures.enabled=true'.
 * In production, this entire bean is omitted by Spring Boot, rendering both endpoints completely unregistered (HTTP 404).
 */
@RestController
@RequestMapping("/api")
@ConditionalOnProperty(name = "app.test-fixtures.enabled", havingValue = "true", matchIfMissing = false)
public class TestFixtureController {

    private final SeminarService seminarService;
    private final AccommodationService accommodationService;
    private final AuthService authService;

    @Autowired
    public TestFixtureController(
            @Autowired(required = false) SeminarService seminarService,
            @Autowired(required = false) AccommodationService accommodationService,
            @Autowired(required = false) AuthService authService) {
        this.seminarService = seminarService;
        this.accommodationService = accommodationService;
        this.authService = authService;
    }

    @PostMapping("/seminar/test-fixture/create-pending")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<SeminarBooking>> createPendingSeminarBookingTestFixture(
            @RequestBody SeminarBookingRequestDTO dto) {
        User user = authService.getCurrentUser();
        SeminarBooking booking = seminarService.createPendingBookingTestFixture(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Test fixture pending booking created", booking));
    }

    @PostMapping("/accommodation/test-fixture/create-pending")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
    public ResponseEntity<ApiResponse<AccommodationRequest>> createPendingAccommodationBookingTestFixture(
            @RequestBody AccommodationRequestDTO dto) {
        User user = authService.getCurrentUser();
        AccommodationRequest booking = accommodationService.createPendingBookingTestFixture(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Test fixture pending booking created", booking));
    }
}
