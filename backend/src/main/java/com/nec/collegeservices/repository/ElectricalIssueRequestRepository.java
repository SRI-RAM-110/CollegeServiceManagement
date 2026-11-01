package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.ElectricalIssueRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ElectricalIssueRequestRepository extends MongoRepository<ElectricalIssueRequest, String> {

    Optional<ElectricalIssueRequest> findByRequestId(String requestId);

    boolean existsByRequestId(String requestId);

    List<ElectricalIssueRequest> findByReportedByUserId(String reportedByUserId);

    List<ElectricalIssueRequest> findByReportedByUserIdOrderByCreatedAtDesc(String reportedByUserId);

    List<ElectricalIssueRequest> findByAssignedElectricianId(String assignedElectricianId);

    List<ElectricalIssueRequest> findByAssignedElectricianIdOrderByCreatedAtDesc(String assignedElectricianId);

    List<ElectricalIssueRequest> findByStatus(String status);

    List<ElectricalIssueRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<ElectricalIssueRequest> findAllByOrderByCreatedAtDesc();
}

