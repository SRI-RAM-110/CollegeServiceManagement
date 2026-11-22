package com.nec.collegeservices.service;

import com.nec.collegeservices.model.EmailDeduplicationClaim;
import lombok.Getter;

/**
 * Result of an atomic email claim acquisition or lease recovery attempt.
 */
@Getter
public class ClaimAcquisitionResult {

    public enum Status {
        ACQUIRED,
        ALREADY_COMPLETED,
        ALREADY_IN_PROGRESS,
        AMBIGUOUS,
        DATABASE_ERROR
    }

    private final Status status;
    private final EmailClaimHandle handle;
    private final EmailDeduplicationClaim existingClaim;
    private final String message;

    private ClaimAcquisitionResult(Status status, EmailClaimHandle handle, EmailDeduplicationClaim existingClaim, String message) {
        this.status = status;
        this.handle = handle;
        this.existingClaim = existingClaim;
        this.message = message;
    }

    public static ClaimAcquisitionResult acquired(EmailClaimHandle handle) {
        return new ClaimAcquisitionResult(Status.ACQUIRED, handle, null, "Claim acquired successfully");
    }

    public static ClaimAcquisitionResult alreadyCompleted(EmailDeduplicationClaim claim) {
        return new ClaimAcquisitionResult(Status.ALREADY_COMPLETED, null, claim, "Email event already completed");
    }

    public static ClaimAcquisitionResult alreadyInProgress(EmailDeduplicationClaim claim) {
        return new ClaimAcquisitionResult(Status.ALREADY_IN_PROGRESS, null, claim, "Email event currently in progress by another worker");
    }

    public static ClaimAcquisitionResult ambiguous(EmailDeduplicationClaim claim) {
        return new ClaimAcquisitionResult(Status.AMBIGUOUS, null, claim, "Email event outcome is ambiguous from previous attempt; duplicate send blocked");
    }

    public static ClaimAcquisitionResult databaseError(String message) {
        return new ClaimAcquisitionResult(Status.DATABASE_ERROR, null, null, "Database error acquiring claim: " + message);
    }

    public boolean isAcquired() {
        return status == Status.ACQUIRED;
    }
}
