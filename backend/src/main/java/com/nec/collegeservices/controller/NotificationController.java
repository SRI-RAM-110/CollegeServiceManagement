package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.model.Notification;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications() {
        User user = authService.getCurrentUser();
        List<Notification> list = notificationService.getNotificationsForUser(user);
        return ResponseEntity.ok(ApiResponse.ok("Notifications list", list));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        User user = authService.getCurrentUser();
        notificationService.markAsRead(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Notification marked as read"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        User user = authService.getCurrentUser();
        notificationService.markAllAsReadForUser(user);
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read"));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearNotifications() {
        User user = authService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized"));
        }
        notificationService.clearNotificationsForUser(user);
        return ResponseEntity.ok(ApiResponse.ok("All notifications cleared"));
    }
}
