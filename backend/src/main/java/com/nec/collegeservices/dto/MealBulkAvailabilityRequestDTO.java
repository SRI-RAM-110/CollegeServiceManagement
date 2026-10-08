package com.nec.collegeservices.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealBulkAvailabilityRequestDTO {
    private List<String> dates;
    private String bookingType; // ONE_TIME, MULTI_DAY, RECURRING
    private String venue;
    private List<String> mealTypes;
}
