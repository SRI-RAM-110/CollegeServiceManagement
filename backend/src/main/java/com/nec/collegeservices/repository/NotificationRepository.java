package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    @Query("{ $or: [ " +
           "{ 'recipientUserId': ?2 }, " +
           "{ $and: [ " +
           "  { $or: [ { 'recipientUserId': null }, { 'recipientUserId': '' }, { 'recipientUserId': 'ALL' }, { 'recipientUserId': { $exists: false } } ] }, " +
           "  { $or: [ { 'recipientDept': 'ALL' }, { 'recipientDept': ?1 } ] }, " +
           "  { $or: [ { 'recipientRole': 'ALL' }, { 'recipientRole': ?0 } ] } " +
           "] } " +
           "] }")
    List<Notification> findForUser(String role, String department, String userId);

    List<Notification> findByRecipientRoleOrRecipientDept(String recipientRole, String recipientDept);

    long countByRecipientRoleAndReadFalse(String recipientRole);
}
