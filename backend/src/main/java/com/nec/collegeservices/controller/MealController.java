package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.MealRequestDTO;
import com.nec.collegeservices.dto.RejectRequestDTO;
import com.nec.collegeservices.model.MealRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.MealService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/meals")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MealController {

    @Autowired
    private MealService mealService;

    @Autowired
    private AuthService authService;

    @GetMapping("/options")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMealOptions() {
        Map<String, Object> options = Map.of(
                "categories", List.of(
                        Map.of("id", "Breakfast", "title", "Breakfast", "subtitle", "Idli, Dosa, Upma, Poha, etc.", "icon", "breakfast"),
                        Map.of("id", "Lunch", "title", "Lunch", "subtitle", "Veg / Non-Veg Meals", "icon", "lunch"),
                        Map.of("id", "Dinner", "title", "Dinner", "subtitle", "Veg / Non-Veg Meals", "icon", "dinner"),
                        Map.of("id", "Snacks", "title", "Snacks", "subtitle", "Samosa, Cutlet, Biscuits, etc.", "icon", "snacks"),
                        Map.of("id", "Tea / Coffee", "title", "Tea / Coffee", "subtitle", "Tea, Coffee, Green Tea, etc.", "icon", "coffee")
                )
        );
        return ResponseEntity.ok(ApiResponse.ok("Meal categories and options", options));
    }

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<MealRequest>> createRequest(@Valid @RequestBody MealRequestDTO dto) {
        User user = authService.getCurrentUser();
        MealRequest request = mealService.createRequest(dto, user);
        return ResponseEntity.ok(ApiResponse.ok("Snacks & Meals request submitted successfully", request));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<MealRequest>>> getRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String mealType,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String department) {
        User user = authService.getCurrentUser();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("MEALS_ADMIN") || user.hasServicePermission("MEALS_ADMIN"));
        if (!isStaffOrAdmin && user != null) {
            department = user.getDepartment();
        }
        List<MealRequest> list = mealService.getAllRequests(status, mealType, date, fromDate, toDate, department, user);
        return ResponseEntity.ok(ApiResponse.ok("Meal requests", list));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<MealRequest>> getRequestById(@PathVariable String id) {
        User user = authService.getCurrentUser();
        MealRequest request = mealService.getRequestById(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Meal request details", request));
    }

    @PutMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'MEALS_ADMIN')")
    public ResponseEntity<ApiResponse<MealRequest>> approveRequest(@PathVariable String id) {
        MealRequest approved = mealService.approveRequest(id);
        return ResponseEntity.ok(ApiResponse.ok("Meal request approved successfully", approved));
    }

    @PutMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'MEALS_ADMIN')")
    public ResponseEntity<ApiResponse<MealRequest>> rejectRequest(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequestDTO rejectDto) {
        String reason = rejectDto != null ? rejectDto.getReason() : null;
        MealRequest rejected = mealService.rejectRequest(id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Meal request rejected", rejected));
    }
}
