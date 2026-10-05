package com.nec.collegeservices.service;

import com.nec.collegeservices.dto.StationeryRequestDTO;
import com.nec.collegeservices.exception.BadRequestException;
import com.nec.collegeservices.exception.ResourceNotFoundException;
import com.nec.collegeservices.model.StationeryItem;
import com.nec.collegeservices.model.StationeryRequest;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.StationeryItemRepository;
import com.nec.collegeservices.repository.StationeryRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class StationeryService {

    @Autowired
    private StationeryItemRepository itemRepository;

    @Autowired
    private StationeryRequestRepository requestRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RequesterResolver requesterResolver;

    @Autowired
    private AuthService authService;

    public List<StationeryItem> getAllItems() {
        return itemRepository.findAll().stream()
                .filter(i -> i.getActive() == null || i.getActive())
                .toList();
    }

    public StationeryItem getItemById(String itemId) {
        return itemRepository.findByItemId(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Stationery item not found: " + itemId));
    }

    public StationeryRequest createRequest(StationeryRequestDTO dto, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new BadRequestException("At least one stationery item must be requested.");
        }

        if (dto.getPurpose() == null || dto.getPurpose().isBlank()) {
            throw new BadRequestException("Purpose of stationery request is required.");
        }

        List<StationeryRequest.RequestedItem> requestedItems = new ArrayList<>();

        for (StationeryRequestDTO.ItemRequestItem reqItem : dto.getItems()) {
            StationeryItem item = itemRepository.findByItemId(reqItem.getItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Stationery item not found: " + reqItem.getItemId()));

            if (reqItem.getQuantity() == null || reqItem.getQuantity() <= 0) {
                throw new BadRequestException("Requested quantity for " + item.getName() + " must be greater than zero.");
            }

            // Zero stock validation: requested quantity represents department requisition
            requestedItems.add(StationeryRequest.RequestedItem.builder()
                    .itemId(item.getItemId())
                    .name(item.getName())
                    .quantity(reqItem.getQuantity())
                    .unit(item.getUnit())
                    .build());
        }

        String requestId = "STA-" + String.format("%04d", (System.currentTimeMillis() % 100000));

        StationeryRequest request = StationeryRequest.builder()
                .requestId(requestId)
                .department(user.getDepartment())
                .requestedBy(user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getUserId())
                .requesterUserId(user.getUserId())
                .itemsRequested(requestedItems)
                .purpose(dto.getPurpose().trim())
                .additionalNotes(dto.getAdditionalNotes())
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        StationeryRequest saved = requestRepository.save(request);

        // Notify Admins
        notificationService.sendNotification(
                "STATIONERY_ADMIN",
                "ADMIN",
                null,
                "New Stationery Request",
                user.getDepartment() + " submitted a stationery request for " + requestedItems.size() + " items (" + saved.getRequestId() + ")",
                "Stationery",
                "INFO",
                saved.getRequestId()
        );

        notificationService.sendNotification(
                "AO_ADMIN",
                "ADMIN",
                null,
                "New Stationery Request",
                user.getDepartment() + " submitted a stationery request for " + requestedItems.size() + " items (" + saved.getRequestId() + ")",
                "Stationery",
                "INFO",
                saved.getRequestId()
        );

        return saved;
    }

    public List<StationeryRequest> getAllRequests(String status, String department) {
        return getAllRequests(status, department, null, null, null);
    }

    public List<StationeryRequest> getAllRequests(String status, String department, String fromDate, String toDate) {
        return getAllRequests(status, department, fromDate, toDate, null);
    }

    public List<StationeryRequest> getAllRequests(String status, String department, String fromDate, String toDate, User user) {
        if (fromDate != null && toDate != null && !fromDate.isBlank() && !toDate.isBlank()) {
            if (toDate.compareTo(fromDate) < 0) {
                throw new BadRequestException("To date cannot be earlier than From date.");
            }
        }
        List<StationeryRequest> all = requestRepository.findAll();
        boolean isStaffOrAdmin = user != null && (user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("STATIONERY_ADMIN") || user.hasServicePermission("STATIONERY_ADMIN"));
        return all.stream()
                .filter(r -> {
                    if (!isStaffOrAdmin && user != null) {
                        return UnifiedRequestService.isRequestedByUser(r.getRequestedBy(), user);
                    }
                    return department == null || department.isBlank() || department.equalsIgnoreCase("ALL") || r.getDepartment().equalsIgnoreCase(department);
                })
                .filter(r -> status == null || status.isBlank() || status.equalsIgnoreCase("ALL") || r.getStatus().equalsIgnoreCase(status))
                .filter(r -> {
                    if (fromDate != null && !fromDate.isBlank() && toDate != null && !toDate.isBlank()) {
                        String reqDate = r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate().toString() : "";
                        return reqDate.compareTo(fromDate) >= 0 && reqDate.compareTo(toDate) <= 0;
                    }
                    return true;
                })
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public List<StationeryRequest> getRequestsByDepartment(String department) {
        return requestRepository.findByDepartment(department).stream()
                .sorted((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0)
                .toList();
    }

    public StationeryRequest getRequestById(String id) {
        return requestRepository.findById(id)
                .or(() -> requestRepository.findByRequestId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Stationery request not found: " + id));
    }

    public StationeryRequest getRequestById(String id, User user) {
        StationeryRequest req = getRequestById(id);
        if (user == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required.");
        }
        boolean isStaffOrAdmin = user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") || user.hasRole("STATIONERY_ADMIN") || user.hasServicePermission("STATIONERY_ADMIN");
        if (!isStaffOrAdmin) {
            if (!UnifiedRequestService.isRequestedByUser(req.getRequestedBy(), user)) {
                throw new org.springframework.security.access.AccessDeniedException("You are not authorized to view stationery requests created by other users.");
            }
        }
        return req;
    }

    /**
     * Approves request. NO inventory or stock deduction occurs.
     */
    public StationeryRequest approveRequest(String id, String comments) {
        StationeryRequest req = getRequestById(id);

        req.setStatus("APPROVED");
        try {
            User current = authService.getCurrentUser();
            if (current != null) {
                req.setApprovedBy(current.getName() != null ? current.getName() : current.getUserId());
            }
        } catch (Exception ignored) {}
        req.setApprovedAt(LocalDateTime.now());
        if (comments != null && !comments.isBlank()) {
            req.setAdminComments(comments);
            req.setAdminRemarks(comments);
        }
        req.setUpdatedAt(LocalDateTime.now());
        StationeryRequest saved = requestRepository.save(req);

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Stationery Request Approved",
                "Your stationery request (" + req.getRequestId() + ") has been approved. Materials are being prepared.",
                "Stationery",
                "SUCCESS",
                saved.getRequestId()
        );

        return saved;
    }

    public StationeryRequest rejectRequest(String id, String reason) {
        StationeryRequest req = getRequestById(id);

        req.setStatus("REJECTED");
        req.setRejectionReason(reason != null && !reason.isBlank() ? reason : "Declined by Stationery Administrator");
        req.setUpdatedAt(LocalDateTime.now());
        StationeryRequest saved = requestRepository.save(req);

        // Notify requester
        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Stationery Request Rejected",
                "Your stationery request (" + req.getRequestId() + ") was rejected. Reason: " + req.getRejectionReason(),
                "Stationery",
                "DANGER",
                saved.getRequestId()
        );

        return saved;
    }

    public StationeryRequest markUnderReview(String id, String comments) {
        StationeryRequest req = getRequestById(id);
        req.setStatus("UNDER_REVIEW");
        if (comments != null && !comments.isBlank()) {
            req.setAdminComments(comments);
        }
        req.setUpdatedAt(LocalDateTime.now());
        StationeryRequest saved = requestRepository.save(req);

        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Stationery Request Under Review",
                "Your stationery request (" + req.getRequestId() + ") is currently under administrative review.",
                "Stationery",
                "INFO",
                saved.getRequestId()
        );
        return saved;
    }

    public StationeryRequest markReadyForCollection(String id, String comments) {
        StationeryRequest req = getRequestById(id);
        req.setStatus("READY_FOR_COLLECTION");
        if (comments != null && !comments.isBlank()) {
            req.setAdminComments(comments);
        }
        req.setUpdatedAt(LocalDateTime.now());
        StationeryRequest saved = requestRepository.save(req);

        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Stationery Ready for Collection",
                "Your stationery request (" + req.getRequestId() + ") is ready for collection at the Stationery Office.",
                "Stationery",
                "SUCCESS",
                saved.getRequestId()
        );
        return saved;
    }

    public StationeryRequest markCollected(String id, String comments) {
        StationeryRequest req = getRequestById(id);
        req.setStatus("COLLECTED");
        if (comments != null && !comments.isBlank()) {
            req.setAdminComments(comments);
        }
        req.setUpdatedAt(LocalDateTime.now());
        StationeryRequest saved = requestRepository.save(req);

        String requesterId = requesterResolver.resolveRequesterUserId(req.getRequesterUserId(), req.getRequestedBy(), req.getDepartment());
        notificationService.sendNotification(
                "DEPARTMENT_USER",
                req.getDepartment(),
                requesterId,
                "Stationery Items Collected",
                "Stationery items for request (" + req.getRequestId() + ") have been collected. Requisition completed.",
                "Stationery",
                "SUCCESS",
                saved.getRequestId()
        );
        return saved;
    }

    public StationeryRequest updateRequestStatus(String id, String newStatus, String comments) {
        if (newStatus == null || newStatus.isBlank()) {
            throw new BadRequestException("Status is required");
        }
        String s = newStatus.toUpperCase().trim();
        switch (s) {
            case "APPROVED":
                return approveRequest(id, comments);
            case "REJECTED":
                return rejectRequest(id, comments);
            case "UNDER_REVIEW":
                return markUnderReview(id, comments);
            case "READY_FOR_COLLECTION":
                return markReadyForCollection(id, comments);
            case "COLLECTED":
                return markCollected(id, comments);
            case "CANCELLED":
                StationeryRequest req = getRequestById(id);
                req.setStatus("CANCELLED");
                if (comments != null && !comments.isBlank()) req.setAdminComments(comments);
                req.setUpdatedAt(LocalDateTime.now());
                return requestRepository.save(req);
            default:
                throw new BadRequestException("Invalid status: " + newStatus);
        }
    }
}
