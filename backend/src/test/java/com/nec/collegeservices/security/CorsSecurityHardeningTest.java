package com.nec.collegeservices.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CorsSecurityHardeningTest {

    private SecurityConfig securityConfig;
    private MockEnvironment mockEnvironment;

    @BeforeEach
    void setUp() {
        securityConfig = new SecurityConfig();
        mockEnvironment = new MockEnvironment();
        securityConfig.setEnvironment(mockEnvironment);
    }

    @Test
    @DisplayName("Production: Verified origins include Vercel and Capacitor, but reject localhost dev ports")
    void testProductionOrigins_strictAllowlist() {
        mockEnvironment.setActiveProfiles("prod");

        assertTrue(securityConfig.isProductionEnvironment());
        List<String> origins = securityConfig.resolveAllowedOrigins();

        // Approved production web origin
        assertTrue(origins.contains("https://college-service-management.vercel.app"));

        // Approved Capacitor Android origins (androidScheme: https)
        assertTrue(origins.contains("https://localhost"));
        assertTrue(origins.contains("capacitor://localhost"));
        assertTrue(origins.contains("http://localhost"));

        // Local development origins MUST NOT be in production allowlist
        assertFalse(origins.contains("http://localhost:5173"));
        assertFalse(origins.contains("http://localhost:3000"));
        assertFalse(origins.contains("http://127.0.0.1:5173"));

        // No wildcard pattern
        assertFalse(origins.contains("*"));
    }

    @Test
    @DisplayName("Local Development: Allows localhost:5173 and localhost:3000")
    void testLocalDevelopmentOrigins() {
        // Non-production environment
        assertFalse(securityConfig.isProductionEnvironment());
        List<String> origins = securityConfig.resolveAllowedOrigins();

        assertTrue(origins.contains("http://localhost:5173"));
        assertTrue(origins.contains("http://localhost:3000"));
        assertTrue(origins.contains("http://127.0.0.1:5173"));
        assertTrue(origins.contains("http://127.0.0.1:3000"));

        // Capacitor origins also available locally for testing
        assertTrue(origins.contains("https://localhost"));
        assertTrue(origins.contains("capacitor://localhost"));
    }

    @Test
    @DisplayName("Custom Override: app.cors.allowed-origins property overrides defaults")
    void testCustomOriginsOverride() {
        mockEnvironment.setProperty("app.cors.allowed-origins", "https://custom.nec.edu.in, https://portal.nec.edu.in");

        List<String> origins = securityConfig.resolveAllowedOrigins();
        assertEquals(2, origins.size());
        assertTrue(origins.contains("https://custom.nec.edu.in"));
        assertTrue(origins.contains("https://portal.nec.edu.in"));
    }

    @Test
    @DisplayName("Production CORS Source: Rejects unapproved arbitrary origin")
    void testProductionCorsSource_rejectsArbitraryOrigin() {
        mockEnvironment.setActiveProfiles("prod");
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/requests/my");
        request.addHeader("Origin", "https://malicious-attacker.com");

        CorsConfiguration config = source.getCorsConfiguration(request);
        assertNotNull(config);

        // checkOrigin returns null when origin is rejected
        String allowed = config.checkOrigin("https://malicious-attacker.com");
        assertNull(allowed, "Arbitrary origin must be rejected by CORS policy");
    }

    @Test
    @DisplayName("Production CORS Source: Rejects local dev origin under production profile")
    void testProductionCorsSource_rejectsLocalOrigin() {
        mockEnvironment.setActiveProfiles("prod");
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/requests/my");
        request.addHeader("Origin", "http://localhost:5173");

        CorsConfiguration config = source.getCorsConfiguration(request);
        assertNotNull(config);

        String allowed = config.checkOrigin("http://localhost:5173");
        assertNull(allowed, "Local development origin must be rejected under production configuration");
    }

    @Test
    @DisplayName("Production CORS Source: Accepts approved Vercel and Capacitor origins")
    void testProductionCorsSource_acceptsApprovedOrigins() {
        mockEnvironment.setActiveProfiles("prod");
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/requests/my");
        CorsConfiguration config = source.getCorsConfiguration(request);
        assertNotNull(config);

        assertEquals("https://college-service-management.vercel.app",
                config.checkOrigin("https://college-service-management.vercel.app"));
        assertEquals("https://localhost",
                config.checkOrigin("https://localhost"));
        assertEquals("capacitor://localhost",
                config.checkOrigin("capacitor://localhost"));
        assertEquals("http://localhost",
                config.checkOrigin("http://localhost"));
    }

    @Test
    @DisplayName("Local CORS Source: Accepts local dev port 5173")
    void testLocalCorsSource_acceptsLocalDev() {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/me");
        CorsConfiguration config = source.getCorsConfiguration(request);
        assertNotNull(config);

        assertEquals("http://localhost:5173", config.checkOrigin("http://localhost:5173"));
        assertEquals("http://localhost:3000", config.checkOrigin("http://localhost:3000"));
    }

    @Test
    @DisplayName("CORS Policy: Methods, Headers, Exposed Headers, MaxAge and Credentials preserved")
    void testCorsPolicyIntegrity() {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/auth/login");
        CorsConfiguration config = source.getCorsConfiguration(request);
        assertNotNull(config);

        // Required HTTP methods
        assertTrue(config.getAllowedMethods().containsAll(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")));

        // Required headers
        assertTrue(config.getAllowedHeaders().contains("Authorization"));
        assertTrue(config.getAllowedHeaders().contains("Content-Type"));

        // Exposed headers for JWT & file download
        assertTrue(config.getExposedHeaders().contains("Authorization"));
        assertTrue(config.getExposedHeaders().contains("Content-Disposition"));

        // Credentials & Preflight cache
        assertTrue(config.getAllowCredentials());
        assertEquals(3600L, config.getMaxAge());
    }
}

