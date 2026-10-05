package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.AuthResponse;
import com.nec.collegeservices.dto.LoginRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getCurrentUser() {
        User user = authService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        user.setPassword(null); // Never return password hash
        return ResponseEntity.ok(ApiResponse.ok("Current user details", user));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<User>> changePassword(@Valid @RequestBody com.nec.collegeservices.dto.ChangePasswordRequestDTO request) {
        User caller = authService.getCurrentUser();
        User updated = authService.changePassword(request, caller);
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully", updated));
    }
}
