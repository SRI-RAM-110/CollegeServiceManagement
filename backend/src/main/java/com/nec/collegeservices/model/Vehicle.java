package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "vehicles")
public class Vehicle {
    @Id
    private String id;

    @Indexed(unique = true)
    private String vehicleId; // e.g. V-01

    private String name; // e.g. College Bus 1 (50 Seater)
    private String type; // College Bus, Mini Bus, Tempo Traveller, Innova
    private String registrationNumber; // e.g. AP39 AB 1234
    private Integer capacity; // e.g. 50, 40, 25, 17, 12, 7
    private String status; // AVAILABLE, ON_TRIP, UNDER_MAINTENANCE
    private String driverName;
    private String driverPhone;
    private String image;
}
