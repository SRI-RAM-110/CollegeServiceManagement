package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.SeminarHall;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SeminarHallRepository extends MongoRepository<SeminarHall, String> {
    Optional<SeminarHall> findByHallId(String hallId);
}
