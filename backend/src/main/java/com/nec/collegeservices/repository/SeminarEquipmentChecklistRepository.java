package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.SeminarEquipmentChecklist;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeminarEquipmentChecklistRepository extends MongoRepository<SeminarEquipmentChecklist, String> {
    Optional<SeminarEquipmentChecklist> findByBookingIdAndOccurrenceDate(String bookingId, String occurrenceDate);
    List<SeminarEquipmentChecklist> findByBookingId(String bookingId);
    List<SeminarEquipmentChecklist> findByHallId(String hallId);
    List<SeminarEquipmentChecklist> findByHallIdIn(List<String> hallIds);
}
