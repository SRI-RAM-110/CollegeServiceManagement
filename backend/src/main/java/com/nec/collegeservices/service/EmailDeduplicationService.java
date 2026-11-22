package com.nec.collegeservices.service;

import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;
import com.nec.collegeservices.model.EmailDeduplicationClaim;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service providing MongoDB-backed atomic lease claims for email deduplication.
 * Replaces JVM-local in-memory guards with distributed atomic leases across all
 * backend instances.
 * <p>
 * Key features:
 * 1. Atomic insertion with unique MongoDB _id constraint.
 * 2. Monotonically increasing fencing tokens to reject stale owners.
 * 3. Atomic conditional lease recovery for expired IN_PROGRESS claims.
 * 4. Distinct lifecycle states (IN_PROGRESS, COMPLETED, AMBIGUOUS).
 * 5. TTL index on retentionExpiresAt (30 days) leaving in-progress leases untracked by TTL.
 * 6. Fail-closed behavior on database connectivity errors.
 */
@Service
@Slf4j
public class EmailDeduplicationService {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Value("${app.mail.deduplication.lease-seconds:60}")
    private long leaseDurationSeconds = 60L;

    @Value("${app.mail.deduplication.retention-days:30}")
    private long retentionDays = 30L;

    public EmailDeduplicationService() {
    }

    public EmailDeduplicationService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public EmailDeduplicationService(MongoTemplate mongoTemplate, long leaseDurationSeconds, long retentionDays) {
        this.mongoTemplate = mongoTemplate;
        this.leaseDurationSeconds = leaseDurationSeconds;
        this.retentionDays = retentionDays;
    }

    /**
     * Initializes the TTL index on retentionExpiresAt with expireAfterSeconds=0.
     * Active IN_PROGRESS claims keep retentionExpiresAt null and are never expired by TTL.
     */
    @PostConstruct
    public void ensureIndexes() {
        if (mongoTemplate == null) {
            return;
        }
        try {
            IndexOperations indexOps = mongoTemplate.indexOps(EmailDeduplicationClaim.class);
            Index ttlIndex = new Index().on("retentionExpiresAt", Sort.Direction.ASC).expire(0);
            indexOps.ensureIndex(ttlIndex);
            log.info("Initialized TTL index on email_deduplication_claims.retentionExpiresAt (expireAfterSeconds=0)");
        } catch (Exception e) {
            log.warn("Could not ensure TTL index on email_deduplication_claims (may already exist or running in test mode): {}", e.getMessage());
        }
    }

