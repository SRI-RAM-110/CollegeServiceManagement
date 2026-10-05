package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.Vehicle;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends MongoRepository<Vehicle, String> {
    Optional<Vehicle> findByVehicleId(String vehicleId);
    List<Vehicle> findByStatus(String status);
}
