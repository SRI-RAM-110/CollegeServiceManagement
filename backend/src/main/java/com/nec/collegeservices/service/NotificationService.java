package com.nec.collegeservices.service;

import com.nec.collegeservices.model.Notification;
import com.nec.collegeservices.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PushService pushService;

    public Notification sendNotification(String recipientRole, String recipientDept, String recipientUserId,
                                         String title, String message, String service, String type, String referenceId) {
        Notification notification = Notification.builder()
                .recipientRole(recipientRole != null ? recipientRole : "ALL")
                .recipientDept(recipientDept != null ? recipientDept : "ALL")
                .recipientUserId(recipientUserId)
                .title(title)
                .message(message)
                .service(service)
                .type(type)
                .read(false)
                .referenceId(referenceId)
                .createdAt(LocalDateTime.now())
                .build();
        Notification saved = notificationRepository.save(notification);

        // Dispatch browser push notification asynchronously (non-blocking, failure isolated)
        try {
            if (recipientUserId != null && !recipientUserId.isBlank() && !"ALL".equalsIgnoreCase(recipientUserId)) {
                pushService.sendPushToUser(recipientUserId, title, message, "/notifications", referenceId);
            } else {
                pushService.sendPushToRoleAndDept(recipientRole, recipientDept, title, message, "/notifications", referenceId);
            }
        } catch (Exception e) {
            // Push delivery failure must never break core notification or business logic
        }

        return saved;
    }

    public List<Notification> getNotificationsForUser(com.nec.collegeservices.model.User user) {
        if (user == null) {
            return java.util.Collections.emptyList();
        }
        List<String> roles = user.getEffectiveRoles();
        if (roles.isEmpty() && user.getRole() != null) {
            roles = List.of(user.getRole());
        }

        boolean isAdmin = user.hasRole("CREATOR") || user.hasRole("AO_ADMIN") ||
                          roles.stream().anyMatch(r -> r.endsWith("_ADMIN"));
        String altDept = isAdmin ? "ADMIN" : user.getDepartment();

        List<Notification> list;
        if (user.hasRole("CREATOR")) {
            List<String> creatorRoles = new java.util.ArrayList<>(roles);
            if (!creatorRoles.contains("AO_ADMIN")) creatorRoles.add("AO_ADMIN");
            list = notificationRepository.findForUserRoles(creatorRoles, user.getDepartment(), user.getUserId(), altDept);
        } else {
            list = notificationRepository.findForUserRoles(roles, user.getDepartment(), user.getUserId(), altDept);
        }

        for (Notification n : list) {
            n.setRead(n.isReadForUser(user.getUserId()));
        }
        // Exclude notifications cleared by this user
        if (user.getUserId() != null) {
            final String currentUid = user.getUserId().trim();
            list.removeIf(n -> n.isClearedByUser(currentUid));
        }
        return list;
    }

    public List<Notification> getNotificationsForUser(String role, String dept, String userId) {
        List<String> roles = role != null ? List.of(role) : java.util.Collections.emptyList();
        boolean isAdmin = roles.stream().anyMatch(r -> r.endsWith("_ADMIN") || "CREATOR".equalsIgnoreCase(r));
        String altDept = isAdmin ? "ADMIN" : dept;
        List<Notification> list = notificationRepository.findForUserRoles(roles, dept, userId, altDept);
        if (userId != null) {
            final String currentUid = userId.trim();
            list.removeIf(n -> n.isClearedByUser(currentUid));
        }
        for (Notification n : list) {
            n.setRead(n.isReadForUser(userId));
        }
        return list;
    }

    public void markAsRead(String id, com.nec.collegeservices.model.User user) {
        if (user == null) return;
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getRecipientUserId() != null && !n.getRecipientUserId().isBlank() && !"ALL".equalsIgnoreCase(n.getRecipientUserId())) {
                if (!n.getRecipientUserId().equalsIgnoreCase(user.getUserId())) {
                    return;
                }
                n.setRead(true);
            }
            if (n.getReadByUserIds() == null) {
                n.setReadByUserIds(new java.util.HashSet<>());
            }
            n.getReadByUserIds().add(user.getUserId());
            notificationRepository.save(n);
        });
    }

    public void markAsRead(String id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsReadForUser(com.nec.collegeservices.model.User user) {
        if (user == null) return;
        List<Notification> list = getNotificationsForUser(user);
        for (Notification n : list) {
            if (n.getRecipientUserId() != null && !n.getRecipientUserId().isBlank() && !"ALL".equalsIgnoreCase(n.getRecipientUserId())) {
                if (n.getRecipientUserId().equalsIgnoreCase(user.getUserId())) {
                    n.setRead(true);
                }
            }
            if (n.getReadByUserIds() == null) {
                n.setReadByUserIds(new java.util.HashSet<>());
            }
            n.getReadByUserIds().add(user.getUserId());
        }
        notificationRepository.saveAll(list);
    }

    public void markAllAsReadForUser(String role, String dept, String userId) {
        List<Notification> list = getNotificationsForUser(role, dept, userId);
        list.forEach(n -> {
            if (n.getReadByUserIds() == null) {
                n.setReadByUserIds(new java.util.HashSet<>());
            }
            n.getReadByUserIds().add(userId);
            n.setRead(true);
        });
        notificationRepository.saveAll(list);
    }

    public void clearNotificationsForUser(com.nec.collegeservices.model.User user) {
        if (user == null || user.getUserId() == null) return;
        String userId = user.getUserId().trim();

        List<Notification> list = getNotificationsForUser(user);
        List<Notification> toDelete = new java.util.ArrayList<>();
        List<Notification> toUpdate = new java.util.ArrayList<>();

        for (Notification n : list) {
            String rUserId = n.getRecipientUserId();
            if (rUserId != null && !rUserId.isBlank() && !"ALL".equalsIgnoreCase(rUserId)) {
                if (rUserId.trim().equalsIgnoreCase(userId)) {
                    toDelete.add(n);
                }
            } else {
                if (n.getClearedByUserIds() == null) {
                    n.setClearedByUserIds(new java.util.HashSet<>());
                }
                n.getClearedByUserIds().add(userId);
                toUpdate.add(n);
            }
        }

        if (!toDelete.isEmpty()) {
            notificationRepository.deleteAll(toDelete);
        }
        if (!toUpdate.isEmpty()) {
            notificationRepository.saveAll(toUpdate);
        }
    }
}
