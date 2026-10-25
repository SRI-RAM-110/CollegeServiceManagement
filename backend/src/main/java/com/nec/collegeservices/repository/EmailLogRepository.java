package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.EmailLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailLogRepository extends MongoRepository<EmailLog, String> {
    Optional<EmailLog> findFirstByDeduplicationKeyAndStatus(String deduplicationKey, String status);
    List<EmailLog> findByReferenceId(String referenceId);
}
