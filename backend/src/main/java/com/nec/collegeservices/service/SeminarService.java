package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.SeminarBookingRequestDTO;
import com.nec.collegeservices.dto.SeminarBulkAvailabilityRequestDTO;
import com.nec.collegeservices.dto.SeminarCancelRequestDTO;
import com.nec.collegeservices.dto.SeminarRescheduleRequestDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.SeminarBooking;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.SeminarHallRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class SeminarService {

    private static final Logger logger = LoggerFactory.getLogger(SeminarService.class);
    private static final AtomicLong ID_COUNTER = new AtomicLong(System.currentTimeMillis() % 1000000);

    public static final ZoneId COLLEGE_ZONE = ZoneId.of("Asia/Kolkata");

    public static LocalTime getSlotStartTime(String slot) {
        if (slot == null) return null;
        return switch (slot.toUpperCase().trim()) {
            case "FORENOON", "FULL_DAY" -> LocalTime.of(9, 0);
            case "AFTERNOON" -> LocalTime.of(12, 0);
            default -> null;
        };
    }

    public static LocalTime getSlotEndTime(String slot) {
        if (slot == null) return null;
        return switch (slot.toUpperCase().trim()) {
            case "FORENOON" -> LocalTime.of(12, 0);
            case "AFTERNOON", "FULL_DAY" -> LocalTime.of(16, 0);
            default -> null;
        };
    }

    private LocalDate parseDate(String dateStr, String fieldName) {
        if (dateStr == null || dateStr.isBlank()) {
            throw new BadRequestException(fieldName + " is required.");
        }
        try {
            return LocalDate.parse(dateStr.trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid " + fieldName + " format (" + dateStr + "). Expected valid date in YYYY-MM-DD format.");
        }
    }

    @Autowired
    private SeminarHallRepository hallRepository;

    @Autowired
    private SeminarBookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RequesterResolver requesterResolver;

    @Autowired
    private AuthService authService;

    @Autowired
    private RequestIdService requestIdService;

    public List<SeminarHall> getAllHalls() {
        return getAllHalls(null, false);
    }

    public List<SeminarHall> getAllHalls(User user, Boolean assignedOnly) {
        List<SeminarHall> halls = hallRepository.findAll();
        for (SeminarHall h : halls) {
            if (h.getLocation() == null || h.getLocation().isBlank()) {
                h.setLocation(h.getLocation());
            }
        }
        boolean isCoordinator = user != null && user.hasRole("SEMINAR_COORDINATOR") && !isSuperAdmin(user) && !user.hasRole("SEMINAR_ADMIN");
        boolean filterAssigned = Boolean.TRUE.equals(assignedOnly) || 
                (isCoordinator && !Boolean.FALSE.equals(assignedOnly) && (user.getRole() == null || user.getRole().equals("SEMINAR_COORDINATOR") || (!user.hasRole("DEPARTMENT_USER") && !user.hasRole("DEPARTMENT_HOD"))));

        if (filterAssigned && isCoordinator) {
            return halls.stream()
                    .filter(h -> isHallAssigned(user.getAssignedHallIds(), h.getHallId()) || isHallAssigned(user.getAssignedHallIds(), h.getName()))
                    .toList();
        }
        return halls;
    }

    public List<SeminarHall> getMyAssignedHalls(User user) {
        List<SeminarHall> halls = hallRepository.findAll();
        if (user == null) return Collections.emptyList();
        if (isSuperAdmin(user) || user.hasRole("SEMINAR_ADMIN")) {
            return halls;
        }
        if (user.hasRole("SEMINAR_COORDINATOR")) {
            return halls.stream()
                    .filter(h -> isHallAssigned(user.getAssignedHallIds(), h.getHallId()) || isHallAssigned(user.getAssignedHallIds(), h.getName()))
                    .toList();
        }
        return Collections.emptyList();
    }

    public Optional<SeminarHall> getHallById(String hallId) {
        if (hallId == null) return Optional.empty();
        Optional<SeminarHall> opt = hallRepository.findByHallId(hallId);
        if (opt.isPresent()) return opt;
        opt = hallRepository.findById(hallId);
        if (opt.isPresent()) return opt;
        if ("SH-5".equalsIgnoreCase(hallId) || "5".equals(hallId)) {
            return hallRepository.findByHallId("TECH-HUB");
        }
        if ("TECH-HUB".equalsIgnoreCase(hallId) || "TECHHUB".equalsIgnoreCase(hallId)) {
            return hallRepository.findByHallId("SH-5");
        }
        return Optional.empty();
    }

    public boolean isSuperAdmin(User user) {
        if (user == null) return false;
        return user.hasRole("CREATOR") || user.hasRole("AO_ADMIN");
    }

    public String normalizeHallKey(String hall) {
        if (hall == null) return "";
        String s = hall.trim().toUpperCase().replace(" ", "").replace("-", "").replace("_", "");
        if (s.contains("TECHHUB") || s.equals("SH5") || s.equals("5")) return "TECHHUB";
        if (s.contains("SEMINARHALL1") || s.equals("SH1") || s.equals("1")) return "SH1";
        if (s.contains("SEMINARHALL2") || s.equals("SH2") || s.equals("2")) return "SH2";
        if (s.contains("SEMINARHALL3") || s.equals("SH3") || s.equals("3")) return "SH3";
        if (s.contains("SEMINARHALL4") || s.equals("SH4") || s.equals("4")) return "SH4";
        if (s.contains("SEMINARHALL6") || s.equals("SH6") || s.equals("6") || s.contains("BLOCK2SEMINARHALL")) return "SH6";
        return s;
    }

    public List<String> getHallIdVariants(String hallId) {
        if (hallId == null) return List.of();
        String norm = normalizeHallKey(hallId);
        if ("TECHHUB".equals(norm)) {
            return List.of("SH-5", "TECH-HUB", "Tech Hub");
        }
        if ("SH6".equals(norm)) {
            return List.of("SH-6", "Block 2 Seminar hall", "Seminar Hall 6");
        }
        return List.of(hallId);
    }

    public List<SeminarBooking> findActiveBookingsForHallAndDate(String hallId, String date) {
        List<String> variants = getHallIdVariants(hallId);
        if (variants.size() <= 1) {
            return bookingRepository.findActiveBookingsForHallAndDate(hallId, date);
        }
        Set<String> seenIds = new HashSet<>();
        List<SeminarBooking> result = new ArrayList<>();
        for (String v : variants) {
            List<SeminarBooking> list = bookingRepository.findActiveBookingsForHallAndDate(v, date);
            for (SeminarBooking b : list) {
                String key = b.getId() != null ? b.getId() : b.getBookingId();
                if (key != null && seenIds.add(key)) {
                    result.add(b);
                }
            }
        }
        return result;
    }

    public boolean isHallAssigned(List<String> assignedHalls, String hallId) {
        if (assignedHalls == null || hallId == null) return false;
        String normalizedTarget = normalizeHallKey(hallId);
        for (String a : assignedHalls) {
            if (a == null) continue;
            if (a.equalsIgnoreCase(hallId) || a.trim().equalsIgnoreCase(hallId.trim())) return true;
            if (normalizeHallKey(a).equalsIgnoreCase(normalizedTarget)) return true;
        }
        return false;
    }

    public void validateHallAuthorization(User user, String hallId, String actionDescription) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        if (isSuperAdmin(user)) {
            return; // Super Admin is unrestricted
        }
        boolean isCoordinator = user.hasRole("SEMINAR_COORDINATOR");
        boolean isSeminarAdmin = user.hasRole("SEMINAR_ADMIN");

        if (!isCoordinator && !isSeminarAdmin) {
            throw new AccessDeniedException("User does not have permission to " + actionDescription);
        }

        if (isCoordinator && !isSeminarAdmin) {
            if (!isHallAssigned(user.getAssignedHallIds(), hallId)) {
                throw new AccessDeniedException("Coordinator " + user.getUserId() + " is not authorized for hall: " + hallId);
            }
        }
    }

    /**
     * Check if two slot names conflict.
     * FULL_DAY conflicts with FORENOON, AFTERNOON, and FULL_DAY.
     * FORENOON conflicts with FORENOON and FULL_DAY.
     * AFTERNOON conflicts with AFTERNOON and FULL_DAY.
     */
    public boolean isSlotConflicting(String requestedSlot, String existingSlot) {
        if (requestedSlot == null || existingSlot == null) return false;
        String r = requestedSlot.toUpperCase().trim();
        String e = existingSlot.toUpperCase().trim();
        if (r.equals("FULL_DAY") || e.equals("FULL_DAY")) {
            return true;
        }
        return r.equals(e);
    }

    /**
     * Helper to verify if status is actively blocking a slot.
     * Blocking: PENDING, UNDER_REVIEW, APPROVED, BOOKED, CANCELLATION_REQUESTED, RESCHEDULE_REQUESTED
     * Non-blocking: REJECTED, CANCELLED, RESCHEDULED, COMPLETED
     */
    public boolean isBlockingStatus(String status) {
        if (status == null) return false;
        String s = status.toUpperCase().trim();
        return s.equals("PENDING") ||
               s.equals("UNDER_REVIEW") ||
               s.equals("APPROVED") ||
               s.equals("BOOKED") ||
               s.equals("CANCELLATION_REQUESTED") ||
               s.equals("RESCHEDULE_REQUESTED");
    }

    /**
     * Live slot availability for a hall on a single date.
     */
    public Map<String, Object> getAvailability(String hallId, String date) {
        Optional<SeminarHall> hallOpt = getHallById(hallId);
        SeminarHall hall = hallOpt.orElse(null);

        List<SeminarBooking> activeBookings = findActiveBookingsForHallAndDate(hallId, date);

        boolean forenoonBooked = false;
        boolean forenoonPending = false;
        boolean afternoonBooked = false;
        boolean afternoonPending = false;
        boolean fullDayBooked = false;
        boolean fullDayPending = false;

        for (SeminarBooking b : activeBookings) {
            String slot = b.getSlot();
            boolean isBooked = "APPROVED".equalsIgnoreCase(b.getStatus()) || "BOOKED".equalsIgnoreCase(b.getStatus());
            boolean isPending = isBlockingStatus(b.getStatus()) && !isBooked;

            if ("FORENOON".equalsIgnoreCase(slot)) {
                if (isBooked) forenoonBooked = true;
                else if (isPending) forenoonPending = true;
            } else if ("AFTERNOON".equalsIgnoreCase(slot)) {
                if (isBooked) afternoonBooked = true;
                else if (isPending) afternoonPending = true;
            } else if ("FULL_DAY".equalsIgnoreCase(slot)) {
                if (isBooked) fullDayBooked = true;
                else if (isPending) fullDayPending = true;
            }
        }

        Map<String, String> slotStatuses = new HashMap<>();

        // FORENOON
        if (fullDayBooked || forenoonBooked) {
            slotStatuses.put("FORENOON", "BOOKED");
        } else if (fullDayPending || forenoonPending) {
            slotStatuses.put("FORENOON", "PENDING");
        } else {
            slotStatuses.put("FORENOON", "AVAILABLE");
        }

        // AFTERNOON
        if (fullDayBooked || afternoonBooked) {
            slotStatuses.put("AFTERNOON", "BOOKED");
        } else if (fullDayPending || afternoonPending) {
            slotStatuses.put("AFTERNOON", "PENDING");
        } else {
            slotStatuses.put("AFTERNOON", "AVAILABLE");
        }

        // FULL_DAY
        if (fullDayBooked || (forenoonBooked && afternoonBooked)) {
            slotStatuses.put("FULL_DAY", "BOOKED");
        } else if (fullDayPending || forenoonPending || afternoonPending || forenoonBooked || afternoonBooked) {
            slotStatuses.put("FULL_DAY", "PENDING");
        } else {
            slotStatuses.put("FULL_DAY", "AVAILABLE");
        }

        LocalDate today = LocalDate.now(COLLEGE_ZONE);
        LocalTime now = LocalTime.now(COLLEGE_ZONE);
        LocalDate parsedDate = null;
        try {
            parsedDate = LocalDate.parse(date.trim());
        } catch (Exception ignored) {}

        if (parsedDate != null) {
            if (parsedDate.isBefore(today)) {
                if (!"BOOKED".equals(slotStatuses.get("FORENOON"))) slotStatuses.put("FORENOON", "PASSED");
                if (!"BOOKED".equals(slotStatuses.get("AFTERNOON"))) slotStatuses.put("AFTERNOON", "PASSED");
                if (!"BOOKED".equals(slotStatuses.get("FULL_DAY"))) slotStatuses.put("FULL_DAY", "PASSED");
            } else if (parsedDate.isEqual(today)) {
                if (!now.isBefore(LocalTime.of(9, 0))) {
                    if (!"BOOKED".equals(slotStatuses.get("FORENOON"))) slotStatuses.put("FORENOON", "PASSED");
                    if (!"BOOKED".equals(slotStatuses.get("FULL_DAY"))) slotStatuses.put("FULL_DAY", "PASSED");
                }
                if (!now.isBefore(LocalTime.of(12, 0))) {
                    if (!"BOOKED".equals(slotStatuses.get("AFTERNOON"))) slotStatuses.put("AFTERNOON", "PASSED");
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("hallId", hallId);
        result.put("hallName", hall != null ? hall.getName() : hallId);
        result.put("hallStatus", hall != null ? hall.getStatus() : "Available");
        result.put("hallCapacity", hall != null ? hall.getCapacity() : 100);
        result.put("date", date);
        result.put("slots", slotStatuses);
        result.put("bookings", activeBookings);
        return result;
    }

    /**
     * Check availability across multiple dates for recurring or multi-day booking.
     */
    public Map<String, Object> checkBulkAvailability(SeminarBulkAvailabilityRequestDTO dto) {
        String hallId = dto.getHallId();
        String requestedSlot = dto.getSlot().toUpperCase();
        List<String> dates = dto.getDates() != null ? dto.getDates() : Collections.emptyList();
        String bookingType = dto.getBookingType() != null && !dto.getBookingType().isBlank()
                ? dto.getBookingType().toUpperCase()
                : (dates.size() > 1 ? "MULTI_DAY" : "ONE_TIME");

        SeminarHall hall = hallRepository.findByHallId(hallId)
                .orElseThrow(() -> new ResourceNotFoundException("Seminar Hall not found: " + hallId));

        boolean isMaintenance = hall.getStatus() != null && 
                                !hall.getStatus().equalsIgnoreCase("Available") && 
                                !hall.getStatus().equalsIgnoreCase("Functional");
        String maintenanceReason = isMaintenance
                ? "Seminar Hall " + (hall.getName() != null ? hall.getName() : hallId) + " is currently under maintenance."
                : null;

        List<Map<String, Object>> conflicts = new ArrayList<>();
        List<Map<String, Object>> occurrences = new ArrayList<>();
        int availableCount = 0;

        LocalDate today = LocalDate.now(COLLEGE_ZONE);
        LocalTime now = LocalTime.now(COLLEGE_ZONE);
        LocalTime slotStartTime = getSlotStartTime(requestedSlot);

        for (String dateStr : dates) {
            String dayOfWeek = "";
            LocalDate parsedDate = null;
            try {
                parsedDate = java.time.LocalDate.parse(dateStr.trim());
                dayOfWeek = parsedDate.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH);
            } catch (Exception ignored) {
            }

            Map<String, Object> occ = new HashMap<>();
            occ.put("date", dateStr);
            occ.put("day", dayOfWeek);
            occ.put("hallId", hallId);
            occ.put("hallName", hall.getName());
            occ.put("hallLocation", hall.getLocation());
            occ.put("slot", requestedSlot);
            occ.put("bookingType", bookingType);

            boolean isPastDate = parsedDate != null && parsedDate.isBefore(today);
            boolean isPastTime = parsedDate != null && parsedDate.isEqual(today) && slotStartTime != null && !now.isBefore(slotStartTime);

            if (isPastDate || isPastTime) {
                String passedReason = "This booking time has already passed. Please select a future date and time.";
                occ.put("status", "UNAVAILABLE");
                occ.put("conflictReason", passedReason);
                occ.put("isPast", true);

                Map<String, Object> c = new HashMap<>();
                c.put("date", dateStr);
                c.put("day", dayOfWeek);
                c.put("hallId", hallId);
                c.put("hallName", hall.getName());
                c.put("hallLocation", hall.getLocation());
                c.put("requestedSlot", requestedSlot);
                c.put("conflictingSlot", requestedSlot);
                c.put("status", "PAST");
                c.put("conflictReason", passedReason);
                c.put("isPast", true);
                conflicts.add(c);
                occurrences.add(occ);
                continue;
            }

            if (isMaintenance) {
                occ.put("status", "UNAVAILABLE");
                occ.put("conflictReason", maintenanceReason);
                occ.put("isMaintenance", true);

                Map<String, Object> c = new HashMap<>();
                c.put("date", dateStr);
                c.put("day", dayOfWeek);
                c.put("hallId", hallId);
                c.put("hallName", hall.getName());
                c.put("hallLocation", hall.getLocation());
                c.put("requestedSlot", requestedSlot);
                c.put("conflictingSlot", "ALL");
                c.put("status", "MAINTENANCE");
                c.put("conflictReason", maintenanceReason);
                c.put("isMaintenance", true);
                conflicts.add(c);
                occurrences.add(occ);
                continue;
            }

            List<SeminarBooking> activeBookings = findActiveBookingsForHallAndDate(hallId, dateStr);
            SeminarBooking conflictingBooking = null;

            for (SeminarBooking existing : activeBookings) {
                if (isBlockingStatus(existing.getStatus()) && isSlotConflicting(requestedSlot, existing.getSlot())) {
                    conflictingBooking = existing;
                    break;
                }
            }

            if (conflictingBooking != null) {
                String reason;
                if ("FULL_DAY".equalsIgnoreCase(conflictingBooking.getSlot()) && !"FULL_DAY".equalsIgnoreCase(requestedSlot)) {
                    reason = "An existing FULL_DAY booking occupies this date.";
                } else if ("FULL_DAY".equalsIgnoreCase(requestedSlot) && !"FULL_DAY".equalsIgnoreCase(conflictingBooking.getSlot())) {
                    reason = "Requested FULL_DAY conflicts with an existing " + conflictingBooking.getSlot() + " booking.";
                } else {
                    reason = "This hall is already booked for the selected slot.";
                }

                Map<String, Object> conflictDetails = new HashMap<>();
                conflictDetails.put("requestId", conflictingBooking.getBookingId() != null ? conflictingBooking.getBookingId() : conflictingBooking.getId());
                conflictDetails.put("eventTitle", conflictingBooking.getEventTitle());
                conflictDetails.put("department", conflictingBooking.getDepartment());
                conflictDetails.put("status", conflictingBooking.getStatus());
                conflictDetails.put("slot", conflictingBooking.getSlot());
                conflictDetails.put("bookingType", conflictingBooking.getBookingType());
                conflictDetails.put("date", dateStr);

                occ.put("status", "CONFLICT");
                occ.put("conflictReason", reason);
                occ.put("conflictDetails", conflictDetails);

                Map<String, Object> c = new HashMap<>(conflictDetails);
                c.put("day", dayOfWeek);
                c.put("hallId", hallId);
                c.put("hallName", hall.getName());
                c.put("hallLocation", hall.getLocation());
                c.put("requestedSlot", requestedSlot);
                c.put("conflictingSlot", conflictingBooking.getSlot());
                c.put("conflictReason", reason);
                conflicts.add(c);
            } else {
                occ.put("status", "AVAILABLE");
                occ.put("conflictReason", null);
                occ.put("conflictDetails", null);
                availableCount++;
            }

            occurrences.add(occ);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("hallId", hallId);
        response.put("hallName", hall.getName());
        response.put("hallLocation", hall.getLocation());
        response.put("hallStatus", hall.getStatus() != null ? hall.getStatus() : "Available");
        response.put("requestedSlot", requestedSlot);
        response.put("bookingType", bookingType);
        response.put("totalChecked", dates.size());
        response.put("availableCount", availableCount);
        response.put("conflictCount", conflicts.size());
        response.put("allAvailable", conflicts.isEmpty());
        response.put("conflicts", conflicts);
        response.put("occurrences", occurrences);
        return response;
    }

    /**
     * Create seminar booking (Supports ONE_TIME, MULTI_DAY, and RECURRING).
     */
    public SeminarBooking createBooking(SeminarBookingRequestDTO dto, User user) {
        String hallId = dto.getHallId();
        if (dto.getEventTitle() == null || dto.getEventTitle().trim().isEmpty()) {
            throw new BadRequestException("Event title is required.");
        }
        if (dto.getSlot() == null || dto.getSlot().isBlank()) {
            throw new BadRequestException("Slot is required.");
        }
        String requestedSlot = dto.getSlot().toUpperCase().trim();
        if (!List.of("FORENOON", "AFTERNOON", "FULL_DAY").contains(requestedSlot)) {
            throw new BadRequestException("Invalid slot: " + requestedSlot + ". Must be FORENOON, AFTERNOON, or FULL_DAY.");
        }
        String bookingType = dto.getBookingType() != null ? dto.getBookingType().toUpperCase().trim() : "ONE_TIME";

        SeminarHall hall = hallRepository.findByHallId(hallId)
                .orElseThrow(() -> new ResourceNotFoundException("Seminar Hall not found: " + hallId));

        // 1. Hall Maintenance Validation (Section 11)
        boolean isOperational = hall.getStatus() == null || 
                                hall.getStatus().isBlank() || 
                                hall.getStatus().equalsIgnoreCase("Available") || 
                                hall.getStatus().equalsIgnoreCase("Functional");
        if (!isOperational) {
            String statusDesc = hall.getStatus().equalsIgnoreCase("Maintenance") ? "Maintenance" : hall.getStatus();
            throw new BadRequestException("Seminar Hall " + hall.getName() + " is currently under maintenance and unavailable for booking (" + statusDesc + ").");
        }

        // 2. Capacity Validation (Section 10)
        if (dto.getExpectedParticipants() != null && hall.getCapacity() != null) {
            if (dto.getExpectedParticipants() > hall.getCapacity()) {
                throw new BadRequestException("Expected participants (" + dto.getExpectedParticipants() +
                        ") exceed the selected hall capacity of " + hall.getCapacity() + " for " + hall.getName() + ".");
            }
        }

        // Optional custom times validation
        LocalTime customStartTime = null;
        LocalTime customEndTime = null;
        if (dto.getStartTime() != null && !dto.getStartTime().isBlank()) {
            try {
                customStartTime = LocalTime.parse(dto.getStartTime().trim());
            } catch (DateTimeParseException e) {
                throw new BadRequestException("Invalid start time format: " + dto.getStartTime());
            }
        }
        if (dto.getEndTime() != null && !dto.getEndTime().isBlank()) {
            try {
                customEndTime = LocalTime.parse(dto.getEndTime().trim());
            } catch (DateTimeParseException e) {
                throw new BadRequestException("Invalid end time format: " + dto.getEndTime());
            }
        }
        if (customStartTime != null && customEndTime != null && !customEndTime.isAfter(customStartTime)) {
            throw new BadRequestException("End time (" + dto.getEndTime() + ") must be after start time (" + dto.getStartTime() + ").");
        }
        LocalTime effectiveStartTime = customStartTime != null ? customStartTime : getSlotStartTime(requestedSlot);

        // Determine list of dates to book
        List<LocalDate> targetDates = new ArrayList<>();
        String startDateStr;
        String endDateStr;
        LocalDate today = LocalDate.now(COLLEGE_ZONE);
        LocalTime now = LocalTime.now(COLLEGE_ZONE);

        if (bookingType.equals("RECURRING")) {
            // Weekly Recurring
            startDateStr = dto.getStartDate() != null ? dto.getStartDate() : dto.getDate();
            endDateStr = dto.getEndDate() != null ? dto.getEndDate() : startDateStr;

            LocalDate start = parseDate(startDateStr, "Start date");
            LocalDate end = parseDate(endDateStr, "End date");

            if (end.isBefore(start)) {
                throw new BadRequestException("End date (" + endDateStr + ") cannot be earlier than start date (" + startDateStr + ").");
            }
            if (start.isBefore(today)) {
                throw new BadRequestException("Start date cannot be in the past (" + startDateStr + "). Please select a future date and time.");
            }

            List<String> repeatDays = dto.getRecurrenceDays();
            if (repeatDays == null || repeatDays.isEmpty()) {
                throw new BadRequestException("Select at least one weekday for recurring event.");
            }

            Set<DayOfWeek> targetDays = new LinkedHashSet<>();
            for (String day : repeatDays) {
                try {
                    targetDays.add(DayOfWeek.valueOf(day.toUpperCase().trim()));
                } catch (IllegalArgumentException e) {
                    throw new BadRequestException("Invalid recurrence weekday: " + day);
                }
            }

            Set<DayOfWeek> matchedDays = new HashSet<>();
            LocalDate curr = start;
            while (!curr.isAfter(end)) {
                if (targetDays.contains(curr.getDayOfWeek())) {
                    targetDates.add(curr);
                    matchedDays.add(curr.getDayOfWeek());
                }
                curr = curr.plusDays(1);
            }

            // Check if any selected weekday does not occur within the date range
            List<String> missingDays = new ArrayList<>();
            for (String day : repeatDays) {
                DayOfWeek dow = DayOfWeek.valueOf(day.toUpperCase().trim());
                if (!matchedDays.contains(dow)) {
                    String displayName = dow.name().substring(0, 1).toUpperCase() + dow.name().substring(1).toLowerCase();
                    if (!missingDays.contains(displayName)) {
                        missingDays.add(displayName);
                    }
                }
            }
            if (!missingDays.isEmpty()) {
                throw new BadRequestException("The selected weekday(s) [" + String.join(", ", missingDays) +
                        "] do not occur within the date range (" + startDateStr + " to " + endDateStr +
                        "). Please extend the date range or adjust your weekday selection.");
            }

            if (targetDates.isEmpty()) {
                throw new BadRequestException("No dates match the selected weekdays between " + startDateStr + " and " + endDateStr + ".");
            }

            // Check if explicit occurrences were passed and whether any falls outside the allowed range
            if (dto.getDates() != null && !dto.getDates().isEmpty()) {
                for (String dStr : dto.getDates()) {
                    LocalDate d = parseDate(dStr, "Occurrence date");
                    if (d.isBefore(start) || d.isAfter(end)) {
                        throw new BadRequestException("Occurrence date (" + dStr + ") falls outside the allowed date range (" + startDateStr + " to " + endDateStr + ").");
                    }
                }
            }

            // Verify generated occurrences strictly fall within [start, end]
            for (LocalDate d : targetDates) {
                if (d.isBefore(start) || d.isAfter(end)) {
                    throw new BadRequestException("Occurrence date (" + d + ") falls outside the allowed date range (" + startDateStr + " to " + endDateStr + ").");
                }
            }

            if (targetDates.size() > 52) {
                throw new BadRequestException("Recurring booking exceeds maximum allowed occurrences of 52 (requested: " + targetDates.size() + ").");
            }

        } else if (bookingType.equals("MULTI_DAY")) {
            // Multi-Day Event
            startDateStr = dto.getStartDate() != null ? dto.getStartDate() : dto.getDate();
            endDateStr = dto.getEndDate() != null ? dto.getEndDate() : startDateStr;

            LocalDate start = parseDate(startDateStr, "Start date");
            LocalDate end = parseDate(endDateStr, "End date");

            if (end.isBefore(start)) {
                throw new BadRequestException("End date (" + endDateStr + ") cannot be earlier than start date (" + startDateStr + ").");
            }
            if (start.isBefore(today)) {
                throw new BadRequestException("Start date cannot be in the past (" + startDateStr + "). Please select a future date and time.");
            }

            // Check if explicit occurrences were passed and whether any falls outside the allowed range
            if (dto.getDates() != null && !dto.getDates().isEmpty()) {
                for (String dStr : dto.getDates()) {
                    LocalDate d = parseDate(dStr, "Occurrence date");
                    if (d.isBefore(start) || d.isAfter(end)) {
                        throw new BadRequestException("Occurrence date (" + dStr + ") falls outside the allowed date range (" + startDateStr + " to " + endDateStr + ").");
                    }
                }
            }

            LocalDate curr = start;
            while (!curr.isAfter(end)) {
                targetDates.add(curr);
                curr = curr.plusDays(1);
            }

            for (LocalDate d : targetDates) {
                if (d.isBefore(start) || d.isAfter(end)) {
                    throw new BadRequestException("Occurrence date (" + d + ") falls outside the allowed date range (" + startDateStr + " to " + endDateStr + ").");
                }
            }
        } else {
            // ONE_TIME
            startDateStr = dto.getDate() != null && !dto.getDate().isBlank() ? dto.getDate() : dto.getStartDate();
            LocalDate start = parseDate(startDateStr, "Booking date");
            if (start.isBefore(today)) {
                throw new BadRequestException("This booking time has already passed. Please select a future date and time.");
            }
            if (start.isEqual(today) && effectiveStartTime != null && !now.isBefore(effectiveStartTime)) {
                throw new BadRequestException("This booking time has already passed. Please select a future date and time.");
            }
            endDateStr = startDateStr;
            targetDates.add(start);
        }

        // Validate each occurrence date and time
        for (LocalDate d : targetDates) {
            if (d.isBefore(today)) {
                String msg = targetDates.size() > 1
                        ? "Occurrence on " + d + ": This booking date has already passed. Please select a future date and time."
                        : "This booking time has already passed. Please select a future date and time.";
                throw new BadRequestException(msg);
            }
            if (d.isEqual(today) && effectiveStartTime != null && !now.isBefore(effectiveStartTime)) {
                String msg = targetDates.size() > 1
                        ? "Occurrence on " + d + " (" + requestedSlot + "): This booking time has already passed. Please select a future date and time."
                        : "This booking time has already passed. Please select a future date and time.";
                throw new BadRequestException(msg);
            }
        }

        // 3. Conflict Detection across ALL target dates (Section 6, 8)
        List<String> conflictMessages = new ArrayList<>();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy");

        for (LocalDate d : targetDates) {
            String dateIso = d.toString();
            List<SeminarBooking> active = findActiveBookingsForHallAndDate(hallId, dateIso);

            for (SeminarBooking existing : active) {
                if (isBlockingStatus(existing.getStatus()) && isSlotConflicting(requestedSlot, existing.getSlot())) {
                    conflictMessages.add("Hall " + hall.getName() + " is unavailable on " + d.format(dtf) +
                            " for " + requestedSlot + " (Conflict with: " + existing.getBookingId() + " " +
                            existing.getSlot() + " [" + existing.getStatus() + "])");
                }
            }
        }

        if (!conflictMessages.isEmpty()) {
            throw new ConflictException(String.join(" | ", conflictMessages));
        }

        // 4. Create and Save Bookings
        int totalOccurrences = targetDates.size();
        boolean isSeries = totalOccurrences > 1;
        String seriesId = isSeries ? generateSeriesId(user, user.getDepartment()) : null;

        List<SeminarBooking> createdList = new ArrayList<>();

        if (bookingType.equals("RECURRING")) {
            // Task 7: A single recurring submission creates ONE parent request with ONE stable request ID
            String parentBookingId = generateBookingId(user, user.getDepartment());
            List<String> dateStrings = new ArrayList<>();
            List<SeminarBooking.Occurrence> occurrences = new ArrayList<>();
            int occIdx = 1;

            for (LocalDate d : targetDates) {
                String dateIso = d.toString();
                dateStrings.add(dateIso);
                occurrences.add(SeminarBooking.Occurrence.builder()
                        .index(occIdx++)
                        .date(dateIso)
                        .dayOfWeek(d.getDayOfWeek().toString())
                        .hallId(hallId)
                        .hallName(hall.getName())
                        .hallLocation(hall.getLocation())
                        .slot(requestedSlot)
                        .startTime(dto.getStartTime() != null ? dto.getStartTime() : (getSlotStartTime(requestedSlot) != null ? getSlotStartTime(requestedSlot).toString() : null))
                        .endTime(dto.getEndTime() != null ? dto.getEndTime() : (getSlotEndTime(requestedSlot) != null ? getSlotEndTime(requestedSlot).toString() : null))
                        .status("PENDING")
                        .build());
            }

            SeminarBooking.StatusHistoryEntry initialHistory = SeminarBooking.StatusHistoryEntry.builder()
                    .status("PENDING")
                    .actor(user.getName() != null ? user.getName() : user.getUserId())
                    .timestamp(LocalDateTime.now())
                    .comment("Recurring booking request submitted by " + user.getDepartment() + " Department (" + totalOccurrences + " occurrences)")
                    .build();

            SeminarBooking parentBooking = SeminarBooking.builder()
                    .bookingId(parentBookingId)
                    .department(user.getDepartment())
                    .eventTitle(dto.getEventTitle())
                    .purpose(dto.getPurpose())
                    .expectedParticipants(dto.getExpectedParticipants())
                    .additionalRequirements(dto.getAdditionalRequirements())
                    .date(targetDates.get(0).toString()) // Primary/first occurrence date
                    .startDate(startDateStr)
                    .endDate(endDateStr)
                    .dates(dateStrings)
                    .occurrences(occurrences)
                    .hallId(hallId)
                    .hallName(hall.getName())
                    .hallLocation(hall.getLocation())
                    .slot(requestedSlot)
                    .startTime(dto.getStartTime() != null ? dto.getStartTime() : (getSlotStartTime(requestedSlot) != null ? getSlotStartTime(requestedSlot).toString() : null))
                    .endTime(dto.getEndTime() != null ? dto.getEndTime() : (getSlotEndTime(requestedSlot) != null ? getSlotEndTime(requestedSlot).toString() : null))
                    .status("PENDING")
                    .bookingType("RECURRING")
                    .isRecurring(true)
                    .seriesId(seriesId)
                    .recurrencePattern(dto.getRecurrencePattern() != null ? dto.getRecurrencePattern() : "WEEKLY")
                    .recurrenceDays(dto.getRecurrenceDays())
                    .occurrenceIndex(1)
                    .totalOccurrences(totalOccurrences)
                    .requestedBy(user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getUserId())
                    .requesterUserId(user.getUserId())
                    .statusHistory(new ArrayList<>(List.of(initialHistory)))
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            createdList.add(bookingRepository.save(parentBooking));
        } else {
            // ONE_TIME and MULTI_DAY continue as before
            int occurrenceIndex = 1;
            for (LocalDate d : targetDates) {
                String dateIso = d.toString();
                String bookingId = generateBookingId(user, user.getDepartment());

                SeminarBooking.StatusHistoryEntry initialHistory = SeminarBooking.StatusHistoryEntry.builder()
                        .status("PENDING")
                        .actor(user.getName() != null ? user.getName() : user.getUserId())
                        .timestamp(LocalDateTime.now())
                        .comment("Booking request submitted by " + user.getDepartment() + " Department")
                        .build();

                SeminarBooking booking = SeminarBooking.builder()
                        .bookingId(bookingId)
                        .department(user.getDepartment())
                        .eventTitle(dto.getEventTitle())
                        .purpose(dto.getPurpose())
                        .expectedParticipants(dto.getExpectedParticipants())
                        .additionalRequirements(dto.getAdditionalRequirements())
                        .date(dateIso)
                        .startDate(startDateStr)
                        .endDate(endDateStr)
                        .hallId(hallId)
                        .hallName(hall.getName())
                        .hallLocation(hall.getLocation())
                        .slot(requestedSlot)
                        .startTime(dto.getStartTime() != null ? dto.getStartTime() : (getSlotStartTime(requestedSlot) != null ? getSlotStartTime(requestedSlot).toString() : null))
                        .endTime(dto.getEndTime() != null ? dto.getEndTime() : (getSlotEndTime(requestedSlot) != null ? getSlotEndTime(requestedSlot).toString() : null))
                        .status("PENDING")
                        .bookingType(bookingType)
                        .isRecurring(false)
                        .seriesId(seriesId)
                        .occurrenceIndex(isSeries ? occurrenceIndex : null)
                        .totalOccurrences(isSeries ? totalOccurrences : null)
                        .requestedBy(user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getUserId())
                        .requesterUserId(user.getUserId())
                        .statusHistory(new ArrayList<>(List.of(initialHistory)))
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                createdList.add(bookingRepository.save(booking));
                occurrenceIndex++;
            }
        }

        SeminarBooking primary = createdList.get(0);

        // 5. Notify Administrators
        String notificationSummary = bookingType.equals("RECURRING")
                ? user.getDepartment() + " requested recurring booking (" + totalOccurrences + " occurrences) for " + hall.getName() + " (" + startDateStr + " to " + endDateStr + ")"
                : isSeries
                ? user.getDepartment() + " requested " + totalOccurrences + " bookings for " + hall.getName() + " (" + startDateStr + " to " + endDateStr + ")"
                : user.getDepartment() + " requested " + hall.getName() + " on " + startDateStr + " (" + requestedSlot + ")";

        notificationService.sendNotification(
                "SEMINAR_ADMIN",
                "ADMIN",
                null,
                "New Seminar Hall Request",
                notificationSummary,
                "Seminar Hall",
                "INFO",
                primary.getBookingId()
        );

        notificationService.sendNotification(
                "AO_ADMIN",
                "ADMIN",
                null,
                "New Seminar Hall Request",
                notificationSummary,
                "Seminar Hall",
                "INFO",
                primary.getBookingId()
        );

        return primary;
    }

    private String generateBookingId(User user, String dept) {
        return requestIdService.generateRequestId("SEM", user, dept);
    }

    private String generateSeriesId(User user, String dept) {
        return requestIdService.generateSeriesId("SEM", user, dept);
    }

    public List<SeminarBooking> getAllBookings(String hallId, String department, String status, String date) {
        return getAllBookings(hallId, department, status, date, null, null);
    }

    public List<SeminarBooking> getAllBookings(String hallId, String department, String status, String date, String fromDate, String toDate, User user) {
        if (fromDate != null && toDate != null && !fromDate.isBlank() && !toDate.isBlank()) {
            if (toDate.compareTo(fromDate) < 0) {
                throw new BadRequestException("To date cannot be earlier than From date.");
            }
        }
        List<SeminarBooking> all = bookingRepository.findAll();

        boolean isStaffOrAdmin = user != null && (isSuperAdmin(user) || user.hasRole("SEMINAR_ADMIN") || user.hasRole("SEMINAR_COORDINATOR"));
        boolean isCoordinator = user != null && user.hasRole("SEMINAR_COORDINATOR") && !isSuperAdmin(user) && !user.hasRole("SEMINAR_ADMIN");

        // If coordinator explicitly queries an unassigned hallId, deny access (Backend Authorization - Test 7)
        if (isCoordinator && hallId != null && !hallId.isBlank() && !hallId.equalsIgnoreCase("ALL")) {
            if (!isHallAssigned(user.getAssignedHallIds(), hallId)) {
                throw new AccessDeniedException("Coordinator " + user.getUserId() + " is not authorized for hall: " + hallId);
            }
        }

        return all.stream()
                .filter(b -> {
                    if (isCoordinator) {
                        return isHallAssigned(user.getAssignedHallIds(), b.getHallId());
                    }
                    if (!isStaffOrAdmin && user != null) {
                        return UnifiedRequestService.isRequestedByUser(b.getRequestedBy(), user);
                    }
                    return true;
                })
                .filter(b -> hallId == null || hallId.isBlank() || hallId.equalsIgnoreCase("ALL") || 
                             b.getHallId().equalsIgnoreCase(hallId) || 
                             normalizeHallKey(b.getHallId()).equalsIgnoreCase(normalizeHallKey(hallId)))
                .filter(b -> department == null || department.isBlank() || department.equalsIgnoreCase("ALL") || b.getDepartment().equalsIgnoreCase(department))
                .filter(b -> status == null || status.isBlank() || status.equalsIgnoreCase("ALL") || b.getStatus().equalsIgnoreCase(status))
                .filter(b -> {
                    if (fromDate != null && !fromDate.isBlank() && toDate != null && !toDate.isBlank()) {
                        if (b.getDates() != null && !b.getDates().isEmpty()) {
                            return b.getDates().stream().anyMatch(d -> d.compareTo(fromDate) >= 0 && d.compareTo(toDate) <= 0);
                        }
                        return b.getDate() != null && b.getDate().compareTo(fromDate) >= 0 && b.getDate().compareTo(toDate) <= 0;
                    }
                    if (date != null && !date.isBlank()) {
                        if (b.getDates() != null && !b.getDates().isEmpty()) {
                            return b.getDates().contains(date);
                        }
                        return date.equals(b.getDate());
                    }
                    return true;
                })
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public List<SeminarBooking> getAllBookings(String hallId, String department, String status, String date, String fromDate, String toDate) {
        return getAllBookings(hallId, department, status, date, fromDate, toDate, null);
    }

    public List<SeminarBooking> getBookingsInDateRange(String fromDate, String toDate, String hallId) {
        if (fromDate != null && toDate != null && !fromDate.isBlank() && !toDate.isBlank()) {
            if (toDate.compareTo(fromDate) < 0) {
                throw new BadRequestException("To date cannot be earlier than From date.");
            }
        }
        List<SeminarBooking> all = bookingRepository.findAll();
        Set<String> hallFilterSet = new HashSet<>();
        if (hallId != null && !hallId.isBlank() && !hallId.equalsIgnoreCase("ALL")) {
            for (String h : hallId.split(",")) {
                String trimmed = h.trim();
                if (!trimmed.isEmpty() && !trimmed.equalsIgnoreCase("ALL")) {
                    hallFilterSet.add(trimmed.toUpperCase());
                    hallFilterSet.add(normalizeHallKey(trimmed).toUpperCase());
                }
            }
        }

        List<SeminarBooking> filteredList = new ArrayList<>();
        for (SeminarBooking b : all) {
            if (b.getStatus() != null && b.getStatus().equalsIgnoreCase("CANCELLED")) {
                continue;
            }
            if (!hallFilterSet.isEmpty()) {
                if (b.getHallId() == null) continue;
                String hid = b.getHallId().toUpperCase();
                if (!hallFilterSet.contains(hid) && !hallFilterSet.contains(normalizeHallKey(hid).toUpperCase())) {
                    continue;
                }
            }

            if (b.getDates() != null && !b.getDates().isEmpty()) {
                for (String dStr : b.getDates()) {
                    if ((fromDate == null || fromDate.isBlank() || dStr.compareTo(fromDate) >= 0) &&
                        (toDate == null || toDate.isBlank() || dStr.compareTo(toDate) <= 0)) {
                        SeminarBooking occView = SeminarBooking.builder()
                                .id(b.getId() + "_" + dStr)
                                .bookingId(b.getBookingId())
                                .department(b.getDepartment())
                                .eventTitle(b.getEventTitle())
                                .purpose(b.getPurpose())
                                .expectedParticipants(b.getExpectedParticipants())
                                .additionalRequirements(b.getAdditionalRequirements())
                                .date(dStr)
                                .startDate(b.getStartDate())
                                .endDate(b.getEndDate())
                                .dates(b.getDates())
                                .occurrences(b.getOccurrences())
                                .hallId(b.getHallId())
                                .hallName(b.getHallName())
                                .hallLocation(b.getHallLocation())
                                .slot(b.getSlot())
                                .startTime(b.getStartTime())
                                .endTime(b.getEndTime())
                                .status(b.getStatus())
                                .bookingType(b.getBookingType())
                                .isRecurring(b.getIsRecurring())
                                .seriesId(b.getSeriesId())
                                .recurrencePattern(b.getRecurrencePattern())
                                .recurrenceDays(b.getRecurrenceDays())
                                .occurrenceIndex(b.getOccurrenceIndex())
                                .totalOccurrences(b.getTotalOccurrences())
                                .requestedBy(b.getRequestedBy())
                                .requesterUserId(b.getRequesterUserId())
                                .createdAt(b.getCreatedAt())
                                .updatedAt(b.getUpdatedAt())
                                .build();
                        filteredList.add(occView);
                    }
                }
            } else {
                if ((fromDate == null || fromDate.isBlank() || b.getDate().compareTo(fromDate) >= 0) &&
                    (toDate == null || toDate.isBlank() || b.getDate().compareTo(toDate) <= 0)) {
                    filteredList.add(b);
                }
            }
        }

        return filteredList.stream()
                .sorted((a, b) -> {
                    int dateCmp = a.getDate().compareTo(b.getDate());
                    if (dateCmp != 0) return dateCmp;
                    return Integer.compare(getSlotOrder(a.getSlot()), getSlotOrder(b.getSlot()));
                })
                .toList();
    }

    private int getSlotOrder(String slot) {
        if (slot == null) return 99;
        return switch (slot.toUpperCase()) {
            case "FORENOON" -> 1;
            case "AFTERNOON" -> 2;
            case "FULL_DAY" -> 3;
            default -> 4;
        };
    }

    public List<SeminarBooking> getBookingsByDepartment(String department) {
        return bookingRepository.findByDepartment(department).stream()
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public List<SeminarBooking> getMyBookings(String hallId, String status, String date, String fromDate, String toDate, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        List<SeminarBooking> all = bookingRepository.findAll();
        return all.stream()
                .filter(b -> UnifiedRequestService.isRequestedByUser(b.getRequestedBy(), user))
                .filter(b -> hallId == null || hallId.isBlank() || hallId.equalsIgnoreCase("ALL") || 
                             b.getHallId().equalsIgnoreCase(hallId) || 
                             normalizeHallKey(b.getHallId()).equalsIgnoreCase(normalizeHallKey(hallId)))
                .filter(b -> status == null || status.isBlank() || status.equalsIgnoreCase("ALL") || b.getStatus().equalsIgnoreCase(status))
                .filter(b -> {
                    if (fromDate != null && !fromDate.isBlank() && toDate != null && !toDate.isBlank()) {
                        if (b.getDates() != null && !b.getDates().isEmpty()) {
                            return b.getDates().stream().anyMatch(d -> d.compareTo(fromDate) >= 0 && d.compareTo(toDate) <= 0);
                        }
                        return b.getDate() != null && b.getDate().compareTo(fromDate) >= 0 && b.getDate().compareTo(toDate) <= 0;
                    }
                    if (date != null && !date.isBlank()) {
                        if (b.getDates() != null && !b.getDates().isEmpty()) {
                            return b.getDates().contains(date);
                        }
                        return date.equals(b.getDate());
                    }
                    return true;
                })
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }


    public SeminarBooking getBookingById(String id, User user) {
        SeminarBooking booking = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        if (isSuperAdmin(user) || user.hasRole("SEMINAR_ADMIN")) {
            return booking;
        }

        if (user.hasRole("SEMINAR_COORDINATOR") && isHallAssigned(user.getAssignedHallIds(), booking.getHallId())) {
            return booking;
        }

        if (UnifiedRequestService.isRequestedByUser(booking.getRequestedBy(), user)) {
            return booking;
        }

        throw new AccessDeniedException("You are not authorized to view bookings created by other users.");
    }

    public List<SeminarBooking> getSeriesBookings(String seriesId, User user) {
        List<SeminarBooking> list = bookingRepository.findBySeriesId(seriesId);
        if (list.isEmpty()) return list;

        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        if (isSuperAdmin(user) || user.hasRole("SEMINAR_ADMIN")) {
            return list;
        }

        SeminarBooking first = list.get(0);
        if (user.hasRole("SEMINAR_COORDINATOR") && isHallAssigned(user.getAssignedHallIds(), first.getHallId())) {
            return list;
        }

        if (UnifiedRequestService.isRequestedByUser(first.getRequestedBy(), user)) {
            return list;
        }

        throw new AccessDeniedException("You are not authorized to view bookings created by other users.");
    }

    /**
     * Admin Approval with Fresh Conflict Recheck (Section 12, 18, 31).
     */
    public SeminarBooking approveBooking(String id) {
        return approveBooking(id, null);
    }

    public SeminarBooking approveBooking(String id, User user) {
        SeminarBooking booking = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }
        validateHallAuthorization(user, booking.getHallId(), "approve booking");

        // Self-approval guard: Requester cannot approve their own request
        if (user != null && (UnifiedRequestService.isRequestedByUser(booking.getRequestedBy(), user) ||
                (booking.getRequesterUserId() != null && booking.getRequesterUserId().equalsIgnoreCase(user.getUserId())))) {
            throw new BadRequestException("Self-approval is not permitted. Requesters cannot approve their own requests.");
        }

        // State validation guards (Cannot double-approve, cannot approve rejected or cancelled booking)
        String currentStatus = booking.getStatus() != null ? booking.getStatus().toUpperCase().trim() : "";
        if (currentStatus.equals("APPROVED") || currentStatus.equals("BOOKED")) {
            throw new BadRequestException("Cannot approve booking: booking is already approved.");
        }
        if (currentStatus.equals("REJECTED")) {
            throw new BadRequestException("Cannot approve booking: booking has already been rejected.");
        }
        if (currentStatus.equals("CANCELLED")) {
            throw new BadRequestException("Cannot approve booking: booking has already been cancelled.");
        }

        // 1. Fresh Availability Recheck on Approval: conflicts only if another booking is already APPROVED or BOOKED
        List<String> checkDates = (booking.getDates() != null && !booking.getDates().isEmpty())
                ? booking.getDates()
                : (booking.getDate() != null ? List.of(booking.getDate()) : List.of());

        for (String chkDate : checkDates) {
            List<SeminarBooking> activeBookings = findActiveBookingsForHallAndDate(booking.getHallId(), chkDate);
            for (SeminarBooking existing : activeBookings) {
                if (!existing.getId().equals(booking.getId()) && !existing.getBookingId().equals(booking.getBookingId())) {
                    boolean isAlreadyApproved = "APPROVED".equalsIgnoreCase(existing.getStatus()) || "BOOKED".equalsIgnoreCase(existing.getStatus()) || "CANCELLATION_REQUESTED".equalsIgnoreCase(existing.getStatus());
                    if (isAlreadyApproved && isSlotConflicting(booking.getSlot(), existing.getSlot())) {
                        throw new ConflictException("This seminar hall and slot is no longer available. Conflicting booking " +
                                existing.getBookingId() + " (" + existing.getSlot() + ") is already " + existing.getStatus() +
                                " on " + chkDate + " for " + booking.getHallName());
                    }
                }
            }
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Admin";

        booking.setStatus("APPROVED");
        booking.setApprovedBy(actor);
        booking.setApprovedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());

        if (booking.getOccurrences() != null) {
            for (SeminarBooking.Occurrence occ : booking.getOccurrences()) {
                occ.setStatus("APPROVED");
            }
        }

        if (booking.getStatusHistory() == null) {
            booking.setStatusHistory(new ArrayList<>());
        }
        booking.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                .status("APPROVED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment("Booking approved and confirmed by " + actor)
                .build());

        SeminarBooking saved = bookingRepository.save(booking);

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(booking.getRequesterUserId(), booking.getRequestedBy(), booking.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                booking.getDepartment(),
                requesterId,
                "Seminar Request Approved",
                "Your booking for " + booking.getHallName() + " on " + booking.getDate() + " (" + booking.getSlot() + ") has been approved and confirmed!",
                "Seminar Hall",
                "SUCCESS",
                saved.getBookingId()
        );

        return saved;
    }

    /**
     * Admin Rejection with Reason (Section 13, 32).
     */
    public SeminarBooking rejectBooking(String id, String reason) {
        return rejectBooking(id, reason, null);
    }

    public SeminarBooking rejectBooking(String id, String reason, User user) {
        SeminarBooking booking = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }
        validateHallAuthorization(user, booking.getHallId(), "reject booking");

        // State validation guards (Cannot reject already approved, rejected, or cancelled booking)
        String currentStatus = booking.getStatus() != null ? booking.getStatus().toUpperCase().trim() : "";
        if (currentStatus.equals("APPROVED") || currentStatus.equals("BOOKED")) {
            throw new BadRequestException("Cannot reject approved booking. Use cancellation workflow instead.");
        }
        if (currentStatus.equals("REJECTED")) {
            throw new BadRequestException("Cannot reject booking: booking is already rejected.");
        }
        if (currentStatus.equals("CANCELLED")) {
            throw new BadRequestException("Cannot reject booking: booking has already been cancelled.");
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Admin";
        String comment = reason != null && !reason.isBlank() ? reason : "Request declined by Administrator";

        booking.setStatus("REJECTED");
        booking.setRejectionReason(comment);
        booking.setUpdatedAt(LocalDateTime.now());

        if (booking.getOccurrences() != null) {
            for (SeminarBooking.Occurrence occ : booking.getOccurrences()) {
                occ.setStatus("REJECTED");
            }
        }

        if (booking.getStatusHistory() == null) {
            booking.setStatusHistory(new ArrayList<>());
        }
        booking.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                .status("REJECTED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment(comment)
                .build());

        SeminarBooking saved = bookingRepository.save(booking);

        String requesterId = requesterResolver.resolveRequesterUserId(booking.getRequesterUserId(), booking.getRequestedBy(), booking.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                booking.getDepartment(),
                requesterId,
                "Seminar Request Rejected",
                "Your booking for " + booking.getHallName() + " on " + booking.getDate() + " was rejected. Reason: " + booking.getRejectionReason(),
                "Seminar Hall",
                "DANGER",
                saved.getBookingId()
        );

        return saved;
    }

    /**
     * Cancellation Handler (Section 14, 15, 16, 20).
     * - If PENDING: requester cancels directly -> CANCELLED.
     * - If APPROVED: requester requests cancellation -> CANCELLATION_REQUESTED.
     */
    public SeminarBooking cancelBooking(String id, SeminarCancelRequestDTO dto, User user) {
        SeminarBooking booking = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        // Authorization check: User must own the booking or be an Admin
        boolean isAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("SEMINAR_ADMIN"));
        if (!isAdmin && !UnifiedRequestService.isRequestedByUser(booking.getRequestedBy(), user)) {
            throw new AccessDeniedException("You are not authorized to cancel bookings created by other users.");
        }

        String reason = dto.getReason();
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("Cancellation reason is required.");
        }

        String scope = dto.getScope() != null ? dto.getScope().toUpperCase().trim() : "THIS_OCCURRENCE";
        String currentStatus = booking.getStatus().toUpperCase();

        if (currentStatus.equals("CANCELLED") || currentStatus.equals("REJECTED")) {
            throw new BadRequestException("Booking is already " + currentStatus + ".");
        }

        List<SeminarBooking> targetBookings = new ArrayList<>();
        if (booking.getSeriesId() != null && !scope.equals("THIS_OCCURRENCE")) {
            if (scope.equals("ENTIRE_SERIES")) {
                targetBookings.addAll(bookingRepository.findBySeriesId(booking.getSeriesId()));
            } else if (scope.equals("THIS_AND_FUTURE")) {
                targetBookings.addAll(bookingRepository.findBySeriesIdAndDateGreaterThanEqual(booking.getSeriesId(), booking.getDate()));
            }
        } else {
            targetBookings.add(booking);
        }

        if (targetBookings.isEmpty()) {
            targetBookings.add(booking);
        }

        String newStatus;
        boolean directCancel = currentStatus.equals("PENDING") || currentStatus.equals("UNDER_REVIEW");

        if (directCancel) {
            newStatus = "CANCELLED";
        } else if (currentStatus.equals("APPROVED") || currentStatus.equals("BOOKED")) {
            newStatus = "CANCELLATION_REQUESTED";
        } else {
            throw new BadRequestException("Cannot request cancellation for booking in status: " + currentStatus);
        }

        for (SeminarBooking b : targetBookings) {
            b.setStatus(newStatus);
            b.setCancellationReason(reason);
            b.setCancellationScope(scope);
            b.setCancellationRequestedAt(LocalDateTime.now());
            b.setCancellationRequestedBy(user.getName() != null ? user.getName() : user.getUserId());
            b.setUpdatedAt(LocalDateTime.now());

            if (b.getOccurrences() != null) {
                for (SeminarBooking.Occurrence occ : b.getOccurrences()) {
                    occ.setStatus(newStatus);
                }
            }

            if (b.getStatusHistory() == null) {
                b.setStatusHistory(new ArrayList<>());
            }
            b.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                    .status(newStatus)
                    .actor(user.getName() != null ? user.getName() : user.getUserId())
                    .timestamp(LocalDateTime.now())
                    .comment(directCancel ? "Cancelled directly: " + reason : "Cancellation requested: " + reason)
                    .build());

            bookingRepository.save(b);
        }

        if (!directCancel) {
            notificationService.sendNotification(
                    "SEMINAR_ADMIN",
                    "ADMIN",
                    null,
                    "Seminar Cancellation Requested",
                    user.getDepartment() + " requested cancellation for " + booking.getHallName() + " on " + booking.getDate() + ". Reason: " + reason,
                    "Seminar Hall",
                    "WARNING",
                    booking.getBookingId()
            );
        }

        return bookingRepository.findById(booking.getId()).orElse(booking);
    }

    /**
     * Admin Approve Cancellation (Section 14, 16, 33).
     */
    public SeminarBooking approveCancellation(String id) {
        return approveCancellation(id, null);
    }

    public SeminarBooking approveCancellation(String id, User user) {
        SeminarBooking booking = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }
        validateHallAuthorization(user, booking.getHallId(), "approve cancellation");

        if (!"CANCELLATION_REQUESTED".equalsIgnoreCase(booking.getStatus())) {
            throw new BadRequestException("Booking is not in CANCELLATION_REQUESTED status.");
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Admin";
        String scope = booking.getCancellationScope() != null ? booking.getCancellationScope() : "THIS_OCCURRENCE";
        List<SeminarBooking> targetBookings = new ArrayList<>();

        if (booking.getSeriesId() != null && !scope.equals("THIS_OCCURRENCE")) {
            if (scope.equals("ENTIRE_SERIES")) {
                targetBookings.addAll(bookingRepository.findBySeriesId(booking.getSeriesId()));
            } else if (scope.equals("THIS_AND_FUTURE")) {
                targetBookings.addAll(bookingRepository.findBySeriesIdAndDateGreaterThanEqual(booking.getSeriesId(), booking.getDate()));
            }
        } else {
            targetBookings.add(booking);
        }

        for (SeminarBooking b : targetBookings) {
            b.setStatus("CANCELLED");
            b.setCancellationReviewedAt(LocalDateTime.now());
            b.setCancellationReviewedBy(actor);
            b.setUpdatedAt(LocalDateTime.now());

            if (b.getOccurrences() != null) {
                for (SeminarBooking.Occurrence occ : b.getOccurrences()) {
                    occ.setStatus("CANCELLED");
                }
            }

            if (b.getStatusHistory() == null) {
                b.setStatusHistory(new ArrayList<>());
            }
            b.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                    .status("CANCELLED")
                    .actor(actor)
                    .timestamp(LocalDateTime.now())
                    .comment("Cancellation approved by " + actor)
                    .build());

            bookingRepository.save(b);
        }

        String requesterId = requesterResolver.resolveRequesterUserId(booking.getRequesterUserId(), booking.getRequestedBy(), booking.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                booking.getDepartment(),
                requesterId,
                "Cancellation Approved",
                "Your cancellation for " + booking.getHallName() + " on " + booking.getDate() + " has been approved.",
                "Seminar Hall",
                "INFO",
                booking.getBookingId()
        );

        return bookingRepository.findById(booking.getId()).orElse(booking);
    }

    /**
     * Admin Reject Cancellation (Section 14, 33).
     */
    public SeminarBooking rejectCancellation(String id, String reason) {
        return rejectCancellation(id, reason, null);
    }

    public SeminarBooking rejectCancellation(String id, String reason, User user) {
        SeminarBooking booking = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }
        validateHallAuthorization(user, booking.getHallId(), "reject cancellation");

        if (!"CANCELLATION_REQUESTED".equalsIgnoreCase(booking.getStatus())) {
            throw new BadRequestException("Booking is not in CANCELLATION_REQUESTED status.");
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Admin";

        booking.setStatus("APPROVED");
        booking.setCancellationReviewedAt(LocalDateTime.now());
        booking.setCancellationReviewedBy(actor);
        booking.setUpdatedAt(LocalDateTime.now());

        String comment = "Cancellation request rejected by Administrator: " + (reason != null ? reason : "");
        if (booking.getStatusHistory() == null) {
            booking.setStatusHistory(new ArrayList<>());
        }
        booking.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                .status("APPROVED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment(comment)
                .build());

        SeminarBooking saved = bookingRepository.save(booking);

        String requesterId = requesterResolver.resolveRequesterUserId(booking.getRequesterUserId(), booking.getRequestedBy(), booking.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                booking.getDepartment(),
                requesterId,
                "Cancellation Declined",
                "Your cancellation request for " + booking.getHallName() + " on " + booking.getDate() + " was declined. Booking remains active.",
                "Seminar Hall",
                "INFO",
                saved.getBookingId()
        );

        return saved;
    }

    /**
     * Rescheduling Handler (Section 17, 18, 19, 20, 23).
     */
    public SeminarBooking requestReschedule(String id, SeminarRescheduleRequestDTO dto, User user) {
        SeminarBooking booking = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        // Authorization check
        boolean isAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("SEMINAR_ADMIN"));
        if (!isAdmin && !UnifiedRequestService.isRequestedByUser(booking.getRequestedBy(), user)) {
            throw new AccessDeniedException("You are not authorized to reschedule bookings created by other users.");
        }

        if (!"APPROVED".equalsIgnoreCase(booking.getStatus()) && !"BOOKED".equalsIgnoreCase(booking.getStatus())) {
            throw new BadRequestException("Only approved/booked reservations can be rescheduled.");
        }

        String newHallId = dto.getNewHallId();
        String newDate = dto.getNewDate();
        String newSlot = dto.getNewSlot().toUpperCase();
        String reason = dto.getReason();

        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("Reschedule reason is required.");
        }

        LocalDate targetDate = parseDate(newDate, "Rescheduled date");
        LocalDate today = LocalDate.now(COLLEGE_ZONE);
        if (targetDate.isBefore(today)) {
            throw new BadRequestException("Cannot reschedule to a past date (" + newDate + "). Please select a future date and time.");
        }
        LocalTime newSlotStartTime = getSlotStartTime(newSlot);
        if (targetDate.isEqual(today) && newSlotStartTime != null && !LocalTime.now(COLLEGE_ZONE).isBefore(newSlotStartTime)) {
            throw new BadRequestException("This booking time has already passed. Please select a future date and time.");
        }

        SeminarHall newHall = getHallById(newHallId)
                .orElseThrow(() -> new ResourceNotFoundException("Target Seminar Hall not found: " + newHallId));

        if (newHall.getStatus() != null && !newHall.getStatus().equalsIgnoreCase("Available")) {
            throw new BadRequestException("Target Seminar Hall " + newHall.getName() + " is currently unavailable (" + newHall.getStatus() + ").");
        }

        if (booking.getExpectedParticipants() != null && newHall.getCapacity() != null) {
            if (booking.getExpectedParticipants() > newHall.getCapacity()) {
                throw new BadRequestException("Expected participants (" + booking.getExpectedParticipants() +
                        ") exceed target hall capacity (" + newHall.getCapacity() + ").");
            }
        }

        // Check availability on target slot
        List<SeminarBooking> activeBookings = findActiveBookingsForHallAndDate(newHallId, newDate);
        for (SeminarBooking existing : activeBookings) {
            if (!existing.getId().equals(booking.getId()) && !existing.getBookingId().equals(booking.getBookingId())) {
                if (isBlockingStatus(existing.getStatus()) && isSlotConflicting(newSlot, existing.getSlot())) {
                    throw new ConflictException("Cannot reschedule: " + newHall.getName() + " is already " +
                            existing.getStatus() + " on " + newDate + " for " + newSlot + ".");
                }
            }
        }

        booking.setStatus("RESCHEDULE_REQUESTED");
        booking.setRescheduledHallId(newHallId);
        booking.setRescheduledHallName(newHall.getName());
        booking.setRescheduledHallLocation(newHall.getLocation());
        booking.setRescheduledDate(newDate);
        booking.setRescheduledSlot(newSlot);
        booking.setRescheduleReason(reason);
        booking.setRescheduleScope(dto.getScope() != null ? dto.getScope().toUpperCase().trim() : "THIS_OCCURRENCE");
        booking.setRescheduleRequestedAt(LocalDateTime.now());
        booking.setRescheduleRequestedBy(user.getName() != null ? user.getName() : user.getUserId());
        booking.setUpdatedAt(LocalDateTime.now());

        if (booking.getStatusHistory() == null) {
            booking.setStatusHistory(new ArrayList<>());
        }
        booking.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                .status("RESCHEDULE_REQUESTED")
                .actor(user.getName() != null ? user.getName() : user.getUserId())
                .timestamp(LocalDateTime.now())
                .comment("Reschedule requested to " + newHall.getName() + " on " + newDate + " (" + newSlot + "). Reason: " + reason)
                .build());

        SeminarBooking saved = bookingRepository.save(booking);

        notificationService.sendNotification(
                "SEMINAR_ADMIN",
                "ADMIN",
                null,
                "Seminar Reschedule Requested",
                user.getDepartment() + " requested reschedule for " + booking.getBookingId() + " to " + newHall.getName() + " on " + newDate,
                "Seminar Hall",
                "WARNING",
                saved.getBookingId()
        );

        return saved;
    }

    /**
     * Admin Approve Reschedule (Section 18, 19, 34).
     */
    public SeminarBooking approveReschedule(String id) {
        return approveReschedule(id, null);
    }

    public SeminarBooking approveReschedule(String id, User user) {
        SeminarBooking original = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }

        // Section 34: Verify authorization for BOTH original hall and new target hall!
        validateHallAuthorization(user, original.getHallId(), "approve reschedule for original hall");
        validateHallAuthorization(user, original.getRescheduledHallId(), "approve reschedule for target hall");

        if (!"RESCHEDULE_REQUESTED".equalsIgnoreCase(original.getStatus())) {
            throw new BadRequestException("Booking is not in RESCHEDULE_REQUESTED status.");
        }

        String newHallId = original.getRescheduledHallId();
        String newDate = original.getRescheduledDate();
        String newSlot = original.getRescheduledSlot();

        SeminarHall newHall = getHallById(newHallId)
                .orElseThrow(() -> new ResourceNotFoundException("Target Seminar Hall not found: " + newHallId));

        // Fresh conflict check on approval! (Section 19)
        List<SeminarBooking> activeBookings = findActiveBookingsForHallAndDate(newHallId, newDate);
        for (SeminarBooking existing : activeBookings) {
            if (!existing.getId().equals(original.getId()) && !existing.getBookingId().equals(original.getBookingId())) {
                if (isBlockingStatus(existing.getStatus()) && isSlotConflicting(newSlot, existing.getSlot())) {
                    throw new ConflictException("Cannot approve reschedule: " + newHall.getName() + " is no longer available on " +
                            newDate + " (" + newSlot + "). Conflicting booking: " + existing.getBookingId() + " [" + existing.getStatus() + "].");
                }
            }
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Admin";

        // 1. Create the NEW approved booking
        String newBookingId = generateBookingId(user, original.getDepartment());
        SeminarBooking newBooking = SeminarBooking.builder()
                .bookingId(newBookingId)
                .department(original.getDepartment())
                .eventTitle(original.getEventTitle())
                .purpose(original.getPurpose())
                .expectedParticipants(original.getExpectedParticipants())
                .additionalRequirements(original.getAdditionalRequirements())
                .hallId(newHallId)
                .hallName(newHall.getName())
                .hallLocation(newHall.getLocation())
                .date(newDate)
                .startDate(newDate)
                .endDate(newDate)
                .slot(newSlot)
                .status("APPROVED")
                .bookingType(original.getBookingType())
                .isRecurring(false)
                .seriesId(original.getSeriesId())
                .requestedBy(original.getRequestedBy())
                .approvedBy(actor)
                .approvedAt(LocalDateTime.now())
                .originalBookingId(original.getBookingId())
                .statusHistory(new ArrayList<>(List.of(
                        SeminarBooking.StatusHistoryEntry.builder()
                                .status("APPROVED")
                                .actor(actor)
                                .timestamp(LocalDateTime.now())
                                .comment("Approved reschedule from " + original.getBookingId() + " (" + original.getDate() + " " + original.getSlot() + ")")
                                .build()
                )))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        SeminarBooking savedNew = bookingRepository.save(newBooking);

        // 2. Mark ORIGINAL as RESCHEDULED
        original.setStatus("RESCHEDULED");
        original.setRescheduledToBookingId(savedNew.getBookingId());
        original.setRescheduledHallLocation(newHall.getLocation());
        original.setUpdatedAt(LocalDateTime.now());

        if (original.getStatusHistory() == null) {
            original.setStatusHistory(new ArrayList<>());
        }
        original.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                .status("RESCHEDULED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment("Reschedule approved. New confirmed booking: " + savedNew.getBookingId() + " on " + newDate + " (" + newSlot + ")")
                .build());

        bookingRepository.save(original);

        String requesterId = requesterResolver.resolveRequesterUserId(original.getRequesterUserId(), original.getRequestedBy(), original.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                original.getDepartment(),
                requesterId,
                "Seminar Reschedule Approved",
                "Your booking was successfully rescheduled to " + newHall.getName() + " on " + newDate + " (" + newSlot + "). New ID: " + savedNew.getBookingId(),
                "Seminar Hall",
                "SUCCESS",
                savedNew.getBookingId()
        );

        return savedNew;
    }

    /**
     * Admin Reject Reschedule (Section 18, 34).
     */
    public SeminarBooking rejectReschedule(String id, String reason) {
        return rejectReschedule(id, reason, null);
    }

    public SeminarBooking rejectReschedule(String id, String reason, User user) {
        SeminarBooking original = bookingRepository.findById(id)
                .or(() -> bookingRepository.findByBookingId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }
        validateHallAuthorization(user, original.getHallId(), "reject reschedule");

        if (!"RESCHEDULE_REQUESTED".equalsIgnoreCase(original.getStatus())) {
            throw new BadRequestException("Booking is not in RESCHEDULE_REQUESTED status.");
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Admin";

        original.setStatus("APPROVED");
        original.setUpdatedAt(LocalDateTime.now());

        String comment = "Reschedule request rejected by Administrator: " + (reason != null ? reason : "");
        if (original.getStatusHistory() == null) {
            original.setStatusHistory(new ArrayList<>());
        }
        original.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                .status("APPROVED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment(comment)
                .build());

        SeminarBooking saved = bookingRepository.save(original);

        String requesterId = requesterResolver.resolveRequesterUserId(original.getRequesterUserId(), original.getRequestedBy(), original.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                original.getDepartment(),
                requesterId,
                "Reschedule Declined",
                "Your reschedule request was rejected. The original reservation for " + original.getHallName() + " on " + original.getDate() + " remains confirmed.",
                "Seminar Hall",
                "INFO",
                saved.getBookingId()
        );

        return saved;
    }

    // ==========================================
    // SUPER ADMIN HALL MANAGEMENT (Section 37)
    // ==========================================

    public SeminarHall updateHall(String hallId, SeminarHall updatedHall, User user) {
        if (!isSuperAdmin(user)) {
            throw new AccessDeniedException("Only Super Admin can update seminar halls.");
        }
        SeminarHall hall = getHallById(hallId)
                .orElseThrow(() -> new ResourceNotFoundException("Seminar Hall not found: " + hallId));

        if (updatedHall.getName() != null) hall.setName(updatedHall.getName());
        if (updatedHall.getLocation() != null) hall.setLocation(updatedHall.getLocation());
        if (updatedHall.getBlock() != null) hall.setBlock(updatedHall.getBlock());
        if (updatedHall.getFloor() != null) hall.setFloor(updatedHall.getFloor());
        if (updatedHall.getCapacity() != null) hall.setCapacity(updatedHall.getCapacity());
        if (updatedHall.getFacilities() != null) hall.setFacilities(updatedHall.getFacilities());
        if (updatedHall.getStatus() != null) hall.setStatus(updatedHall.getStatus());
        if (updatedHall.getCoordinatorUserIds() != null) hall.setCoordinatorUserIds(updatedHall.getCoordinatorUserIds());

        return hallRepository.save(hall);
    }

    public SeminarHall updateHallStatus(String hallId, String status, User user) {
        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }
        if (!isSuperAdmin(user) && !user.hasRole("SEMINAR_ADMIN")) {
            validateHallAuthorization(user, hallId, "update hall status");
        }
        SeminarHall hall = getHallById(hallId)
                .orElseThrow(() -> new ResourceNotFoundException("Seminar Hall not found: " + hallId));

        hall.setStatus(status);
        return hallRepository.save(hall);
    }

    public SeminarHall assignCoordinators(String hallId, List<String> coordinatorUserIds, User user) {
        if (!isSuperAdmin(user)) {
            throw new AccessDeniedException("Only Super Admin can assign coordinators.");
        }
        SeminarHall hall = getHallById(hallId)
                .orElseThrow(() -> new ResourceNotFoundException("Seminar Hall not found: " + hallId));

        hall.setCoordinatorUserIds(coordinatorUserIds);
        return hallRepository.save(hall);
    }

    // ==========================================
    // TEST FIXTURE (Section 48 - TEST 23)
    // ==========================================

    public SeminarBooking createPendingBookingTestFixture(SeminarBookingRequestDTO dto, User user) {
        if (!isSuperAdmin(user)) {
            throw new AccessDeniedException("Only Administrator can invoke test fixture.");
        }
        String hallId = dto.getHallId();
        SeminarHall hall = getHallById(hallId)
                .orElseThrow(() -> new ResourceNotFoundException("Seminar Hall not found: " + hallId));

        String bookingId = generateBookingId(user, user != null ? user.getDepartment() : "CSE");
        SeminarBooking booking = SeminarBooking.builder()
                .bookingId(bookingId)
                .department(dto.getEventTitle() != null && dto.getEventTitle().contains("ECE") ? "ECE" : "CSE")
                .eventTitle(dto.getEventTitle())
                .purpose(dto.getPurpose())
                .expectedParticipants(dto.getExpectedParticipants() != null ? dto.getExpectedParticipants() : 50)
                .additionalRequirements(dto.getAdditionalRequirements())
                .date(dto.getDate())
                .startDate(dto.getDate())
                .endDate(dto.getDate())
                .hallId(hall.getHallId())
                .hallName(hall.getName())
                .hallLocation(hall.getLocation())
                .slot(dto.getSlot().toUpperCase())
                .status("PENDING")
                .bookingType("ONE_TIME")
                .requestedBy("Test Fixture")
                .statusHistory(new ArrayList<>(List.of(
                        SeminarBooking.StatusHistoryEntry.builder()
                                .status("PENDING")
                                .actor(user.getName())
                                .timestamp(LocalDateTime.now())
                                .comment("Test fixture created pending booking")
                                .build()
                )))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return bookingRepository.save(booking);
    }
}
