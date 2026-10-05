package com.nec.collegeservices.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealRequestDTO {
    @NotBlank(message = "Event / Purpose is required")
    private String eventTitle;

    @NotBlank(message = "Date is required (YYYY-MM-DD)")
    private String date;

    @NotBlank(message = "Venue / Location is required")
    private String venue;

    @NotEmpty(message = "At least one meal type must be selected")
    private List<String> mealTypes; // Breakfast, Lunch, Dinner, Snacks, Tea / Coffee

    private List<MealItemDetailDTO> mealItems;

    private Integer totalGuests;

    private String serviceTime; // FORENOON or AFTERNOON (mandatory if Snacks or Tea / Coffee is selected)

    private String specialRequirements;
    private String additionalNotes;

    public String getEventDate() {
        return date;
    }

    public void setEventDate(String eventDate) {
        if (this.date == null || this.date.isBlank()) {
            this.date = eventDate;
        }
    }

    public String getEventName() {
        return eventTitle;
    }

    public void setEventName(String eventName) {
        if (this.eventTitle == null || this.eventTitle.isBlank()) {
            this.eventTitle = eventName;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealItemDetailDTO {
        private String mealType;
        private Integer guestCount;
        private String preferredTime;
        private String description;
    }
}
