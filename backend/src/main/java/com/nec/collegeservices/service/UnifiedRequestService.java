package com.nec.collegeservices.service;

import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class UnifiedRequestService {

    @Autowired
    private SeminarBookingRepository seminarBookingRepository;

    @Autowired
    private AccommodationRequestRepository accommodationRequestRepository;

    @Autowired
    private TransportRequestRepository transportRequestRepository;

    @Autowired
    private StationeryRequestRepository stationeryRequestRepository;

    @Autowired
    private MealRequestRepository mealRequestRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RequesterResolver requesterResolver;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnifiedRequestItem {
        private String id;
        private String requestId;
        private String date;
        private String service; // Seminar Hall, Accommodation, Transport, Stationery, Snacks & Meals
        private String serviceCategory; // SEMINAR, ACCOMMODATION, TRANSPORT, STATIONERY, MEALS
        private String department;
        private String requestedBy;
        private String requesterUserId;
        private String details;
        private String status; // PENDING, APPROVED, REJECTED, BOOKED
        private LocalDateTime createdAt;
        private String approvedBy;
        private LocalDateTime approvedAt;
        private String adminRemarks;
        private Object rawObject;
    }

    public List<UnifiedRequestItem> getRequestsForDepartment(String department, String serviceFilter, String statusFilter, String search) {
        List<UnifiedRequestItem> list = new ArrayList<>();

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Seminar Hall")) {
            for (SeminarBooking b : seminarBookingRepository.findByDepartment(department)) {
                list.add(fromSeminar(b));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Accommodation")) {
            for (AccommodationRequest a : accommodationRequestRepository.findByDepartment(department)) {
                list.add(fromAccommodation(a));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Transport")) {
            for (TransportRequest t : transportRequestRepository.findByDepartment(department)) {
                list.add(fromTransport(t));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Stationery")) {
            for (StationeryRequest s : stationeryRequestRepository.findByDepartment(department)) {
                list.add(fromStationery(s));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Snacks & Meals")) {
            for (MealRequest m : mealRequestRepository.findByDepartment(department)) {
                list.add(fromMeal(m));
            }
        }

        return list.stream()
                .filter(item -> statusFilter == null || statusFilter.isBlank() || statusFilter.equalsIgnoreCase("ALL") || item.getStatus().equalsIgnoreCase(statusFilter))
                .filter(item -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    return (item.getRequestId() != null && item.getRequestId().toLowerCase().contains(q)) ||
                            (item.getDetails() != null && item.getDetails().toLowerCase().contains(q)) ||
                            (item.getService() != null && item.getService().toLowerCase().contains(q)) ||
                            (item.getDepartment() != null && item.getDepartment().toLowerCase().contains(q)) ||
                            (item.getRequestedBy() != null && item.getRequestedBy().toLowerCase().contains(q)) ||
                            (item.getRequesterUserId() != null && item.getRequesterUserId().toLowerCase().contains(q)) ||
                            (item.getStatus() != null && item.getStatus().toLowerCase().contains(q));
                })
                .sorted(Comparator.comparing(UnifiedRequestItem::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<UnifiedRequestItem> getRequestsForUser(User user, String serviceFilter, String statusFilter, String search) {
        if (user == null) {
            return new ArrayList<>();
        }
        List<UnifiedRequestItem> all = getAllRequests(serviceFilter, "ALL", statusFilter, search);
        return all.stream()
                .filter(item -> isRequestedByUser(item, user))
                .toList();
    }

    public static boolean isRequestedByUser(UnifiedRequestItem item, User user) {
        if (item == null || user == null) return false;
        if (item.getRequesterUserId() != null && !item.getRequesterUserId().isBlank()) {
            if (item.getRequesterUserId().equalsIgnoreCase(user.getUserId())) {
                return true;
            }
        }
        return isRequestedByUser(item.getRequestedBy(), user);
    }

    public static boolean isRequestedByUser(String requestedBy, User user) {
        if (requestedBy == null || user == null) return false;
        String req = requestedBy.trim().replaceAll("\\s+", " ");
        if (user.getUserId() != null && !user.getUserId().isBlank()) {
            String uid = user.getUserId().trim();
            if (req.equalsIgnoreCase(uid)) {
                return true;
            }
            if (req.toLowerCase().contains("(" + uid.toLowerCase() + ")")) {
                return true;
            }
        }
        if (user.getName() != null && !user.getName().isBlank()) {
            String uName = user.getName().trim().replaceAll("\\s+", " ");
            if (req.equalsIgnoreCase(uName)) {
                return true;
            }
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            if (req.equalsIgnoreCase(user.getEmail().trim())) {
                return true;
            }
        }
        return false;
    }

    public List<UnifiedRequestItem> getAllRequests(String serviceFilter, String departmentFilter, String statusFilter, String search) {
        return getAllRequests(serviceFilter, departmentFilter, statusFilter, null, search);
    }

    public List<UnifiedRequestItem> getAllRequests(String serviceFilter, String departmentFilter, String statusFilter, String dateFilter, String search) {
        List<UnifiedRequestItem> list = new ArrayList<>();

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Seminar Hall") || serviceFilter.equalsIgnoreCase("SEMINAR")) {
            for (SeminarBooking b : seminarBookingRepository.findAll()) {
                list.add(fromSeminar(b));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Accommodation") || serviceFilter.equalsIgnoreCase("ACCOMMODATION")) {
            for (AccommodationRequest a : accommodationRequestRepository.findAll()) {
                list.add(fromAccommodation(a));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Transport") || serviceFilter.equalsIgnoreCase("TRANSPORT")) {
            for (TransportRequest t : transportRequestRepository.findAll()) {
                list.add(fromTransport(t));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Stationery") || serviceFilter.equalsIgnoreCase("STATIONERY")) {
            for (StationeryRequest s : stationeryRequestRepository.findAll()) {
                list.add(fromStationery(s));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Snacks & Meals") || serviceFilter.equalsIgnoreCase("MEALS") || serviceFilter.equalsIgnoreCase("SNACKS_MEALS")) {
            for (MealRequest m : mealRequestRepository.findAll()) {
                list.add(fromMeal(m));
            }
        }

        return list.stream()
                .filter(item -> departmentFilter == null || departmentFilter.isBlank() || departmentFilter.equalsIgnoreCase("ALL") || (item.getDepartment() != null && item.getDepartment().equalsIgnoreCase(departmentFilter)))
                .filter(item -> statusFilter == null || statusFilter.isBlank() || statusFilter.equalsIgnoreCase("ALL") || (item.getStatus() != null && item.getStatus().equalsIgnoreCase(statusFilter)))
                .filter(item -> {
                    if (dateFilter == null || dateFilter.isBlank() || dateFilter.equalsIgnoreCase("ALL")) return true;
                    if (item.getRawObject() instanceof SeminarBooking sb && sb.getDates() != null && !sb.getDates().isEmpty()) {
                        if (sb.getDates().stream().anyMatch(d -> d.startsWith(dateFilter))) return true;
                    }
                    if (item.getDate() != null && item.getDate().startsWith(dateFilter)) return true;
                    if (item.getCreatedAt() != null && item.getCreatedAt().toLocalDate().toString().equals(dateFilter)) return true;
                    return false;
                })
                .filter(item -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    return (item.getRequestId() != null && item.getRequestId().toLowerCase().contains(q)) ||
                            (item.getDetails() != null && item.getDetails().toLowerCase().contains(q)) ||
                            (item.getDepartment() != null && item.getDepartment().toLowerCase().contains(q)) ||
                            (item.getService() != null && item.getService().toLowerCase().contains(q)) ||
                            (item.getRequestedBy() != null && item.getRequestedBy().toLowerCase().contains(q)) ||
                            (item.getRequesterUserId() != null && item.getRequesterUserId().toLowerCase().contains(q)) ||
                            (item.getStatus() != null && item.getStatus().toLowerCase().contains(q));
                })
                .sorted(Comparator.comparing(UnifiedRequestItem::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public UnifiedRequestItem getRequestById(String id) {
        if (id == null || id.isBlank()) return null;

        var seminarOpt = seminarBookingRepository.findById(id).or(() -> seminarBookingRepository.findByBookingId(id));
        if (seminarOpt.isPresent()) return fromSeminar(seminarOpt.get());

        var accOpt = accommodationRequestRepository.findById(id).or(() -> accommodationRequestRepository.findByRequestId(id));
        if (accOpt.isPresent()) return fromAccommodation(accOpt.get());

        var transOpt = transportRequestRepository.findById(id).or(() -> transportRequestRepository.findByRequestId(id));
        if (transOpt.isPresent()) return fromTransport(transOpt.get());

        var statOpt = stationeryRequestRepository.findById(id).or(() -> stationeryRequestRepository.findByRequestId(id));
        if (statOpt.isPresent()) return fromStationery(statOpt.get());

        var mealOpt = mealRequestRepository.findById(id).or(() -> mealRequestRepository.findByRequestId(id));
        if (mealOpt.isPresent()) return fromMeal(mealOpt.get());

        return null;
    }

    public UnifiedRequestItem fromSeminar(SeminarBooking b) {
        String detailText = b.getHallName() + " (" + b.getSlot() + ") - " + b.getEventTitle();
        if (b.getDates() != null && !b.getDates().isEmpty()) {
            detailText = b.getHallName() + " (" + b.getSlot() + ") [Recurring: " + b.getDates().size() + " Occurrences] - " + b.getEventTitle();
        } else if (b.getOccurrenceIndex() != null && b.getTotalOccurrences() != null) {
            detailText = b.getHallName() + " (" + b.getSlot() + ") [Occ " + b.getOccurrenceIndex() + " of " + b.getTotalOccurrences() + "] - " + b.getEventTitle();
        }

        return UnifiedRequestItem.builder()
                .id(b.getId())
                .requestId(b.getBookingId())
                .date(b.getDate())
                .service("Seminar Hall")
                .serviceCategory("SEMINAR")
                .department(b.getDepartment())
                .requestedBy(b.getRequestedBy())
                .requesterUserId(b.getRequesterUserId())
                .details(detailText)
                .status(b.getStatus())
                .createdAt(b.getCreatedAt())
                .approvedBy(b.getApprovedBy())
                .approvedAt(b.getApprovedAt())
                .adminRemarks(b.getAdminRemarks())
                .rawObject(b)
                .build();
    }

    public UnifiedRequestItem fromAccommodation(AccommodationRequest a) {
        return UnifiedRequestItem.builder()
                .id(a.getId())
                .requestId(a.getRequestId())
                .date(a.getCheckInDate())
                .service("Accommodation")
                .serviceCategory("ACCOMMODATION")
                .department(a.getDepartment())
                .requestedBy(a.getRequestedBy())
                .requesterUserId(a.getRequesterUserId())
                .details(a.getHostel() + " (" + a.getRoomType() + ") - " + a.getGuestsCount() + " Guest(s)")
                .status(a.getStatus())
                .createdAt(a.getCreatedAt())
                .approvedBy(a.getApprovedBy())
                .approvedAt(a.getApprovedAt())
                .adminRemarks(a.getAdminRemarks())
                .rawObject(a)
                .build();
    }

    public UnifiedRequestItem fromTransport(TransportRequest t) {
        return UnifiedRequestItem.builder()
                .id(t.getId())
                .requestId(t.getRequestId())
                .date(t.getTripDate())
                .service("Transport")
                .serviceCategory("TRANSPORT")
                .department(t.getDepartment())
                .requestedBy(t.getRequestedBy())
                .requesterUserId(t.getRequesterUserId())
                .details(t.getTripType() + " to " + t.getDestination() + " (" + t.getDepartureTime() + ")")
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .approvedBy(t.getApprovedBy())
                .approvedAt(t.getApprovedAt())
                .adminRemarks(t.getAdminRemarks())
                .rawObject(t)
                .build();
    }

    public UnifiedRequestItem fromStationery(StationeryRequest s) {
        StringBuilder itemSummary = new StringBuilder();
        if (s.getItemsRequested() != null) {
            for (int i = 0; i < s.getItemsRequested().size(); i++) {
                if (i > 0) itemSummary.append(", ");
                itemSummary.append(s.getItemsRequested().get(i).getName())
                        .append(" (").append(s.getItemsRequested().get(i).getQuantity()).append(")");
            }
        }
        return UnifiedRequestItem.builder()
                .id(s.getId())
                .requestId(s.getRequestId())
                .date(s.getCreatedAt() != null ? s.getCreatedAt().toLocalDate().toString() : "")
                .service("Stationery")
                .serviceCategory("STATIONERY")
                .department(s.getDepartment())
                .requestedBy(s.getRequestedBy())
                .requesterUserId(s.getRequesterUserId())
                .details(itemSummary.toString())
                .status(s.getStatus())
                .createdAt(s.getCreatedAt())
                .approvedBy(s.getApprovedBy())
                .approvedAt(s.getApprovedAt())
                .adminRemarks(s.getAdminRemarks() != null ? s.getAdminRemarks() : s.getAdminComments())
                .rawObject(s)
                .build();
    }

    public UnifiedRequestItem fromMeal(MealRequest m) {
        return UnifiedRequestItem.builder()
                .id(m.getId())
                .requestId(m.getRequestId())
                .date(m.getDate())
                .service("Snacks & Meals")
                .serviceCategory("MEALS")
                .department(m.getDepartment())
                .requestedBy(m.getRequestedBy())
                .requesterUserId(m.getRequesterUserId())
                .details(String.join(", ", m.getMealTypes() != null ? m.getMealTypes() : List.of()) + (m.getServiceTime() != null ? " (" + m.getServiceTime() + ")" : "") + " for " + m.getTotalGuests() + " guests")
                .status(m.getStatus())
                .createdAt(m.getCreatedAt())
                .approvedBy(m.getApprovedBy())
                .approvedAt(m.getApprovedAt())
                .adminRemarks(m.getAdminRemarks())
                .rawObject(m)
                .build();
    }

    /**
     * Requirement (Part C): AO Admin Cancel Approved Request across all services.
     */
    public UnifiedRequestItem cancelApprovedRequest(String id, String reason, User user) {
        if (id == null || id.isBlank()) {
            throw new BadRequestException("Request ID is required.");
        }
        if (reason == null || reason.trim().isBlank()) {
            throw new BadRequestException("Cancellation reason is required.");
        }
        String actor = user != null ? (user.getName() != null ? user.getName() : user.getUserId()) : "AO Admin";
        String cleanReason = reason.trim();

        // 1. Check Seminar Booking
        var seminarOpt = seminarBookingRepository.findById(id).or(() -> seminarBookingRepository.findByBookingId(id));
        if (seminarOpt.isPresent()) {
            SeminarBooking b = seminarOpt.get();
            String st = b.getStatus() != null ? b.getStatus().toUpperCase() : "";
            if ("CANCELLED".equals(st)) {
                throw new BadRequestException("Booking " + b.getBookingId() + " is already cancelled.");
            }
            if ("REJECTED".equals(st)) {
                throw new BadRequestException("Cannot cancel booking: booking is in REJECTED state.");
            }
            if (!"APPROVED".equals(st) && !"BOOKED".equals(st) && !"CANCELLATION_REQUESTED".equals(st)) {
                throw new BadRequestException("Only approved requests can be cancelled. Current status is " + st + ".");
            }

            b.setStatus("CANCELLED");
            b.setCancellationReason(cleanReason);
            b.setCancellationReviewedBy(actor);
            b.setCancellationReviewedAt(LocalDateTime.now());
            b.setUpdatedAt(LocalDateTime.now());

            if (b.getStatusHistory() == null) {
                b.setStatusHistory(new ArrayList<>());
            }
            b.getStatusHistory().add(SeminarBooking.StatusHistoryEntry.builder()
                    .status("CANCELLED")
                    .actor(actor)
                    .timestamp(LocalDateTime.now())
                    .comment("Approved booking cancelled by AO Admin: " + cleanReason)
                    .build());

            SeminarBooking saved = seminarBookingRepository.save(b);

            // Notify requester
            String reqId = requesterResolver.resolveRequesterUserId(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment());
            notificationService.sendNotification(
                    "DEPARTMENT_USER",
                    saved.getDepartment(),
                    reqId,
                    "Seminar Hall Booking Cancelled by AO Admin",
                    "Your approved booking for " + saved.getHallName() + " on " + saved.getDate() + " was cancelled by AO Admin. Reason: " + cleanReason,
                    "Seminar Hall",
                    "WARNING",
                    saved.getBookingId()
            );

            return fromSeminar(saved);
        }

        // 2. Check Accommodation
        var accOpt = accommodationRequestRepository.findById(id).or(() -> accommodationRequestRepository.findByRequestId(id));
        if (accOpt.isPresent()) {
            AccommodationRequest a = accOpt.get();
            String st = a.getStatus() != null ? a.getStatus().toUpperCase() : "";
            if ("CANCELLED".equals(st)) {
                throw new BadRequestException("Request " + a.getRequestId() + " is already cancelled.");
            }
            if ("REJECTED".equals(st)) {
                throw new BadRequestException("Cannot cancel request: request is in REJECTED state.");
            }
            boolean isApproved = "APPROVED".equals(st) || "AO_APPROVED".equals(st) || "AO_DIRECT_APPROVED".equals(st) || "BOOKED".equals(st) || "CANCELLATION_REQUESTED".equals(st);
            if (!isApproved) {
                throw new BadRequestException("Only approved requests can be cancelled. Current status is " + st + ".");
            }

            a.setStatus("CANCELLED");
            a.setCancellationReason(cleanReason);
            a.setCancellationReviewedBy(actor);
            a.setCancellationReviewedAt(LocalDateTime.now());
            a.setUpdatedAt(LocalDateTime.now());

            if (a.getStatusHistory() == null) {
                a.setStatusHistory(new ArrayList<>());
            }
            a.getStatusHistory().add(AccommodationRequest.StatusHistoryEntry.builder()
                    .status("CANCELLED")
                    .actor(actor)
                    .timestamp(LocalDateTime.now())
                    .comment("Approved accommodation cancelled by AO Admin: " + cleanReason)
                    .build());

            AccommodationRequest saved = accommodationRequestRepository.save(a);

            String reqId = requesterResolver.resolveRequesterUserId(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment());
            notificationService.sendNotification(
                    "DEPARTMENT_USER",
                    saved.getDepartment(),
                    reqId,
                    "Accommodation Request Cancelled by AO Admin",
                    "Your approved accommodation request (" + saved.getRequestId() + ") was cancelled by AO Admin. Reason: " + cleanReason,
                    "Accommodation",
                    "WARNING",
                    saved.getRequestId()
            );

            return fromAccommodation(saved);
        }

        // 3. Check Transport
        var transOpt = transportRequestRepository.findById(id).or(() -> transportRequestRepository.findByRequestId(id));
        if (transOpt.isPresent()) {
            TransportRequest t = transOpt.get();
            String st = t.getStatus() != null ? t.getStatus().toUpperCase() : "";
            if ("CANCELLED".equals(st)) {
                throw new BadRequestException("Request " + t.getRequestId() + " is already cancelled.");
            }
            if ("REJECTED".equals(st)) {
                throw new BadRequestException("Cannot cancel request: request is in REJECTED state.");
            }
            boolean isApproved = "APPROVED".equals(st) || "SCHEDULED".equals(st);
            if (!isApproved) {
                throw new BadRequestException("Only approved requests can be cancelled. Current status is " + st + ".");
            }

            t.setStatus("CANCELLED");
            t.setAdminRemarks("Cancelled by AO Admin: " + cleanReason);
            t.setUpdatedAt(LocalDateTime.now());

            // Check if vehicle was ON_TRIP for today and release if no other trips
            if (t.getVehicleId() != null && !t.getVehicleId().isBlank()) {
                String today = LocalDate.now().toString();
                if (today.equals(t.getTripDate())) {
                    List<TransportRequest> otherActive = transportRequestRepository.findByTripDateAndStatusIn(
                            today, List.of("APPROVED", "SCHEDULED", "ON_TRIP"));
                    boolean otherBusy = otherActive.stream().anyMatch(r -> !r.getRequestId().equals(t.getRequestId()) && t.getVehicleId().equals(r.getVehicleId()));
                    if (!otherBusy) {
                        vehicleRepository.findByVehicleId(t.getVehicleId()).ifPresent(v -> {
                            if ("ON_TRIP".equalsIgnoreCase(v.getStatus())) {
                                v.setStatus("AVAILABLE");
                                vehicleRepository.save(v);
                            }
                        });
                    }
                }
            }

            TransportRequest saved = transportRequestRepository.save(t);

            String reqId = requesterResolver.resolveRequesterUserId(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment());
            notificationService.sendNotification(
                    "DEPARTMENT_USER",
                    saved.getDepartment(),
                    reqId,
                    "Transport Request Cancelled by AO Admin",
                    "Your approved transport request (" + saved.getRequestId() + ") to " + saved.getDestination() + " was cancelled by AO Admin. Reason: " + cleanReason,
                    "Transport",
                    "WARNING",
                    saved.getRequestId()
            );

            return fromTransport(saved);
        }

        // 4. Check Stationery
        var statOpt = stationeryRequestRepository.findById(id).or(() -> stationeryRequestRepository.findByRequestId(id));
        if (statOpt.isPresent()) {
            StationeryRequest s = statOpt.get();
            String st = s.getStatus() != null ? s.getStatus().toUpperCase() : "";
            if ("CANCELLED".equals(st)) {
                throw new BadRequestException("Request " + s.getRequestId() + " is already cancelled.");
            }
            if ("REJECTED".equals(st)) {
                throw new BadRequestException("Cannot cancel request: request is in REJECTED state.");
            }
            if ("COLLECTED".equals(st)) {
                throw new BadRequestException("Cannot cancel request: items have already been collected.");
            }
            boolean isApproved = "APPROVED".equals(st) || "READY_FOR_COLLECTION".equals(st) || "READY".equals(st);
            if (!isApproved) {
                throw new BadRequestException("Only approved requests can be cancelled. Current status is " + st + ".");
            }

            s.setStatus("CANCELLED");
            s.setAdminComments("Cancelled by AO Admin: " + cleanReason);
            s.setAdminRemarks("Cancelled by AO Admin: " + cleanReason);
            s.setUpdatedAt(LocalDateTime.now());

            StationeryRequest saved = stationeryRequestRepository.save(s);

            String reqId = requesterResolver.resolveRequesterUserId(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment());
            notificationService.sendNotification(
                    "DEPARTMENT_USER",
                    saved.getDepartment(),
                    reqId,
                    "Stationery Request Cancelled by AO Admin",
                    "Your approved stationery request (" + saved.getRequestId() + ") was cancelled by AO Admin. Reason: " + cleanReason,
                    "Stationery",
                    "WARNING",
                    saved.getRequestId()
            );

            return fromStationery(saved);
        }

        // 5. Check Snacks & Meals
        var mealOpt = mealRequestRepository.findById(id).or(() -> mealRequestRepository.findByRequestId(id));
        if (mealOpt.isPresent()) {
            MealRequest m = mealOpt.get();
            String st = m.getStatus() != null ? m.getStatus().toUpperCase() : "";
            if ("CANCELLED".equals(st)) {
                throw new BadRequestException("Request " + m.getRequestId() + " is already cancelled.");
            }
            if ("REJECTED".equals(st)) {
                throw new BadRequestException("Cannot cancel request: request is in REJECTED state.");
            }
            if (!"APPROVED".equals(st)) {
                throw new BadRequestException("Only approved requests can be cancelled. Current status is " + st + ".");
            }

            m.setStatus("CANCELLED");
            m.setAdminRemarks("Cancelled by AO Admin: " + cleanReason);
            m.setUpdatedAt(LocalDateTime.now());

            MealRequest saved = mealRequestRepository.save(m);

            String reqId = requesterResolver.resolveRequesterUserId(saved.getRequesterUserId(), saved.getRequestedBy(), saved.getDepartment());
            notificationService.sendNotification(
                    "DEPARTMENT_USER",
                    saved.getDepartment(),
                    reqId,
                    "Meals Request Cancelled by AO Admin",
                    "Your approved snacks & meals request (" + saved.getRequestId() + ") for " + saved.getDate() + " was cancelled by AO Admin. Reason: " + cleanReason,
                    "Snacks & Meals",
                    "WARNING",
                    saved.getRequestId()
            );

            return fromMeal(saved);
        }

        throw new ResourceNotFoundException("Request not found: " + id);
    }
}
