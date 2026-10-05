package com.nec.collegeservices.service;

import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class RequesterResolver {

    @Autowired
    private UserRepository userRepository;

    public String resolveRequesterUserId(String requesterUserId, String requestedBy, String department) {
        if (requesterUserId != null && !requesterUserId.isBlank() && !"null".equalsIgnoreCase(requesterUserId)) {
            return requesterUserId.trim();
        }

        if (requestedBy != null && !requestedBy.isBlank()) {
            String trimmed = requestedBy.trim();
            // Check direct userId match
            Optional<User> byId = userRepository.findByUserId(trimmed);
            if (byId.isPresent()) {
                return byId.get().getUserId();
            }

            // Check if string contains parenthesized userId e.g. "Dr. Rao (csehod)"
            int openParen = trimmed.lastIndexOf('(');
            int closeParen = trimmed.lastIndexOf(')');
            if (openParen >= 0 && closeParen > openParen) {
                String potentialId = trimmed.substring(openParen + 1, closeParen).trim();
                Optional<User> byParenId = userRepository.findByUserId(potentialId);
                if (byParenId.isPresent()) {
                    return byParenId.get().getUserId();
                }
            }

            // Check match by name
            for (User u : userRepository.findAll()) {
                if (u.getName() != null && u.getName().trim().equalsIgnoreCase(trimmed)) {
                    return u.getUserId();
                }
            }
        }

        // Fallback to department HOD or department-specific user
        if (department != null && !department.isBlank()) {
            String hodId = department.trim().toLowerCase() + "hod";
            Optional<User> hodUser = userRepository.findByUserId(hodId);
            if (hodUser.isPresent()) {
                return hodUser.get().getUserId();
            }

            // Search for any user with DEPARTMENT_HOD in that department
            for (User u : userRepository.findAll()) {
                if (department.equalsIgnoreCase(u.getDepartment()) && u.hasRole("DEPARTMENT_HOD")) {
                    return u.getUserId();
                }
            }

            // Search for any active user in that department
            for (User u : userRepository.findAll()) {
                if (department.equalsIgnoreCase(u.getDepartment()) && Boolean.TRUE.equals(u.getActive())) {
                    return u.getUserId();
                }
            }
        }

        return requesterUserId;
    }
}
