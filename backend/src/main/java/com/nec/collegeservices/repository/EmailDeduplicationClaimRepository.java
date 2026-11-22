package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.EmailDeduplicationClaim;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailDeduplicationClaimRepository extends MongoRepository<EmailDeduplicationClaim, String> {
    Optional<EmailDeduplicationClaim> findByIdAndStatus(String id, String status);
}
