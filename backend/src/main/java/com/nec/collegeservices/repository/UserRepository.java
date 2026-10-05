package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUserId(String userId);
    boolean existsByUserId(String userId);
    java.util.List<User> findByDepartment(String department);
    long countByActive(Boolean active);
}
