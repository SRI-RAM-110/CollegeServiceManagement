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
@Document(collection = "stationery_items")
public class StationeryItem {
    @Id
    private String id;

    @Indexed(unique = true)
    private String itemId; // e.g. ST-01

    private String name; // e.g. A4 Paper (500 sheets)
    private String category; // Paper, Writing, Filing, Office Tools
    private String description;
    private String unit; // packs, pcs, reams, boxes
    @Builder.Default
    private Boolean active = true;
    private String image;

    // Audit metadata
    private String createdAt;
    private String createdBy;
    private String updatedAt;
    private String updatedBy;

    public boolean isResourceActive() {
        return active == null || active;
    }

    // Backward-compatibility accessors for legacy consumers
    public String getItemCode() {
        return itemId;
    }

    public void setItemCode(String itemCode) {
        if (this.itemId == null || this.itemId.isBlank()) {
            this.itemId = itemCode;
        }
    }
}
