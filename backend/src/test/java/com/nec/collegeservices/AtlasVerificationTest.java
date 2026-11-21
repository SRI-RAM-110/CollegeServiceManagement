package com.nec.collegeservices;

import com.nec.collegeservices.model.*;
import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@org.junit.jupiter.api.Disabled("Explicit manual Atlas verification test only - excluded from automated builds")
@SpringBootTest
public class AtlasVerificationTest {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private SeminarHallRepository seminarHallRepository;

    @Autowired
    private SeminarBookingRepository seminarBookingRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Verify Atlas Database Name, Collections, and Preserved Data")
    void verifyAtlasConnectionAndData() {
        // 1. Verify Database Name
        String dbName = mongoTemplate.getDb().getName();
        assertEquals("collegeservices_db", dbName, "Database name must be collegeservices_db");
        System.out.println("VERIFIED DATABASE NAME: " + dbName);

        // 2. Verify Collections Exist
        Set<String> collections = mongoTemplate.getCollectionNames();
        assertTrue(collections.contains("users"), "Collection 'users' must exist");
        assertTrue(collections.contains("departments"), "Collection 'departments' must exist");
        assertTrue(collections.contains("seminar_halls"), "Collection 'seminar_halls' must exist");
        assertTrue(collections.contains("seminar_bookings"), "Collection 'seminar_bookings' must exist");
        System.out.println("VERIFIED COLLECTIONS (" + collections.size() + "): " + collections);

        // 3. Verify Document Counts
        long userCount = userRepository.count();
        long deptCount = departmentRepository.count();
        long hallCount = seminarHallRepository.count();
        long bookingCount = seminarBookingRepository.count();

        System.out.println("ATLAS DOCUMENT COUNTS:");
        System.out.println("  Users: " + userCount);
        System.out.println("  Departments: " + deptCount);
        System.out.println("  Seminar Halls: " + hallCount);
        System.out.println("  Bookings: " + bookingCount);

        assertTrue(userCount > 0, "Users collection should have documents");
        assertTrue(deptCount > 0, "Departments collection should have documents");
        assertTrue(hallCount > 0, "Seminar halls collection should have documents");

        // 4. Test Reading Departments & Seminar Halls
        List<Department> depts = departmentRepository.findAll();
        assertFalse(depts.isEmpty());
        for (Department d : depts) {
            assertNotNull(d.getCode());
            System.out.println("  Dept: " + d.getCode() + " - " + d.getName());
        }

        List<SeminarHall> halls = seminarHallRepository.findAll();
        assertFalse(halls.isEmpty());
        for (SeminarHall h : halls) {
            assertNotNull(h.getHallId());
            System.out.println("  Hall: " + h.getHallId() + " - " + h.getName() + " (Capacity: " + h.getCapacity() + ")");
        }

        // 5. Test User Passwords
        List<User> users = userRepository.findAll();
        String[] candidates = {
            "admin123", "dept123", "password123", "password", "Admin123", "Dept123",
            "nec@123", "nrtec@123", "nec123", "nrtec123", "sriram", "Sriram", "sriram123",
            "123456", "12345678", "welcome123", "Welcome123", "Welcome@123", "test1234"
        };

        int matchedCount = 0;
        for (User u : users) {
            String foundPass = null;
            for (String cand : candidates) {
                if (passwordEncoder.matches(cand, u.getPassword())) {
                    foundPass = cand;
                    break;
                }
            }
            if (foundPass != null) {
                matchedCount++;
                System.out.println("  MATCH: User " + u.getUserId() + " (" + u.getEmail() + ") uses password: " + foundPass);
            }
        }
        System.out.println("Matched passwords for " + matchedCount + " out of " + users.size() + " users.");
    }
}
