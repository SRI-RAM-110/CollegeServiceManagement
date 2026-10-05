package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.AccommodationRoom;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccommodationRoomRepository extends MongoRepository<AccommodationRoom, String> {
    Optional<AccommodationRoom> findByRoomId(String roomId);
    List<AccommodationRoom> findByHostel(String hostel);
}
