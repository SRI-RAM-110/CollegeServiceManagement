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
@Document(collection = "seminar_halls")
public class SeminarHall {
    @Id
    private String id;

    @Indexed(unique = true)
    private String hallId; // SH-1, SH-2, SH-3, SH-4, TECH-HUB

    private String name; // Seminar Hall 1, etc.
    private String location; // Block 3 – Ground Floor, etc. (stored in MongoDB document)
    private String block;
    private String floor;
    private Integer capacity;
    private List<String> facilities; // Projector, AC, Audio System, Wi-Fi
    private String image;
    private String status; // Available, Maintenance, Disabled

    @Builder.Default
    private List<String> coordinatorUserIds = new java.util.ArrayList<>();

    public String getLocation() {
        if (location != null && !location.isBlank()) {
            return location;
        }
        if (block != null && floor != null) {
            return block + " – " + floor;
        }
        return block != null ? block : (floor != null ? floor : "");
    }
}
