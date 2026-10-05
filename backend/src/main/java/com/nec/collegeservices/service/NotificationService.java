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

    public List<Notification> getNotificationsForUser(String role, String dept, String userId) {
        if ("CREATOR".equalsIgnoreCase(role)) {
            List<Notification> aoList = notificationRepository.findForUser("AO_ADMIN", dept, userId);
            List<Notification> creatorList = notificationRepository.findForUser("CREATOR", dept, userId);
            java.util.Set<String> seen = new java.util.HashSet<>();
            java.util.List<Notification> combined = new java.util.ArrayList<>();
            for (Notification n : creatorList) {
                if (seen.add(n.getId())) combined.add(n);
            }
            for (Notification n : aoList) {
                if (seen.add(n.getId())) combined.add(n);
            }
            combined.sort((a, b) -> b.getCreatedAt() != null && a.getCreatedAt() != null ? b.getCreatedAt().compareTo(a.getCreatedAt()) : 0);
            return combined;
        }
        return notificationRepository.findForUser(role, dept, userId);
    }

    public void markAsRead(String id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsReadForUser(String role, String dept, String userId) {
        List<Notification> list = getNotificationsForUser(role, dept, userId);
        list.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(list);
    }
}
