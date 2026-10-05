package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "announcements")
public class Announcement {
    @Id
    private String id;

    private String title;
    private String content;
    private String type; // EVENT, MAINTENANCE, NOTICE
    private String date; // e.g. 12 Sep 2026
    @Builder.Default
    private String audience = "COLLEGE_WIDE"; // COLLEGE_WIDE, DEPARTMENT
    private String department; // e.g. CSE or null for COLLEGE_WIDE
    private boolean active;
}
