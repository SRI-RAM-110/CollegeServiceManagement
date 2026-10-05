package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.MealRequestDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.MealRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.MealRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
public class MealService {

    @Autowired
    private MealRequestRepository mealRequestRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RequesterResolver requesterResolver;

    @Autowired
    private AuthService authService;

    @Autowired
    private com.nec.collegeservices.repository.UserRepository userRepository;

    public MealRequest createRequest(MealRequestDTO dto, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        // 1. Required fields
        if (dto.getEventTitle() == null || dto.getEventTitle().isBlank()) {
            throw new BadRequestException("Event title is required.");
        }
        if (dto.getVenue() == null || dto.getVenue().isBlank()) {
            throw new BadRequestException("Venue is required.");
        }

        // 2. Date validation
        if (dto.getDate() == null || dto.getDate().isBlank()) {
            throw new BadRequestException("Event date is required.");
        }
        LocalDate mealDate;
        try {
            mealDate = LocalDate.parse(dto.getDate().trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD.");
        }
        if (mealDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Event date cannot be in the past (" + dto.getDate() + ").");
        }

        // 3. Meal types validation
        if (dto.getMealTypes() == null || dto.getMealTypes().isEmpty()) {
            throw new BadRequestException("At least one meal type must be selected.");
        }
        List<String> validMealTypes = List.of("Breakfast", "Lunch", "Dinner", "Snacks", "Tea / Coffee", "Tea/Coffee");
        for (String mt : dto.getMealTypes()) {
            if (validMealTypes.stream().noneMatch(v -> v.equalsIgnoreCase(mt.trim()))) {
                throw new BadRequestException("Invalid meal type: " + mt);
            }
        }

        // 4. Guest counts validation
        if (dto.getTotalGuests() != null && dto.getTotalGuests() <= 0) {
            throw new BadRequestException("Total guest count must be greater than zero.");
        }

        // 5. Service Time validation for Snacks / Tea & Coffee
        boolean hasRefreshments = dto.getMealTypes() != null && dto.getMealTypes().stream()
                .anyMatch(mt -> mt != null && (mt.equalsIgnoreCase("Snacks") || mt.toLowerCase().contains("tea") || mt.toLowerCase().contains("coffee")));

        String validatedServiceTime = null;
        if (hasRefreshments) {
            if (dto.getServiceTime() == null || dto.getServiceTime().isBlank()) {
                throw new BadRequestException("Please select FORENOON or AFTERNOON for Snacks / Tea / Coffee.");
            }
            validatedServiceTime = dto.getServiceTime().trim().toUpperCase();
            if (!validatedServiceTime.equals("FORENOON") && !validatedServiceTime.equals("AFTERNOON")) {
                throw new BadRequestException("Invalid service time: " + dto.getServiceTime() + ". Allowed values: FORENOON, AFTERNOON.");
            }
        }

        List<MealRequest.MealItemDetail> items = new ArrayList<>();
        int totalGuestCount = (dto.getTotalGuests() != null && dto.getTotalGuests() > 0) ? dto.getTotalGuests() : 0;

        if (dto.getMealItems() != null) {
            for (MealRequestDTO.MealItemDetailDTO itemDTO : dto.getMealItems()) {
                if (itemDTO.getGuestCount() != null && itemDTO.getGuestCount() <= 0) {
                    throw new BadRequestException("Guest count for " + itemDTO.getMealType() + " must be greater than zero.");
                }
                int count = itemDTO.getGuestCount() != null && itemDTO.getGuestCount() > 0 ? itemDTO.getGuestCount() : (totalGuestCount > 0 ? totalGuestCount : 1);
                if (totalGuestCount == 0) {
                    totalGuestCount = Math.max(totalGuestCount, count);
                }
                boolean isItemRefreshment = itemDTO.getMealType() != null &&
                        (itemDTO.getMealType().equalsIgnoreCase("Snacks") || itemDTO.getMealType().toLowerCase().contains("tea") || itemDTO.getMealType().toLowerCase().contains("coffee"));
                String prefTime = isItemRefreshment && validatedServiceTime != null ? validatedServiceTime : itemDTO.getPreferredTime();

                items.add(MealRequest.MealItemDetail.builder()
                        .mealType(itemDTO.getMealType())
                        .guestCount(count)
                        .preferredTime(prefTime)
                        .description(itemDTO.getDescription())
                        .build());
            }
        }
        if (totalGuestCount <= 0) {
            totalGuestCount = 1;
        }

        String requestId = "SM-" + String.format("%03d", System.currentTimeMillis() % 10000);

        MealRequest request = MealRequest.builder()
                .requestId(requestId)
                .department(user.getDepartment())
                .eventTitle(dto.getEventTitle().trim())
                .date(dto.getDate().trim())
                .venue(dto.getVenue().trim())
                .mealTypes(dto.getMealTypes())
                .serviceTime(validatedServiceTime)
                .mealItems(items)
                .totalGuests(totalGuestCount)
                .specialRequirements(dto.getSpecialRequirements())
                .additionalNotes(dto.getAdditionalNotes())
                .status("PENDING")
                .requestedBy(user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getUserId())
                .requesterUserId(user.getUserId())
                .requesterEmail(user.getEmail() != null && !user.getEmail().isBlank() ? user.getEmail() : resolveUserEmail(user.getUserId(), user.getName(), user.getDepartment()))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        MealRequest saved = mealRequestRepository.save(request);

        // Notify Admins
        notificationService.sendNotification(
                "MEALS_ADMIN",
                "ADMIN",
                null,
                "New Meal Arrangement Request",
                user.getDepartment() + " requested food arrangement for " + dto.getDate() + " (" + String.join(", ", dto.getMealTypes()) + ")",
                "Snacks & Meals",
                "INFO",
                saved.getRequestId()
        );

        notificationService.sendNotification(
                "AO_ADMIN",
                "ADMIN",
                null,
                "New Meal Arrangement Request",
                user.getDepartment() + " requested food arrangement for " + dto.getDate() + " (" + String.join(", ", dto.getMealTypes()) + ")",
                "Snacks & Meals",
                "INFO",
                saved.getRequestId()
        );

        return saved;
    }

    public List<MealRequest> getAllRequests(String status, String mealType, String date, String department) {
        return getAllRequests(status, mealType, date, null, null, department, null);
    }

    public List<MealRequest> getAllRequests(String status, String mealType, String date, String fromDate, String toDate, String department) {
        return getAllRequests(status, mealType, date, fromDate, toDate, department, null);
    }

    public List<MealRequest> getAllRequests(String status, String mealType, String date, String fromDate, String toDate, String department, User user) {
        if (fromDate != null && toDate != null && !fromDate.isBlank() && !toDate.isBlank()) {
            if (toDate.compareTo(fromDate) < 0) {
                throw new BadRequestException("To date cannot be earlier than From date.");
            }
        }
        List<MealRequest> all = mealRequestRepository.findAll();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("MEALS_ADMIN") || user.hasServicePermission("MEALS_ADMIN"));
        List<MealRequest> list = all.stream()
                .filter(r -> {
                    if (!isStaffOrAdmin && user != null) {
                        return UnifiedRequestService.isRequestedByUser(r.getRequestedBy(), user);
                    }
                    return department == null || department.isBlank() || department.equalsIgnoreCase("ALL") || r.getDepartment().equalsIgnoreCase(department);
                })
                .filter(r -> status == null || status.isBlank() || status.equalsIgnoreCase("ALL") || r.getStatus().equalsIgnoreCase(status))
                .filter(r -> mealType == null || mealType.isBlank() || mealType.equalsIgnoreCase("ALL") || (r.getMealTypes() != null && r.getMealTypes().contains(mealType)))
                .filter(r -> {
                    if (fromDate != null && !fromDate.isBlank() && toDate != null && !toDate.isBlank()) {
                        return r.getDate().compareTo(fromDate) >= 0 && r.getDate().compareTo(toDate) <= 0;
                    }
                    return date == null || date.isBlank() || r.getDate().equals(date);
                })
                .sorted((a, b) -> {
                    int dateCmp = a.getDate().compareTo(b.getDate());
                    if (dateCmp != 0) return dateCmp;
                    return b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0;
                })
                .toList();

        for (MealRequest r : list) {
            if (r.getRequesterEmail() == null || r.getRequesterEmail().isBlank()) {
                r.setRequesterEmail(resolveUserEmail(r.getRequesterUserId(), r.getRequestedBy(), r.getDepartment()));
            }
        }
        return list;
    }

