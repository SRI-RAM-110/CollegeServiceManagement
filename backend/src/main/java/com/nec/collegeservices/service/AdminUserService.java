package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.*;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminUserService {

    private static final Logger logger = LoggerFactory.getLogger(AdminUserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.nec.collegeservices.repository.SeminarHallRepository seminarHallRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Get real database statistics for User Management dashboard.
     */
    public UserStatsDTO getUserStats() {
        List<User> allUsers = userRepository.findAll();
        long total = allUsers.size();
        long active = allUsers.stream().filter(u -> u.getActive() == null || Boolean.TRUE.equals(u.getActive())).count();
        long inactive = allUsers.stream().filter(u -> Boolean.FALSE.equals(u.getActive())).count();

        long hods = allUsers.stream().filter(u -> u.hasRole("DEPARTMENT_HOD")).count();
        long coordinators = allUsers.stream().filter(u -> u.hasRole("SEMINAR_COORDINATOR")).count();

        long serviceAdmins = allUsers.stream().filter(u -> {
            List<String> eff = u.getEffectiveRoles();
            boolean hasAdminRole = eff.stream().anyMatch(r -> 
                r.equals("SERVICE_ADMIN") || 
                r.equals("SEMINAR_ADMIN") || 
                r.equals("ACCOMMODATION_ADMIN") || 
                r.equals("TRANSPORT_ADMIN") || 
                r.equals("STATIONERY_ADMIN") || 
                r.equals("MEALS_ADMIN")
            );
            boolean hasServicePerm = u.getServicePermissions() != null && !u.getServicePermissions().isEmpty();
            return hasAdminRole || hasServicePerm;
        }).count();

        return UserStatsDTO.builder()
                .totalUsers(total)
                .activeUsers(active)
                .inactiveUsers(inactive)
                .hods(hods)
                .serviceAdmins(serviceAdmins)
                .seminarCoordinators(coordinators)
                .build();
    }

    /**
     * Get users with optional filtering by search query, role, department, status, and service.
     */
    public List<UserDTO> getUsers(String search, String role, String department, String status, String service) {
        List<User> all = userRepository.findAll();

        return all.stream()
                .filter(u -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    boolean nameMatch = u.getName() != null && u.getName().toLowerCase().contains(q);
                    boolean idMatch = u.getUserId() != null && u.getUserId().toLowerCase().contains(q);
                    boolean emailMatch = u.getEmail() != null && u.getEmail().toLowerCase().contains(q);
                    boolean deptMatch = u.getDepartment() != null && u.getDepartment().toLowerCase().contains(q);
                    boolean desigMatch = u.getDesignation() != null && u.getDesignation().toLowerCase().contains(q);
                    return nameMatch || idMatch || emailMatch || deptMatch || desigMatch;
                })
                .filter(u -> {
                    if (role == null || role.isBlank() || role.equalsIgnoreCase("ALL")) return true;
                    return u.hasRole(role);
                })
                .filter(u -> {
                    if (department == null || department.isBlank() || department.equalsIgnoreCase("ALL")) return true;
                    return u.getDepartment() != null && u.getDepartment().equalsIgnoreCase(department.trim());
                })
                .filter(u -> {
                    if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) return true;
                    boolean isActive = u.getActive() == null || Boolean.TRUE.equals(u.getActive());
                    if (status.equalsIgnoreCase("ACTIVE")) return isActive;
                    if (status.equalsIgnoreCase("INACTIVE")) return !isActive;
                    return true;
                })
                .filter(u -> {
                    if (service == null || service.isBlank() || service.equalsIgnoreCase("ALL")) return true;
                    String s = service.trim().toUpperCase();
                    // service can be e.g. "SEMINAR", "MEALS", or "SEMINAR_ADMIN"
                    String targetRole = s.endsWith("_ADMIN") ? s : s + "_ADMIN";
                    return u.hasServicePermission(targetRole) || u.hasRole(targetRole);
                })
                .sorted((a, b) -> {
                    if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                        return b.getCreatedAt().compareTo(a.getCreatedAt());
                    }
                    return a.getUserId().compareToIgnoreCase(b.getUserId());
                })
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a single user by userId or MongoDB id.
     */
    public UserDTO getUser(String identifier) {
        String cleanId = identifier != null ? identifier.trim().toLowerCase() : "";
        User user = userRepository.findByUserId(identifier)
                .or(() -> userRepository.findByUserId(cleanId))
                .or(() -> userRepository.findById(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + identifier));
        return mapToDTO(user);
    }

    public UserDTO createUser(CreateUserRequestDTO dto) {
        return createUser(dto, null);
    }

    /**
     * Register a new user with multi-roles, service access, and optional seminar halls.
     */
    public UserDTO createUser(CreateUserRequestDTO dto, User caller) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Full Name is required.");
        }

        if (dto.getEmail() == null || dto.getEmail().isBlank()) {
            throw new BadRequestException("Email is required.");
        }
        String cleanEmail = dto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new BadRequestException("Email '" + cleanEmail + "' is already registered. Please choose a different email address.");
        }

        String cleanUserId;
        if (dto.getUserId() != null && !dto.getUserId().isBlank()) {
            cleanUserId = dto.getUserId().trim().toLowerCase();
            if (userRepository.existsByUserId(cleanUserId)) {
                throw new BadRequestException("Username / User ID '" + cleanUserId + "' already exists. Please choose a different username.");
            }
        } else {
            String baseId = cleanEmail.split("@")[0].replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            if (baseId.isBlank()) baseId = "user";
            cleanUserId = baseId;
            int counter = 1;
            while (userRepository.existsByUserId(cleanUserId)) {
                cleanUserId = baseId + counter++;
            }
        }

        if (dto.getDepartment() == null || dto.getDepartment().isBlank()) {
            throw new BadRequestException("Department is required.");
        }

        // Check if any requested role is CREATOR
        boolean assigningCreator = (dto.getRole() != null && dto.getRole().trim().equalsIgnoreCase("CREATOR")) ||
                (dto.getRoles() != null && dto.getRoles().stream().anyMatch(r -> r != null && r.trim().equalsIgnoreCase("CREATOR")));

        if (assigningCreator) {
            if (caller == null || !caller.hasRole("CREATOR")) {
                throw new org.springframework.security.access.AccessDeniedException("Only CREATOR is authorized to assign or create a CREATOR account.");
            }
            if (userRepository.findAll().stream().anyMatch(u -> u.hasRole("CREATOR"))) {
                throw new BadRequestException("Only one CREATOR master account is permitted in the system.");
            }
        }

        // Temporary or initial password handling (default 12345)
        String rawPassword = dto.getPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            rawPassword = "12345";
        }
        String encodedPassword = passwordEncoder.encode(rawPassword);

        // Build role list
        Set<String> rolesSet = new LinkedHashSet<>();
        if (dto.getRole() != null && !dto.getRole().isBlank()) {
            rolesSet.add(dto.getRole().trim().toUpperCase());
        }
        if (dto.getRoles() != null) {
            for (String r : dto.getRoles()) {
                if (r != null && !r.isBlank()) {
                    rolesSet.add(r.trim().toUpperCase());
                }
            }
        }
        if (rolesSet.isEmpty()) {
            rolesSet.add("DEPARTMENT_USER");
        }

        // Service permissions
        List<String> servicePermissions = new ArrayList<>();
        if (dto.getServicePermissions() != null) {
            for (String sp : dto.getServicePermissions()) {
                if (sp != null && !sp.isBlank()) {
                    String norm = sp.trim().toUpperCase();
                    if (!norm.endsWith("_ADMIN") && !norm.equals("SERVICE_ADMIN")) {
                        norm = norm + "_ADMIN";
                    }
                    servicePermissions.add(norm);
                }
            }
        }

        // Seminar hall assignments
        List<String> assignedHalls = new ArrayList<>();
        if (rolesSet.contains("SEMINAR_COORDINATOR") && dto.getAssignedHallIds() != null) {
            for (String h : dto.getAssignedHallIds()) {
                if (h != null && !h.isBlank()) {
                    assignedHalls.add(h.trim().toUpperCase());
                }
            }
        }

        // Accommodation hostel assignments
        List<String> assignedHostels = new ArrayList<>();
        if (dto.getAssignedHostels() != null) {
            for (String h : dto.getAssignedHostels()) {
                if (h != null && !h.isBlank()) {
                    String clean = h.trim();
                    if (clean.equalsIgnoreCase("Boys") || clean.equalsIgnoreCase("Boys Hostel")) {
                        assignedHostels.add("Boys Hostel");
                    } else if (clean.equalsIgnoreCase("Girls") || clean.equalsIgnoreCase("Girls Hostel")) {
                        assignedHostels.add("Girls Hostel");
                    } else {
                        assignedHostels.add(clean);
                    }
                }
            }
        }

        String primaryRole = rolesSet.iterator().next();

        User user = User.builder()
                .userId(cleanUserId)
                .password(encodedPassword)
                .name(dto.getName().trim())
                .email(dto.getEmail() != null ? dto.getEmail().trim() : null)
                .phone(dto.getPhone() != null ? dto.getPhone().trim() : null)
                .department(dto.getDepartment().trim().toUpperCase())
                .designation(dto.getDesignation() != null ? dto.getDesignation().trim() : null)
                .role(primaryRole)
                .roles(new ArrayList<>(rolesSet))
                .servicePermissions(servicePermissions)
                .assignedHallIds(assignedHalls)
                .assignedHostels(assignedHostels)
                .active(dto.getActive() != null ? dto.getActive() : true)
                .mustChangePassword(dto.getMustChangePassword() != null ? dto.getMustChangePassword() : true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);
        logger.info("Administrator registered new user: {} with roles: {}", saved.getUserId(), saved.getEffectiveRoles());
        return mapToDTO(saved);
    }

    public UserDTO updateUser(String identifier, UpdateUserRequestDTO dto) {
        return updateUser(identifier, dto, null);
    }

    /**
     * Update an existing user.
     */
    public UserDTO updateUser(String identifier, UpdateUserRequestDTO dto, User caller) {
        String cleanId = identifier != null ? identifier.trim().toLowerCase() : "";
        User user = userRepository.findByUserId(identifier)
                .or(() -> userRepository.findByUserId(cleanId))
                .or(() -> userRepository.findById(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + identifier));

        boolean targetIsCreator = user.hasRole("CREATOR");
        if (targetIsCreator && (caller == null || !caller.hasRole("CREATOR"))) {
            throw new org.springframework.security.access.AccessDeniedException("Only CREATOR can modify the Creator account.");
        }

        boolean assigningCreator = (dto.getRole() != null && dto.getRole().trim().equalsIgnoreCase("CREATOR")) ||
                (dto.getRoles() != null && dto.getRoles().stream().anyMatch(r -> r != null && r.trim().equalsIgnoreCase("CREATOR")));

        if (assigningCreator && !targetIsCreator) {
            if (caller == null || !caller.hasRole("CREATOR")) {
                throw new org.springframework.security.access.AccessDeniedException("Only CREATOR can promote a user to CREATOR role.");
            }
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            user.setName(dto.getName().trim());
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            String cleanEmail = dto.getEmail().trim().toLowerCase();
            Optional<User> existingEmailUser = userRepository.findByEmailIgnoreCase(cleanEmail);
            if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(user.getId())) {
                throw new BadRequestException("Email '" + cleanEmail + "' is already in use by another user.");
            }
            user.setEmail(cleanEmail);
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone().trim());
        }
        if (dto.getDepartment() != null && !dto.getDepartment().isBlank()) {
            user.setDepartment(dto.getDepartment().trim().toUpperCase());
        }
        if (dto.getDesignation() != null) {
            user.setDesignation(dto.getDesignation().trim());
        }

        if (dto.getRoles() != null) {
            Set<String> rolesSet = new LinkedHashSet<>();
            for (String r : dto.getRoles()) {
                if (r != null && !r.isBlank()) {
                    rolesSet.add(r.trim().toUpperCase());
                }
            }
            if (dto.getRole() != null && !dto.getRole().isBlank()) {
                rolesSet.add(dto.getRole().trim().toUpperCase());
            }
            if (!rolesSet.isEmpty()) {
                user.setRoles(new ArrayList<>(rolesSet));
                user.setRole(rolesSet.iterator().next());
            }
        } else if (dto.getRole() != null && !dto.getRole().isBlank()) {
            user.setRole(dto.getRole().trim().toUpperCase());
        }

        if (dto.getServicePermissions() != null) {
            List<String> perms = new ArrayList<>();
            for (String sp : dto.getServicePermissions()) {
                if (sp != null && !sp.isBlank()) {
                    String norm = sp.trim().toUpperCase();
                    if (!norm.endsWith("_ADMIN") && !norm.equals("SERVICE_ADMIN")) {
                        norm = norm + "_ADMIN";
                    }
                    perms.add(norm);
                }
            }
            user.setServicePermissions(perms);
        }

        if (dto.getAssignedHallIds() != null) {
            List<String> halls = new ArrayList<>();
            for (String h : dto.getAssignedHallIds()) {
                if (h != null && !h.isBlank()) {
                    halls.add(h.trim().toUpperCase());
                }
            }
            user.setAssignedHallIds(halls);
        }

        if (dto.getAssignedHostels() != null) {
            List<String> hostels = new ArrayList<>();
            for (String h : dto.getAssignedHostels()) {
                if (h != null && !h.isBlank()) {
                    String clean = h.trim();
                    if (clean.equalsIgnoreCase("Boys") || clean.equalsIgnoreCase("Boys Hostel")) {
                        hostels.add("Boys Hostel");
                    } else if (clean.equalsIgnoreCase("Girls") || clean.equalsIgnoreCase("Girls Hostel")) {
                        hostels.add("Girls Hostel");
                    } else {
                        hostels.add(clean);
                    }
                }
            }
            user.setAssignedHostels(hostels);
        }

        if (dto.getActive() != null) {
            user.setActive(dto.getActive());
        }

        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        logger.info("Administrator updated user: {}", saved.getUserId());
        return mapToDTO(saved);
    }

    public UserDTO toggleUserStatus(String identifier, Boolean active) {
        return toggleUserStatus(identifier, active, null);
    }

    /**
     * Toggle or set active/inactive status.
     */
    public UserDTO toggleUserStatus(String identifier, Boolean active, User caller) {
        String cleanId = identifier != null ? identifier.trim().toLowerCase() : "";
        User user = userRepository.findByUserId(identifier)
                .or(() -> userRepository.findByUserId(cleanId))
                .or(() -> userRepository.findById(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + identifier));

        if (user.hasRole("CREATOR")) {
            if (caller == null || !caller.hasRole("CREATOR")) {
                throw new org.springframework.security.access.AccessDeniedException("Only CREATOR can modify the Creator account status.");
            }
            if (Boolean.FALSE.equals(active)) {
                throw new BadRequestException("The Creator account cannot be deactivated.");
            }
        }

        if (active == null) {
            user.setActive(!Boolean.TRUE.equals(user.getActive()));
        } else {
            user.setActive(active);
        }

        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        logger.info("Administrator updated status for user {} to active={}", saved.getUserId(), saved.getActive());
        return mapToDTO(saved);
    }

    public Map<String, Object> resetPassword(String identifier, ResetPasswordRequestDTO dto) {
        return resetPassword(identifier, dto, null);
    }

    /**
     * Reset password with temporary password (default "12345") and force mustChangePassword.
     */
    public Map<String, Object> resetPassword(String identifier, ResetPasswordRequestDTO dto, User caller) {
        String cleanId = identifier != null ? identifier.trim().toLowerCase() : "";
        User user = userRepository.findByUserId(identifier)
                .or(() -> userRepository.findByUserId(cleanId))
                .or(() -> userRepository.findById(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + identifier));

        if (user.hasRole("CREATOR")) {
            if (caller == null || !caller.hasRole("CREATOR")) {
                throw new org.springframework.security.access.AccessDeniedException("Only CREATOR can reset the Creator account password.");
            }
        }

        String tempPass = dto != null && dto.getTemporaryPassword() != null && !dto.getTemporaryPassword().isBlank()
                ? dto.getTemporaryPassword().trim()
                : "12345";

        user.setPassword(passwordEncoder.encode(tempPass));
        user.setMustChangePassword(dto != null && dto.getMustChangePassword() != null ? dto.getMustChangePassword() : true);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        logger.info("Administrator reset password for user: {}. mustChangePassword set to true.", user.getUserId());

        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("message", "Password reset successfully. The user will be required to change their password on next login.");
        response.put("mustChangePassword", user.getMustChangePassword());
        return response;
    }

    /**
     * Permanently remove a user with safety checks.
     * 1. Only CREATOR or AO_ADMIN is authorized.
     * 2. Cannot remove the Creator account.
     * 3. Cannot remove the currently logged-in administrator.
     * 4. Cannot remove the final remaining AO_ADMIN account unless authorized.
     * 5. Safely clean active seminar coordinator assignments in SeminarHall.
     * 6. Preserve historical requests, bookings, and audit records.
     */
    public void removeUser(String identifier, User currentAdmin) {
        if (currentAdmin == null || (!currentAdmin.hasRole("CREATOR") && !currentAdmin.hasRole("AO_ADMIN"))) {
            throw new org.springframework.security.access.AccessDeniedException("Only CREATOR or AO_ADMIN is authorized to remove users.");
        }

        String cleanId = identifier != null ? identifier.trim().toLowerCase() : "";
        User user = userRepository.findByUserId(identifier)
                .or(() -> userRepository.findByUserId(cleanId))
                .or(() -> userRepository.findById(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + identifier));

        // 1. Protect Creator account from deletion
        if (user.hasRole("CREATOR")) {
            throw new BadRequestException("The Creator account cannot be removed.");
        }

        // 2. Protect against self-deletion
        if (currentAdmin.getUserId() != null && currentAdmin.getUserId().equalsIgnoreCase(user.getUserId())) {
            throw new BadRequestException("You cannot remove your own administrator account while logged in.");
        }

        // 3. Protect final/only AO_ADMIN account if removed by AO_ADMIN
        if (user.hasRole("AO_ADMIN") && !currentAdmin.hasRole("CREATOR")) {
            long totalAdmins = userRepository.findAll().stream()
                    .filter(u -> u.hasRole("AO_ADMIN"))
                    .count();
            if (totalAdmins <= 1) {
                throw new BadRequestException("Cannot remove the last remaining Super Admin (AO_ADMIN) account in the system.");
            }
        }

        // 4. Safe handling of Seminar Coordinator hall assignments
        try {
            List<com.nec.collegeservices.model.SeminarHall> halls = seminarHallRepository.findAll();
            for (com.nec.collegeservices.model.SeminarHall hall : halls) {
                if (hall.getCoordinatorUserIds() != null && hall.getCoordinatorUserIds().contains(user.getUserId())) {
                    hall.getCoordinatorUserIds().remove(user.getUserId());
                    seminarHallRepository.save(hall);
                    logger.info("Removed user {} from coordinator assignments of hall {}", user.getUserId(), hall.getHallId());
                }
            }
        } catch (Exception e) {
            logger.warn("Could not cleanup seminar hall coordinator references for user {}: {}", user.getUserId(), e.getMessage());
        }

        // 5. Note: Request ownership, booking history, approvals, and audit logs are NOT deleted.
        // They remain preserved so historical records remain valid and understandable.

        // 6. Permanently remove the user from repository
        userRepository.delete(user);
        logger.info("Administrator {} permanently removed user account: {}", currentAdmin.getUserId(), user.getUserId());
    }

    public UserDTO mapToDTO(User user) {
        if (user == null) return null;
        return UserDTO.builder()
                .id(user.getId())
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .department(user.getDepartment())
                .designation(user.getDesignation())
                .role(user.getRole())
                .roles(user.getEffectiveRoles())
                .servicePermissions(user.getServicePermissions() != null ? user.getServicePermissions() : Collections.emptyList())
                .assignedHallIds(user.getAssignedHallIds() != null ? user.getAssignedHallIds() : Collections.emptyList())
                .assignedHostels(user.getAssignedHostels() != null ? user.getAssignedHostels() : Collections.emptyList())
                .active(user.getActive() == null || Boolean.TRUE.equals(user.getActive()))
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
