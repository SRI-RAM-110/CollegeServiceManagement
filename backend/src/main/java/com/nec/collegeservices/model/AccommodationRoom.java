package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "accommodation_rooms")
public class AccommodationRoom {
    @Id
    private String id;

    @Indexed(unique = true)
    private String roomId; // GH-AC-1, GH-NAC-1, BH-AC-1, BH-NAC-1

    private String hostel; // Girls Hostel, Boys Hostel
    private String roomType; // AC Room, Non-AC Room
    private Integer capacity; // e.g. 2
    private List<String> amenities; // AC, Attached Bath, Wi-Fi, TV

    @Builder.Default
    private boolean available = true;

    // Status: Available, Maintenance, Unavailable
    @Builder.Default
    private String status = "Available";

    private Integer currentOccupancy;
    private String image;
    private String location; // e.g. "Girls Hostel - Block A, Ground Floor"

    public boolean isAvailable() {
        return "Available".equalsIgnoreCase(this.status) && this.available;
    }
}
