package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.DashboardService;
import com.nec.collegeservices.service.UnifiedRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard() {
        User user = authService.getCurrentUser();
        String role = user != null && user.getRole() != null ? user.getRole() : "";

        Map<String, Object> data = switch (role) {
            case "CREATOR", "AO_ADMIN" -> dashboardService.getAOAdminDashboard();
            case "SEMINAR_ADMIN" -> dashboardService.getSeminarAdminDashboard();
            case "ACCOMMODATION_ADMIN" -> dashboardService.getAccommodationAdminDashboard();
            case "TRANSPORT_ADMIN" -> dashboardService.getTransportAdminDashboard();
            case "STATIONERY_ADMIN" -> dashboardService.getStationeryAdminDashboard();
            case "MEALS_ADMIN" -> dashboardService.getMealsAdminDashboard();
            default -> dashboardService.getDepartmentDashboard(user);
        };

        return ResponseEntity.ok(ApiResponse.ok("Dashboard statistics from MongoDB", data));
    }

    /**
     * Requirement: User-specific upcoming events.
     * The authenticated user identity is derived strictly from Spring Security/JWT.
     * Any query parameter (e.g. ?userId=...) is ignored to prevent cross-user visibility.
     */
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<UnifiedRequestService.UnifiedRequestItem>>> getUpcomingEvents(
            @RequestParam(required = false) String userId) {
        User user = authService.getCurrentUser();
        List<UnifiedRequestService.UnifiedRequestItem> upcoming = dashboardService.getUserUpcomingEvents(user);
        return ResponseEntity.ok(ApiResponse.ok("User upcoming events", upcoming));
    }
}
