package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    @Query(value = "{ $or: [ " +
           "{ 'recipientUserId': ?2 }, " +
           "{ $and: [ " +
           "  { $or: [ { 'recipientUserId': null }, { 'recipientUserId': '' }, { 'recipientUserId': 'ALL' }, { 'recipientUserId': { $exists: false } } ] }, " +
           "  { $or: [ { 'recipientDept': 'ALL' }, { 'recipientDept': ?1 }, { 'recipientDept': ?3 } ] }, " +
           "  { $or: [ { 'recipientRole': 'ALL' }, { 'recipientRole': { $in: ?0 } } ] } " +
           "] } " +
           "] }", sort = "{ 'createdAt': -1 }")
    List<Notification> findForUserRoles(List<String> roles, String department, String userId, String altDept);

    default List<Notification> findForUserRoles(List<String> roles, String department, String userId) {
        return findForUserRoles(roles, department, userId, department);
    }

    @Query(value = "{ $or: [ " +
           "{ 'recipientUserId': ?2 }, " +
           "{ $and: [ " +
           "  { $or: [ { 'recipientUserId': null }, { 'recipientUserId': '' }, { 'recipientUserId': 'ALL' }, { 'recipientUserId': { $exists: false } } ] }, " +
           "  { $or: [ { 'recipientDept': 'ALL' }, { 'recipientDept': ?1 } ] }, " +
           "  { $or: [ { 'recipientRole': 'ALL' }, { 'recipientRole': ?0 } ] } " +
           "] } " +
           "] }", sort = "{ 'createdAt': -1 }")
    List<Notification> findForUser(String role, String department, String userId);

    List<Notification> findByRecipientRoleOrRecipientDept(String recipientRole, String recipientDept);

    long countByRecipientRoleAndReadFalse(String recipientRole);
}
