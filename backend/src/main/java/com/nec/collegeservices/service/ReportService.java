package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.report.ReportDataDTO;
import com.nec.collegeservices.dto.report.ReportFilterRequest;
import com.nec.collegeservices.dto.report.UserReportPermissionsDTO;
import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private static final Logger logger = LoggerFactory.getLogger(ReportService.class);

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
    private SeminarHallRepository seminarHallRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PdfReportGenerator pdfReportGenerator;

    @Autowired
    private ExcelReportGenerator excelReportGenerator;

    /**
     * Resolves the current user's reporting permissions and available filters.
     */
    public UserReportPermissionsDTO getUserPermissions(User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required to access reports.");
        }

        boolean isAO = user.hasRole("CREATOR") || user.hasRole("AO_ADMIN");
        boolean isSemAdmin = user.hasRole("SEMINAR_ADMIN");
        boolean isSemCoord = user.hasRole("SEMINAR_COORDINATOR");
        boolean isAccAdmin = user.hasRole("ACCOMMODATION_ADMIN");
        boolean isTransAdmin = user.hasRole("TRANSPORT_ADMIN");
        boolean isStatAdmin = user.hasRole("STATIONERY_ADMIN");
        boolean isMealsAdmin = user.hasRole("MEALS_ADMIN");
        boolean isServiceAdmin = isSemAdmin || isAccAdmin || isTransAdmin || isStatAdmin || isMealsAdmin;
        boolean isSemCoordOnly = isSemCoord && !isSemAdmin && !isAO;
        boolean isDeptUser = !isAO && !isServiceAdmin && !isSemCoord;
        boolean canViewOverall = isAO;
        boolean canViewAllDepts = isAO || isServiceAdmin || isSemCoord;

        List<String> allowedServices = new ArrayList<>();
        allowedServices.addAll(List.of("SEMINAR_HALL", "ACCOMMODATION", "TRANSPORT", "STATIONERY", "MEALS"));


        // Available Halls
        List<SeminarHall> allHalls = seminarHallRepository.findAll();
        List<UserReportPermissionsDTO.SeminarHallOptionDTO> allowedHalls = new ArrayList<>();

        if (isSemCoordOnly) {
            for (SeminarHall h : allHalls) {
                if (user.isAssignedToHall(h.getHallId()) || (h.getCoordinatorUserIds() != null && h.getCoordinatorUserIds().contains(user.getUserId()))) {
                    allowedHalls.add(UserReportPermissionsDTO.SeminarHallOptionDTO.builder()
                            .hallId(h.getHallId())
                            .hallName(h.getName())
                            .name(h.getName())
                            .location(h.getLocation())
                            .capacity(h.getCapacity())
                            .build());
                }
            }
        } else {
            for (SeminarHall h : allHalls) {
                allowedHalls.add(UserReportPermissionsDTO.SeminarHallOptionDTO.builder()
                        .hallId(h.getHallId())
                        .hallName(h.getName())
                        .name(h.getName())
                        .location(h.getLocation())
                        .capacity(h.getCapacity())
                        .build());
            }
        }

        // Available Departments
        List<String> availableDepts = new ArrayList<>();
        if (canViewAllDepts) {
            Set<String> depts = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
            depts.addAll(List.of("CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "AIML", "MBA", "MCA", "BS&H"));
            for (User u : userRepository.findAll()) {
                if (u.getDepartment() != null && !u.getDepartment().isBlank()) {
                    depts.add(u.getDepartment().trim().toUpperCase());
                }
            }
            availableDepts.addAll(depts);
        } else {
            if (user.getDepartment() != null && !user.getDepartment().isBlank()) {
                availableDepts.add(user.getDepartment().trim().toUpperCase());
            } else {
                availableDepts.add("CSE");
            }
        }

        return UserReportPermissionsDTO.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .primaryRole(user.getRole())
                .department(user.getDepartment())
                .userDepartment(user.getDepartment())
                .isAOAdmin(isAO)
                .isServiceAdmin(isServiceAdmin)
                .isSeminarCoordinator(isSemCoordOnly)
                .isDepartmentUser(isDeptUser)
                .canViewOverall(canViewOverall)
                .canViewAllDepartments(canViewAllDepts)
                .effectiveRoles(user.getEffectiveRoles())
                .allowedServices(allowedServices)
                .allowedHalls(allowedHalls)
                .availableDepartments(availableDepts)
                .build();
    }

    /**
     * Enforces security constraints and calculates all requested report data.
     */
    public ReportDataDTO generateReportData(ReportFilterRequest filter, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        UserReportPermissionsDTO permissions = getUserPermissions(user);
        validateAndEnforceFilterPermissions(filter, user, permissions);

        // Date Range resolution
        DateRange range = resolveDateRange(filter);

        // Fetch filtered items
        List<ReportDataDTO.ReportRecordDTO> records = new ArrayList<>();

        boolean includeSeminar = shouldIncludeService(filter, "SEMINAR");
        boolean includeAccom = shouldIncludeService(filter, "ACCOMMODATION");
        boolean includeTransport = shouldIncludeService(filter, "TRANSPORT");
        boolean includeStationery = shouldIncludeService(filter, "STATIONERY");
        boolean includeMeals = shouldIncludeService(filter, "MEALS");

        List<SeminarBooking> seminarList = new ArrayList<>();
        List<AccommodationRequest> accomList = new ArrayList<>();
        List<TransportRequest> transportList = new ArrayList<>();
        List<StationeryRequest> stationeryList = new ArrayList<>();
        List<MealRequest> mealList = new ArrayList<>();

        if (includeSeminar) {
            seminarList = fetchSeminarBookings(filter, user, permissions, range);
            for (SeminarBooking b : seminarList) {
                records.add(toRecord(b));
            }
        }

        if (includeAccom) {
            accomList = fetchAccommodationRequests(filter, user, permissions, range);
            for (AccommodationRequest a : accomList) {
                records.add(toRecord(a));
            }
        }

        if (includeTransport) {
            transportList = fetchTransportRequests(filter, user, permissions, range);
            for (TransportRequest t : transportList) {
                records.add(toRecord(t));
            }
        }

        if (includeStationery) {
            stationeryList = fetchStationeryRequests(filter, user, permissions, range);
            for (StationeryRequest s : stationeryList) {
                records.add(toRecord(s));
            }
        }

        if (includeMeals) {
            mealList = fetchMealRequests(filter, user, permissions, range);
            for (MealRequest m : mealList) {
                records.add(toRecord(m));
            }
        }

        // Apply general text search across records
        if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
            String q = filter.getSearch().trim().toLowerCase();
            records = records.stream()
                    .filter(r -> (r.getRequestId() != null && r.getRequestId().toLowerCase().contains(q))
                            || (r.getPurpose() != null && r.getPurpose().toLowerCase().contains(q))
                            || (r.getDepartment() != null && r.getDepartment().toLowerCase().contains(q))
                            || (r.getResource() != null && r.getResource().toLowerCase().contains(q))
                            || (r.getRequestedBy() != null && r.getRequestedBy().toLowerCase().contains(q))
                            || (r.getService() != null && r.getService().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        // Sort by date descending
        records.sort((a, b) -> {
            String da = a.getDate() != null ? a.getDate() : "";
            String db = b.getDate() != null ? b.getDate() : "";
            int cmp = db.compareTo(da);
            if (cmp != 0) return cmp;
            return b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0;
        });

        // Compute Aggregations
        ReportDataDTO.ReportSummaryDTO summary = computeSummary(records);
        List<ReportDataDTO.ServiceBreakdownDTO> serviceBreakdown = computeServiceBreakdown(records);
        List<ReportDataDTO.DepartmentBreakdownDTO> deptBreakdown = computeDepartmentBreakdown(records);
        List<ReportDataDTO.HallBreakdownDTO> hallBreakdown = computeHallBreakdown(seminarList);
        Map<String, Long> slotBreakdown = computeSlotBreakdown(seminarList);
        ReportDataDTO.MealsHeadcountDTO mealsHeadcount = computeMealsHeadcount(mealList);
        List<ReportDataDTO.StationeryItemSummaryDTO> stationeryItems = computeStationeryItems(stationeryList);
        ReportDataDTO.TransportMetricsDTO transportMetrics = computeTransportMetrics(transportList);
        ReportDataDTO.AccommodationMetricsDTO accomMetrics = computeAccommodationMetrics(accomList);

        String title = buildReportTitle(filter, user);
        String activeHallName = null;
        if (filter.getHallId() != null && !filter.getHallId().equalsIgnoreCase("ALL")) {
            SeminarHall h = seminarHallRepository.findByHallId(filter.getHallId()).orElse(null);
            if (h != null) {
                activeHallName = h.getName();
            }
        }

        String activeServiceLabel = filter.getServices() != null && !filter.getServices().isEmpty()
                ? String.join(", ", filter.getServices())
                : filter.getService();
        String activeDeptLabel = filter.getDepartments() != null && !filter.getDepartments().isEmpty()
                ? String.join(", ", filter.getDepartments())
                : filter.getDepartment();
        String activeStatusLabel = filter.getStatuses() != null && !filter.getStatuses().isEmpty()
                ? String.join(", ", filter.getStatuses())
                : filter.getStatus();

        ReportDataDTO.ReportMetadataDTO metadata = ReportDataDTO.ReportMetadataDTO.builder()
                .reportTitle(title)
                .generatedBy(user.getName() != null ? user.getName() : user.getUserId())
                .userRole(user.getRole() != null ? user.getRole() : "USER")
                .userDepartment(user.getDepartment())
                .generatedAt(LocalDateTime.now())
                .dateRangeLabel(range.label)
                .activeService(activeServiceLabel)
                .activeDepartment(activeDeptLabel)
                .activeHall(filter.getHallId())
                .activeHallName(activeHallName)
                .activeStatus(activeStatusLabel)
                .viewType(filter.getViewType())
                .build();

        return ReportDataDTO.builder()
                .metadata(metadata)
                .summary(summary)
                .serviceBreakdown(serviceBreakdown)
                .departmentBreakdown(deptBreakdown)
                .hallBreakdown(hallBreakdown)
                .slotBreakdown(slotBreakdown)
                .mealsHeadcount(mealsHeadcount)
                .stationeryItems(stationeryItems)
                .transportMetrics(transportMetrics)
                .accommodationMetrics(accomMetrics)
                .detailedRecords(records)
                .build();
    }

    public byte[] generateReportPdf(ReportFilterRequest filter, User user) {
        ReportDataDTO data = generateReportData(filter, user);
        return pdfReportGenerator.generatePdf(data);
    }

    public byte[] generateReportExcel(ReportFilterRequest filter, User user) {
        ReportDataDTO data = generateReportData(filter, user);
        return excelReportGenerator.generateExcel(data);
    }

    // --- Validation and Filter Enforcement ---
    private void validateAndEnforceFilterPermissions(ReportFilterRequest filter, User user, UserReportPermissionsDTO permissions) {
        if (filter.getService() == null || filter.getService().isBlank()) {
            filter.setService("ALL");
        }
        if (filter.getDepartment() == null || filter.getDepartment().isBlank()) {
            filter.setDepartment("ALL");
        }
        if (filter.getHallId() == null || filter.getHallId().isBlank()) {
            filter.setHallId("ALL");
        }
        if (filter.getStatus() == null || filter.getStatus().isBlank()) {
            filter.setStatus("ALL");
        }
        if (filter.getDateRangeType() == null || filter.getDateRangeType().isBlank()) {
            filter.setDateRangeType("ALL");
        }

        // Clean lists if provided
        if (filter.getServices() != null) {
            filter.setServices(filter.getServices().stream().filter(s -> s != null && !s.isBlank()).collect(Collectors.toList()));
        }
        if (filter.getDepartments() != null) {
            filter.setDepartments(filter.getDepartments().stream().filter(d -> d != null && !d.isBlank()).collect(Collectors.toList()));
        }
        if (filter.getStatuses() != null) {
            filter.setStatuses(filter.getStatuses().stream().filter(st -> st != null && !st.isBlank()).collect(Collectors.toList()));
        }

        // 1. Department Enforcement: Department Users can only access their own department!
        if (permissions.isDepartmentUser()) {
            String userDept = user.getDepartment() != null ? user.getDepartment().trim() : "CSE";
            filter.setDepartment(userDept);
            filter.setDepartments(List.of(userDept));
        }

        // 2. Hall Enforcement: Seminar Coordinators can only access their assigned hall(s)!
        if (permissions.isSeminarCoordinator()) {
            List<String> allowedHallIds = permissions.getAllowedHalls().stream()
                    .map(UserReportPermissionsDTO.SeminarHallOptionDTO::getHallId)
                    .toList();
            if (filter.getHallId() != null && !filter.getHallId().equalsIgnoreCase("ALL")) {
                boolean isAllowed = allowedHallIds.stream().anyMatch(h -> h.equalsIgnoreCase(filter.getHallId()));
                if (!isAllowed) {
                    throw new AccessDeniedException("You are not authorized to access reports for seminar hall: " + filter.getHallId());
                }
            } else if (allowedHallIds.size() == 1) {
                filter.setHallId(allowedHallIds.get(0));
            }
        }
    }

    private boolean isServiceMatch(String s1, String s2) {
        if (s1 == null || s2 == null) return false;
        if (s1.equalsIgnoreCase(s2)) return true;
        if ((s1.equalsIgnoreCase("SEMINAR") || s1.equalsIgnoreCase("SEMINAR_HALL")) &&
            (s2.equalsIgnoreCase("SEMINAR") || s2.equalsIgnoreCase("SEMINAR_HALL"))) {
            return true;
        }
        return false;
    }

    private boolean shouldIncludeService(ReportFilterRequest filter, String targetService) {
        if (filter.getServices() != null && !filter.getServices().isEmpty()) {
            if (filter.getServices().contains("ALL") || filter.getServices().size() >= 5) {
                return true;
            }
            return filter.getServices().stream().anyMatch(s -> isServiceMatch(s, targetService));
        }
        String selectedService = filter.getService();
        if (selectedService == null || selectedService.equalsIgnoreCase("ALL")) return true;
        return isServiceMatch(selectedService, targetService);
    }

    private boolean matchDepartment(String recordDept, List<String> filterDepts, String singleDeptFallback) {
        if (filterDepts != null && !filterDepts.isEmpty()) {
            if (filterDepts.contains("ALL")) return true;
            if (recordDept == null) return false;
            return filterDepts.stream().anyMatch(d -> d.equalsIgnoreCase(recordDept.trim()));
        }
        if (singleDeptFallback == null || singleDeptFallback.equalsIgnoreCase("ALL")) return true;
        return recordDept != null && recordDept.equalsIgnoreCase(singleDeptFallback.trim());
    }

    private boolean matchStatuses(String actualStatus, List<String> filterStatuses, String singleStatusFallback) {
        if (filterStatuses != null && !filterStatuses.isEmpty()) {
            if (filterStatuses.contains("ALL")) return true;
            if (actualStatus == null) return false;
            return filterStatuses.stream().anyMatch(st -> matchStatus(actualStatus, st));
        }
        return matchStatus(actualStatus, singleStatusFallback);
    }

    // --- Record Fetchers with Filtering ---
    private List<SeminarBooking> fetchSeminarBookings(ReportFilterRequest filter, User user, UserReportPermissionsDTO perm, DateRange range) {
        List<SeminarBooking> all = seminarBookingRepository.findAll();
        boolean isMyRequestsOnly = "MY_REQUESTS".equalsIgnoreCase(filter.getViewType());

        return all.stream()
                .filter(b -> !isMyRequestsOnly || UnifiedRequestService.isRequestedByUser(b.getRequestedBy(), user))
                .filter(b -> matchDepartment(b.getDepartment(), filter.getDepartments(), filter.getDepartment()))
                .filter(b -> {
                    if (filter.getHallId().equalsIgnoreCase("ALL")) {
                        if (user.hasRole("SEMINAR_COORDINATOR") && !user.hasRole("SEMINAR_ADMIN") && !perm.isAOAdmin()) {
                            return perm.getAllowedHalls().stream().anyMatch(h -> h.getHallId().equalsIgnoreCase(b.getHallId()));
                        }
                        return true;
                    }
                    return b.getHallId() != null && b.getHallId().equalsIgnoreCase(filter.getHallId());
                })
                .filter(b -> matchStatuses(b.getStatus(), filter.getStatuses(), filter.getStatus()))
                .filter(b -> matchDate(b.getDate() != null ? b.getDate() : b.getStartDate(), range))
                .collect(Collectors.toList());
    }

    private List<AccommodationRequest> fetchAccommodationRequests(ReportFilterRequest filter, User user, UserReportPermissionsDTO perm, DateRange range) {
        List<AccommodationRequest> all = accommodationRequestRepository.findAll();
        boolean isMyRequestsOnly = "MY_REQUESTS".equalsIgnoreCase(filter.getViewType());
        boolean isSuper = perm.isAOAdmin() || (user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN")));
        boolean isAccAdmin = user != null && (user.hasRole("ACCOMMODATION_ADMIN") || user.hasRole("BOYS_HOSTEL_ADMIN") || user.hasRole("GIRLS_HOSTEL_ADMIN") || user.hasServicePermission("ACCOMMODATION_ADMIN"));
        boolean isHostelAdminOnly = isAccAdmin && !isSuper;

        return all.stream()
                .filter(a -> !isMyRequestsOnly || UnifiedRequestService.isRequestedByUser(a.getRequestedBy(), user))
                .filter(a -> {
                    if (isHostelAdminOnly) {
                        if (!user.isAssignedToHostel(a.getHostel())) {
                            return false;
                        }
                        if ("PENDING_AO_APPROVAL".equalsIgnoreCase(a.getStatus()) || "AO_REJECTED".equalsIgnoreCase(a.getStatus())) {
                            return false;
                        }
                        if ("DIRECT_APPROVE".equalsIgnoreCase(a.getAoAction())) {
                            return false;
                        }
                        boolean isForwardedToThisAdmin = "FORWARD".equalsIgnoreCase(a.getAoAction()) ||
                                "AO_APPROVED".equalsIgnoreCase(a.getStatus()) ||
                                (a.getStatus() != null && a.getStatus().startsWith("FORWARDED_TO_"));
                        if (!isForwardedToThisAdmin) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(a -> matchDepartment(a.getDepartment(), filter.getDepartments(), filter.getDepartment()))
                .filter(a -> matchStatuses(a.getStatus(), filter.getStatuses(), filter.getStatus()))
                .filter(a -> matchDate(a.getCheckInDate(), range))
                .collect(Collectors.toList());
    }

    private List<TransportRequest> fetchTransportRequests(ReportFilterRequest filter, User user, UserReportPermissionsDTO perm, DateRange range) {
        List<TransportRequest> all = transportRequestRepository.findAll();
        boolean isMyRequestsOnly = "MY_REQUESTS".equalsIgnoreCase(filter.getViewType());

        return all.stream()
                .filter(t -> !isMyRequestsOnly || UnifiedRequestService.isRequestedByUser(t.getRequestedBy(), user))
                .filter(t -> matchDepartment(t.getDepartment(), filter.getDepartments(), filter.getDepartment()))
                .filter(t -> matchStatuses(t.getStatus(), filter.getStatuses(), filter.getStatus()))
                .filter(t -> matchDate(t.getTripDate(), range))
                .collect(Collectors.toList());
    }

    private List<StationeryRequest> fetchStationeryRequests(ReportFilterRequest filter, User user, UserReportPermissionsDTO perm, DateRange range) {
        List<StationeryRequest> all = stationeryRequestRepository.findAll();
        boolean isMyRequestsOnly = "MY_REQUESTS".equalsIgnoreCase(filter.getViewType());

        return all.stream()
                .filter(s -> !isMyRequestsOnly || UnifiedRequestService.isRequestedByUser(s.getRequestedBy(), user))
                .filter(s -> matchDepartment(s.getDepartment(), filter.getDepartments(), filter.getDepartment()))
                .filter(s -> matchStatuses(s.getStatus(), filter.getStatuses(), filter.getStatus()))
                .filter(s -> {
                    String d = s.getCreatedAt() != null ? s.getCreatedAt().toLocalDate().toString() : null;
                    return matchDate(d, range);
                })
                .collect(Collectors.toList());
    }

    private List<MealRequest> fetchMealRequests(ReportFilterRequest filter, User user, UserReportPermissionsDTO perm, DateRange range) {
        List<MealRequest> all = mealRequestRepository.findAll();
        boolean isMyRequestsOnly = "MY_REQUESTS".equalsIgnoreCase(filter.getViewType());

        return all.stream()
                .filter(m -> !isMyRequestsOnly || UnifiedRequestService.isRequestedByUser(m.getRequestedBy(), user))
                .filter(m -> matchDepartment(m.getDepartment(), filter.getDepartments(), filter.getDepartment()))
                .filter(m -> matchStatuses(m.getStatus(), filter.getStatuses(), filter.getStatus()))
                .filter(m -> matchDate(m.getDate() != null ? m.getDate() : m.getEventDate(), range))
                .collect(Collectors.toList());
    }

    private boolean matchStatus(String actualStatus, String filterStatus) {
        if (filterStatus == null || filterStatus.equalsIgnoreCase("ALL")) return true;
        if (actualStatus == null) return false;
        String act = actualStatus.trim().toUpperCase();
        String flt = filterStatus.trim().toUpperCase();

        if (act.equals(flt)) return true;

        if (flt.equals("APPROVED")) {
            return isApprovedStatus(act);
        }
        if (flt.equals("PENDING")) {
            return isPendingStatus(act);
        }
        if (flt.equals("UNDER_REVIEW")) {
            return act.equals("UNDER_REVIEW") || act.equals("REVIEW")
                    || act.equals("PENDING_AO_APPROVAL") || act.equals("AO_APPROVED")
                    || act.equals("FORWARDED_TO_BOYS_ADMIN") || act.equals("FORWARDED_TO_GIRLS_ADMIN");
        }
        if (flt.equals("REJECTED")) {
            return isRejectedStatus(act);
        }
        if (flt.equals("CANCELLED")) {
            return isCancelledStatus(act);
        }
        if (flt.equals("COMPLETED")) {
            return act.equals("COMPLETED") || act.equals("COLLECTED");
        }
        return false;
    }

    private boolean matchDate(String recordDateStr, DateRange range) {
        if (!range.hasFilter) return true;
        if (recordDateStr == null || recordDateStr.isBlank()) return false;
        String d = recordDateStr.trim().substring(0, Math.min(10, recordDateStr.trim().length()));
        if (range.startDate != null && d.compareTo(range.startDate) < 0) return false;
        if (range.endDate != null && d.compareTo(range.endDate) > 0) return false;
        return true;
    }

    // --- Record Converters ---
    private ReportDataDTO.ReportRecordDTO toRecord(SeminarBooking b) {
        return ReportDataDTO.ReportRecordDTO.builder()
                .requestId(b.getBookingId())
                .service("Seminar Hall")
                .serviceKey("SEMINAR")
                .department(b.getDepartment())
                .requestedBy(b.getRequestedBy())
                .requesterUserId(b.getRequesterUserId())
                .date(b.getDate() != null ? b.getDate() : b.getStartDate())
                .purpose(b.getEventTitle() != null ? b.getEventTitle() : b.getPurpose())
                .status(b.getStatus())
                .createdAt(b.getCreatedAt())
                .approvedBy(b.getApprovedBy())
                .resource(b.getHallName() != null ? b.getHallName() : b.getHallId())
                .slotOrTiming(b.getSlot())
                .guestOrQuantityCount(b.getExpectedParticipants())
                .details("Slot: " + b.getSlot() + " | Participants: " + (b.getExpectedParticipants() != null ? b.getExpectedParticipants() : "N/A"))
                .build();
    }

    private ReportDataDTO.ReportRecordDTO toRecord(AccommodationRequest a) {
        String stage;
        String st = a.getStatus() != null ? a.getStatus().trim().toUpperCase() : "";
        if (isApprovedStatus(st)) {
            stage = "APPROVED";
        } else if (isRejectedStatus(st)) {
            stage = "REJECTED";
        } else if (isCancelledStatus(st)) {
            stage = "CANCELLED";
        } else if ("PENDING_AO_APPROVAL".equals(st) || ("PENDING".equals(st) && ("PENDING".equalsIgnoreCase(a.getAoApprovalStatus()) || a.getAoApprovalStatus() == null) && (a.getForwardedTo() == null || a.getForwardedTo().isBlank()))) {
            stage = "AWAITING_AO_FORWARDING";
        } else if ("FORWARDED_TO_BOYS_ADMIN".equals(st) || "FORWARDED_TO_GIRLS_ADMIN".equals(st) || "AO_APPROVED".equals(st) || "FORWARDED".equalsIgnoreCase(a.getAoApprovalStatus())) {
            stage = "FORWARDED_HOSTEL_ADMIN";
        } else {
            stage = "PENDING_REVIEW";
        }

        String fwTo = a.getForwardedTo();
        if ((fwTo == null || fwTo.isBlank()) && a.getHostel() != null) {
            if (a.getHostel().toLowerCase().contains("boys")) {
                fwTo = "BOYS_HOSTEL";
            } else if (a.getHostel().toLowerCase().contains("girls")) {
                fwTo = "GIRLS_HOSTEL";
            }
        }

        return ReportDataDTO.ReportRecordDTO.builder()
                .requestId(a.getRequestId())
                .service("Accommodation")
                .serviceKey("ACCOMMODATION")
                .department(a.getDepartment())
                .requestedBy(a.getRequestedBy() != null ? a.getRequestedBy() : a.getFacultyOrGuestName())
                .requesterUserId(a.getRequesterUserId())
                .date(a.getCheckInDate())
                .purpose(a.getPurpose())
                .status(a.getStatus())
                .createdAt(a.getCreatedAt())
                .approvedBy(a.getApprovedBy())
                .resource(a.getHostel() + " (" + a.getRoomType() + ") " + (a.getRoomId() != null ? a.getRoomId() : ""))
                .slotOrTiming(a.getCheckInDate() + " to " + a.getCheckOutDate())
                .guestOrQuantityCount(a.getGuestsCount())
                .details("Guests: " + (a.getGuestsCount() != null ? a.getGuestsCount() : 1) + " | Room: " + (a.getRoomId() != null ? a.getRoomId() : a.getRoomType()))
                .workflowStage(stage)
                .aoApprovalStatus(a.getAoApprovalStatus())
                .forwardedTo(fwTo)
                .build();
    }

    private ReportDataDTO.ReportRecordDTO toRecord(TransportRequest t) {
        return ReportDataDTO.ReportRecordDTO.builder()
                .requestId(t.getRequestId())
                .service("Transport")
                .serviceKey("TRANSPORT")
                .department(t.getDepartment())
                .requestedBy(t.getRequestedBy())
                .requesterUserId(t.getRequesterUserId())
                .date(t.getTripDate())
                .purpose(t.getPurpose())
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .approvedBy(t.getApprovedBy())
                .resource(t.getTripType() + (t.getVehicleName() != null ? " (" + t.getVehicleName() + ")" : ""))
                .slotOrTiming(t.getDepartureTime() + (t.getReturnTime() != null ? " - " + t.getReturnTime() : ""))
                .guestOrQuantityCount(t.getExpectedPassengers())
                .details(t.getPickupLocation() + " → " + t.getDestination() + " | Passengers: " + (t.getExpectedPassengers() != null ? t.getExpectedPassengers() : 0))
                .build();
    }

    private ReportDataDTO.ReportRecordDTO toRecord(StationeryRequest s) {
        int totalQty = s.getItemsRequested() != null
                ? s.getItemsRequested().stream().mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 0).sum()
                : 0;
        String itemsSummary = s.getItemsRequested() != null
                ? s.getItemsRequested().stream().map(i -> i.getName() + " (" + i.getQuantity() + ")").collect(Collectors.joining(", "))
                : "-";

        return ReportDataDTO.ReportRecordDTO.builder()
                .requestId(s.getRequestId())
                .service("Stationery")
                .serviceKey("STATIONERY")
                .department(s.getDepartment())
                .requestedBy(s.getRequestedBy())
                .requesterUserId(s.getRequesterUserId())
                .date(s.getCreatedAt() != null ? s.getCreatedAt().toLocalDate().toString() : "-")
                .purpose(s.getPurpose())
                .status(s.getStatus())
                .createdAt(s.getCreatedAt())
                .approvedBy(s.getApprovedBy())
                .resource(itemsSummary)
                .slotOrTiming("On-Demand")
                .guestOrQuantityCount(totalQty)
                .details(itemsSummary)
                .build();
    }

    private ReportDataDTO.ReportRecordDTO toRecord(MealRequest m) {
        String mealsList = m.getMealTypes() != null ? String.join(", ", m.getMealTypes()) : "Catering";
        return ReportDataDTO.ReportRecordDTO.builder()
                .requestId(m.getRequestId())
                .service("Snacks & Meals")
                .serviceKey("MEALS")
                .department(m.getDepartment())
                .requestedBy(m.getRequestedBy())
                .requesterUserId(m.getRequesterUserId())
                .date(m.getDate() != null ? m.getDate() : m.getEventDate())
                .purpose(m.getEventTitle() != null ? m.getEventTitle() : m.getEventName())
                .status(m.getStatus())
                .createdAt(m.getCreatedAt())
                .approvedBy(m.getApprovedBy())
                .resource(m.getVenue() + " (" + mealsList + ")")
                .slotOrTiming(m.getServiceTime() != null ? m.getServiceTime() : "Service Timing")
                .guestOrQuantityCount(m.getTotalGuests())
                .details("Guests: " + (m.getTotalGuests() != null ? m.getTotalGuests() : 0) + " | Venue: " + m.getVenue())
                .build();
    }

    // --- Aggregation Calculations ---
    private ReportDataDTO.ReportSummaryDTO computeSummary(List<ReportDataDTO.ReportRecordDTO> records) {
        long total = records.size();
        long approved = records.stream().filter(r -> isApprovedStatus(r.getStatus())).count();
        long pending = records.stream().filter(r -> isPendingStatus(r.getStatus())).count();
        long rejected = records.stream().filter(r -> isRejectedStatus(r.getStatus())).count();
        long cancelled = records.stream().filter(r -> isCancelledStatus(r.getStatus())).count();

        long pendingAoReview = records.stream().filter(this::isAwaitingAoForwarding).count();
        long pendingHostelReview = records.stream().filter(this::isAwaitingHostelReview).count();
        long pendingGeneral = pending - pendingAoReview - pendingHostelReview;
        if (pendingGeneral < 0) pendingGeneral = 0;

        return ReportDataDTO.ReportSummaryDTO.builder()
                .totalRequests(total)
                .approved(approved)
                .pending(pending)
                .rejected(rejected)
                .cancelled(cancelled)
                .pendingAoReview(pendingAoReview)
                .pendingHostelReview(pendingHostelReview)
                .pendingGeneral(pendingGeneral)
                .build();
    }

    private List<ReportDataDTO.ServiceBreakdownDTO> computeServiceBreakdown(List<ReportDataDTO.ReportRecordDTO> records) {
        Map<String, List<ReportDataDTO.ReportRecordDTO>> grouped = records.stream()
                .collect(Collectors.groupingBy(ReportDataDTO.ReportRecordDTO::getServiceKey));

        List<ReportDataDTO.ServiceBreakdownDTO> list = new ArrayList<>();
        Map<String, String> nameMap = Map.of(
                "SEMINAR", "Seminar Hall",
                "ACCOMMODATION", "Accommodation",
                "TRANSPORT", "Transport",
                "STATIONERY", "Stationery",
                "MEALS", "Snacks & Meals"
        );

        for (String key : List.of("SEMINAR", "ACCOMMODATION", "TRANSPORT", "STATIONERY", "MEALS")) {
            List<ReportDataDTO.ReportRecordDTO> recs = grouped.getOrDefault(key, Collections.emptyList());
            list.add(ReportDataDTO.ServiceBreakdownDTO.builder()
                    .serviceKey(key)
                    .serviceName(nameMap.get(key))
                    .total(recs.size())
                    .approved(recs.stream().filter(r -> isApprovedStatus(r.getStatus())).count())
                    .pending(recs.stream().filter(r -> isPendingStatus(r.getStatus())).count())
                    .rejected(recs.stream().filter(r -> isRejectedStatus(r.getStatus())).count())
                    .cancelled(recs.stream().filter(r -> isCancelledStatus(r.getStatus())).count())
                    .build());
        }
        return list;
    }

    private List<ReportDataDTO.DepartmentBreakdownDTO> computeDepartmentBreakdown(List<ReportDataDTO.ReportRecordDTO> records) {
        Map<String, List<ReportDataDTO.ReportRecordDTO>> grouped = records.stream()
                .filter(r -> r.getDepartment() != null && !r.getDepartment().isBlank())
                .collect(Collectors.groupingBy(r -> r.getDepartment().toUpperCase()));

        List<ReportDataDTO.DepartmentBreakdownDTO> list = new ArrayList<>();
        for (Map.Entry<String, List<ReportDataDTO.ReportRecordDTO>> entry : grouped.entrySet()) {
            List<ReportDataDTO.ReportRecordDTO> recs = entry.getValue();
            long pendingAo = recs.stream().filter(this::isAwaitingAoForwarding).count();
            list.add(ReportDataDTO.DepartmentBreakdownDTO.builder()
                    .department(entry.getKey())
                    .total(recs.size())
                    .approved(recs.stream().filter(r -> isApprovedStatus(r.getStatus())).count())
                    .pending(recs.stream().filter(r -> isPendingStatus(r.getStatus())).count())
                    .rejected(recs.stream().filter(r -> isRejectedStatus(r.getStatus())).count())
                    .cancelled(recs.stream().filter(r -> isCancelledStatus(r.getStatus())).count())
                    .pendingAoReview(pendingAo)
                    .seminarCount(recs.stream().filter(r -> "SEMINAR".equalsIgnoreCase(r.getServiceKey())).count())
                    .accommodationCount(recs.stream().filter(r -> "ACCOMMODATION".equalsIgnoreCase(r.getServiceKey())).count())
                    .transportCount(recs.stream().filter(r -> "TRANSPORT".equalsIgnoreCase(r.getServiceKey())).count())
                    .stationeryCount(recs.stream().filter(r -> "STATIONERY".equalsIgnoreCase(r.getServiceKey())).count())
                    .mealsCount(recs.stream().filter(r -> "MEALS".equalsIgnoreCase(r.getServiceKey())).count())
                    .build());
        }

        list.sort((a, b) -> Long.compare(b.getTotal(), a.getTotal()));
        return list;
    }

    private List<ReportDataDTO.HallBreakdownDTO> computeHallBreakdown(List<SeminarBooking> bookings) {
        List<SeminarHall> halls = seminarHallRepository.findAll();
        Map<String, List<SeminarBooking>> grouped = bookings.stream()
                .filter(b -> b.getHallId() != null)
                .collect(Collectors.groupingBy(SeminarBooking::getHallId));

        List<ReportDataDTO.HallBreakdownDTO> list = new ArrayList<>();
        for (SeminarHall h : halls) {
            List<SeminarBooking> hallBookings = grouped.getOrDefault(h.getHallId(), Collections.emptyList());
            long fn = hallBookings.stream().filter(b -> isApprovedStatus(b.getStatus()) && "FORENOON".equalsIgnoreCase(b.getSlot())).count();
            long an = hallBookings.stream().filter(b -> isApprovedStatus(b.getStatus()) && "AFTERNOON".equalsIgnoreCase(b.getSlot())).count();
            long fd = hallBookings.stream().filter(b -> isApprovedStatus(b.getStatus()) && "FULL_DAY".equalsIgnoreCase(b.getSlot())).count();
            double hours = (fn * 3.0) + (an * 4.0) + (fd * 7.0);

            Map<String, Long> deptUsage = hallBookings.stream()
                    .filter(b -> b.getDepartment() != null)
                    .collect(Collectors.groupingBy(b -> b.getDepartment().toUpperCase(), Collectors.counting()));

            list.add(ReportDataDTO.HallBreakdownDTO.builder()
                    .hallId(h.getHallId())
                    .hallName(h.getName())
                    .location(h.getLocation())
                    .capacity(h.getCapacity())
                    .total(hallBookings.size())
                    .approved(hallBookings.stream().filter(b -> isApprovedStatus(b.getStatus())).count())
                    .pending(hallBookings.stream().filter(b -> isPendingStatus(b.getStatus())).count())
                    .rejected(hallBookings.stream().filter(b -> isRejectedStatus(b.getStatus())).count())
                    .cancelled(hallBookings.stream().filter(b -> isCancelledStatus(b.getStatus())).count())
                    .forenoonCount(fn)
                    .afternoonCount(an)
                    .fullDayCount(fd)
                    .totalBookedHours(hours)
                    .departmentUsage(deptUsage)
                    .build());
        }

        return list;
    }

    private Map<String, Long> computeSlotBreakdown(List<SeminarBooking> bookings) {
        long fn = bookings.stream().filter(b -> isApprovedStatus(b.getStatus()) && "FORENOON".equalsIgnoreCase(b.getSlot())).count();
        long an = bookings.stream().filter(b -> isApprovedStatus(b.getStatus()) && "AFTERNOON".equalsIgnoreCase(b.getSlot())).count();
        long fd = bookings.stream().filter(b -> isApprovedStatus(b.getStatus()) && "FULL_DAY".equalsIgnoreCase(b.getSlot())).count();
        double hours = (fn * 3.0) + (an * 4.0) + (fd * 7.0);

        Map<String, Long> map = new LinkedHashMap<>();
        map.put("FORENOON", fn);
        map.put("AFTERNOON", an);
        map.put("FULL_DAY", fd);
        map.put("TOTAL_HOURS", (long) hours);
        return map;
    }

    private ReportDataDTO.MealsHeadcountDTO computeMealsHeadcount(List<MealRequest> meals) {
        long bf = 0, lunch = 0, dinner = 0, snacks = 0, teaCoffee = 0;
        long snacksFn = 0, snacksAn = 0, tcFn = 0, tcAn = 0;

        for (MealRequest m : meals) {
            if (!isApprovedStatus(m.getStatus())) continue;
            int guests = m.getTotalGuests() != null ? m.getTotalGuests() : 0;
            List<String> types = m.getMealTypes() != null ? m.getMealTypes() : Collections.emptyList();

            for (String t : types) {
                String norm = t.toLowerCase().replace(" ", "");
                if (norm.contains("breakfast")) bf += guests;
                if (norm.contains("lunch")) lunch += guests;
                if (norm.contains("dinner")) dinner += guests;
                if (norm.contains("snack")) {
                    snacks += guests;
                    if ("FORENOON".equalsIgnoreCase(m.getServiceTime())) snacksFn += guests;
                    if ("AFTERNOON".equalsIgnoreCase(m.getServiceTime())) snacksAn += guests;
                }
                if (norm.contains("tea") || norm.contains("coffee")) {
                    teaCoffee += guests;
                    if ("FORENOON".equalsIgnoreCase(m.getServiceTime())) tcFn += guests;
                    if ("AFTERNOON".equalsIgnoreCase(m.getServiceTime())) tcAn += guests;
                }
            }
        }

        return ReportDataDTO.MealsHeadcountDTO.builder()
                .breakfast(bf)
                .lunch(lunch)
                .dinner(dinner)
                .snacks(snacks)
                .teaCoffee(teaCoffee)
                .snacksForenoon(snacksFn)
                .snacksAfternoon(snacksAn)
                .teaCoffeeForenoon(tcFn)
                .teaCoffeeAfternoon(tcAn)
                .build();
    }

    private List<ReportDataDTO.StationeryItemSummaryDTO> computeStationeryItems(List<StationeryRequest> requests) {
        Map<String, Long> qtyMap = new HashMap<>();
        Map<String, Long> reqCountMap = new HashMap<>();
        Map<String, String> unitMap = new HashMap<>();

        for (StationeryRequest s : requests) {
            if (s.getItemsRequested() != null) {
                for (StationeryRequest.RequestedItem i : s.getItemsRequested()) {
                    if (i.getName() != null) {
                        String name = i.getName().trim();
                        int q = i.getQuantity() != null ? i.getQuantity() : 0;
                        qtyMap.put(name, qtyMap.getOrDefault(name, 0L) + q);
                        reqCountMap.put(name, reqCountMap.getOrDefault(name, 0L) + 1);
                        if (i.getUnit() != null) unitMap.put(name, i.getUnit());
                    }
                }
            }
        }

        List<ReportDataDTO.StationeryItemSummaryDTO> list = new ArrayList<>();
        for (String name : qtyMap.keySet()) {
            list.add(ReportDataDTO.StationeryItemSummaryDTO.builder()
                    .name(name)
                    .totalQuantity(qtyMap.get(name))
                    .requestCount(reqCountMap.get(name))
                    .unit(unitMap.getOrDefault(name, "Units"))
                    .build());
        }

        list.sort((a, b) -> Long.compare(b.getTotalQuantity(), a.getTotalQuantity()));
        return list;
    }

    private ReportDataDTO.TransportMetricsDTO computeTransportMetrics(List<TransportRequest> requests) {
        long passengers = 0;
        Map<String, Long> vehicleMap = new HashMap<>();
        Map<String, Long> tripMap = new HashMap<>();

        for (TransportRequest t : requests) {
            if (t.getExpectedPassengers() != null) {
                passengers += t.getExpectedPassengers();
            }
            if (t.getTripType() != null) {
                tripMap.put(t.getTripType(), tripMap.getOrDefault(t.getTripType(), 0L) + 1);
            }
            if (t.getVehicleName() != null || t.getVehicleId() != null) {
                String v = t.getVehicleName() != null ? t.getVehicleName() : t.getVehicleId();
                vehicleMap.put(v, vehicleMap.getOrDefault(v, 0L) + 1);
            }
        }

        return ReportDataDTO.TransportMetricsDTO.builder()
                .totalPassengers(passengers)
                .vehicleUsage(vehicleMap)
                .tripTypes(tripMap)
                .build();
    }

    private ReportDataDTO.AccommodationMetricsDTO computeAccommodationMetrics(List<AccommodationRequest> requests) {
        long guests = 0;
        Map<String, Long> roomMap = new HashMap<>();
        Map<String, Long> typeMap = new HashMap<>();

        for (AccommodationRequest a : requests) {
            if (a.getGuestsCount() != null) {
                guests += a.getGuestsCount();
            }
            if (a.getRoomType() != null) {
                typeMap.put(a.getRoomType(), typeMap.getOrDefault(a.getRoomType(), 0L) + 1);
            }
            if (a.getRoomId() != null) {
                roomMap.put(a.getRoomId(), roomMap.getOrDefault(a.getRoomId(), 0L) + 1);
            }
        }

        return ReportDataDTO.AccommodationMetricsDTO.builder()
                .totalGuests(guests)
                .roomUsage(roomMap)
                .roomTypes(typeMap)
                .build();
    }

    private boolean isApprovedStatus(String s) {
        if (s == null) return false;
        String u = s.trim().toUpperCase();
        return u.equals("APPROVED") || u.equals("BOOKED") || u.equals("COLLECTED")
                || u.equals("READY_FOR_COLLECTION") || u.equals("AO_DIRECT_APPROVED")
                || u.equals("COMPLETED");
    }

    private boolean isPendingStatus(String s) {
        if (s == null) return false;
        String u = s.trim().toUpperCase();
        return u.equals("PENDING") || u.equals("UNDER_REVIEW")
                || u.equals("PENDING_AO_APPROVAL") || u.equals("AO_APPROVED")
                || u.equals("FORWARDED_TO_BOYS_ADMIN") || u.equals("FORWARDED_TO_GIRLS_ADMIN")
                || u.equals("RESCHEDULE_REQUESTED");
    }

    private boolean isRejectedStatus(String s) {
        if (s == null) return false;
        String u = s.trim().toUpperCase();
        return u.equals("REJECTED") || u.equals("AO_REJECTED");
    }

    private boolean isCancelledStatus(String s) {
        if (s == null) return false;
        String u = s.trim().toUpperCase();
        return u.equals("CANCELLED") || u.equals("CANCELLATION_REQUESTED");
    }

    private boolean isAwaitingAoForwarding(ReportDataDTO.ReportRecordDTO r) {
        if (r == null || r.getStatus() == null) return false;
        if (!"ACCOMMODATION".equalsIgnoreCase(r.getServiceKey())) return false;
        String st = r.getStatus().trim().toUpperCase();
        if ("PENDING_AO_APPROVAL".equals(st)) return true;
        if ("PENDING".equals(st) && ("PENDING".equalsIgnoreCase(r.getAoApprovalStatus()) || r.getAoApprovalStatus() == null)
                && (r.getForwardedTo() == null || r.getForwardedTo().isBlank())) {
            return true;
        }
        return false;
    }

    private boolean isAwaitingHostelReview(ReportDataDTO.ReportRecordDTO r) {
        if (r == null || r.getStatus() == null) return false;
        if (!"ACCOMMODATION".equalsIgnoreCase(r.getServiceKey())) return false;
        if (!isPendingStatus(r.getStatus())) return false;
        String st = r.getStatus().trim().toUpperCase();
        if ("FORWARDED_TO_BOYS_ADMIN".equals(st) || "FORWARDED_TO_GIRLS_ADMIN".equals(st) || "AO_APPROVED".equals(st)) {
            return true;
        }
        if ("FORWARDED".equalsIgnoreCase(r.getAoApprovalStatus())) {
            return true;
        }
        return false;
    }

    private DateRange resolveDateRange(ReportFilterRequest filter) {
        String type = filter.getDateRangeType() != null ? filter.getDateRangeType().toUpperCase() : "ALL";
        LocalDate today = LocalDate.now();

        switch (type) {
            case "TODAY":
                return new DateRange(true, today.toString(), today.toString(), "Today (" + today + ")");
            case "THIS_WEEK":
                LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                LocalDate endOfWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
                return new DateRange(true, startOfWeek.toString(), endOfWeek.toString(), "This Week (" + startOfWeek + " to " + endOfWeek + ")");
            case "THIS_MONTH":
                LocalDate startOfMonth = today.with(TemporalAdjusters.firstDayOfMonth());
                LocalDate endOfMonth = today.with(TemporalAdjusters.lastDayOfMonth());
                return new DateRange(true, startOfMonth.toString(), endOfMonth.toString(), "This Month (" + startOfMonth + " to " + endOfMonth + ")");
            case "THIS_YEAR":
                LocalDate startOfYear = today.with(TemporalAdjusters.firstDayOfYear());
                LocalDate endOfYear = today.with(TemporalAdjusters.lastDayOfYear());
                return new DateRange(true, startOfYear.toString(), endOfYear.toString(), "This Year (" + startOfYear.getYear() + ")");
            case "CUSTOM":
                if (filter.getStartDate() != null && !filter.getStartDate().isBlank() && filter.getEndDate() != null && !filter.getEndDate().isBlank()) {
                    return new DateRange(true, filter.getStartDate(), filter.getEndDate(), filter.getStartDate() + " to " + filter.getEndDate());
                } else if (filter.getStartDate() != null && !filter.getStartDate().isBlank()) {
                    return new DateRange(true, filter.getStartDate(), null, "From " + filter.getStartDate());
                } else if (filter.getEndDate() != null && !filter.getEndDate().isBlank()) {
                    return new DateRange(true, null, filter.getEndDate(), "Until " + filter.getEndDate());
                }
                return new DateRange(false, null, null, "All Dates");
            default:
                return new DateRange(false, null, null, "All Dates");
        }
    }

    private String buildReportTitle(ReportFilterRequest filter, User user) {
        StringBuilder sb = new StringBuilder();
        if ("MY_REQUESTS".equalsIgnoreCase(filter.getViewType())) {
            return "MY SERVICE REQUESTS REPORT";
        }
        if ("MY_DEPARTMENT".equalsIgnoreCase(filter.getViewType())) {
            return (user.getDepartment() != null ? user.getDepartment() : "DEPARTMENT") + " USAGE REPORT";
        }

        if (filter.getDepartments() != null && !filter.getDepartments().isEmpty() && !filter.getDepartments().contains("ALL")) {
            if (filter.getDepartments().size() == 1) {
                sb.append(filter.getDepartments().get(0)).append(" DEPARTMENT ");
            } else {
                sb.append(String.join(", ", filter.getDepartments())).append(" DEPARTMENTS ");
            }
        } else if (filter.getDepartment() != null && !filter.getDepartment().equalsIgnoreCase("ALL")) {
            sb.append(filter.getDepartment()).append(" DEPARTMENT ");
        }

        if (filter.getHallId() != null && !filter.getHallId().equalsIgnoreCase("ALL")) {
            sb.append(filter.getHallId()).append(" ");
        } else if (filter.getServices() != null && !filter.getServices().isEmpty() && !filter.getServices().contains("ALL") && filter.getServices().size() < 5) {
            sb.append(String.join(", ", filter.getServices())).append(" ");
        } else if (filter.getService() != null && !filter.getService().equalsIgnoreCase("ALL")) {
            sb.append(filter.getService()).append(" ");
        } else {
            sb.append("OVERALL SERVICE ");
        }

        sb.append("USAGE REPORT");
        return sb.toString();
    }

    private static class DateRange {
        final boolean hasFilter;
        final String startDate;
        final String endDate;
        final String label;

        DateRange(boolean hasFilter, String startDate, String endDate, String label) {
            this.hasFilter = hasFilter;
            this.startDate = startDate;
            this.endDate = endDate;
            this.label = label;
        }
    }
}