    public List<MealRequest> getRequestsByDepartment(String department) {
        return mealRequestRepository.findByDepartment(department).stream()
                .peek(r -> {
                    if (r.getRequesterEmail() == null || r.getRequesterEmail().isBlank()) {
                        r.setRequesterEmail(resolveUserEmail(r.getRequesterUserId(), r.getRequestedBy(), r.getDepartment()));
                    }
                })
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public MealRequest approveRequest(String id) {
        MealRequest req = mealRequestRepository.findById(id)
                .or(() -> mealRequestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Meal request not found: " + id));

        if ("APPROVED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Meal request is already approved.");
        }

        req.setStatus("APPROVED");
        try {
            User current = authService.getCurrentUser();
            if (current != null) {
                req.setApprovedBy(current.getName() != null ? current.getName() : current.getUserId());
            }
        } catch (Exception ignored) {}
        req.setApprovedAt(LocalDateTime.now());
        req.setUpdatedAt(LocalDateTime.now());
        MealRequest saved = mealRequestRepository.save(req);

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Meals Request Approved",
                "Your snacks & meals arrangement request for " + req.getDate() + " has been approved!",
                "Snacks & Meals",
                "SUCCESS",
                saved.getRequestId()
        );

        if (saved.getRequesterEmail() == null || saved.getRequesterEmail().isBlank()) {
            saved.setRequesterEmail(resolveUserEmail(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment()));
        }

        return saved;
    }

