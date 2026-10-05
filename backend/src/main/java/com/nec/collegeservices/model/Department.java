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
@Document(collection = "departments")
public class Department {
    @Id
    private String id;

    @Indexed(unique = true)
    private String code; // CSE, ECE, EEE, ME, CIVIL, AI, MBA, PHARM

    private String name;
    private String block;
    private String floor;
    private String headOfDept;
    private boolean active;
}