    /**
     * Attempts to atomically acquire a claim for the given deduplication key.
     *
     * @param deduplicationKey deterministic key (referenceId:eventCategory:email)
     * @return ClaimAcquisitionResult (ACQUIRED, ALREADY_COMPLETED, ALREADY_IN_PROGRESS, AMBIGUOUS, or DATABASE_ERROR)
     */
    public ClaimAcquisitionResult acquireClaim(String deduplicationKey) {
        if (deduplicationKey == null || deduplicationKey.isBlank()) {
            return ClaimAcquisitionResult.databaseError("Deduplication key cannot be null or blank");
        }

        String ownerId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime leaseExpiresAt = now.plusSeconds(leaseDurationSeconds);

        EmailDeduplicationClaim newClaim = EmailDeduplicationClaim.builder()
                .id(deduplicationKey)
                .status(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
                .ownerId(ownerId)
                .fencingToken(1L)
                .claimedAt(now)
                .updatedAt(now)
                .leaseExpiresAt(leaseExpiresAt)
                .retentionExpiresAt(null)
                .build();

        try {
            mongoTemplate.insert(newClaim);
            EmailClaimHandle handle = new EmailClaimHandle(deduplicationKey, ownerId, 1L, leaseExpiresAt);
            log.debug("Acquired new email claim for key={} (owner={}, fencingToken=1)", deduplicationKey, ownerId);
            return ClaimAcquisitionResult.acquired(handle);
        } catch (DuplicateKeyException e) {
            // Claim already exists. Inspect existing status or attempt lease recovery if expired
            return handleExistingClaim(deduplicationKey, ownerId, now, leaseExpiresAt);
        } catch (Exception e) {
            log.error("Database error acquiring email claim for key={}: {}", deduplicationKey, e.getMessage());
            return ClaimAcquisitionResult.databaseError(e.getMessage());
        }
    }

    /**
     * Handles existing claim document upon insert collision:
     * - If COMPLETED -> reject (ALREADY_COMPLETED)
     * - If AMBIGUOUS -> reject (AMBIGUOUS)
     * - If IN_PROGRESS and lease active -> reject (ALREADY_IN_PROGRESS)
     * - If IN_PROGRESS and lease expired -> atomically recover lease with incremented fencing token
     */
    private ClaimAcquisitionResult handleExistingClaim(String deduplicationKey, String newOwnerId, LocalDateTime now, LocalDateTime newLeaseExpiresAt) {
        try {
            EmailDeduplicationClaim existing = mongoTemplate.findById(deduplicationKey, EmailDeduplicationClaim.class);
            if (existing == null) {
                // Claim was deleted/released just before lookup; retry fresh acquisition
                return acquireClaim(deduplicationKey);
            }

            if (EmailDeduplicationClaim.STATUS_COMPLETED.equals(existing.getStatus())) {
                log.info("Claim rejected: event {} already COMPLETED (owner={}, fencingToken={})",
                        deduplicationKey, existing.getOwnerId(), existing.getFencingToken());
                return ClaimAcquisitionResult.alreadyCompleted(existing);
            }

            if (EmailDeduplicationClaim.STATUS_AMBIGUOUS.equals(existing.getStatus())) {
                log.warn("Claim rejected: event {} is marked AMBIGUOUS from previous attempt (owner={}, fencingToken={})",
                        deduplicationKey, existing.getOwnerId(), existing.getFencingToken());
                return ClaimAcquisitionResult.ambiguous(existing);
            }

            if (EmailDeduplicationClaim.STATUS_IN_PROGRESS.equals(existing.getStatus())) {
                // Check if lease is still active
                if (existing.getLeaseExpiresAt() != null && existing.getLeaseExpiresAt().isAfter(now)) {
                    log.info("Claim rejected: event {} is actively IN_PROGRESS (owner={}, leaseExpiresAt={})",
                            deduplicationKey, existing.getOwnerId(), existing.getLeaseExpiresAt());
                    return ClaimAcquisitionResult.alreadyInProgress(existing);
                }

                // Lease has expired! Attempt atomic recovery
                log.warn("Detected expired lease for key={} (previous owner={}, fencingToken={}, expired at {}). Attempting atomic recovery.",
                        deduplicationKey, existing.getOwnerId(), existing.getFencingToken(), existing.getLeaseExpiresAt());

                Query query = Query.query(
                        Criteria.where("_id").is(deduplicationKey)
                                .and("status").is(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
                                .and("leaseExpiresAt").lte(now)
                );

                Update update = new Update()
                        .set("ownerId", newOwnerId)
                        .inc("fencingToken", 1)
                        .set("leaseExpiresAt", newLeaseExpiresAt)
                        .set("updatedAt", now);

                FindAndModifyOptions options = FindAndModifyOptions.options().returnNew(true);
                EmailDeduplicationClaim recovered = mongoTemplate.findAndModify(query, update, options, EmailDeduplicationClaim.class);

                if (recovered != null) {
                    log.info("Successfully recovered expired lease for key={} (new owner={}, new fencingToken={})",
                            deduplicationKey, recovered.getOwnerId(), recovered.getFencingToken());
                    EmailClaimHandle handle = new EmailClaimHandle(
                            deduplicationKey,
                            recovered.getOwnerId(),
                            recovered.getFencingToken(),
                            recovered.getLeaseExpiresAt()
                    );
                    return ClaimAcquisitionResult.acquired(handle);
                } else {
                    // Race condition: another concurrent worker recovered the claim or completed it first
                    EmailDeduplicationClaim current = mongoTemplate.findById(deduplicationKey, EmailDeduplicationClaim.class);
                    if (current != null) {
                        if (EmailDeduplicationClaim.STATUS_COMPLETED.equals(current.getStatus())) {
                            return ClaimAcquisitionResult.alreadyCompleted(current);
                        }
                        if (EmailDeduplicationClaim.STATUS_AMBIGUOUS.equals(current.getStatus())) {
                            return ClaimAcquisitionResult.ambiguous(current);
                        }
                    }
                    return ClaimAcquisitionResult.alreadyInProgress(current);
                }
            }

            return ClaimAcquisitionResult.databaseError("Unexpected claim status: " + existing.getStatus());
        } catch (Exception e) {
            log.error("Database error handling existing claim for key={}: {}", deduplicationKey, e.getMessage());
            return ClaimAcquisitionResult.databaseError(e.getMessage());
        }
    }

    /**
     * Validates that the caller's handle still owns the active lease.
     * Must be verified immediately before external relay dispatch.
     *
     * @param handle claim handle obtained during acquisition
     * @return true if still the active owner with valid lease; false otherwise
     */
    public boolean validateOwnership(EmailClaimHandle handle) {
        if (handle == null || handle.getDeduplicationKey() == null) {
            return false;
        }
        try {
            LocalDateTime now = LocalDateTime.now();
            Query query = Query.query(
                    Criteria.where("_id").is(handle.getDeduplicationKey())
                            .and("ownerId").is(handle.getOwnerId())
                            .and("fencingToken").is(handle.getFencingToken())
                            .and("status").is(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
                            .and("leaseExpiresAt").gt(now)
            );
            return mongoTemplate.exists(query, EmailDeduplicationClaim.class);
        } catch (Exception e) {
            log.error("Database error validating ownership for key={}: {}", handle.getDeduplicationKey(), e.getMessage());
            return false; // Fail-closed
        }
    }

    /**
     * Atomically marks a claim as COMPLETED.
     * Enforces fencing-token and ownerId match so stale owners cannot complete recovered claims.
     * Sets retentionExpiresAt to 30 days from now for eventual TTL cleanup.
     *
     * @param handle active claim handle
     * @return true if successfully transitioned; false if caller was rejected as stale owner
     */
    public boolean completeClaim(EmailClaimHandle handle) {
        if (handle == null || handle.getDeduplicationKey() == null) {
            return false;
        }
        try {
            LocalDateTime now = LocalDateTime.now();
            Query query = Query.query(
                    Criteria.where("_id").is(handle.getDeduplicationKey())
                            .and("ownerId").is(handle.getOwnerId())
                            .and("fencingToken").is(handle.getFencingToken())
                            .and("status").is(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
            );

            Update update = new Update()
                    .set("status", EmailDeduplicationClaim.STATUS_COMPLETED)
                    .set("updatedAt", now)
                    .set("retentionExpiresAt", now.plusDays(retentionDays));

            UpdateResult result = mongoTemplate.updateFirst(query, update, EmailDeduplicationClaim.class);
            if (result.getModifiedCount() > 0) {
                log.debug("Marked claim {} as COMPLETED (owner={}, fencingToken={})",
                        handle.getDeduplicationKey(), handle.getOwnerId(), handle.getFencingToken());
                return true;
            } else {
                log.warn("Failed to complete claim {}: caller is stale owner or status changed (owner={}, fencingToken={})",
                        handle.getDeduplicationKey(), handle.getOwnerId(), handle.getFencingToken());
                return false;
            }
        } catch (Exception e) {
            log.error("Database error completing claim {}: {}", handle.getDeduplicationKey(), e.getMessage());
            return false;
        }
    }

    /**
     * Atomically marks a claim as AMBIGUOUS (e.g. after an HTTP timeout or network disconnection
     * where external dispatch outcome is uncertain).
     * Enforces fencing-token and ownerId match.
     * Sets retentionExpiresAt to 30 days. Never permits automatic retry.
     *
     * @param handle active claim handle
     * @param reason diagnostic explanation
     * @return true if marked ambiguous; false if caller was stale
     */
    public boolean markAmbiguous(EmailClaimHandle handle, String reason) {
        if (handle == null || handle.getDeduplicationKey() == null) {
            return false;
        }
        try {
            LocalDateTime now = LocalDateTime.now();
            Query query = Query.query(
                    Criteria.where("_id").is(handle.getDeduplicationKey())
                            .and("ownerId").is(handle.getOwnerId())
                            .and("fencingToken").is(handle.getFencingToken())
                            .and("status").is(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
            );

            Update update = new Update()
                    .set("status", EmailDeduplicationClaim.STATUS_AMBIGUOUS)
                    .set("updatedAt", now)
                    .set("retentionExpiresAt", now.plusDays(retentionDays));

            UpdateResult result = mongoTemplate.updateFirst(query, update, EmailDeduplicationClaim.class);
            if (result.getModifiedCount() > 0) {
                log.warn("Marked claim {} as AMBIGUOUS (reason='{}', owner={}, fencingToken={})",
                        handle.getDeduplicationKey(), reason, handle.getOwnerId(), handle.getFencingToken());
                return true;
            } else {
                log.warn("Failed to mark claim {} ambiguous: caller is stale owner (owner={}, fencingToken={})",
                        handle.getDeduplicationKey(), handle.getOwnerId(), handle.getFencingToken());
                return false;
            }
        } catch (Exception e) {
            log.error("Database error marking claim {} ambiguous: {}", handle.getDeduplicationKey(), e.getMessage());
            return false;
        }
    }

    /**
     * Releases an in-progress claim upon conclusive pre-dispatch failure (e.g. invalid PDF header or size),
     * allowing subsequent corrected attempts to claim the key.
     * Enforces fencing-token and ownerId match so stale owners cannot delete newer claims.
     *
     * @param handle active claim handle
     * @return true if released; false if caller was stale
     */
    public boolean releaseClaim(EmailClaimHandle handle) {
        if (handle == null || handle.getDeduplicationKey() == null) {
            return false;
        }
        try {
            Query query = Query.query(
                    Criteria.where("_id").is(handle.getDeduplicationKey())
                            .and("ownerId").is(handle.getOwnerId())
                            .and("fencingToken").is(handle.getFencingToken())
                            .and("status").is(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
            );

            DeleteResult result = mongoTemplate.remove(query, EmailDeduplicationClaim.class);
            if (result.getDeletedCount() > 0) {
                log.debug("Released in-progress claim {} (owner={}, fencingToken={})",
                        handle.getDeduplicationKey(), handle.getOwnerId(), handle.getFencingToken());
                return true;
            } else {
                log.warn("Failed to release claim {}: caller is stale owner or claim already completed",
                        handle.getDeduplicationKey());
                return false;
            }
        } catch (Exception e) {
            log.error("Database error releasing claim {}: {}", handle.getDeduplicationKey(), e.getMessage());
            return false;
        }
    }

    /**
     * Reads the current claim document for testing or inspection.
     */
    public EmailDeduplicationClaim getClaim(String deduplicationKey) {
        if (deduplicationKey == null || deduplicationKey.isBlank() || mongoTemplate == null) {
            return null;
        }
        try {
            return mongoTemplate.findById(deduplicationKey, EmailDeduplicationClaim.class);
        } catch (Exception e) {
            log.error("Database error fetching claim {}: {}", deduplicationKey, e.getMessage());
            return null;
        }
    }
}
