package com.nec.collegeservices.service;

import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class DashboardService {

    @Autowired
    private SeminarBookingRepository seminarBookingRepository;

    @Autowired
    private SeminarHallRepository seminarHallRepository;

    @Autowired
    private AccommodationRequestRepository accommodationRequestRepository;

    @Autowired
    private AccommodationRoomRepository accommodationRoomRepository;

    @Autowired
    private TransportRequestRepository transportRequestRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private StationeryRequestRepository stationeryRequestRepository;

    @Autowired
    private StationeryItemRepository stationeryItemRepository;

    @Autowired
    private MealRequestRepository mealRequestRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private UnifiedRequestService unifiedRequestService;

    @Autowired(required = false)
    private AuthService authService;

    /**
     * Computes real MongoDB statistics for the logged-in department user.
     * Upcoming events are strictly filtered to only those created by the authenticated user.
     */
    public Map<String, Object> getDepartmentDashboard(User user) {
        Map<String, Object> data = new HashMap<>();

        // User-specific requests for user overview, counts & recent requests
        List<UnifiedRequestService.UnifiedRequestItem> userRequests = user != null
                ? unifiedRequestService.getRequestsForUser(user, "ALL", "ALL", null)
                : Collections.emptyList();

        Map<String, Object> stats = new HashMap<>();
        stats.put("seminarHalls", userRequests.stream().filter(r -> "SEMINAR".equalsIgnoreCase(r.getServiceCategory())).count());
        stats.put("accommodation", userRequests.stream().filter(r -> "ACCOMMODATION".equalsIgnoreCase(r.getServiceCategory()) && !"REJECTED".equalsIgnoreCase(r.getStatus())).count());
        stats.put("transport", userRequests.stream().filter(r -> "TRANSPORT".equalsIgnoreCase(r.getServiceCategory())).count());
        stats.put("stationery", userRequests.stream().filter(r -> "STATIONERY".equalsIgnoreCase(r.getServiceCategory())).count());
        stats.put("meals", userRequests.stream().filter(r -> "MEALS".equalsIgnoreCase(r.getServiceCategory())).count());

        long pending = userRequests.stream().filter(r -> "PENDING".equalsIgnoreCase(r.getStatus()) || "UNDER_REVIEW".equalsIgnoreCase(r.getStatus())).count();
        long approved = userRequests.stream().filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus()) || "BOOKED".equalsIgnoreCase(r.getStatus())).count();
        long rejected = userRequests.stream().filter(r -> "REJECTED".equalsIgnoreCase(r.getStatus())).count();
        long cancelled = userRequests.stream().filter(r -> "CANCELLED".equalsIgnoreCase(r.getStatus())).count();
        long completed = userRequests.stream().filter(r -> "COMPLETED".equalsIgnoreCase(r.getStatus()) || "COLLECTED".equalsIgnoreCase(r.getStatus())).count();

        stats.put("total", userRequests.size());
        stats.put("pending", pending);
        stats.put("approved", approved);
        stats.put("rejected", rejected);
        stats.put("cancelled", cancelled);
        stats.put("completed", completed);
        data.put("stats", stats);

        // Upcoming events: USER-SPECIFIC ONLY!
        // Show ONLY service requests that were created/submitted by the currently logged-in user.
        List<UnifiedRequestService.UnifiedRequestItem> userUpcoming = getUserUpcomingEvents(user);
        data.put("upcomingEvents", userUpcoming);
        data.put("recentRequests", userRequests);

        // Announcements: COLLEGE-WIDE & Department Announcements remain unchanged (Requirement 9 & 23)
        data.put("announcements", announcementRepository.findByActiveTrue());

        return data;
    }

    public List<UnifiedRequestService.UnifiedRequestItem> getUserUpcomingEvents(User user) {
        if (user == null) {
            return Collections.emptyList();
        }
        List<UnifiedRequestService.UnifiedRequestItem> userRequests = unifiedRequestService.getRequestsForUser(user, "ALL", "ALL", null);
        return userRequests.stream()
                .filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus()) || "BOOKED".equalsIgnoreCase(r.getStatus()) || "PENDING".equalsIgnoreCase(r.getStatus()))
                .toList();
    }

    public Map<String, Object> getDepartmentDashboard(String department) {
        if (authService != null) {
            User current = authService.getCurrentUser();
            if (current != null) {
                return getDepartmentDashboard(current);
            }
        }
        User fallbackUser = User.builder().department(department).build();
        return getDepartmentDashboard(fallbackUser);
    }

    /**
     * Seminar Admin Dashboard stats
     */
    public Map<String, Object> getSeminarAdminDashboard() {
        Map<String, Object> data = new HashMap<>();
        List<SeminarBooking> all = seminarBookingRepository.findAll();

        long pending = all.stream().filter(b -> "PENDING".equalsIgnoreCase(b.getStatus())).count();
        long approved = all.stream().filter(b -> "APPROVED".equalsIgnoreCase(b.getStatus()) || "BOOKED".equalsIgnoreCase(b.getStatus())).count();
        long rejected = all.stream().filter(b -> "REJECTED".equalsIgnoreCase(b.getStatus())).count();

        data.put("totalRequests", all.size());
        data.put("pending", pending);
        data.put("approved", approved);
        data.put("rejected", rejected);

        data.put("halls", seminarHallRepository.findAll());
        data.put("upcomingBookings", all.stream().filter(b -> !"REJECTED".equalsIgnoreCase(b.getStatus())).limit(6).toList());
        return data;
    }

    /**
     * Accommodation Admin Dashboard stats
     */
    public Map<String, Object> getAccommodationAdminDashboard() {
        Map<String, Object> data = new HashMap<>();
        List<AccommodationRequest> all = accommodationRequestRepository.findAll();

        long pending = all.stream().filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).count();
        long approved = all.stream().filter(a -> "APPROVED".equalsIgnoreCase(a.getStatus())).count();
        long rejected = all.stream().filter(a -> "REJECTED".equalsIgnoreCase(a.getStatus())).count();

        data.put("totalRequests", all.size());
        data.put("pending", pending);
        data.put("approved", approved);
        data.put("rejected", rejected);

        data.put("rooms", accommodationRoomRepository.findAll());

        String today = LocalDate.now().toString();
        List<AccommodationRequest> todayCheckins = accommodationRequestRepository.findByCheckInDate(today);
        List<AccommodationRequest> todayCheckouts = accommodationRequestRepository.findByCheckOutDate(today);
        data.put("todayCheckIns", todayCheckins);
        data.put("todayCheckOuts", todayCheckouts);

        return data;
    }

    /**
     * Transport Admin Dashboard stats
     */
    public Map<String, Object> getTransportAdminDashboard() {
        Map<String, Object> data = new HashMap<>();
        List<TransportRequest> all = transportRequestRepository.findAll();

        long pending = all.stream().filter(t -> "PENDING".equalsIgnoreCase(t.getStatus())).count();
        long approved = all.stream().filter(t -> "APPROVED".equalsIgnoreCase(t.getStatus())).count();
        long rejected = all.stream().filter(t -> "REJECTED".equalsIgnoreCase(t.getStatus())).count();

        data.put("totalRequests", all.size());
        data.put("pending", pending);
        data.put("approved", approved);
        data.put("rejected", rejected);

        data.put("vehicles", vehicleRepository.findAll());
        return data;
    }

    /**
     * Stationery Admin Dashboard stats
     */
    public Map<String, Object> getStationeryAdminDashboard() {
        Map<String, Object> data = new HashMap<>();
        List<StationeryRequest> all = stationeryRequestRepository.findAll();

        long pending = all.stream().filter(s -> "PENDING".equalsIgnoreCase(s.getStatus()) || "UNDER_REVIEW".equalsIgnoreCase(s.getStatus())).count();
        long approved = all.stream().filter(s -> "APPROVED".equalsIgnoreCase(s.getStatus())).count();
        long ready = all.stream().filter(s -> "READY_FOR_COLLECTION".equalsIgnoreCase(s.getStatus())).count();
        long collected = all.stream().filter(s -> "COLLECTED".equalsIgnoreCase(s.getStatus())).count();
        long rejected = all.stream().filter(s -> "REJECTED".equalsIgnoreCase(s.getStatus())).count();

        data.put("totalRequests", all.size());
        data.put("pending", pending);
        data.put("approved", approved);
        data.put("readyForCollection", ready);
        data.put("collected", collected);
        data.put("rejected", rejected);

        List<StationeryItem> items = stationeryItemRepository.findAll();
        data.put("items", items);

        return data;
    }

    /**
     * Meals Admin Dashboard stats
     */
    public Map<String, Object> getMealsAdminDashboard() {
        Map<String, Object> data = new HashMap<>();
        List<MealRequest> all = mealRequestRepository.findAll();

        long pending = all.stream().filter(m -> "PENDING".equalsIgnoreCase(m.getStatus())).count();
        long approved = all.stream().filter(m -> "APPROVED".equalsIgnoreCase(m.getStatus())).count();
        long rejected = all.stream().filter(m -> "REJECTED".equalsIgnoreCase(m.getStatus())).count();

        data.put("totalRequests", all.size());
        data.put("pending", pending);
        data.put("approved", approved);
        data.put("rejected", rejected);

        // Category breakdown counts
        Map<String, Long> categoryCounts = new HashMap<>();
        for (String cat : List.of("Breakfast", "Lunch", "Dinner", "Snacks", "Tea / Coffee")) {
            categoryCounts.put(cat, all.stream().filter(m -> m.getMealTypes() != null && m.getMealTypes().contains(cat)).count());
        }
        data.put("categoryCounts", categoryCounts);

        return data;
    }

    /**
     * AO Super Admin Dashboard stats
     */
    public Map<String, Object> getAOAdminDashboard() {
        Map<String, Object> data = new HashMap<>();

        long semCount = seminarBookingRepository.count();
        long accCount = accommodationRequestRepository.count();
        long transCount = transportRequestRepository.count();
        long statCount = stationeryRequestRepository.count();
        long mealCount = mealRequestRepository.count();

        long total = semCount + accCount + transCount + statCount + mealCount;

        // Pending counts
        long semPending = seminarBookingRepository.findByStatus("PENDING").size();
        long accPending = accommodationRequestRepository.findByStatus("PENDING").size();
        long transPending = transportRequestRepository.findByStatus("PENDING").size();
        long statPending = stationeryRequestRepository.findByStatus("PENDING").size();
        long mealPending = mealRequestRepository.findByStatus("PENDING").size();
        long totalPending = semPending + accPending + transPending + statPending + mealPending;

        // Approved counts
        long semAppr = seminarBookingRepository.findByStatus("APPROVED").size() + seminarBookingRepository.findByStatus("BOOKED").size();
        long accAppr = accommodationRequestRepository.findByStatus("APPROVED").size();
        long transAppr = transportRequestRepository.findByStatus("APPROVED").size();
        long statAppr = stationeryRequestRepository.findByStatus("APPROVED").size();
        long mealAppr = mealRequestRepository.findByStatus("APPROVED").size();
        long totalApproved = semAppr + accAppr + transAppr + statAppr + mealAppr;

        // Rejected counts
        long semRej = seminarBookingRepository.findByStatus("REJECTED").size();
        long accRej = accommodationRequestRepository.findByStatus("REJECTED").size();
        long transRej = transportRequestRepository.findByStatus("REJECTED").size();
        long statRej = stationeryRequestRepository.findByStatus("REJECTED").size();
        long mealRej = mealRequestRepository.findByStatus("REJECTED").size();
        long totalRejected = semRej + accRej + transRej + statRej + mealRej;

        long statComp = stationeryRequestRepository.findByStatus("COLLECTED").size();
        long totalCompleted = statComp;

        data.put("totalRequests", total);
        data.put("pending", totalPending);
        data.put("approved", totalApproved);
        data.put("rejected", totalRejected);
        data.put("completed", totalCompleted);

        Map<String, Long> byService = new LinkedHashMap<>();
        byService.put("Seminar Hall", semCount);
        byService.put("Accommodation", accCount);
        byService.put("Transport", transCount);
        byService.put("Snacks & Meals", mealCount);
        byService.put("Stationery", statCount);
        data.put("requestsByService", byService);
        data.put("byService", byService);

        Map<String, Long> pendingByService = new LinkedHashMap<>();
        pendingByService.put("Seminar Hall", semPending);
        pendingByService.put("Accommodation", accPending);
        pendingByService.put("Transport", transPending);
        pendingByService.put("Snacks & Meals", mealPending);
        pendingByService.put("Stationery", statPending);
        data.put("pendingByService", pendingByService);

        List<UnifiedRequestService.UnifiedRequestItem> allRecent = unifiedRequestService.getAllRequests("ALL", "ALL", "ALL", null);
        data.put("recentRequests", allRecent);
        data.put("upcomingEvents", allRecent.stream().filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus()) || "PENDING".equalsIgnoreCase(r.getStatus())).toList());

        Map<String, Long> byDepartment = new LinkedHashMap<>();
        for (UnifiedRequestService.UnifiedRequestItem item : allRecent) {
            if (item.getDepartment() != null) {
                byDepartment.put(item.getDepartment(), byDepartment.getOrDefault(item.getDepartment(), 0L) + 1L);
            }
        }
        data.put("requestsByDepartment", byDepartment);
        data.put("byDepartment", byDepartment);

        return data;
    }
}
