package com.nec.collegeservices.service;

import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
        List<UnifiedRequestItem> list = new ArrayList<>();

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Seminar Hall")) {
            for (SeminarBooking b : seminarBookingRepository.findAll()) {
                list.add(fromSeminar(b));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Accommodation")) {
            for (AccommodationRequest a : accommodationRequestRepository.findAll()) {
                list.add(fromAccommodation(a));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Transport")) {
            for (TransportRequest t : transportRequestRepository.findAll()) {
                list.add(fromTransport(t));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Stationery")) {
            for (StationeryRequest s : stationeryRequestRepository.findAll()) {
                list.add(fromStationery(s));
            }
        }

        if (serviceFilter == null || serviceFilter.isBlank() || serviceFilter.equalsIgnoreCase("ALL") || serviceFilter.equalsIgnoreCase("Snacks & Meals")) {
            for (MealRequest m : mealRequestRepository.findAll()) {
                list.add(fromMeal(m));
            }
        }

        return list.stream()
                .filter(item -> departmentFilter == null || departmentFilter.isBlank() || departmentFilter.equalsIgnoreCase("ALL") || item.getDepartment().equalsIgnoreCase(departmentFilter))
                .filter(item -> statusFilter == null || statusFilter.isBlank() || statusFilter.equalsIgnoreCase("ALL") || item.getStatus().equalsIgnoreCase(statusFilter))
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
        if (b.getOccurrenceIndex() != null && b.getTotalOccurrences() != null) {
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
}
