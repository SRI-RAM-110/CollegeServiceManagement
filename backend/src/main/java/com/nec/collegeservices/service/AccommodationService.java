package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.AccommodationBulkAvailabilityRequestDTO;
import com.nec.collegeservices.dto.AccommodationCancelRequestDTO;
import com.nec.collegeservices.dto.AccommodationRequestDTO;
import com.nec.collegeservices.dto.AccommodationRescheduleRequestDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.AccommodationRequest;
import com.nec.collegeservices.model.AccommodationRoom;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.AccommodationRequestRepository;
import com.nec.collegeservices.repository.AccommodationRoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class AccommodationService {

    private static final Logger logger = LoggerFactory.getLogger(AccommodationService.class);
    private static final AtomicLong ID_COUNTER = new AtomicLong(System.currentTimeMillis() % 100000);

    @Autowired
    private AccommodationRoomRepository roomRepository;

    @Autowired
    private AccommodationRequestRepository requestRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RequesterResolver requesterResolver;

    @Autowired
    private AuthService authService;

    public List<AccommodationRoom> getAllRooms() {
        List<AccommodationRoom> rooms = roomRepository.findAll();
        for (AccommodationRoom r : rooms) {
            if (r.getStatus() == null || r.getStatus().isBlank()) {
                r.setStatus(r.isAvailable() ? "Available" : "Maintenance");
            }
        }
        return rooms;
    }

    public List<AccommodationRoom> getRoomsByHostel(String hostel) {
        if (hostel == null || hostel.isBlank() || hostel.equalsIgnoreCase("ALL")) {
            return getAllRooms();
        }
        return roomRepository.findByHostel(hostel);
    }

    public Optional<AccommodationRoom> getRoomById(String roomId) {
        if (roomId == null) return Optional.empty();
        return roomRepository.findByRoomId(roomId);
    }

    public AccommodationRoom updateRoomStatus(String roomId, String status, User user) {
        AccommodationRoom room = roomRepository.findByRoomId(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));

        String normalizedStatus = "Available";
        if (status != null && (status.equalsIgnoreCase("Maintenance") || status.equalsIgnoreCase("Under Maintenance"))) {
            normalizedStatus = "Maintenance";
        } else if (status != null && status.equalsIgnoreCase("Unavailable")) {
            normalizedStatus = "Unavailable";
        }

        room.setStatus(normalizedStatus);
        room.setAvailable(normalizedStatus.equalsIgnoreCase("Available"));
        return roomRepository.save(room);
    }

    /**
     * Check if two date ranges overlap.
     * Date intervals: [existingIn, existingOut) and [requestedIn, requestedOut).
     * Overlap condition: existingIn < requestedOut && existingOut > requestedIn.
     */
    public boolean isDatesConflicting(String existingIn, String existingOut, String requestedIn, String requestedOut) {
        if (existingIn == null || existingOut == null || requestedIn == null || requestedOut == null) return false;
        return existingIn.compareTo(requestedOut) < 0 && existingOut.compareTo(requestedIn) > 0;
    }

    public boolean isBlockingStatus(String status) {
        if (status == null) return false;
        String s = status.toUpperCase().trim();
        return s.equals("PENDING") ||
               s.equals("APPROVED") ||
               s.equals("BOOKED") ||
               s.equals("CANCELLATION_REQUESTED") ||
               s.equals("RESCHEDULE_REQUESTED");
    }

    public boolean isSuperAdmin(User user) {
        if (user == null) return false;
        return user.hasRole("CREATOR") || user.hasRole("AO_ADMIN");
    }

    public boolean isAccommodationAdmin(User user) {
        if (user == null) return false;
        return user.hasRole("ACCOMMODATION_ADMIN") || isSuperAdmin(user);
    }

    /**
     * Live room availability check for a given date range.
     */
    public Map<String, Object> getRoomAvailability(String roomId, String checkInDate, String checkOutDate) {
        AccommodationRoom room = roomRepository.findByRoomId(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));

        boolean available = true;
        String unavailableReason = null;

        if (room.getStatus() != null && !room.getStatus().equalsIgnoreCase("Available")) {
            available = false;
            unavailableReason = "Room is currently under " + room.getStatus();
        } else if (checkInDate != null && checkOutDate != null && !checkInDate.isBlank() && !checkOutDate.isBlank()) {
            List<AccommodationRequest> activeBookings = requestRepository.findActiveBookingsForRoom(roomId);
            for (AccommodationRequest existing : activeBookings) {
                if (isBlockingStatus(existing.getStatus()) && isDatesConflicting(existing.getCheckInDate(), existing.getCheckOutDate(), checkInDate, checkOutDate)) {
                    available = false;
                    unavailableReason = "Conflicting booking " + existing.getRequestId() + " (" + existing.getStatus() + ") from " + existing.getCheckInDate() + " to " + existing.getCheckOutDate();
                    break;
                }
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("roomId", room.getRoomId());
        res.put("hostel", room.getHostel());
        res.put("roomType", room.getRoomType());
        res.put("capacity", room.getCapacity());
        res.put("status", room.getStatus());
        res.put("isAvailable", available);
        res.put("unavailableReason", unavailableReason);
        return res;
    }

    /**
     * Check availability across multiple dates for recurring or multi-day room booking.
     */
    public Map<String, Object> checkBulkAvailability(AccommodationBulkAvailabilityRequestDTO dto) {
        String roomId = dto.getRoomId();
        List<String> dates = dto.getDates() != null ? dto.getDates() : Collections.emptyList();
        String bookingType = dto.getBookingType() != null && !dto.getBookingType().isBlank()
                ? dto.getBookingType().toUpperCase()
                : (dates.size() > 1 ? "MULTI_DAY" : "ONE_TIME");

        AccommodationRoom room = roomRepository.findByRoomId(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));

        boolean isMaintenance = room.getStatus() != null && !room.getStatus().equalsIgnoreCase("Available");
        String maintenanceReason = isMaintenance
                ? "Room " + room.getRoomId() + " (" + room.getHostel() + ") is currently under " + room.getStatus() + "."
                : null;

        List<Map<String, Object>> conflicts = new ArrayList<>();
        List<Map<String, Object>> occurrences = new ArrayList<>();
        int availableCount = 0;

        List<AccommodationRequest> activeBookings = requestRepository.findActiveBookingsForRoom(roomId);

        for (String dateStr : dates) {
            String dayOfWeek = "";
            try {
                LocalDate ld = LocalDate.parse(dateStr);
                dayOfWeek = ld.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH);
            } catch (Exception ignored) {}

            Map<String, Object> occ = new HashMap<>();
            occ.put("date", dateStr);
            occ.put("day", dayOfWeek);
            occ.put("roomId", roomId);
            occ.put("roomType", room.getRoomType());
            occ.put("hostel", room.getHostel());
            occ.put("bookingType", bookingType);

            if (isMaintenance) {
                occ.put("status", "UNAVAILABLE");
                occ.put("conflictReason", maintenanceReason);
                occ.put("isMaintenance", true);

                Map<String, Object> c = new HashMap<>();
                c.put("date", dateStr);
                c.put("day", dayOfWeek);
                c.put("roomId", roomId);
                c.put("status", "MAINTENANCE");
                c.put("conflictReason", maintenanceReason);
                conflicts.add(c);
                occurrences.add(occ);
                continue;
            }

            LocalDate inDate = LocalDate.parse(dateStr);
            LocalDate outDate = inDate.plusDays(1);
            AccommodationRequest conflictingBooking = null;

            for (AccommodationRequest existing : activeBookings) {
                if (isBlockingStatus(existing.getStatus()) &&
                        isDatesConflicting(existing.getCheckInDate(), existing.getCheckOutDate(), inDate.toString(), outDate.toString())) {
                    conflictingBooking = existing;
                    break;
                }
            }

            if (conflictingBooking != null) {
                String reason = "Room " + roomId + " is already booked (" + conflictingBooking.getRequestId() + " [" + conflictingBooking.getStatus() + "]).";
                occ.put("status", "CONFLICT");
                occ.put("conflictReason", reason);

                Map<String, Object> c = new HashMap<>();
                c.put("date", dateStr);
                c.put("day", dayOfWeek);
                c.put("roomId", roomId);
                c.put("status", "CONFLICT");
                c.put("conflictReason", reason);
                conflicts.add(c);
            } else {
                occ.put("status", "AVAILABLE");
                availableCount++;
            }
            occurrences.add(occ);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("roomId", roomId);
        result.put("totalDates", dates.size());
        result.put("availableCount", availableCount);
        result.put("conflictCount", conflicts.size());
        result.put("occurrences", occurrences);
        result.put("conflicts", conflicts);
        return result;
    }

    /**
     * Submit Accommodation Request (supports single stay and multiple dates).
     */
    public AccommodationRequest createRequest(AccommodationRequestDTO dto, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        LocalDate today = LocalDate.now();
        String bookingType = dto.getBookingType() != null && !dto.getBookingType().isBlank()
                ? dto.getBookingType().toUpperCase().trim()
                : "ONE_TIME";

        // Determine target dates
        List<LocalDate> targetDates = new ArrayList<>();
        if (dto.getDates() != null && !dto.getDates().isEmpty()) {
            for (String dStr : dto.getDates()) {
                try {
                    LocalDate d = LocalDate.parse(dStr.trim());
                    if (d.isBefore(today)) {
                        throw new BadRequestException("Accommodation date cannot be in the past (" + dStr + ").");
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
            String startDateStr = dto.getStartDate() != null ? dto.getStartDate() : dto.getCheckInDate();
            String endDateStr = dto.getEndDate() != null ? dto.getEndDate() : dto.getCheckOutDate();
            if (startDateStr == null || endDateStr == null || startDateStr.isBlank() || endDateStr.isBlank()) {
                throw new BadRequestException("Both start date and end date are required for recurring stay.");
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
                throw new BadRequestException("Select at least one weekday for recurring accommodation.");
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

        // 1. Single stay Date parsing and validation fallback
        LocalDate checkIn = null;
        LocalDate checkOut = null;
        if (targetDates.isEmpty()) {
            if (dto.getCheckInDate() == null || dto.getCheckInDate().isBlank()) {
                throw new BadRequestException("Check-in date is required.");
            }
            if (dto.getCheckOutDate() == null || dto.getCheckOutDate().isBlank()) {
                throw new BadRequestException("Check-out date is required.");
            }
            try {
                checkIn = LocalDate.parse(dto.getCheckInDate());
                checkOut = LocalDate.parse(dto.getCheckOutDate());
            } catch (DateTimeParseException e) {
                throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD.");
            }
            if (checkIn.isBefore(today)) {
                throw new BadRequestException("Check-in date cannot be in the past (" + dto.getCheckInDate() + ").");
            }
            if (checkIn.equals(checkOut)) {
                throw new BadRequestException("Same-day check-in and check-out is not allowed. Check-out must be after check-in.");
            }
            if (!checkOut.isAfter(checkIn)) {
                throw new BadRequestException("Check-out date (" + dto.getCheckOutDate() + ") must be after check-in date (" + dto.getCheckInDate() + ").");
            }
        }

        // 2. Hostel validation
        String hostel = dto.getHostel() != null ? dto.getHostel().trim() : "";
        if (!hostel.equalsIgnoreCase("Girls Hostel") && !hostel.equalsIgnoreCase("Boys Hostel")) {
            throw new BadRequestException("Invalid hostel: " + dto.getHostel() + ". Must be 'Girls Hostel' or 'Boys Hostel'.");
        }

        // 3. Room identification and resolution
        AccommodationRoom room;
        if (dto.getRoomId() != null && !dto.getRoomId().isBlank()) {
            room = roomRepository.findByRoomId(dto.getRoomId().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + dto.getRoomId()));
            if (!room.getHostel().equalsIgnoreCase(hostel)) {
                throw new BadRequestException("Room " + dto.getRoomId() + " does not belong to " + hostel + ".");
            }
        } else {
            List<AccommodationRoom> matching = roomRepository.findByHostel(hostel).stream()
                    .filter(r -> r.getRoomType().equalsIgnoreCase(dto.getRoomType()))
                    .toList();
            if (matching.isEmpty()) {
                throw new ResourceNotFoundException("No rooms match hostel '" + hostel + "' and room type '" + dto.getRoomType() + "'.");
            }
            room = matching.get(0);
        }

        // 4. Room Maintenance / Status check
        if (room.getStatus() != null && !room.getStatus().equalsIgnoreCase("Available")) {
            throw new BadRequestException("Room " + room.getRoomId() + " is currently under " + room.getStatus() + " and cannot be booked.");
        }

        // 5. Guest Count Validation (1 to 50 guests)
        if (dto.getGuestsCount() == null || dto.getGuestsCount() < 1) {
            throw new BadRequestException("Number of guests must be at least 1.");
        }
        if (dto.getGuestsCount() > 50) {
            throw new BadRequestException("Number of guests cannot exceed 50.");
        }

        // 6. Purpose check
        if (dto.getPurpose() == null || dto.getPurpose().isBlank()) {
            throw new BadRequestException("Purpose of stay is required.");
        }

        List<AccommodationRequest> activeBookings = requestRepository.findActiveBookingsForRoom(room.getRoomId());
        String requesterName = user.getName() != null ? user.getName() : user.getUserId();

        // 7. MULTIPLE DATES HANDLING (like Seminar Hall)
        if (targetDates.size() > 1) {
            List<String> conflictMessages = new ArrayList<>();
            for (LocalDate d : targetDates) {
                String inStr = d.toString();
                String outStr = d.plusDays(1).toString();
                for (AccommodationRequest existing : activeBookings) {
                    if (isBlockingStatus(existing.getStatus()) && isDatesConflicting(existing.getCheckInDate(), existing.getCheckOutDate(), inStr, outStr)) {
                        conflictMessages.add("Room " + room.getRoomId() + " is unavailable on " + inStr +
                                " (Conflict with: " + existing.getRequestId() + " [" + existing.getStatus() + "])");
                    }
                }
            }
            if (!conflictMessages.isEmpty()) {
                throw new ConflictException(String.join(" | ", conflictMessages));
            }

            int totalOccurrences = targetDates.size();
            String seriesId = generateSeriesId();
            List<AccommodationRequest> createdList = new ArrayList<>();
            int occurrenceIndex = 1;
            String startDateStr = targetDates.get(0).toString();
            String endDateStr = targetDates.get(targetDates.size() - 1).plusDays(1).toString();
            List<String> dateStrings = targetDates.stream().map(LocalDate::toString).toList();

            for (LocalDate d : targetDates) {
                String inStr = d.toString();
                String outStr = d.plusDays(1).toString();
                String requestId = generateRequestId(occurrenceIndex);

                AccommodationRequest.StatusHistoryEntry initialHistory = AccommodationRequest.StatusHistoryEntry.builder()
                        .status("PENDING")
                        .actor(requesterName)
                        .timestamp(LocalDateTime.now())
                        .comment("Accommodation request submitted by " + user.getDepartment() + " Department")
                        .build();

                AccommodationRequest request = AccommodationRequest.builder()
                        .requestId(requestId)
                        .department(user.getDepartment())
                        .facultyOrGuestName(dto.getFacultyOrGuestName() != null && !dto.getFacultyOrGuestName().isBlank() ? dto.getFacultyOrGuestName() : requesterName)
                        .hostel(room.getHostel())
                        .roomType(room.getRoomType())
                        .roomId(room.getRoomId())
                        .roomLocation(room.getLocation())
                        .checkInDate(inStr)
                        .checkOutDate(outStr)
                        .startDate(startDateStr)
                        .endDate(endDateStr)
                        .dates(dateStrings)
                        .guestsCount(dto.getGuestsCount())
                        .purpose(dto.getPurpose())
                        .additionalNotes(dto.getAdditionalNotes())
                        .bookingType(bookingType)
                        .isRecurring("RECURRING".equals(bookingType))
                        .seriesId(seriesId)
                        .recurrencePattern("RECURRING".equals(bookingType) ? dto.getRecurrencePattern() : null)
                        .recurrenceDays("RECURRING".equals(bookingType) ? dto.getRecurrenceDays() : null)
                        .occurrenceIndex(occurrenceIndex)
                        .totalOccurrences(totalOccurrences)
                        .status("PENDING")
                        .requestedBy(requesterName)
                        .requesterUserId(user.getUserId())
                        .statusHistory(new ArrayList<>(List.of(initialHistory)))
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                createdList.add(requestRepository.save(request));
                occurrenceIndex++;
            }

            AccommodationRequest primary = createdList.get(0);
            String notifyMsg = user.getDepartment() + " requested " + totalOccurrences + " stay occurrences for room " + room.getRoomId() + " (" + room.getHostel() + ").";
            notificationService.sendNotification("ACCOMMODATION_ADMIN", "ADMIN", null, "New Accommodation Request", notifyMsg, "Accommodation", "INFO", primary.getRequestId());
            notificationService.sendNotification("AO_ADMIN", "ADMIN", null, "New Accommodation Request", notifyMsg, "Accommodation", "INFO", primary.getRequestId());
            return primary;
        }

        // 8. SINGLE DATE / CONTINUOUS STAY
        String finalCheckIn = !targetDates.isEmpty() ? targetDates.get(0).toString() : dto.getCheckInDate();
        String finalCheckOut = !targetDates.isEmpty() ? targetDates.get(0).plusDays(1).toString() : dto.getCheckOutDate();

        for (AccommodationRequest existing : activeBookings) {
            if (isBlockingStatus(existing.getStatus()) && isDatesConflicting(existing.getCheckInDate(), existing.getCheckOutDate(), finalCheckIn, finalCheckOut)) {
                throw new ConflictException("Room " + room.getRoomId() + " is unavailable from " + finalCheckIn +
                        " to " + finalCheckOut + " (Conflict with: " + existing.getRequestId() + " [" + existing.getStatus() + "]).");
            }
        }

        String requestId = generateRequestId(0);
        String effBookingType = (checkIn != null && checkIn.plusDays(1).equals(checkOut)) ? "ONE_TIME" : bookingType;

        AccommodationRequest.StatusHistoryEntry initialHistory = AccommodationRequest.StatusHistoryEntry.builder()
                .status("PENDING")
                .actor(requesterName)
                .timestamp(LocalDateTime.now())
                .comment("Accommodation request submitted by " + user.getDepartment() + " Department")
                .build();

        AccommodationRequest request = AccommodationRequest.builder()
                .requestId(requestId)
                .department(user.getDepartment())
                .facultyOrGuestName(dto.getFacultyOrGuestName() != null && !dto.getFacultyOrGuestName().isBlank() ? dto.getFacultyOrGuestName() : requesterName)
                .hostel(room.getHostel())
                .roomType(room.getRoomType())
                .roomId(room.getRoomId())
                .roomLocation(room.getLocation())
                .checkInDate(finalCheckIn)
                .checkOutDate(finalCheckOut)
                .startDate(finalCheckIn)
                .endDate(finalCheckOut)
                .guestsCount(dto.getGuestsCount())
                .purpose(dto.getPurpose())
                .additionalNotes(dto.getAdditionalNotes())
                .bookingType(effBookingType)
                .status("PENDING")
                .requestedBy(requesterName)
                .requesterUserId(user.getUserId())
                .statusHistory(new ArrayList<>(List.of(initialHistory)))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        AccommodationRequest saved = requestRepository.save(request);

        // Notify Admins
        String notifyMsg = user.getDepartment() + " requested " + room.getRoomId() + " (" + room.getHostel() + ") from " +
                finalCheckIn + " to " + finalCheckOut + " for " + dto.getGuestsCount() + " guest(s).";

        notificationService.sendNotification("ACCOMMODATION_ADMIN", "ADMIN", null, "New Accommodation Request", notifyMsg, "Accommodation", "INFO", saved.getRequestId());
        notificationService.sendNotification("AO_ADMIN", "ADMIN", null, "New Accommodation Request", notifyMsg, "Accommodation", "INFO", saved.getRequestId());

        return saved;
    }

    private String generateRequestId() {
        return generateRequestId(0);
    }

    private String generateRequestId(int index) {
        int year = LocalDate.now().getYear();
        long seq = ID_COUNTER.incrementAndGet() % 100000;
        if (index > 0) {
            return String.format("ACC-%d-%05d-%d", year, seq, index);
        }
        return String.format("ACC-%d-%05d", year, seq);
    }

    private String generateSeriesId() {
        int year = LocalDate.now().getYear();
        long seq = ID_COUNTER.incrementAndGet() % 100000;
        return String.format("ACC-SERIES-%d-%05d", year, seq);
    }

    public List<AccommodationRequest> getAllRequests(String status, String hostel, String date, String fromDate, String toDate, String department, User user) {
        if (fromDate != null && toDate != null && !fromDate.isBlank() && !toDate.isBlank()) {
            if (toDate.compareTo(fromDate) < 0) {
                throw new BadRequestException("To date cannot be earlier than From date.");
            }
        }

        List<AccommodationRequest> all = requestRepository.findAll();
        boolean isStaffOrAdmin = user != null && (isSuperAdmin(user) || user.hasRole("ACCOMMODATION_ADMIN") || user.hasServicePermission("ACCOMMODATION_ADMIN"));

        return all.stream()
                .filter(r -> {
                    if (!isStaffOrAdmin && user != null) {
                        return UnifiedRequestService.isRequestedByUser(r.getRequestedBy(), user);
                    }
                    return department == null || department.isBlank() || department.equalsIgnoreCase("ALL") || r.getDepartment().equalsIgnoreCase(department);
                })
                .filter(r -> status == null || status.isBlank() || status.equalsIgnoreCase("ALL") || r.getStatus().equalsIgnoreCase(status))
                .filter(r -> hostel == null || hostel.isBlank() || hostel.equalsIgnoreCase("ALL") || r.getHostel().equalsIgnoreCase(hostel))
                .filter(r -> {
                    if (fromDate != null && !fromDate.isBlank() && toDate != null && !toDate.isBlank()) {
                        return r.getCheckInDate().compareTo(toDate) <= 0 && r.getCheckOutDate().compareTo(fromDate) >= 0;
                    }
                    return date == null || date.isBlank() || (r.getCheckInDate().compareTo(date) <= 0 && r.getCheckOutDate().compareTo(date) >= 0);
                })
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public List<AccommodationRequest> getAllRequests(String status, String hostel, String date, String fromDate, String toDate, String department) {
        return getAllRequests(status, hostel, date, fromDate, toDate, department, null);
    }

    public List<AccommodationRequest> getRequestsByDepartment(String department) {
        return requestRepository.findByDepartment(department).stream()
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    /**
     * Get Accommodation Request by ID with Department Privacy Enforcement (Step 15).
     */
    public AccommodationRequest getRequestById(String id, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        if (isSuperAdmin(user) || user.hasRole("ACCOMMODATION_ADMIN")) {
            return req;
        }

        if (UnifiedRequestService.isRequestedByUser(req.getRequestedBy(), user)) {
            return req;
        }

        throw new AccessDeniedException("You are not authorized to view accommodation requests created by other users.");
    }

    /**
     * Approve Accommodation Request with Fresh Conflict Check (Step 9).
     */
    public AccommodationRequest approveRequest(String id, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }

        // State validation guards
        String currentStatus = req.getStatus() != null ? req.getStatus().toUpperCase().trim() : "";
        if (currentStatus.equals("APPROVED") || currentStatus.equals("BOOKED")) {
            throw new BadRequestException("Cannot approve request: request is already approved.");
        }
        if (currentStatus.equals("REJECTED")) {
            throw new BadRequestException("Cannot approve request: request has already been rejected.");
        }
        if (currentStatus.equals("CANCELLED")) {
            throw new BadRequestException("Cannot approve request: request has already been cancelled.");
        }

        // Fresh Conflict Recheck on Approval against already APPROVED / BOOKED reservations
        List<AccommodationRequest> activeBookings = requestRepository.findActiveBookingsForRoom(req.getRoomId());
        for (AccommodationRequest existing : activeBookings) {
            if (!existing.getId().equals(req.getId()) && !existing.getRequestId().equals(req.getRequestId())) {
                boolean isAlreadyApproved = "APPROVED".equalsIgnoreCase(existing.getStatus()) || "BOOKED".equalsIgnoreCase(existing.getStatus());
                if (isAlreadyApproved && isDatesConflicting(existing.getCheckInDate(), existing.getCheckOutDate(), req.getCheckInDate(), req.getCheckOutDate())) {
                    throw new ConflictException("Room " + req.getRoomId() + " is no longer available. Conflicting reservation " +
                            existing.getRequestId() + " is already " + existing.getStatus() + " from " + existing.getCheckInDate() +
                            " to " + existing.getCheckOutDate() + ".");
                }
            }
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Accommodation Admin";

        req.setStatus("APPROVED");
        req.setApprovedBy(actor);
        req.setApprovedAt(LocalDateTime.now());
        req.setUpdatedAt(LocalDateTime.now());

        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status("APPROVED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment("Accommodation request approved and confirmed by " + actor)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        // Update room occupancy
        if (req.getRoomId() != null) {
            roomRepository.findByRoomId(req.getRoomId()).ifPresent(room -> {
                room.setCurrentOccupancy(req.getGuestsCount());
                roomRepository.save(room);
            });
        }

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Accommodation Request Approved",
                "Your accommodation request for " + req.getRoomId() + " (" + req.getCheckInDate() + " to " + req.getCheckOutDate() + ") has been approved!",
                "Accommodation",
                "SUCCESS",
                saved.getRequestId()
        );

        return saved;
    }

    public AccommodationRequest approveRequest(String id) {
        return approveRequest(id, null);
    }

    /**
     * Reject Accommodation Request (Step 10).
     */
    public AccommodationRequest rejectRequest(String id, String reason, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        if (user == null) {
            try { user = authService.getCurrentUser(); } catch (Exception ignored) {}
        }

        // State validation guards
        String currentStatus = req.getStatus() != null ? req.getStatus().toUpperCase().trim() : "";
        if (currentStatus.equals("APPROVED") || currentStatus.equals("BOOKED")) {
            throw new BadRequestException("Cannot reject approved request. Use cancellation workflow instead.");
        }
        if (currentStatus.equals("REJECTED")) {
            throw new BadRequestException("Cannot reject request: request is already rejected.");
        }
        if (currentStatus.equals("CANCELLED")) {
            throw new BadRequestException("Cannot reject request: request has already been cancelled.");
        }

        String comment = (reason != null && !reason.isBlank()) ? reason.trim() : "Declined by Accommodation Administrator";
        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Accommodation Admin";

        req.setStatus("REJECTED");
        req.setRejectionReason(comment);
        req.setUpdatedAt(LocalDateTime.now());

        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status("REJECTED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment(comment)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Accommodation Request Rejected",
                "Your accommodation request for " + req.getRoomId() + " was rejected. Reason: " + comment,
                "Accommodation",
                "DANGER",
                saved.getRequestId()
        );

        return saved;
    }

    public AccommodationRequest rejectRequest(String id, String reason) {
        return rejectRequest(id, reason, null);
    }

    /**
     * Cancellation Request Handler (Step 11).
     * - If PENDING: Department user cancels directly -> CANCELLED.
     * - If APPROVED: Department user requests cancellation -> CANCELLATION_REQUESTED.
     */
    public AccommodationRequest cancelRequest(String id, AccommodationCancelRequestDTO dto, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        // Ownership check
        boolean isAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("ACCOMMODATION_ADMIN"));
        if (!isAdmin && !UnifiedRequestService.isRequestedByUser(req.getRequestedBy(), user)) {
            throw new AccessDeniedException("You are not authorized to cancel accommodation requests created by other users.");
        }

        String reason = dto != null ? dto.getReason() : null;
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("Cancellation reason is required.");
        }

        String currentStatus = req.getStatus() != null ? req.getStatus().toUpperCase().trim() : "";
        if (currentStatus.equals("CANCELLED") || currentStatus.equals("REJECTED")) {
            throw new BadRequestException("Request is already " + currentStatus + ".");
        }

        boolean directCancel = currentStatus.equals("PENDING") || currentStatus.equals("UNDER_REVIEW");
        String newStatus = directCancel ? "CANCELLED" : "CANCELLATION_REQUESTED";
        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "User";

        req.setStatus(newStatus);
        req.setCancellationReason(reason);
        req.setCancellationRequestedAt(LocalDateTime.now());
        req.setCancellationRequestedBy(actor);
        req.setUpdatedAt(LocalDateTime.now());

        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status(newStatus)
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment(directCancel ? "Cancelled directly: " + reason : "Cancellation requested: " + reason)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        if (!directCancel) {
            notificationService.sendNotification(
                    "ACCOMMODATION_ADMIN",
                    "ADMIN",
                    null,
                    "Accommodation Cancellation Requested",
                    user.getDepartment() + " requested cancellation for " + req.getRoomId() + " (" + req.getCheckInDate() + " to " + req.getCheckOutDate() + "). Reason: " + reason,
                    "Accommodation",
                    "WARNING",
                    req.getRequestId()
            );
        }

        return saved;
    }

    /**
     * Admin Approve Cancellation (Step 11).
     */
    public AccommodationRequest approveCancellation(String id, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        if (!"CANCELLATION_REQUESTED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Request is not in CANCELLATION_REQUESTED status.");
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Accommodation Admin";

        req.setStatus("CANCELLED");
        req.setCancellationReviewedAt(LocalDateTime.now());
        req.setCancellationReviewedBy(actor);
        req.setUpdatedAt(LocalDateTime.now());

        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status("CANCELLED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment("Cancellation approved by " + actor)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Cancellation Approved",
                "Your cancellation request for " + req.getRoomId() + " has been approved.",
                "Accommodation",
                "INFO",
                saved.getRequestId()
        );

        return saved;
    }

    public AccommodationRequest approveCancellation(String id) {
        return approveCancellation(id, null);
    }

    /**
     * Admin Reject Cancellation (Step 11).
     */
    public AccommodationRequest rejectCancellation(String id, String reason, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        if (!"CANCELLATION_REQUESTED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Request is not in CANCELLATION_REQUESTED status.");
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Accommodation Admin";

        req.setStatus("APPROVED");
        req.setCancellationReviewedAt(LocalDateTime.now());
        req.setCancellationReviewedBy(actor);
        req.setUpdatedAt(LocalDateTime.now());

        String comment = "Cancellation request rejected by Administrator: " + (reason != null ? reason : "Reservation retained");
        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status("APPROVED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment(comment)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Cancellation Declined",
                "Your cancellation request for " + req.getRoomId() + " was declined. Booking remains active.",
                "Accommodation",
                "INFO",
                saved.getRequestId()
        );

        return saved;
    }

    public AccommodationRequest rejectCancellation(String id, String reason) {
        return rejectCancellation(id, reason, null);
    }

    /**
     * Rescheduling Request Handler (Step 12).
     */
    public AccommodationRequest requestReschedule(String id, AccommodationRescheduleRequestDTO dto, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        // Ownership check
        boolean isAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("ACCOMMODATION_ADMIN"));
        if (!isAdmin && !UnifiedRequestService.isRequestedByUser(req.getRequestedBy(), user)) {
            throw new AccessDeniedException("You are not authorized to reschedule accommodation requests created by other users.");
        }

        if (!"APPROVED".equalsIgnoreCase(req.getStatus()) && !"BOOKED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Only approved reservations can be rescheduled.");
        }

        String targetRoomId = dto.getTargetRoomId() != null ? dto.getTargetRoomId().trim() : "";
        String targetCheckInStr = dto.getTargetCheckInDate() != null ? dto.getTargetCheckInDate().trim() : "";
        String targetCheckOutStr = dto.getTargetCheckOutDate() != null ? dto.getTargetCheckOutDate().trim() : "";
        String reason = dto.getReason() != null ? dto.getReason().trim() : "";

        if (reason.isBlank()) {
            throw new BadRequestException("Reschedule reason is required.");
        }

        LocalDate targetCheckIn;
        LocalDate targetCheckOut;
        try {
            targetCheckIn = LocalDate.parse(targetCheckInStr);
            targetCheckOut = LocalDate.parse(targetCheckOutStr);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid target date format. Expected YYYY-MM-DD.");
        }

        LocalDate today = LocalDate.now();
        if (targetCheckIn.isBefore(today)) {
            throw new BadRequestException("Target check-in date cannot be in the past (" + targetCheckInStr + ").");
        }
        if (targetCheckIn.equals(targetCheckOut)) {
            throw new BadRequestException("Same-day check-in and check-out is not allowed for reschedule.");
        }
        if (!targetCheckOut.isAfter(targetCheckIn)) {
            throw new BadRequestException("Target check-out date must be after check-in date.");
        }

        AccommodationRoom targetRoom = roomRepository.findByRoomId(targetRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("Target room not found: " + targetRoomId));

        if (targetRoom.getStatus() != null && !targetRoom.getStatus().equalsIgnoreCase("Available")) {
            throw new BadRequestException("Target room " + targetRoom.getRoomId() + " is currently under " + targetRoom.getStatus() + ".");
        }

        if (req.getGuestsCount() != null && req.getGuestsCount() > 50) {
            throw new BadRequestException("Number of guests cannot exceed 50.");
        }

        // Check if target room is already occupied during target dates by any blocking booking
        List<AccommodationRequest> activeBookings = requestRepository.findActiveBookingsForRoom(targetRoomId);
        for (AccommodationRequest existing : activeBookings) {
            if (!existing.getId().equals(req.getId()) && !existing.getRequestId().equals(req.getRequestId())) {
                if (isBlockingStatus(existing.getStatus()) && isDatesConflicting(existing.getCheckInDate(), existing.getCheckOutDate(), targetCheckInStr, targetCheckOutStr)) {
                    throw new ConflictException("Cannot reschedule: target room " + targetRoom.getRoomId() + " is already " +
                            existing.getStatus() + " from " + existing.getCheckInDate() + " to " + existing.getCheckOutDate() + ".");
                }
            }
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "User";

        req.setStatus("RESCHEDULE_REQUESTED");
        req.setRescheduledRoomId(targetRoom.getRoomId());
        req.setRescheduledHostel(targetRoom.getHostel());
        req.setRescheduledRoomType(targetRoom.getRoomType());
        req.setRescheduledRoomLocation(targetRoom.getLocation());
        req.setRescheduledCheckInDate(targetCheckInStr);
        req.setRescheduledCheckOutDate(targetCheckOutStr);
        req.setRescheduleReason(reason);
        req.setRescheduleRequestedAt(LocalDateTime.now());
        req.setRescheduleRequestedBy(actor);
        req.setUpdatedAt(LocalDateTime.now());

        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status("RESCHEDULE_REQUESTED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment("Reschedule requested to " + targetRoom.getRoomId() + " (" + targetCheckInStr + " to " + targetCheckOutStr + "). Reason: " + reason)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        notificationService.sendNotification(
                "ACCOMMODATION_ADMIN",
                "ADMIN",
                null,
                "Accommodation Reschedule Requested",
                user.getDepartment() + " requested reschedule for " + req.getRequestId() + " to " + targetRoom.getRoomId() + " (" + targetCheckInStr + " to " + targetCheckOutStr + ")",
                "Accommodation",
                "WARNING",
                saved.getRequestId()
        );

        return saved;
    }

    /**
     * Admin Approve Reschedule (Step 13).
     */
    public AccommodationRequest approveReschedule(String id, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        if (!"RESCHEDULE_REQUESTED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Request is not in RESCHEDULE_REQUESTED status.");
        }

        String targetRoomId = req.getRescheduledRoomId();
        String targetCheckIn = req.getRescheduledCheckInDate();
        String targetCheckOut = req.getRescheduledCheckOutDate();

        AccommodationRoom targetRoom = roomRepository.findByRoomId(targetRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("Target room not found: " + targetRoomId));

        // Fresh conflict check on target room/dates
        List<AccommodationRequest> activeBookings = requestRepository.findActiveBookingsForRoom(targetRoomId);
        for (AccommodationRequest existing : activeBookings) {
            if (!existing.getId().equals(req.getId()) && !existing.getRequestId().equals(req.getRequestId())) {
                boolean isAlreadyApproved = "APPROVED".equalsIgnoreCase(existing.getStatus()) || "BOOKED".equalsIgnoreCase(existing.getStatus());
                if (isAlreadyApproved && isDatesConflicting(existing.getCheckInDate(), existing.getCheckOutDate(), targetCheckIn, targetCheckOut)) {
                    throw new ConflictException("Cannot approve reschedule: target room " + targetRoom.getRoomId() +
                            " is no longer available from " + targetCheckIn + " to " + targetCheckOut + ".");
                }
            }
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Accommodation Admin";

        // Archive original values
        req.setOriginalRoomId(req.getRoomId());
        req.setOriginalCheckInDate(req.getCheckInDate());
        req.setOriginalCheckOutDate(req.getCheckOutDate());

        // Apply new values
        req.setRoomId(targetRoom.getRoomId());
        req.setHostel(targetRoom.getHostel());
        req.setRoomType(targetRoom.getRoomType());
        req.setRoomLocation(targetRoom.getLocation());
        req.setCheckInDate(targetCheckIn);
        req.setCheckOutDate(targetCheckOut);
        req.setStatus("APPROVED");
        req.setRescheduleReviewedAt(LocalDateTime.now());
        req.setRescheduleReviewedBy(actor);
        req.setUpdatedAt(LocalDateTime.now());

        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status("APPROVED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment("Reschedule approved to " + targetRoom.getRoomId() + " (" + targetCheckIn + " to " + targetCheckOut + ") by " + actor)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Accommodation Reschedule Approved",
                "Your accommodation request was rescheduled to " + targetRoom.getRoomId() + " (" + targetCheckIn + " to " + targetCheckOut + ").",
                "Accommodation",
                "SUCCESS",
                saved.getRequestId()
        );

        return saved;
    }

    public AccommodationRequest approveReschedule(String id) {
        return approveReschedule(id, null);
    }

    /**
     * Admin Reject Reschedule (Step 14).
     */
    public AccommodationRequest rejectReschedule(String id, String reason, User user) {
        AccommodationRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation request not found: " + id));

        if (!"RESCHEDULE_REQUESTED".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Request is not in RESCHEDULE_REQUESTED status.");
        }

        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "Accommodation Admin";

        req.setStatus("APPROVED");
        req.setRescheduleReviewedAt(LocalDateTime.now());
        req.setRescheduleReviewedBy(actor);
        req.setUpdatedAt(LocalDateTime.now());

        String comment = "Reschedule request declined by Administrator: " + (reason != null ? reason : "Retained at original room and dates");
        if (req.getStatusHistory() == null) {
            req.setStatusHistory(new ArrayList<>());
        }
        req.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                .status("APPROVED")
                .actor(actor)
                .timestamp(LocalDateTime.now())
                .comment(comment)
                .build());

        AccommodationRequest saved = requestRepository.save(req);

        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Reschedule Declined",
                "Your accommodation reschedule request for " + req.getRoomId() + " was declined. Original booking remains active.",
                "Accommodation",
                "INFO",
                saved.getRequestId()
        );

        return saved;
    }

    public AccommodationRequest rejectReschedule(String id, String reason) {
        return rejectReschedule(id, reason, null);
    }

    /**
     * Test fixture endpoint: directly creates a pending booking (bypassing creation conflict checks)
     * strictly for testing approval-time concurrency and conflict checks.
     */
    public AccommodationRequest createPendingBookingTestFixture(AccommodationRequestDTO dto, User user) {
        AccommodationRoom room = roomRepository.findByRoomId(dto.getRoomId())
                .orElseGet(() -> roomRepository.findAll().get(0));

        String dept = (dto.getFacultyOrGuestName() != null && !dto.getFacultyOrGuestName().isBlank())
                ? dto.getFacultyOrGuestName()
                : (user != null ? user.getDepartment() : "CSE");

        AccommodationRequest booking = AccommodationRequest.builder()
                .requestId(generateRequestId())
                .department(dept)
                .facultyOrGuestName(dto.getFacultyOrGuestName() != null ? dto.getFacultyOrGuestName() : "Test Fixture Guest")
                .hostel(room.getHostel())
                .roomType(room.getRoomType())
                .roomId(room.getRoomId())
                .roomLocation(room.getLocation())
                .checkInDate(dto.getCheckInDate())
                .checkOutDate(dto.getCheckOutDate())
                .guestsCount(dto.getGuestsCount() != null ? dto.getGuestsCount() : 1)
                .purpose(dto.getPurpose() != null ? dto.getPurpose() : "Pending Fixture")
                .status("PENDING")
                .requestedBy(user != null ? user.getName() : "Admin")
                .statusHistory(new ArrayList<>(List.of(
                        AccommodationRequest.StatusHistoryEntry.builder()
                                .status("PENDING")
                                .actor("TestFixture")
                                .timestamp(LocalDateTime.now())
                                .comment("Direct pending test fixture creation")
                                .build()
                )))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return requestRepository.save(booking);
    }
}
