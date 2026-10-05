package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.*;
import com.nec.collegeservices.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "*", maxAge = 3600)
@PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN')")
public class AdminUserController {

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private com.nec.collegeservices.service.AuthService authService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<UserStatsDTO>> getUserStats() {
        UserStatsDTO stats = adminUserService.getUserStats();
        return ResponseEntity.ok(ApiResponse.ok("User management statistics", stats));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDTO>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String service) {
        List<UserDTO> users = adminUserService.getUsers(search, role, department, status, service);
        return ResponseEntity.ok(ApiResponse.ok("Users list retrieved successfully", users));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserDTO>> getUser(@PathVariable String userId) {
        UserDTO user = adminUserService.getUser(userId);
        return ResponseEntity.ok(ApiResponse.ok("User retrieved successfully", user));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserDTO>> createUser(@Valid @RequestBody CreateUserRequestDTO dto) {
        com.nec.collegeservices.model.User caller = authService.getCurrentUser();
        UserDTO created = adminUserService.createUser(dto, caller);
        return ResponseEntity.ok(ApiResponse.ok("User registered successfully", created));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserDTO>> updateUser(
            @PathVariable String userId,
            @RequestBody UpdateUserRequestDTO dto) {
        com.nec.collegeservices.model.User caller = authService.getCurrentUser();
        UserDTO updated = adminUserService.updateUser(userId, dto, caller);
        return ResponseEntity.ok(ApiResponse.ok("User updated successfully", updated));
    }

    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<UserDTO>> toggleUserStatus(
            @PathVariable String userId,
            @RequestBody(required = false) Map<String, Boolean> body) {
        com.nec.collegeservices.model.User caller = authService.getCurrentUser();
        Boolean active = body != null ? body.get("active") : null;
        UserDTO updated = adminUserService.toggleUserStatus(userId, active, caller);
        String msg = Boolean.TRUE.equals(updated.getActive()) ? "User activated successfully" : "User deactivated successfully";
        return ResponseEntity.ok(ApiResponse.ok(msg, updated));
    }

    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resetPassword(
            @PathVariable String userId,
            @RequestBody(required = false) ResetPasswordRequestDTO dto) {
        com.nec.collegeservices.model.User caller = authService.getCurrentUser();
        Map<String, Object> result = adminUserService.resetPassword(userId, dto, caller);
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully", result));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> removeUser(@PathVariable String userId) {
        com.nec.collegeservices.model.User currentAdmin = authService.getCurrentUser();
        adminUserService.removeUser(userId, currentAdmin);
        Map<String, Object> data = Map.of(
                "userId", userId,
                "removed", true
        );
        return ResponseEntity.ok(ApiResponse.ok("User removed successfully", data));
    }
}
