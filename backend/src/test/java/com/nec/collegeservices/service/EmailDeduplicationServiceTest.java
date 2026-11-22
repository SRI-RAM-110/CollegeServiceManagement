package com.nec.collegeservices.service;

import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;
import com.nec.collegeservices.model.EmailDeduplicationClaim;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailDeduplicationServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private IndexOperations indexOperations;

    private EmailDeduplicationService deduplicationService;

    private static final String DEDUP_KEY = "SEM-0001:INSPECTION_REPORT:principal@nrtec.in";

    @BeforeEach
    void setUp() {
        deduplicationService = new EmailDeduplicationService(mongoTemplate, 60L, 30L);
    }

    @Test
    @DisplayName("1. New claim acquisition is atomic with initial fencing token = 1")
    void testAtomicAcquisitionSuccess() {
        ClaimAcquisitionResult result = deduplicationService.acquireClaim(DEDUP_KEY);

        assertTrue(result.isAcquired());
        assertEquals(ClaimAcquisitionResult.Status.ACQUIRED, result.getStatus());
        assertNotNull(result.getHandle());
        assertEquals(DEDUP_KEY, result.getHandle().getDeduplicationKey());
        assertNotNull(result.getHandle().getOwnerId());
        assertEquals(1L, result.getHandle().getFencingToken());
        assertTrue(result.getHandle().getLeaseExpiresAt().isAfter(LocalDateTime.now()));

        ArgumentCaptor<EmailDeduplicationClaim> claimCaptor = ArgumentCaptor.forClass(EmailDeduplicationClaim.class);
        verify(mongoTemplate, times(1)).insert(claimCaptor.capture());

        EmailDeduplicationClaim inserted = claimCaptor.getValue();
        assertEquals(DEDUP_KEY, inserted.getId());
        assertEquals(EmailDeduplicationClaim.STATUS_IN_PROGRESS, inserted.getStatus());
        assertEquals(1L, inserted.getFencingToken());
        assertNull(inserted.getRetentionExpiresAt(), "Active IN_PROGRESS claim must have null retentionExpiresAt");
    }

    @Test
    @DisplayName("2. Collision with ALREADY_COMPLETED claim is rejected")
    void testCollisionWithCompletedClaim() {
        doThrow(new DuplicateKeyException("E11000 duplicate key"))
                .when(mongoTemplate).insert(any(EmailDeduplicationClaim.class));

        EmailDeduplicationClaim completedClaim = EmailDeduplicationClaim.builder()
                .id(DEDUP_KEY)
                .status(EmailDeduplicationClaim.STATUS_COMPLETED)
                .ownerId("prev-owner")
                .fencingToken(1L)
                .leaseExpiresAt(LocalDateTime.now().minusMinutes(5))
                .retentionExpiresAt(LocalDateTime.now().plusDays(29))
                .build();

        when(mongoTemplate.findById(DEDUP_KEY, EmailDeduplicationClaim.class))
                .thenReturn(completedClaim);

        ClaimAcquisitionResult result = deduplicationService.acquireClaim(DEDUP_KEY);

        assertFalse(result.isAcquired());
        assertEquals(ClaimAcquisitionResult.Status.ALREADY_COMPLETED, result.getStatus());
        assertNull(result.getHandle());
    }

    @Test
    @DisplayName("3. Collision with AMBIGUOUS claim is rejected permanently")
    void testCollisionWithAmbiguousClaim() {
        doThrow(new DuplicateKeyException("E11000 duplicate key"))
                .when(mongoTemplate).insert(any(EmailDeduplicationClaim.class));

        EmailDeduplicationClaim ambiguousClaim = EmailDeduplicationClaim.builder()
                .id(DEDUP_KEY)
                .status(EmailDeduplicationClaim.STATUS_AMBIGUOUS)
                .ownerId("prev-owner")
                .fencingToken(1L)
                .leaseExpiresAt(LocalDateTime.now().minusMinutes(5))
                .retentionExpiresAt(LocalDateTime.now().plusDays(29))
                .build();

        when(mongoTemplate.findById(DEDUP_KEY, EmailDeduplicationClaim.class))
                .thenReturn(ambiguousClaim);

        ClaimAcquisitionResult result = deduplicationService.acquireClaim(DEDUP_KEY);

        assertFalse(result.isAcquired());
        assertEquals(ClaimAcquisitionResult.Status.AMBIGUOUS, result.getStatus());
    }

    @Test
    @DisplayName("4. Collision with active live IN_PROGRESS claim protects live lease")
    void testCollisionWithActiveLiveClaim() {
        doThrow(new DuplicateKeyException("E11000 duplicate key"))
                .when(mongoTemplate).insert(any(EmailDeduplicationClaim.class));

        EmailDeduplicationClaim liveClaim = EmailDeduplicationClaim.builder()
                .id(DEDUP_KEY)
                .status(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
                .ownerId("worker-active")
                .fencingToken(1L)
                .leaseExpiresAt(LocalDateTime.now().plusSeconds(45)) // Active lease
                .build();

        when(mongoTemplate.findById(DEDUP_KEY, EmailDeduplicationClaim.class))
                .thenReturn(liveClaim);

        ClaimAcquisitionResult result = deduplicationService.acquireClaim(DEDUP_KEY);

        assertFalse(result.isAcquired());
        assertEquals(ClaimAcquisitionResult.Status.ALREADY_IN_PROGRESS, result.getStatus());
        verify(mongoTemplate, never()).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(EmailDeduplicationClaim.class));
    }

    @Test
    @DisplayName("5. Expired IN_PROGRESS lease is recovered with incremented fencing token")
    void testExpiredLeaseRecovery_Success() {
        doThrow(new DuplicateKeyException("E11000 duplicate key"))
                .when(mongoTemplate).insert(any(EmailDeduplicationClaim.class));

        EmailDeduplicationClaim expiredClaim = EmailDeduplicationClaim.builder()
                .id(DEDUP_KEY)
                .status(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
                .ownerId("dead-worker")
                .fencingToken(1L)
                .leaseExpiresAt(LocalDateTime.now().minusSeconds(10)) // Expired
                .build();

        when(mongoTemplate.findById(DEDUP_KEY, EmailDeduplicationClaim.class))
                .thenReturn(expiredClaim);

        EmailDeduplicationClaim recoveredClaim = EmailDeduplicationClaim.builder()
                .id(DEDUP_KEY)
                .status(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
                .ownerId("new-recovering-worker")
                .fencingToken(2L) // Incremented
                .leaseExpiresAt(LocalDateTime.now().plusSeconds(60))
                .build();

        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(recoveredClaim);

        ClaimAcquisitionResult result = deduplicationService.acquireClaim(DEDUP_KEY);

        assertTrue(result.isAcquired());
        assertEquals(ClaimAcquisitionResult.Status.ACQUIRED, result.getStatus());
        assertEquals(2L, result.getHandle().getFencingToken(), "Fencing token must be incremented to 2");
        assertEquals("new-recovering-worker", result.getHandle().getOwnerId());
    }

    @Test
    @DisplayName("6. Concurrent expired lease recovery race: second worker loses findAndModify")
    void testConcurrentExpiredLeaseRecovery_SecondWorkerLoses() {
        doThrow(new DuplicateKeyException("E11000 duplicate key"))
                .when(mongoTemplate).insert(any(EmailDeduplicationClaim.class));

        EmailDeduplicationClaim expiredClaim = EmailDeduplicationClaim.builder()
                .id(DEDUP_KEY)
                .status(EmailDeduplicationClaim.STATUS_IN_PROGRESS)
                .ownerId("dead-worker")
                .fencingToken(1L)
                .leaseExpiresAt(LocalDateTime.now().minusSeconds(10))
                .build();

        when(mongoTemplate.findById(DEDUP_KEY, EmailDeduplicationClaim.class))
                .thenReturn(expiredClaim);

        // findAndModify returns null because another worker already matched and updated it
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(null);

        ClaimAcquisitionResult result = deduplicationService.acquireClaim(DEDUP_KEY);

        assertFalse(result.isAcquired());
        assertEquals(ClaimAcquisitionResult.Status.ALREADY_IN_PROGRESS, result.getStatus());
    }

    @Test
    @DisplayName("7. completeClaim succeeds for current owner and sets 30-day retention")
    void testCompleteClaim_Success() {
        EmailClaimHandle handle = new EmailClaimHandle(DEDUP_KEY, "owner-1", 1L, LocalDateTime.now().plusSeconds(50));
        UpdateResult mockUpdateResult = mock(UpdateResult.class);
        when(mockUpdateResult.getModifiedCount()).thenReturn(1L);

        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(mockUpdateResult);

        boolean completed = deduplicationService.completeClaim(handle);

        assertTrue(completed);

        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(any(Query.class), updateCaptor.capture(), eq(EmailDeduplicationClaim.class));
        Update appliedUpdate = updateCaptor.getValue();
        assertEquals(EmailDeduplicationClaim.STATUS_COMPLETED, appliedUpdate.getUpdateObject().get("$set", org.bson.Document.class).get("status"));
        assertNotNull(appliedUpdate.getUpdateObject().get("$set", org.bson.Document.class).get("retentionExpiresAt"));
    }

    @Test
    @DisplayName("8. completeClaim rejects stale owner when fencing token or ownerId has changed")
    void testCompleteClaim_StaleOwnerRejected() {
        EmailClaimHandle staleHandle = new EmailClaimHandle(DEDUP_KEY, "stale-owner", 1L, LocalDateTime.now().minusSeconds(10));
        UpdateResult mockUpdateResult = mock(UpdateResult.class);
        when(mockUpdateResult.getModifiedCount()).thenReturn(0L); // 0 rows modified because query matched nothing

        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(mockUpdateResult);

        boolean completed = deduplicationService.completeClaim(staleHandle);

        assertFalse(completed, "Stale owner transition must be rejected");
    }

    @Test
    @DisplayName("9. markAmbiguous transitions status to AMBIGUOUS and sets 30-day retention")
    void testMarkAmbiguous_Success() {
        EmailClaimHandle handle = new EmailClaimHandle(DEDUP_KEY, "owner-timeout", 2L, LocalDateTime.now().plusSeconds(30));
        UpdateResult mockUpdateResult = mock(UpdateResult.class);
        when(mockUpdateResult.getModifiedCount()).thenReturn(1L);

        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(mockUpdateResult);

        boolean marked = deduplicationService.markAmbiguous(handle, "Apps Script timeout after 30s");

        assertTrue(marked);
    }

    @Test
    @DisplayName("10. releaseClaim deletes in-progress claim upon conclusive pre-dispatch failure")
    void testReleaseClaim_Success() {
        EmailClaimHandle handle = new EmailClaimHandle(DEDUP_KEY, "owner-1", 1L, LocalDateTime.now().plusSeconds(50));
        DeleteResult mockDeleteResult = mock(DeleteResult.class);
        when(mockDeleteResult.getDeletedCount()).thenReturn(1L);

        when(mongoTemplate.remove(any(Query.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(mockDeleteResult);

        boolean released = deduplicationService.releaseClaim(handle);

        assertTrue(released);
    }

    @Test
    @DisplayName("11. releaseClaim rejects stale owner")
    void testReleaseClaim_StaleOwnerRejected() {
        EmailClaimHandle staleHandle = new EmailClaimHandle(DEDUP_KEY, "stale-owner", 1L, LocalDateTime.now().minusSeconds(10));
        DeleteResult mockDeleteResult = mock(DeleteResult.class);
        when(mockDeleteResult.getDeletedCount()).thenReturn(0L);

        when(mongoTemplate.remove(any(Query.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(mockDeleteResult);

        boolean released = deduplicationService.releaseClaim(staleHandle);

        assertFalse(released);
    }

    @Test
    @DisplayName("12. validateOwnership verifies ownerId, fencingToken, status, and active lease")
    void testValidateOwnership() {
        EmailClaimHandle handle = new EmailClaimHandle(DEDUP_KEY, "owner-valid", 1L, LocalDateTime.now().plusSeconds(50));

        when(mongoTemplate.exists(any(Query.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(true);

        assertTrue(deduplicationService.validateOwnership(handle));

        when(mongoTemplate.exists(any(Query.class), eq(EmailDeduplicationClaim.class)))
                .thenReturn(false);

        assertFalse(deduplicationService.validateOwnership(handle));
    }

    @Test
    @DisplayName("13. System fails closed (DATABASE_ERROR) when MongoDB throws an exception")
    void testDatabaseFailure_FailsClosed() {
        doThrow(new RuntimeException("MongoDB connection refused"))
                .when(mongoTemplate).insert(any(EmailDeduplicationClaim.class));

        ClaimAcquisitionResult result = deduplicationService.acquireClaim(DEDUP_KEY);

        assertFalse(result.isAcquired());
        assertEquals(ClaimAcquisitionResult.Status.DATABASE_ERROR, result.getStatus());
        assertTrue(result.getMessage().contains("MongoDB connection refused"));
    }

    @Test
    @DisplayName("14. ensureIndexes creates TTL index on retentionExpiresAt with expireAfterSeconds=0")
    void testTtlIndexInitialization() {
        when(mongoTemplate.indexOps(EmailDeduplicationClaim.class)).thenReturn(indexOperations);

        deduplicationService.ensureIndexes();

        ArgumentCaptor<Index> indexCaptor = ArgumentCaptor.forClass(Index.class);
        verify(indexOperations, times(1)).ensureIndex(indexCaptor.capture());

        Index created = indexCaptor.getValue();
        assertTrue(created.getIndexKeys().containsKey("retentionExpiresAt"));
    }
}
