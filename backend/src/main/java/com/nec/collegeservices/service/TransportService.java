package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.TransportBulkAvailabilityRequestDTO;
import com.nec.collegeservices.dto.TransportRequestDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ConflictException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.TransportRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.model.Vehicle;
import com.nec.collegeservices.repository.TransportRequestRepository;
import com.nec.collegeservices.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.security.access.AccessDeniedException;

@Service
public class TransportService {

    private static final AtomicLong ID_COUNTER = new AtomicLong(System.currentTimeMillis() % 10000);

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private TransportRequestRepository requestRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RequesterResolver requesterResolver;

    @Autowired
    private AuthService authService;

    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    public List<Vehicle> getVehiclesWithDateAvailability(String date) {
        List<Vehicle> allVehicles = vehicleRepository.findAll();
        if (date == null || date.isBlank()) {
            return allVehicles;
        }

        // Find active bookings/trips for that date
        List<TransportRequest> bookedOnDate = requestRepository.findByTripDateAndStatusIn(
                date, List.of("APPROVED", "SCHEDULED", "ON_TRIP", "PENDING"));

        Set<String> busyVehicleIds = new HashSet<>();
        for (TransportRequest req : bookedOnDate) {
            if (req.getVehicleId() != null && !req.getVehicleId().isBlank()) {
                busyVehicleIds.add(req.getVehicleId());
            }
        }

        // Return copy with calculated status for requested date
        return allVehicles.stream().map(v -> {
            String calculatedStatus;
            if ("MAINTENANCE".equalsIgnoreCase(v.getStatus())) {
                calculatedStatus = "MAINTENANCE";
            } else if (busyVehicleIds.contains(v.getVehicleId())) {
                calculatedStatus = "BOOKED";
            } else {
                calculatedStatus = "AVAILABLE";
            }
            return Vehicle.builder()
                    .id(v.getId())
                    .vehicleId(v.getVehicleId())
                    .name(v.getName())
                    .type(v.getType())
                    .registrationNumber(v.getRegistrationNumber())
                    .capacity(v.getCapacity())
                    .driverName(v.getDriverName())
                    .driverPhone(v.getDriverPhone())
                    .status(calculatedStatus)
                    .build();
        }).toList();
    }

    public List<TransportRequest> getTripsForDate(String date) {
        return requestRepository.findByTripDate(date).stream()
                .sorted((a, b) -> a.getDepartureTime() != null && b.getDepartureTime() != null ? a.getDepartureTime().compareTo(b.getDepartureTime()) : 0)
                .toList();
    }

    public Vehicle addVehicle(Vehicle vehicle) {
        if (vehicle.getVehicleId() == null || vehicle.getVehicleId().isBlank()) {
            vehicle.setVehicleId("V-" + String.format("%02d", vehicleRepository.count() + 1));
        }
        return vehicleRepository.save(vehicle);
    }

