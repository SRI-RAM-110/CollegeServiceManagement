package com.nec.collegeservices.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

public class MongoAtlasConfigurationValidatorTest {

    private MongoAtlasConfigurationValidator validator;
    private MockEnvironment mockEnvironment;

    @BeforeEach
    void setUp() {
        validator = new MongoAtlasConfigurationValidator();
        mockEnvironment = new MockEnvironment();
        validator.setEnvironment(mockEnvironment);
    }

    @Test
    @DisplayName("Validation fails when spring.data.mongodb.uri is missing")
    void testMissingUri_fails() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> validator.validateConfiguration());
        assertTrue(ex.getMessage().contains("MONGODB_URI is mandatory"));
    }

    @Test
    @DisplayName("Validation fails when spring.data.mongodb.uri is blank")
    void testBlankUri_fails() {
        mockEnvironment.setProperty("spring.data.mongodb.uri", "   ");
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> validator.validateConfiguration());
        assertTrue(ex.getMessage().contains("MONGODB_URI is mandatory"));
    }

    @Test
    @DisplayName("Validation fails when spring.data.mongodb.uri points to localhost")
    void testLocalhostUri_fails() {
        mockEnvironment.setProperty("spring.data.mongodb.uri", "mongodb://localhost:27017/collegeservices_db");
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> validator.validateConfiguration());
        assertTrue(ex.getMessage().contains("Local MongoDB connections are strictly prohibited"));
    }

    @Test
    @DisplayName("Validation fails when spring.data.mongodb.uri points to 127.0.0.1")
    void testLoopbackIpUri_fails() {
        mockEnvironment.setProperty("spring.data.mongodb.uri", "mongodb://127.0.0.1:27017/collegeservices_db");
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> validator.validateConfiguration());
        assertTrue(ex.getMessage().contains("Local MongoDB connections are strictly prohibited"));
    }

    @Test
    @DisplayName("Validation fails when database name is wrong or missing")
    void testWrongDatabaseName_fails() {
        mockEnvironment.setProperty("spring.data.mongodb.uri", "mongodb+srv://user:pass@cluster0.mongodb.net/testdb");
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> validator.validateConfiguration());
        assertTrue(ex.getMessage().contains("Invalid MongoDB database name"));
    }

    @Test
    @DisplayName("Validation succeeds with valid Atlas connection string targeting collegeservices_db")
    void testValidAtlasUri_succeeds() {
        mockEnvironment.setProperty("spring.data.mongodb.uri",
                "mongodb+srv://admin:securepass@cluster0.tzw0cfl.mongodb.net/collegeservices_db?retryWrites=true&w=majority");
        assertDoesNotThrow(() -> validator.validateConfiguration());
    }
}
