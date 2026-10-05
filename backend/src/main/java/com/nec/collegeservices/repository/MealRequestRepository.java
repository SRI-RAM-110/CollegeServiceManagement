package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.MealRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MealRequestRepository extends MongoRepository<MealRequest, String> {
    Optional<MealRequest> findByRequestId(String requestId);

    List<MealRequest> findByDepartment(String department);

    List<MealRequest> findByStatus(String status);

    List<MealRequest> findByDate(String date);
}
