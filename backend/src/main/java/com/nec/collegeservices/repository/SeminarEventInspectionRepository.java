package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.SeminarEventInspection;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeminarEventInspectionRepository extends MongoRepository<SeminarEventInspection, String> {

    Optional<SeminarEventInspection> findByBookingIdAndOccurrenceDate(String bookingId, String occurrenceDate);

    List<SeminarEventInspection> findByBookingId(String bookingId);

    List<SeminarEventInspection> findByHallId(String hallId);

    List<SeminarEventInspection> findByHallIdIn(List<String> hallIds);

    List<SeminarEventInspection> findByTechnicianUserId(String technicianUserId);

    List<SeminarEventInspection> findByCoordinatorUserId(String coordinatorUserId);

    List<SeminarEventInspection> findByRequesterUserId(String requesterUserId);

    List<SeminarEventInspection> findByDepartment(String department);
}

