package com.nec.collegeservices.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * MongoDB document representing an atomic deduplication lease claim for email dispatch.
 * Stored in the dedicated 'email_deduplication_claims' collection.
 * <p>
 * Uses the deterministic deduplication key as the MongoDB _id to guarantee atomic uniqueness
 * across multiple concurrent application instances.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "email_deduplication_claims")
public class EmailDeduplicationClaim {

    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_AMBIGUOUS = "AMBIGUOUS";

    /**
     * The deterministic deduplication key: referenceId:eventCategory:email
     * Serves as MongoDB primary key (_id) to enforce atomic singleton claims.
     */
    @Id
    private String id;

    /**
     * Current lifecycle status: IN_PROGRESS, COMPLETED, or AMBIGUOUS.
     */
    private String status;

    /**
     * Unique identifier for the worker/attempt currently holding or completing this claim.
     */
    private String ownerId;

    /**
     * Monotonically increasing fencing token. Incremented on lease recovery.
     * Prevents stale owners from modifying or completing claims after lease expiration.
     */
    private long fencingToken;

    /**
     * Timestamp when the current in-progress lease expires.
     */
    private LocalDateTime leaseExpiresAt;

    /**
     * Timestamp when the claim was first created.
     */
    private LocalDateTime claimedAt;

    /**
     * Timestamp of the most recent state or lease update.
     */
    private LocalDateTime updatedAt;

    /**
     * Timestamp after which MongoDB TTL index will purge the document.
     * Null while IN_PROGRESS to prevent active claims from expiring via TTL.
     * Set to (now + 30 days) upon COMPLETED or AMBIGUOUS status.
     */
    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime retentionExpiresAt;
}
