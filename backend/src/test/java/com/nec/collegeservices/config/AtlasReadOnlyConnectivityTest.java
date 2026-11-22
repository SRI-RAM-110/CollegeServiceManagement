package com.nec.collegeservices.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AtlasReadOnlyConnectivityTest {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private Environment environment;

    @Test
    @DisplayName("Atlas Verification: Confirms backend connects to authoritative collegeservices_db on Atlas")
    void testAtlasReadOnlyConnectivity() {
        // 1. Verify configured URI scheme
        String configuredUri = environment.getProperty("spring.data.mongodb.uri", "");
        assertNotNull(configuredUri, "spring.data.mongodb.uri must be configured");
        assertFalse(configuredUri.isBlank(), "spring.data.mongodb.uri must not be blank");
        assertTrue(configuredUri.startsWith("mongodb+srv://"), "Configured URI must be a MongoDB Atlas cloud URI (mongodb+srv://)");
        assertFalse(configuredUri.contains("localhost"), "URI must not contain localhost");
        assertFalse(configuredUri.contains("127.0.0.1"), "URI must not contain 127.0.0.1");

        // 2. Verify Database Name
        String dbName = mongoTemplate.getDb().getName();
        assertEquals("collegeservices_db", dbName, "Database name must be 'collegeservices_db'");

        // 3. Verify Authoritative Collections Exist in Atlas (Read-Only)
        Set<String> collections = mongoTemplate.getCollectionNames();
        assertTrue(collections.contains("users"), "Atlas must contain 'users' collection");
        assertTrue(collections.contains("departments"), "Atlas must contain 'departments' collection");
        assertTrue(collections.contains("seminar_halls"), "Atlas must contain 'seminar_halls' collection");
        assertTrue(collections.contains("seminar_bookings"), "Atlas must contain 'seminar_bookings' collection");
        assertTrue(collections.size() >= 15, "Atlas database should contain all 20+ production collections");
    }
}
