package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.DeviceToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends MongoRepository<DeviceToken, String> {
    List<DeviceToken> findByUserId(String userId);

    List<DeviceToken> findByUserIdIn(List<String> userIds);

    Optional<DeviceToken> findByToken(String token);

    void deleteByToken(String token);

    void deleteByUserIdAndToken(String userId, String token);

    void deleteByUserId(String userId);
}

