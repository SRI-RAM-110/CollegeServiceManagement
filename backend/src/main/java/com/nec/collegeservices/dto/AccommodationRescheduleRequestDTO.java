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
public class AccommodationRescheduleRequestDTO {
    @NotBlank(message = "Target room ID is required")
    @JsonAlias({"targetRoomId", "newRoomId", "rescheduledRoomId", "roomId"})
    private String targetRoomId;

    @NotBlank(message = "Target check-in date is required (YYYY-MM-DD)")
    @JsonAlias({"targetCheckInDate", "newCheckInDate", "rescheduledCheckInDate", "checkInDate"})
    private String targetCheckInDate;

    @NotBlank(message = "Target check-out date is required (YYYY-MM-DD)")
    @JsonAlias({"targetCheckOutDate", "newCheckOutDate", "rescheduledCheckOutDate", "checkOutDate"})
    private String targetCheckOutDate;

    @NotBlank(message = "Reschedule reason is required")
    private String reason;

    public String getNewRoomId() {
        return targetRoomId;
    }

    public void setNewRoomId(String val) {
        this.targetRoomId = val;
    }

    public String getNewCheckInDate() {
        return targetCheckInDate;
    }

    public void setNewCheckInDate(String val) {
        this.targetCheckInDate = val;
    }

    public String getNewCheckOutDate() {
        return targetCheckOutDate;
    }

    public void setNewCheckOutDate(String val) {
        this.targetCheckOutDate = val;
    }
}
