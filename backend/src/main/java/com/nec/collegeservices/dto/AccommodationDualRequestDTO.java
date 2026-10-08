package com.nec.collegeservices.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccommodationDualRequestDTO {
    private AccommodationRequestDTO boysRequest;
    private AccommodationRequestDTO girlsRequest;
    private String selectionMode;
}
