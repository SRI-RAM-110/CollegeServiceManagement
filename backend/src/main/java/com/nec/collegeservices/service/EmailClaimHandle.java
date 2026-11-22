package com.nec.collegeservices.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Handle representing ownership of an active email deduplication claim.
 * Must be presented with matching ownerId and fencingToken to perform state transitions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailClaimHandle {
    private String deduplicationKey;
    private String ownerId;
    private long fencingToken;
    private LocalDateTime leaseExpiresAt;
}
