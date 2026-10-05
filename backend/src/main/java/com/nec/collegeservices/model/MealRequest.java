package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "meal_requests")
public class MealRequest {
    @Id
    private String id;

    @Indexed(unique = true)
    private String requestId; // e.g. SM-018

    private String department;
    private String eventTitle; // Event / Purpose
    private String date; // YYYY-MM-DD
    private String venue; // Venue / Location

    private List<String> mealTypes; // Breakfast, Lunch, Dinner, Snacks, Tea / Coffee
    private List<MealItemDetail> mealItems;

    private Integer totalGuests;
    private String serviceTime; // FORENOON or AFTERNOON
    private String specialRequirements; // e.g. Vegetarian option required. No onion/garlic.
    private String additionalNotes;

    // Status: PENDING, APPROVED, REJECTED
    private String status;

    private String requestedBy;
    private String requesterUserId;
    private String requesterEmail;
    private String rejectionReason;

    private String approvedBy;
    private LocalDateTime approvedAt;
    private String adminRemarks;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public String getEventDate() {
        return date;
    }

    public String getEventName() {
        return eventTitle;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealItemDetail {
        private String mealType; // Breakfast, Lunch, Dinner, Snacks, Tea / Coffee
        private Integer guestCount;
        private String preferredTime;
        private String description;
    }
}
