package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.AccommodationRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccommodationRequestRepository extends MongoRepository<AccommodationRequest, String> {
    Optional<AccommodationRequest> findByRequestId(String requestId);

    List<AccommodationRequest> findByDepartment(String department);

    List<AccommodationRequest> findByStatus(String status);

    List<AccommodationRequest> findByRoomId(String roomId);
    List<AccommodationRequest> findByCheckInDate(String checkInDate);
    List<AccommodationRequest> findByCheckOutDate(String checkOutDate);

    @Query("{ 'roomId': ?0, 'status': { $in: ['PENDING', 'APPROVED', 'BOOKED', 'CANCELLATION_REQUESTED', 'RESCHEDULE_REQUESTED'] } }")
    List<AccommodationRequest> findActiveBookingsForRoom(String roomId);

    @Query("{ 'roomId': ?0, 'status': { $in: ['PENDING', 'APPROVED', 'BOOKED', 'CANCELLATION_REQUESTED', 'RESCHEDULE_REQUESTED'] }, $and: [ { 'checkInDate': { $lt: ?2 } }, { 'checkOutDate': { $gt: ?1 } } ] }")
    List<AccommodationRequest> findOverlappingRequests(String roomId, String checkInDate, String checkOutDate);
}
