package com.nec.collegeservices.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeminarRescheduleRequestDTO {
    @NotBlank(message = "New hall ID is required")
    @JsonAlias({"targetHallId", "rescheduledHallId", "newHallId"})
    private String newHallId;

    @NotBlank(message = "New booking date is required (YYYY-MM-DD)")
    @JsonAlias({"targetDate", "rescheduledDate", "newDate"})
    private String newDate;

    @NotBlank(message = "New slot is required (FORENOON, AFTERNOON, or FULL_DAY)")
    @JsonAlias({"targetSlot", "rescheduledSlot", "newSlot"})
    private String newSlot;

    @NotBlank(message = "Reschedule reason is required")
    private String reason;

    // Scope: "THIS_OCCURRENCE", "THIS_AND_FUTURE"
    @Builder.Default
    private String scope = "THIS_OCCURRENCE";

    public String getTargetHallId() {
        return newHallId;
    }

    public void setTargetHallId(String targetHallId) {
        this.newHallId = targetHallId;
    }

    public String getTargetDate() {
        return newDate;
    }

    public void setTargetDate(String targetDate) {
        this.newDate = targetDate;
    }

    public String getTargetSlot() {
        return newSlot;
    }

    public void setTargetSlot(String targetSlot) {
        this.newSlot = targetSlot;
    }
}
