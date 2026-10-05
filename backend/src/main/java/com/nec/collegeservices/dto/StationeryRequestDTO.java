package com.nec.collegeservices.dto;

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
public class StationeryRequestDTO {
    @NotEmpty(message = "At least one stationery item must be requested")
    private List<ItemRequestItem> items;

    private String purpose;
    private String additionalNotes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemRequestItem {
        private String itemId;
        private Integer quantity;
    }
}