    public MealRequest rejectRequest(String id, String reason) {
        MealRequest req = mealRequestRepository.findById(id)
                .or(() -> mealRequestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Meal request not found: " + id));

        req.setStatus("REJECTED");
        req.setRejectionReason(reason != null && !reason.isBlank() ? reason : "Declined by Administrator");
        req.setUpdatedAt(LocalDateTime.now());
        MealRequest saved = mealRequestRepository.save(req);

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Meals Request Rejected",
                "Your snacks & meals request for " + req.getDate() + " was rejected. Reason: " + req.getRejectionReason(),
                "Snacks & Meals",
                "DANGER",
                saved.getRequestId()
        );

        if (saved.getRequesterEmail() == null || saved.getRequesterEmail().isBlank()) {
            saved.setRequesterEmail(resolveUserEmail(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment()));
        }

        return saved;
    }

    public MealRequest getRequestById(String id, User user) {
        MealRequest req = mealRequestRepository.findById(id)
                .or(() -> mealRequestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Meal request not found: " + id));
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        boolean isStaffOrAdmin = user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("MEALS_ADMIN") || user.hasServicePermission("MEALS_ADMIN");
        if (!isStaffOrAdmin) {
            if (!UnifiedRequestService.isRequestedByUser(req.getRequestedBy(), user)) {
                throw new AccessDeniedException("You are not authorized to view meal requests created by other users.");
            }
        }
        if (req.getRequesterEmail() == null || req.getRequesterEmail().isBlank()) {
            req.setRequesterEmail(resolveUserEmail(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment()));
        }
        return req;
    }

    public MealRequest updateRequest(String id, MealRequestDTO dto, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        boolean isStaffOrAdmin = user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("MEALS_ADMIN") || user.hasServicePermission("MEALS_ADMIN");
        if (!isStaffOrAdmin) {
            throw new AccessDeniedException("You are not authorized to edit meal requests.");
        }

        MealRequest req = mealRequestRepository.findById(id)
                .or(() -> mealRequestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Meal request not found: " + id));

        // Status rule: Only PENDING or UNDER_REVIEW can be edited
        if (!"PENDING".equalsIgnoreCase(req.getStatus()) && !"UNDER_REVIEW".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Only pending or under-review meal requests can be edited. Current status: " + req.getStatus());
        }

        // 1. Required fields
        if (dto.getEventTitle() == null || dto.getEventTitle().isBlank()) {
            throw new BadRequestException("Event title is required.");
        }
        if (dto.getVenue() == null || dto.getVenue().isBlank()) {
            throw new BadRequestException("Venue is required.");
        }

        // 2. Date validation
        if (dto.getDate() == null || dto.getDate().isBlank()) {
            throw new BadRequestException("Event date is required.");
        }
        LocalDate mealDate;
        try {
            mealDate = LocalDate.parse(dto.getDate().trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD.");
        }
        if (mealDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Event date cannot be in the past (" + dto.getDate() + ").");
        }

        // 3. Meal types validation
        if (dto.getMealTypes() == null || dto.getMealTypes().isEmpty()) {
            throw new BadRequestException("At least one meal type must be selected.");
        }
        List<String> validMealTypes = List.of("Breakfast", "Lunch", "Dinner", "Snacks", "Tea / Coffee", "Tea/Coffee");
        for (String mt : dto.getMealTypes()) {
            if (validMealTypes.stream().noneMatch(v -> v.equalsIgnoreCase(mt.trim()))) {
                throw new BadRequestException("Invalid meal type: " + mt);
            }
        }

        // 4. Guest counts validation
        if (dto.getTotalGuests() != null && dto.getTotalGuests() <= 0) {
            throw new BadRequestException("Total guest count must be greater than zero.");
        }

        // 5. Service Time validation for Snacks / Tea & Coffee
        boolean hasRefreshments = dto.getMealTypes().stream()
                .anyMatch(mt -> mt != null && (mt.equalsIgnoreCase("Snacks") || mt.toLowerCase().contains("tea") || mt.toLowerCase().contains("coffee")));

        String validatedServiceTime = null;
        if (hasRefreshments) {
            if (dto.getServiceTime() == null || dto.getServiceTime().isBlank()) {
                throw new BadRequestException("Please select FORENOON or AFTERNOON for Snacks / Tea / Coffee.");
            }
            validatedServiceTime = dto.getServiceTime().trim().toUpperCase();
            if (!validatedServiceTime.equals("FORENOON") && !validatedServiceTime.equals("AFTERNOON")) {
                throw new BadRequestException("Invalid service time: " + dto.getServiceTime() + ". Allowed values: FORENOON, AFTERNOON.");
            }
        }

        List<MealRequest.MealItemDetail> items = new ArrayList<>();
        int totalGuestCount = (dto.getTotalGuests() != null && dto.getTotalGuests() > 0) ? dto.getTotalGuests() : 0;

        if (dto.getMealItems() != null) {
            for (MealRequestDTO.MealItemDetailDTO itemDTO : dto.getMealItems()) {
                if (itemDTO.getGuestCount() != null && itemDTO.getGuestCount() <= 0) {
                    throw new BadRequestException("Guest count for " + itemDTO.getMealType() + " must be greater than zero.");
                }
                int count = itemDTO.getGuestCount() != null && itemDTO.getGuestCount() > 0 ? itemDTO.getGuestCount() : (totalGuestCount > 0 ? totalGuestCount : 1);
                if (totalGuestCount == 0) {
                    totalGuestCount = Math.max(totalGuestCount, count);
                }
                boolean isItemRefreshment = itemDTO.getMealType() != null &&
                        (itemDTO.getMealType().equalsIgnoreCase("Snacks") || itemDTO.getMealType().toLowerCase().contains("tea") || itemDTO.getMealType().toLowerCase().contains("coffee"));
                String prefTime = isItemRefreshment && validatedServiceTime != null ? validatedServiceTime : itemDTO.getPreferredTime();

                items.add(MealRequest.MealItemDetail.builder()
                        .mealType(itemDTO.getMealType())
                        .guestCount(count)
                        .preferredTime(prefTime)
                        .description(itemDTO.getDescription())
                        .build());
            }
        }
        if (totalGuestCount <= 0) {
            totalGuestCount = (req.getTotalGuests() != null && req.getTotalGuests() > 0) ? req.getTotalGuests() : 1;
        }

        // Apply changes to mutable fields only (preserving system-controlled identity fields)
        req.setEventTitle(dto.getEventTitle().trim());
        req.setDate(dto.getDate().trim());
        req.setVenue(dto.getVenue().trim());
        req.setMealTypes(dto.getMealTypes());
        req.setServiceTime(validatedServiceTime);
        req.setMealItems(items);
        req.setTotalGuests(totalGuestCount);
        req.setSpecialRequirements(dto.getSpecialRequirements());
        if (dto.getAdditionalNotes() != null) {
            req.setAdditionalNotes(dto.getAdditionalNotes());
        }
        req.setUpdatedAt(LocalDateTime.now());

        MealRequest saved = mealRequestRepository.save(req);
        if (saved.getRequesterEmail() == null || saved.getRequesterEmail().isBlank()) {
            saved.setRequesterEmail(resolveUserEmail(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment()));
        }
        return saved;
    }

    public String resolveUserEmail(String requesterUserId, String requestedBy, String department) {
        if (requesterUserId != null && !requesterUserId.isBlank() && !"null".equalsIgnoreCase(requesterUserId)) {
            var opt = userRepository.findByUserId(requesterUserId.trim());
            if (opt.isPresent() && opt.get().getEmail() != null && !opt.get().getEmail().isBlank()) {
                return opt.get().getEmail();
            }
        }
        String resolvedId = requesterResolver.resolveRequesterUserId(requesterUserId, requestedBy, department);
        if (resolvedId != null && !resolvedId.isBlank()) {
            var opt = userRepository.findByUserId(resolvedId.trim());
            if (opt.isPresent() && opt.get().getEmail() != null && !opt.get().getEmail().isBlank()) {
                return opt.get().getEmail();
            }
        }
        if (department != null && !department.isBlank()) {
            return department.toLowerCase().trim() + "@nrtec.local";
        }
        return "requester@nrtec.local";
    }
}
