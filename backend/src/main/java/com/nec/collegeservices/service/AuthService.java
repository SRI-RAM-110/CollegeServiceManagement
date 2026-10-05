package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.AuthResponse;
import com.nec.collegeservices.dto.LoginRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.UserRepository;
import com.nec.collegeservices.security.CustomUserDetails;
import com.nec.collegeservices.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getEmail();
        if (identifier == null || identifier.trim().isEmpty()) {
            identifier = request.getUserId();
        }
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new BadCredentialsException("Email is required");
        }
        String cleanIdentifier = identifier.trim().toLowerCase();

        // Check if account is inactive
        java.util.Optional<User> userOpt = userRepository.findByEmailIgnoreCase(cleanIdentifier)
                .or(() -> userRepository.findByUserId(cleanIdentifier));

        if (userOpt.isPresent()) {
            User u = userOpt.get();
            if (u.getActive() != null && !u.getActive()) {
                throw new org.springframework.security.authentication.DisabledException("User account is inactive. Please contact administrator.");
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(cleanIdentifier, request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            String jwt = jwtUtils.generateJwtToken(userDetails);

            User user = userDetails.getUser();
            return AuthResponse.builder()
                    .token(jwt)
                    .userId(user.getUserId())
                    .name(user.getName())
                    .role(user.getRole())
                    .roles(user.getEffectiveRoles())
                    .assignedHallIds(user.getAssignedHallIds() != null ? user.getAssignedHallIds() : java.util.List.of())
                    .servicePermissions(user.getServicePermissions() != null ? user.getServicePermissions() : java.util.List.of())
                    .department(user.getDepartment())
                    .designation(user.getDesignation())
                    .email(user.getEmail())
                    .active(user.getActive())
                    .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                    .build();
        } catch (org.springframework.security.authentication.DisabledException e) {
            throw e;
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid Email or Password");
        }
    }

    public User changePassword(com.nec.collegeservices.dto.ChangePasswordRequestDTO dto, User caller) {
        User user = caller;
        if (user == null && dto.getUserId() != null && !dto.getUserId().isBlank()) {
            user = userRepository.findByUserId(dto.getUserId()).orElse(null);
        }
        if (user == null) {
            throw new com.nec.collegeservices.exception.ResourceNotFoundException("User account not found");
        }

        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new com.nec.collegeservices.exception.BadRequestException("Current or temporary password does not match.");
        }

        if (dto.getNewPassword() == null || dto.getNewPassword().length() < 4) {
            throw new com.nec.collegeservices.exception.BadRequestException("New password must be at least 4 characters long.");
        }

        if (passwordEncoder.matches(dto.getNewPassword(), user.getPassword())) {
            throw new com.nec.collegeservices.exception.BadRequestException("New password cannot be the same as the current temporary password.");
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setMustChangePassword(false);
        user.setUpdatedAt(java.time.LocalDateTime.now());
        User saved = userRepository.save(user);
        saved.setPassword(null);
        return saved;
    }

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        String principal = auth.getName();
        return userRepository.findByUserId(principal)
                .or(() -> userRepository.findByEmailIgnoreCase(principal))
                .orElse(null);
    }
}