    public static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) {
            return -1;
        }
        String s = timeStr.trim().toUpperCase();
        boolean isPm = s.endsWith("PM");
        boolean isAm = s.endsWith("AM");
        if (isPm || isAm) {
            s = s.substring(0, s.length() - 2).trim();
        }
        String[] parts = s.split(":");
        if (parts.length < 2) {
            return -1;
        }
        try {
            int hour = Integer.parseInt(parts[0].trim());
            int minute = Integer.parseInt(parts[1].trim());
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                return -1;
            }
            if (isPm && hour < 12) hour += 12;
            if (isAm && hour == 12) hour = 0;
            return hour * 60 + minute;
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /**
     * Check availability across multiple dates for recurring or multi-day trip requests.
     */
    public Map<String, Object> checkBulkAvailability(TransportBulkAvailabilityRequestDTO dto) {
        String tripType = dto.getTripType();
        String vehicleId = dto.getVehicleId();
        List<String> dates = dto.getDates() != null ? dto.getDates() : Collections.emptyList();
        String bookingType = dto.getBookingType() != null && !dto.getBookingType().isBlank()
                ? dto.getBookingType().toUpperCase()
                : (dates.size() > 1 ? "MULTI_DAY" : "ONE_TIME");

        Vehicle vehicle = null;
        if (vehicleId != null && !vehicleId.isBlank()) {
            vehicle = vehicleRepository.findByVehicleId(vehicleId).orElse(null);
        } else if (tripType != null && !tripType.isBlank()) {
            List<Vehicle> available = vehicleRepository.findAll().stream()
                    .filter(v -> v.getType().equalsIgnoreCase(tripType) && "AVAILABLE".equalsIgnoreCase(v.getStatus()))
                    .toList();
            if (!available.isEmpty()) {
                vehicle = available.get(0);
            }
        }

        int startMin = dto.getDepartureTime() != null ? parseTimeToMinutes(dto.getDepartureTime()) : 540;
        if (startMin < 0) startMin = 540;
        int endMin = dto.getReturnTime() != null && !dto.getReturnTime().isBlank() ? parseTimeToMinutes(dto.getReturnTime()) : (startMin + 120);
        if (endMin <= startMin) endMin = startMin + 120;

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
            occ.put("tripType", tripType);
            occ.put("bookingType", bookingType);

            boolean hasConflict = false;
            String conflictReason = null;

            if (vehicle != null) {
                occ.put("vehicleId", vehicle.getVehicleId());
                occ.put("vehicleName", vehicle.getName());
                List<TransportRequest> existing = requestRepository.findByVehicleIdAndTripDateAndStatusIn(
                        vehicle.getVehicleId(), dateStr, List.of("PENDING", "APPROVED", "SCHEDULED", "ON_TRIP"));
                for (TransportRequest ex : existing) {
                    int exStart = parseTimeToMinutes(ex.getDepartureTime());
                    int exEnd = parseTimeToMinutes(ex.getReturnTime());
                    if (exStart < 0) exStart = 0;
                    if (exEnd < 0) exEnd = exStart + 120;

                    if (exStart < endMin && exEnd > startMin) {
                        hasConflict = true;
                        conflictReason = "Vehicle " + vehicle.getName() + " already assigned to trip " + ex.getRequestId() + " (" + ex.getDepartureTime() + " - " + (ex.getReturnTime() != null ? ex.getReturnTime() : "completion") + ").";
                        break;
                    }
                }
            }

            if (hasConflict) {
                occ.put("status", "CONFLICT");
                occ.put("conflictReason", conflictReason);

                Map<String, Object> c = new HashMap<>();
                c.put("date", dateStr);
                c.put("day", dayOfWeek);
                c.put("status", "CONFLICT");
                c.put("conflictReason", conflictReason);
                conflicts.add(c);
            } else {
                occ.put("status", "AVAILABLE");
                availableCount++;
            }
            occurrences.add(occ);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalDates", dates.size());
        result.put("availableCount", availableCount);
        result.put("conflictCount", conflicts.size());
        result.put("occurrences", occurrences);
        result.put("conflicts", conflicts);
        return result;
    }

    public TransportRequest createRequest(TransportRequestDTO dto, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        // 1. Required fields
        if (dto.getTripType() == null || dto.getTripType().isBlank()) {
            throw new BadRequestException("Trip type is required.");
        }
        if (dto.getPickupLocation() == null || dto.getPickupLocation().isBlank()) {
            throw new BadRequestException("Pickup location is required.");
        }
        if (dto.getDestination() == null || dto.getDestination().isBlank()) {
            throw new BadRequestException("Destination is required.");
        }
        if (dto.getPurpose() == null || dto.getPurpose().isBlank()) {
            throw new BadRequestException("Purpose is required.");
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
                        throw new BadRequestException("Trip date cannot be in the past (" + dStr + ").");
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
            String startDateStr = dto.getStartDate() != null ? dto.getStartDate() : dto.getTripDate();
            String endDateStr = dto.getEndDate() != null ? dto.getEndDate() : startDateStr;
            if (startDateStr == null || endDateStr == null || startDateStr.isBlank() || endDateStr.isBlank()) {
                throw new BadRequestException("Both start date and end date are required for recurring trips.");
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
                throw new BadRequestException("Select at least one weekday for recurring trips.");
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
            if (dto.getTripDate() == null || dto.getTripDate().isBlank()) {
                throw new BadRequestException("Trip date is required.");
            }
            LocalDate tripDate;
            try {
                tripDate = LocalDate.parse(dto.getTripDate().trim());
            } catch (DateTimeParseException e) {
                throw new BadRequestException("Invalid trip date format. Expected YYYY-MM-DD.");
            }
            if (tripDate.isBefore(today)) {
                throw new BadRequestException("Trip date cannot be in the past (" + dto.getTripDate() + ").");
            }
            targetDates.add(tripDate);
        }

        // 3. Time validation
        if (dto.getDepartureTime() == null || dto.getDepartureTime().isBlank()) {
            throw new BadRequestException("Departure time is required.");
        }
        int startMin = parseTimeToMinutes(dto.getDepartureTime());
        if (startMin < 0) {
            throw new BadRequestException("Invalid departure time format: " + dto.getDepartureTime());
        }
        int endMin = -1;
        if (dto.getReturnTime() != null && !dto.getReturnTime().isBlank()) {
            endMin = parseTimeToMinutes(dto.getReturnTime());
            if (endMin < 0) {
                throw new BadRequestException("Invalid return time format: " + dto.getReturnTime());
            }
            if (endMin <= startMin) {
                throw new BadRequestException("Return time (" + dto.getReturnTime() + ") cannot be before or equal to departure time (" + dto.getDepartureTime() + ").");
            }
        } else if (dto.isRoundTrip()) {
            throw new BadRequestException("Return time is required for round trips.");
        } else {
            endMin = startMin + 120; // Default 2 hours window for one-way trip
        }

        // 4. Vehicle assignment or check
        Vehicle vehicle = null;
        if (dto.getVehicleId() != null && !dto.getVehicleId().isBlank()) {
            vehicle = vehicleRepository.findByVehicleId(dto.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + dto.getVehicleId()));
        } else {
            // Find first available vehicle of requested trip type
            List<Vehicle> available = vehicleRepository.findAll().stream()
                    .filter(v -> v.getType().equalsIgnoreCase(dto.getTripType()) && "AVAILABLE".equalsIgnoreCase(v.getStatus()))
                    .toList();
            if (!available.isEmpty()) {
                vehicle = available.get(0);
            }
        }

        // 5. Passenger Count & Vehicle Capacity check
        if (dto.getExpectedPassengers() == null || dto.getExpectedPassengers() <= 0) {
            throw new BadRequestException("Expected passengers count must be greater than zero.");
        }
        if (vehicle != null && vehicle.getCapacity() != null && vehicle.getCapacity() > 0) {
            if (dto.getExpectedPassengers() > vehicle.getCapacity()) {
                throw new BadRequestException("Requested passenger count (" + dto.getExpectedPassengers() +
                        ") exceeds vehicle capacity (" + vehicle.getCapacity() + ") for " + vehicle.getName() + ".");
            }
        }

        // 6. Conflict Detection across ALL target dates
        if (vehicle != null) {
            List<String> conflictMessages = new ArrayList<>();
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy");
            for (LocalDate d : targetDates) {
                String dIso = d.toString();
                List<TransportRequest> existing = requestRepository.findByVehicleIdAndTripDateAndStatusIn(
                        vehicle.getVehicleId(), dIso, List.of("PENDING", "APPROVED", "SCHEDULED", "ON_TRIP"));
                for (TransportRequest ex : existing) {
                    int exStart = parseTimeToMinutes(ex.getDepartureTime());
                    int exEnd = parseTimeToMinutes(ex.getReturnTime());
                    if (exStart < 0) exStart = 0;
                    if (exEnd < 0) exEnd = exStart + 120;

                    if (exStart < endMin && exEnd > startMin) {
                        conflictMessages.add("Vehicle " + vehicle.getName() + " has conflicting trip (" +
                                ex.getRequestId() + " [" + ex.getStatus() + "]) on " + d.format(dtf) +
                                " from " + ex.getDepartureTime() + " to " + (ex.getReturnTime() != null ? ex.getReturnTime() : "completion"));
                    }
                }
            }
            if (!conflictMessages.isEmpty()) {
                throw new ConflictException(String.join(" | ", conflictMessages));
            }
        }

        String requesterName = user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getUserId();
        int totalOccurrences = targetDates.size();
        boolean isSeries = totalOccurrences > 1;
        String seriesId = isSeries ? generateSeriesId() : null;
        List<TransportRequest> createdList = new ArrayList<>();
        int occurrenceIndex = 1;

        String startDateStr = targetDates.get(0).toString();
        String endDateStr = targetDates.get(targetDates.size() - 1).toString();
        List<String> dateStrings = targetDates.stream().map(LocalDate::toString).toList();

        for (LocalDate d : targetDates) {
            String dateIso = d.toString();
            String reqId = isSeries
                    ? generateRequestId(occurrenceIndex)
                    : generateRequestId(0);

            TransportRequest request = TransportRequest.builder()
                    .requestId(reqId)
                    .department(user.getDepartment())
                    .tripType(dto.getTripType())
                    .tripDate(dateIso)
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
                    .roundTrip(dto.isRoundTrip())
                    .pickupLocation(dto.getPickupLocation())
                    .destination(dto.getDestination())
                    .purpose(dto.getPurpose())
                    .departureTime(dto.getDepartureTime())
                    .returnTime(dto.getReturnTime())
                    .expectedPassengers(dto.getExpectedPassengers())
                    .vehicleId(vehicle != null ? vehicle.getVehicleId() : null)
                    .vehicleName(vehicle != null ? vehicle.getName() : dto.getTripType())
                    .additionalNotes(dto.getAdditionalNotes())
                    .status("PENDING")
                    .requestedBy(requesterName)
                    .requesterUserId(user.getUserId())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            createdList.add(requestRepository.save(request));
            occurrenceIndex++;
        }

        TransportRequest primary = createdList.get(0);

        // Notify Admins
        String notifyMsg = isSeries
                ? user.getDepartment() + " requested " + totalOccurrences + " trips (" + dto.getTripType() + " to " + dto.getDestination() + " from " + startDateStr + " to " + endDateStr + ")."
                : user.getDepartment() + " requested " + dto.getTripType() + " to " + dto.getDestination() + " on " + startDateStr;

        notificationService.sendNotification(
                "TRANSPORT_ADMIN",
                "ADMIN",
                null,
                "New Transport Request",
                notifyMsg,
                "Transport",
                "INFO",
                primary.getRequestId()
        );

        notificationService.sendNotification(
                "AO_ADMIN",
                "ADMIN",
                null,
                "New Transport Request",
                notifyMsg,
                "Transport",
                "INFO",
                primary.getRequestId()
        );

        return primary;
    }

    private String generateRequestId(int index) {
        long seq = ID_COUNTER.incrementAndGet() % 10000;
        if (index > 0) {
            return String.format("TR-%04d-%d", seq, index);
        }
        return String.format("TR-%04d", seq);
    }

    private String generateSeriesId() {
        long seq = ID_COUNTER.incrementAndGet() % 10000;
        return String.format("TR-SERIES-%04d", seq);
    }

    public List<TransportRequest> getAllRequests(String status, String tripType, String date, String department) {
        return getAllRequests(status, tripType, date, null, null, department, null);
    }

    public List<TransportRequest> getAllRequests(String status, String tripType, String date, String fromDate, String toDate, String department) {
        return getAllRequests(status, tripType, date, fromDate, toDate, department, null);
    }

    public List<TransportRequest> getAllRequests(String status, String tripType, String date, String fromDate, String toDate, String department, User user) {
        if (fromDate != null && toDate != null && !fromDate.isBlank() && !toDate.isBlank()) {
            if (toDate.compareTo(fromDate) < 0) {
                throw new BadRequestException("To date cannot be earlier than From date.");
            }
        }
        List<TransportRequest> all = requestRepository.findAll();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("TRANSPORT_ADMIN") || user.hasServicePermission("TRANSPORT_ADMIN"));

        return all.stream()
                .filter(r -> {
                    if (!isStaffOrAdmin && user != null) {
                        return UnifiedRequestService.isRequestedByUser(r.getRequestedBy(), user);
                    }
                    return department == null || department.isBlank() || department.equalsIgnoreCase("ALL") || r.getDepartment().equalsIgnoreCase(department);
                })
                .filter(r -> status == null || status.isBlank() || status.equalsIgnoreCase("ALL") || r.getStatus().equalsIgnoreCase(status))
                .filter(r -> tripType == null || tripType.isBlank() || tripType.equalsIgnoreCase("ALL") || r.getTripType().equalsIgnoreCase(tripType))
                .filter(r -> {
                    if (fromDate != null && !fromDate.isBlank() && toDate != null && !toDate.isBlank()) {
                        return r.getTripDate().compareTo(fromDate) >= 0 && r.getTripDate().compareTo(toDate) <= 0;
                    }
                    return date == null || date.isBlank() || r.getTripDate().equals(date);
                })
                .sorted((a, b) -> {
                    int dateCmp = a.getTripDate().compareTo(b.getTripDate());
                    if (dateCmp != 0) return dateCmp;
                    if (a.getDepartureTime() != null && b.getDepartureTime() != null) {
                        return a.getDepartureTime().compareTo(b.getDepartureTime());
                    }
                    return b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0;
                })
                .toList();
    }

    public List<TransportRequest> getRequestsByDepartment(String department) {
        return requestRepository.findByDepartment(department).stream()
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public TransportRequest approveRequest(String id) {
        TransportRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Transport request not found: " + id));

        req.setStatus("APPROVED");
        try {
            User current = authService.getCurrentUser();
            if (current != null) {
                req.setApprovedBy(current.getName() != null ? current.getName() : current.getUserId());
            }
        } catch (Exception ignored) {}
        req.setApprovedAt(LocalDateTime.now());
        req.setUpdatedAt(LocalDateTime.now());
        TransportRequest saved = requestRepository.save(req);

        // Update vehicle status to ON_TRIP only if the trip is scheduled for today
        if (req.getVehicleId() != null && req.getTripDate() != null) {
            String today = java.time.LocalDate.now().toString();
            if (today.equals(req.getTripDate())) {
                vehicleRepository.findByVehicleId(req.getVehicleId()).ifPresent(v -> {
                    v.setStatus("ON_TRIP");
                    vehicleRepository.save(v);
                });
            }
        }

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Transport Request Approved",
                "Your transport request for " + req.getDestination() + " on " + req.getTripDate() + " has been approved!",
                "Transport",
                "SUCCESS",
                saved.getRequestId()
        );

        return saved;
    }

    public TransportRequest rejectRequest(String id, String reason) {
        TransportRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Transport request not found: " + id));

        req.setStatus("REJECTED");
        req.setRejectionReason(reason != null && !reason.isBlank() ? reason : "Declined by Transport Administrator");
        req.setUpdatedAt(LocalDateTime.now());
        TransportRequest saved = requestRepository.save(req);

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Transport Request Rejected",
                "Your transport request for " + req.getDestination() + " was rejected. Reason: " + req.getRejectionReason(),
                "Transport",
                "DANGER",
                saved.getRequestId()
        );

        return saved;
    }

    public TransportRequest getRequestById(String id, User user) {
        TransportRequest req = requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Transport request not found: " + id));
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        boolean isStaffOrAdmin = user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("TRANSPORT_ADMIN") || user.hasServicePermission("TRANSPORT_ADMIN");
        if (!isStaffOrAdmin) {
            if (!UnifiedRequestService.isRequestedByUser(req.getRequestedBy(), user)) {
                throw new AccessDeniedException("You are not authorized to view transport requests created by other users.");
            }
        }
        return req;
    }
}
