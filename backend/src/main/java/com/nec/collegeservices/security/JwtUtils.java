package com.nec.collegeservices.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    public static final String DEFAULT_DEV_SECRET = "nec_college_faculty_service_management_secure_jwt_token_secret_key_2026_xyz";
    public static final int MIN_SECRET_BYTES = 32; // 256 bits required for HMAC-SHA256 (HS256)

    private static final Set<String> INSECURE_PLACEHOLDERS = Set.of(
            "secret", "password", "12345678", "changeme", "change_this_secret", "jwt_secret", "default"
    );

    @Autowired(required = false)
    private Environment environment;

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private int jwtExpirationMs;

    @PostConstruct
    public void validateConfiguration() {
        boolean isProd = isProductionEnvironment();
        this.jwtSecret = validateAndResolveSecret(this.jwtSecret, isProd);
    }

    public boolean isProductionEnvironment() {
        if (environment == null) {
            return false;
        }
        for (String profile : environment.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        if ("true".equalsIgnoreCase(environment.getProperty("app.jwt.production"))
                || "true".equalsIgnoreCase(environment.getProperty("APP_JWT_PRODUCTION"))) {
            return true;
        }
        if ("true".equalsIgnoreCase(environment.getProperty("RENDER"))
                || environment.getProperty("RENDER_SERVICE_ID") != null
                || environment.getProperty("RENDER_INSTANCE_ID") != null) {
            return true;
        }
        String mailProvider = environment.getProperty("app.mail.provider");
        if ("apps-script".equalsIgnoreCase(mailProvider)) {
            return true;
        }
        String frontendUrl = environment.getProperty("app.frontend.url", "");
        if (frontendUrl.contains("vercel.app")) {
            return true;
        }
        String mongoUri = environment.getProperty("spring.data.mongodb.uri", "");
        if (mongoUri.contains("mongodb+srv://")) {
            return true;
        }
        return false;
    }

    public String validateAndResolveSecret(String secret, boolean isProd) {
        if (isProd) {
            if (secret == null || secret.trim().isEmpty()) {
                throw new IllegalStateException(
                        "CRITICAL CONFIGURATION ERROR: Production JWT secret is missing or blank. " +
                        "A strong, random 256-bit (32+ byte) JWT_SECRET must be configured in environment variables."
                );
            }
            String trimmed = secret.trim();
            if (DEFAULT_DEV_SECRET.equals(trimmed)) {
                throw new IllegalStateException(
                        "CRITICAL SECURITY VIOLATION: Production backend cannot use the default hardcoded repository JWT secret. " +
                        "You must configure an independent, cryptographically secure JWT_SECRET on the deployment platform."
                );
            }
            if (INSECURE_PLACEHOLDERS.contains(trimmed.toLowerCase())) {
                throw new IllegalStateException(
                        "CRITICAL SECURITY VIOLATION: Production JWT secret is a known insecure placeholder. " +
                        "Please configure a strong, cryptographically secure 256-bit+ JWT_SECRET."
                );
            }
            byte[] bytes = trimmed.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < MIN_SECRET_BYTES) {
                throw new IllegalStateException(String.format(
                        "CRITICAL SECURITY VIOLATION: Production JWT secret must be at least %d bytes (256 bits) for HS256 security. " +
                        "Configured secret length is %d bytes. Never use short passwords for HS256 keys.",
                        MIN_SECRET_BYTES, bytes.length
                ));
            }
            logger.info("Production JWT secret validated successfully (length: {} bytes, algorithm: HS256).", bytes.length);
            return trimmed;
        } else {
            // Non-production (local development / testing)
            if (secret == null || secret.trim().isEmpty()) {
                logger.warn("JWT secret is not configured for local development; falling back to default development secret.");
                return DEFAULT_DEV_SECRET;
            }
            String trimmed = secret.trim();
            if (DEFAULT_DEV_SECRET.equals(trimmed)) {
                logger.debug("Using default development JWT secret (non-production environment).");
            }
            return trimmed;
        }
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public void setJwtExpirationMs(int jwtExpirationMs) {
        this.jwtExpirationMs = jwtExpirationMs;
    }

    public String getJwtSecret() {
        return jwtSecret;
    }

    private Key getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < MIN_SECRET_BYTES) {
            // pad if needed for HMAC-SHA256 (local dev only fallback)
            byte[] padded = new byte[MIN_SECRET_BYTES];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            return Keys.hmacShaKeyFor(padded);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateJwtToken(CustomUserDetails userPrincipal) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userPrincipal.getUsername());
        claims.put("email", userPrincipal.getUser().getEmail());
        claims.put("role", userPrincipal.getUser().getRole());
        claims.put("department", userPrincipal.getUser().getDepartment());
        claims.put("name", userPrincipal.getUser().getName());

        return Jwts.builder()
                .claims(claims)
                .subject(userPrincipal.getUsername())
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String getUserIdFromJwtToken(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser()
                    .verifyWith((SecretKey) getSigningKey())
                    .build()
                    .parseSignedClaims(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
        }
        return false;
    }
}
