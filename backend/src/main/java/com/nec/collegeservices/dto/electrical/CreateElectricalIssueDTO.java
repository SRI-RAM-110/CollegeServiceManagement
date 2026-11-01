package com.nec.collegeservices.dto.electrical;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateElectricalIssueDTO {

    @NotBlank(message = "Location type is required")
    private String locationType;

    @NotBlank(message = "Building name is required")
    private String buildingName;

    @NotBlank(message = "Floor is required")
    private String floor;

    private String roomNumber;

    @NotBlank(message = "Specific location details are required")
    @Size(max = 250, message = "Specific location details cannot exceed 250 characters")
    private String specificLocation;

    @NotBlank(message = "Issue category is required")
    private String issueCategory;

    @NotBlank(message = "Priority is required")
    private String priority;

    @NotBlank(message = "Issue description is required")
    @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
    private String description;

    private String photoUrl;
}

