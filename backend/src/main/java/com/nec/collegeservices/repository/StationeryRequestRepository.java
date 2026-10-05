package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.StationeryRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StationeryRequestRepository extends MongoRepository<StationeryRequest, String> {
    Optional<StationeryRequest> findByRequestId(String requestId);

    List<StationeryRequest> findByDepartment(String department);

    List<StationeryRequest> findByStatus(String status);
}
