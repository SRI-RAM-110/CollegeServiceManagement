package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.SeminarBooking;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeminarBookingRepository extends MongoRepository<SeminarBooking, String> {
    Optional<SeminarBooking> findByBookingId(String bookingId);

    List<SeminarBooking> findByHallIdAndDate(String hallId, String date);

    @Query("{'hallId': ?0, 'date': ?1, 'status': { $in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'BOOKED', 'CANCELLATION_REQUESTED', 'RESCHEDULE_REQUESTED'] }}")
    List<SeminarBooking> findActiveBookingsForHallAndDate(String hallId, String date);

    List<SeminarBooking> findBySeriesId(String seriesId);

    List<SeminarBooking> findBySeriesIdAndDateGreaterThanEqual(String seriesId, String date);

    List<SeminarBooking> findByDate(String date);

    List<SeminarBooking> findByDepartment(String department);

    List<SeminarBooking> findByStatus(String status);
}
