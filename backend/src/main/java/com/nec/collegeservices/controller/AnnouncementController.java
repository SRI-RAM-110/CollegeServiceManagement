package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.model.Announcement;
import com.nec.collegeservices.repository.AnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AnnouncementController {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private com.nec.collegeservices.service.NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Announcement>>> getAllAnnouncements() {
        List<Announcement> announcements = announcementRepository.findByActiveTrue();
        return ResponseEntity.ok(ApiResponse.ok("Active announcements", announcements));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'ACCOMMODATION_ADMIN', 'TRANSPORT_ADMIN', 'STATIONERY_ADMIN', 'MEALS_ADMIN')")
    public ResponseEntity<ApiResponse<Announcement>> createAnnouncement(@RequestBody Announcement announcement) {
        announcement.setActive(true);
        Announcement saved = announcementRepository.save(announcement);

        try {
            boolean isDeptSpecific = "DEPARTMENT".equalsIgnoreCase(saved.getAudience()) 
                    && saved.getDepartment() != null 
                    && !saved.getDepartment().isBlank() 
                    && !"ALL".equalsIgnoreCase(saved.getDepartment());

            String targetDept = isDeptSpecific ? saved.getDepartment().trim() : "ALL";
            String titlePrefix = isDeptSpecific ? "[" + targetDept + "] " : "";
            String notifTitle = titlePrefix + (saved.getType() != null && saved.getType().equalsIgnoreCase("EVENT") ? "New Campus Event: " : "Campus Notice: ") + saved.getTitle();

            notificationService.sendNotification(
                    "ALL",
                    targetDept,
                    null,
                    notifTitle,
                    saved.getContent(),
                    "System",
                    "INFO",
                    saved.getId()
            );
        } catch (Exception e) {
            // Notification dispatch failure should not break announcement creation
        }

        return ResponseEntity.ok(ApiResponse.ok("Announcement created successfully", saved));
    }
}
