package com.nec.collegeservices.service;

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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.access.AccessDeniedException;

@Service
public class TransportService {

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

        // 2. Date validation
        if (dto.getTripDate() == null || dto.getTripDate().isBlank()) {
            throw new BadRequestException("Trip date is required.");
        }
        LocalDate tripDate;
        try {
            tripDate = LocalDate.parse(dto.getTripDate().trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid trip date format. Expected YYYY-MM-DD.");
        }
        if (tripDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Trip date cannot be in the past (" + dto.getTripDate() + ").");
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

        // 6. Check if specific vehicle is requested and conflicts on overlapping time windows
        if (vehicle != null) {
            List<TransportRequest> existing = requestRepository.findByVehicleIdAndTripDateAndStatusIn(
                    vehicle.getVehicleId(), dto.getTripDate(), List.of("PENDING", "APPROVED", "SCHEDULED", "ON_TRIP"));
            for (TransportRequest ex : existing) {
                int exStart = parseTimeToMinutes(ex.getDepartureTime());
                int exEnd = parseTimeToMinutes(ex.getReturnTime());
                if (exStart < 0) exStart = 0;
                if (exEnd < 0) exEnd = exStart + 120;

                // Overlap condition: exStart < newEnd && exEnd > newStart
                if (exStart < endMin && exEnd > startMin) {
                    throw new ConflictException("Vehicle " + vehicle.getName() + " already has a conflicting trip (" +
                            ex.getRequestId() + " [" + ex.getStatus() + "]) on " + dto.getTripDate() + " from " +
                            ex.getDepartureTime() + " to " + (ex.getReturnTime() != null ? ex.getReturnTime() : "completion") + ".");
                }
            }
        }

        String requestId = "TR-" + String.format("%03d", System.currentTimeMillis() % 10000);

        TransportRequest request = TransportRequest.builder()
                .requestId(requestId)
                .department(user.getDepartment())
                .tripType(dto.getTripType())
                .tripDate(dto.getTripDate())
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
                .requestedBy(user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getUserId())
                .requesterUserId(user.getUserId())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        TransportRequest saved = requestRepository.save(request);

        // Notify Admins
        notificationService.sendNotification(
                "TRANSPORT_ADMIN",
                "ADMIN",
                null,
                "New Transport Request",
                user.getDepartment() + " requested " + dto.getTripType() + " to " + dto.getDestination() + " on " + dto.getTripDate(),
                "Transport",
                "INFO",
                saved.getRequestId()
        );

        notificationService.sendNotification(
                "AO_ADMIN",
                "ADMIN",
                null,
                "New Transport Request",
                user.getDepartment() + " requested " + dto.getTripType() + " to " + dto.getDestination() + " on " + dto.getTripDate(),
                "Transport",
                "INFO",
                saved.getRequestId()
        );

        return saved;
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
