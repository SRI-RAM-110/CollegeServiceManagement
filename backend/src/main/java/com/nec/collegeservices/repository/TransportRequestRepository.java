package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.TransportRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransportRequestRepository extends MongoRepository<TransportRequest, String> {
    Optional<TransportRequest> findByRequestId(String requestId);

    List<TransportRequest> findByDepartment(String department);

    List<TransportRequest> findByStatus(String status);

    List<TransportRequest> findByTripDate(String tripDate);

    List<TransportRequest> findByTripDateAndStatusIn(String tripDate, List<String> statuses);

    List<TransportRequest> findByVehicleIdAndTripDateAndStatusIn(String vehicleId, String tripDate, List<String> statuses);

    List<TransportRequest> findBySeriesId(String seriesId);
}
