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
    private com.nec.collegeservices.repository.PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private EmailService emailService;

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
                    .assignedHostels(user.getAssignedHostels() != null ? user.getAssignedHostels() : java.util.List.of())
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

    public void forgotPassword(com.nec.collegeservices.dto.ForgotPasswordRequestDTO request) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            return;
        }
        String cleanEmail = request.getEmail().trim().toLowerCase();
        java.util.Optional<User> userOpt = userRepository.findByEmailIgnoreCase(cleanEmail);
        if (userOpt.isEmpty()) {
            // Never reveal whether an email address is registered
            return;
        }

        User user = userOpt.get();
        if (Boolean.FALSE.equals(user.getActive())) {
            return;
        }

        // Rate limiting cooldown: 60 seconds between reset token generations
        java.util.Optional<com.nec.collegeservices.model.PasswordResetToken> recent = passwordResetTokenRepository
                .findFirstByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getUserId());
        if (recent.isPresent() && recent.get().getCreatedAt() != null &&
            recent.get().getCreatedAt().isAfter(java.time.LocalDateTime.now().minusSeconds(60))) {
            return;
        }

        // Invalidate previous unused reset tokens for this user
        java.util.List<com.nec.collegeservices.model.PasswordResetToken> existingTokens =
                passwordResetTokenRepository.findAllByUserIdAndUsedFalse(user.getUserId());
        for (com.nec.collegeservices.model.PasswordResetToken t : existingTokens) {
            t.setUsed(true);
            t.setUsedAt(java.time.LocalDateTime.now());
        }
        if (!existingTokens.isEmpty()) {
            passwordResetTokenRepository.saveAll(existingTokens);
        }

        // Generate 32 bytes cryptographically secure unpredictable token
        byte[] randomBytes = new byte[32];
        new java.security.SecureRandom().nextBytes(randomBytes);
        String rawToken = java.util.HexFormat.of().formatHex(randomBytes);
        String tokenHash = hashToken(rawToken);

        com.nec.collegeservices.model.PasswordResetToken resetToken = com.nec.collegeservices.model.PasswordResetToken.builder()
                .userId(user.getUserId())
                .email(cleanEmail)
                .tokenHash(tokenHash)
                .expiryDate(java.time.LocalDateTime.now().plusMinutes(15))
                .used(false)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        passwordResetTokenRepository.save(resetToken);

        // Send email asynchronously via existing EmailService (without CC)
        emailService.sendPasswordResetEmailAsync(cleanEmail, user.getName(), rawToken);
    }

    public void resetPassword(com.nec.collegeservices.dto.PasswordResetConfirmDTO request) {
        if (request == null || request.getToken() == null || request.getToken().isBlank()) {
            throw new com.nec.collegeservices.exception.BadRequestException("Invalid or expired password reset token.");
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new com.nec.collegeservices.exception.BadRequestException("New password must be at least 6 characters long.");
        }

        String rawToken = request.getToken().trim();
        String tokenHash = hashToken(rawToken);

        com.nec.collegeservices.model.PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new com.nec.collegeservices.exception.BadRequestException("Invalid or expired password reset token."));

        if (resetToken.isUsed() || resetToken.getExpiryDate() == null || resetToken.getExpiryDate().isBefore(java.time.LocalDateTime.now())) {
            throw new com.nec.collegeservices.exception.BadRequestException("Invalid or expired password reset token.");
        }

        User user = userRepository.findByUserId(resetToken.getUserId())
                .orElseThrow(() -> new com.nec.collegeservices.exception.ResourceNotFoundException("User account not found."));

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new com.nec.collegeservices.exception.BadRequestException("User account is inactive. Please contact administrator.");
        }

        // Update password using existing password encoder
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user.setUpdatedAt(java.time.LocalDateTime.now());
        userRepository.save(user);

        // Mark token as consumed/used
        resetToken.setUsed(true);
        resetToken.setUsedAt(java.time.LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        // Invalidate any other tokens for this user
        java.util.List<com.nec.collegeservices.model.PasswordResetToken> otherTokens =
                passwordResetTokenRepository.findAllByUserIdAndUsedFalse(user.getUserId());
        for (com.nec.collegeservices.model.PasswordResetToken t : otherTokens) {
            t.setUsed(true);
            t.setUsedAt(java.time.LocalDateTime.now());
        }
        if (!otherTokens.isEmpty()) {
            passwordResetTokenRepository.saveAll(otherTokens);
        }
    }

    private String hashToken(String rawToken) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
