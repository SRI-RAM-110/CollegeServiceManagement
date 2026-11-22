package com.nec.collegeservices.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Validates that the application is configured strictly to connect to the authoritative
 * MongoDB Atlas cloud database and prohibits any local MongoDB (localhost / 127.0.0.1) connection.
 */
@Configuration
public class MongoAtlasConfigurationValidator {

    private static final Logger logger = LoggerFactory.getLogger(MongoAtlasConfigurationValidator.class);
    public static final String REQUIRED_DATABASE_NAME = "collegeservices_db";

    @Autowired(required = false)
    private Environment environment;

    @PostConstruct
    public void validateConfiguration() {
        if (environment == null) {
            return;
        }
        String mongoUri = environment.getProperty("spring.data.mongodb.uri");
        validateMongoUri(mongoUri);
    }

    public void validateMongoUri(String mongoUri) {
        if (mongoUri == null || mongoUri.trim().isEmpty()) {
            throw new IllegalStateException(
                    "CRITICAL CONFIGURATION ERROR: MONGODB_URI is mandatory. " +
                    "The application must connect to the authoritative MongoDB Atlas cloud database. " +
                    "Local MongoDB fallback has been eliminated. Configure MONGODB_URI in environment variables " +
                    "or application-local.properties."
            );
        }

        String normalized = mongoUri.trim().toLowerCase();

        // 1. Prohibit local MongoDB hosts
        if (normalized.contains("localhost") || normalized.contains("127.0.0.1") || normalized.contains("::1")) {
            throw new IllegalStateException(
                    "CRITICAL ARCHITECTURE VIOLATION: Local MongoDB connections are strictly prohibited. " +
                    "The application must connect exclusively to MongoDB Atlas (mongodb+srv://...). " +
                    "Prohibited localhost/127.0.0.1 host detected in spring.data.mongodb.uri."
            );
        }

        // 2. Validate scheme
        if (!normalized.startsWith("mongodb+srv://") && !normalized.startsWith("mongodb://")) {
            throw new IllegalStateException(
                    "CRITICAL CONFIGURATION ERROR: Invalid MongoDB connection URI format. " +
                    "Expected connection scheme 'mongodb+srv://' or 'mongodb://'."
            );
        }

        // 3. Validate database name
        if (!normalized.contains("/" + REQUIRED_DATABASE_NAME)) {
            throw new IllegalStateException(String.format(
                    "CRITICAL CONFIGURATION ERROR: Invalid MongoDB database name. " +
                    "The application must connect to the authoritative '%s' database. " +
                    "Ensure the URI path specifies '/%s'.",
                    REQUIRED_DATABASE_NAME, REQUIRED_DATABASE_NAME
            ));
        }

        logger.info("MongoDB Atlas connection configuration verified successfully (Atlas-only architecture, database: {}).",
                REQUIRED_DATABASE_NAME);
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }
}
