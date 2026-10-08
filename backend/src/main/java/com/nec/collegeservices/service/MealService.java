package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.MealBulkAvailabilityRequestDTO;
import com.nec.collegeservices.dto.MealRequestDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.MealRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.MealRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class MealService {

    private static final AtomicLong ID_COUNTER = new AtomicLong(System.currentTimeMillis() % 10000);

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

    /**
     * Check availability across multiple dates for recurring or multi-day meal requests.
     */
    public Map<String, Object> checkBulkAvailability(MealBulkAvailabilityRequestDTO dto) {
        List<String> dates = dto.getDates() != null ? dto.getDates() : Collections.emptyList();
        String bookingType = dto.getBookingType() != null && !dto.getBookingType().isBlank()
                ? dto.getBookingType().toUpperCase()
                : (dates.size() > 1 ? "MULTI_DAY" : "ONE_TIME");

        List<Map<String, Object>> conflicts = new ArrayList<>();
        List<Map<String, Object>> occurrences = new ArrayList<>();
        int availableCount = 0;

        for (String dateStr : dates) {
            String dayOfWeek = "";
            try {
                LocalDate ld = LocalDate.parse(dateStr);
                dayOfWeek = ld.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH);
            } catch (Exception ignored) {}

            Map<String, Object> occ = new HashMap<>();
            occ.put("date", dateStr);
            occ.put("day", dayOfWeek);
            occ.put("venue", dto.getVenue());
            occ.put("bookingType", bookingType);
            occ.put("status", "AVAILABLE");
            occurrences.add(occ);
            availableCount++;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalDates", dates.size());
        result.put("availableCount", availableCount);
        result.put("conflictCount", conflicts.size());
        result.put("occurrences", occurrences);
        result.put("conflicts", conflicts);
        return result;
    }

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

        LocalDate today = LocalDate.now();
        String bookingType = dto.getBookingType() != null && !dto.getBookingType().isBlank()
                ? dto.getBookingType().toUpperCase().trim()
                : "ONE_TIME";

        // 2. Date determination & validation (supports multiple dates like Seminar Hall)
        List<LocalDate> targetDates = new ArrayList<>();
        if (dto.getDates() != null && !dto.getDates().isEmpty()) {
            for (String dStr : dto.getDates()) {
                try {
                    LocalDate d = LocalDate.parse(dStr.trim());
                    if (d.isBefore(today)) {
                        throw new BadRequestException("Event date cannot be in the past (" + dStr + ").");
                    }
                    if (!targetDates.contains(d)) {
                        targetDates.add(d);
                    }
                } catch (DateTimeParseException e) {
                    throw new BadRequestException("Invalid date format: " + dStr);
                }
            }
            Collections.sort(targetDates);
        } else if ("RECURRING".equals(bookingType)) {
            String startDateStr = dto.getStartDate() != null ? dto.getStartDate() : dto.getDate();
            String endDateStr = dto.getEndDate() != null ? dto.getEndDate() : startDateStr;
            if (startDateStr == null || endDateStr == null || startDateStr.isBlank() || endDateStr.isBlank()) {
                throw new BadRequestException("Both start date and end date are required for recurring meal requests.");
            }
            LocalDate start = LocalDate.parse(startDateStr);
            LocalDate end = LocalDate.parse(endDateStr);
            if (end.isBefore(start)) {
                throw new BadRequestException("End date (" + endDateStr + ") cannot be earlier than start date (" + startDateStr + ").");
            }
            if (start.isBefore(today)) {
                throw new BadRequestException("Start date cannot be in the past (" + startDateStr + ").");
            }
            List<String> repeatDays = dto.getRecurrenceDays();
            if (repeatDays == null || repeatDays.isEmpty()) {
                throw new BadRequestException("Select at least one weekday for recurring meal requests.");
            }
            Set<DayOfWeek> targetDays = new HashSet<>();
            for (String day : repeatDays) {
                targetDays.add(DayOfWeek.valueOf(day.toUpperCase().trim()));
            }
            LocalDate curr = start;
            while (!curr.isAfter(end)) {
                if (targetDays.contains(curr.getDayOfWeek())) {
                    targetDates.add(curr);
                }
                curr = curr.plusDays(1);
            }
        } else if ("MULTI_DAY".equals(bookingType) && dto.getStartDate() != null && !dto.getStartDate().isBlank()) {
            String startDateStr = dto.getStartDate();
            String endDateStr = dto.getEndDate() != null ? dto.getEndDate() : startDateStr;
            LocalDate start = LocalDate.parse(startDateStr);
            LocalDate end = LocalDate.parse(endDateStr);
            if (end.isBefore(start)) {
                throw new BadRequestException("End date (" + endDateStr + ") cannot be earlier than start date (" + startDateStr + ").");
            }
            if (start.isBefore(today)) {
                throw new BadRequestException("Start date cannot be in the past (" + startDateStr + ").");
            }
            LocalDate curr = start;
            while (!curr.isAfter(end)) {
                targetDates.add(curr);
                curr = curr.plusDays(1);
            }
        }

        if (targetDates.isEmpty()) {
            if (dto.getDate() == null || dto.getDate().isBlank()) {
                throw new BadRequestException("Event date is required.");
            }
            LocalDate mealDate;
            try {
                mealDate = LocalDate.parse(dto.getDate().trim());
            } catch (DateTimeParseException e) {
                throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD.");
            }
            if (mealDate.isBefore(today)) {
                throw new BadRequestException("Event date cannot be in the past (" + dto.getDate() + ").");
            }
            targetDates.add(mealDate);
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

        int totalOccurrences = targetDates.size();
        boolean isSeries = totalOccurrences > 1;
        String seriesId = isSeries ? generateSeriesId() : null;
        List<MealRequest> createdList = new ArrayList<>();
        int occurrenceIndex = 1;

        String startDateStr = targetDates.get(0).toString();
        String endDateStr = targetDates.get(targetDates.size() - 1).toString();
        List<String> dateStrings = targetDates.stream().map(LocalDate::toString).toList();

        for (LocalDate d : targetDates) {
            String dateIso = d.toString();
            String reqId = isSeries
                    ? generateRequestId(occurrenceIndex)
                    : generateRequestId(0);

            MealRequest request = MealRequest.builder()
                    .requestId(reqId)
                    .department(user.getDepartment())
                    .eventTitle(dto.getEventTitle().trim())
                    .date(dateIso)
                    .startDate(startDateStr)
                    .endDate(endDateStr)
                    .dates(dateStrings)
                    .bookingType(bookingType)
                    .isRecurring("RECURRING".equals(bookingType))
                    .seriesId(seriesId)
                    .recurrencePattern("RECURRING".equals(bookingType) ? dto.getRecurrencePattern() : null)
                    .recurrenceDays("RECURRING".equals(bookingType) ? dto.getRecurrenceDays() : null)
                    .occurrenceIndex(isSeries ? occurrenceIndex : null)
                    .totalOccurrences(isSeries ? totalOccurrences : null)
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

            createdList.add(mealRequestRepository.save(request));
            occurrenceIndex++;
        }

        MealRequest primary = createdList.get(0);

        // Notify Admins
        String notifyMsg = isSeries
                ? user.getDepartment() + " requested " + totalOccurrences + " meal arrangement occurrences (" + String.join(", ", dto.getMealTypes()) + " from " + startDateStr + " to " + endDateStr + ")."
                : user.getDepartment() + " requested food arrangement for " + startDateStr + " (" + String.join(", ", dto.getMealTypes()) + ")";

        notificationService.sendNotification(
                "MEALS_ADMIN",
                "ADMIN",
                null,
                "New Meal Arrangement Request",
                notifyMsg,
                "Snacks & Meals",
                "INFO",
                primary.getRequestId()
        );

        notificationService.sendNotification(
                "AO_ADMIN",
                "ADMIN",
                null,
                "New Meal Arrangement Request",
                notifyMsg,
                "Snacks & Meals",
                "INFO",
                primary.getRequestId()
        );

        return primary;
    }

    private String generateRequestId(int index) {
        long seq = ID_COUNTER.incrementAndGet() % 10000;
        if (index > 0) {
            return String.format("SM-%04d-%d", seq, index);
        }
        return String.format("SM-%04d", seq);
    }

    private String generateSeriesId() {
        long seq = ID_COUNTER.incrementAndGet() % 10000;
        return String.format("SM-SERIES-%04d", seq);
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
