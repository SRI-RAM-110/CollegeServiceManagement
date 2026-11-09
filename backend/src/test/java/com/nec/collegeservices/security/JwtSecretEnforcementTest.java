package com.nec.collegeservices.security;

import com.nec.collegeservices.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

class JwtSecretEnforcementTest {

    private JwtUtils jwtUtils;
    private MockEnvironment mockEnvironment;

    private static final String STRONG_TEST_SECRET = "this_is_a_sufficiently_strong_production_test_secret_key_32_bytes_plus";

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        mockEnvironment = new MockEnvironment();
        jwtUtils.setEnvironment(mockEnvironment);
        jwtUtils.setJwtExpirationMs(3600000);
    }

    private CustomUserDetails createTestUserDetails() {
        User user = User.builder()
                .userId("TEST001")
                .email("test@nrtec.in")
                .role("DEPARTMENT_USER")
                .department("CSE")
                .name("Test Faculty")
                .build();
        return new CustomUserDetails(user);
    }

    @Test
    @DisplayName("Production: Missing secret throws IllegalStateException")
    void testMissingSecretInProduction_failsStartup() {
        mockEnvironment.setActiveProfiles("prod");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                jwtUtils.validateAndResolveSecret(null, true)
        );
        assertTrue(ex.getMessage().contains("Production JWT secret is missing or blank"));
    }

    @Test
    @DisplayName("Production: Blank whitespace secret throws IllegalStateException")
    void testBlankSecretInProduction_failsStartup() {
        mockEnvironment.setActiveProfiles("production");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                jwtUtils.validateAndResolveSecret("   ", true)
        );
        assertTrue(ex.getMessage().contains("Production JWT secret is missing or blank"));
    }

    @Test
    @DisplayName("Production: Hardcoded default repository secret is rejected")
    void testDefaultRepositorySecretInProduction_failsStartup() {
        mockEnvironment.setActiveProfiles("prod");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                jwtUtils.validateAndResolveSecret(JwtUtils.DEFAULT_DEV_SECRET, true)
        );
        assertTrue(ex.getMessage().contains("cannot use the default hardcoded repository JWT secret"));
    }

    @Test
    @DisplayName("Production: Secret shorter than 32 bytes (256 bits) throws IllegalStateException")
    void testShortSecretInProduction_failsStartup() {
        mockEnvironment.setActiveProfiles("prod");
        String shortSecret = "too_short_key_16b";

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                jwtUtils.validateAndResolveSecret(shortSecret, true)
        );
        assertTrue(ex.getMessage().contains("must be at least 32 bytes (256 bits)"));
    }

    @Test
    @DisplayName("Production: Insecure placeholder keywords are rejected")
    void testInsecurePlaceholderInProduction_failsStartup() {
        mockEnvironment.setActiveProfiles("prod");

        for (String placeholder : new String[]{"secret", "password", "changeme", "12345678", "jwt_secret"}) {
            IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                    jwtUtils.validateAndResolveSecret(placeholder, true)
            );
            assertTrue(ex.getMessage().contains("known insecure placeholder") || ex.getMessage().contains("at least 32 bytes"));
        }
    }

    @Test
    @DisplayName("Production: Valid strong secret succeeds and token lifecycle works")
    void testValidProductionSecret_succeeds() {
        mockEnvironment.setActiveProfiles("prod");

        String resolved = jwtUtils.validateAndResolveSecret(STRONG_TEST_SECRET, true);
        assertEquals(STRONG_TEST_SECRET, resolved);

        jwtUtils.setJwtSecret(STRONG_TEST_SECRET);
        CustomUserDetails userDetails = createTestUserDetails();

        String token = jwtUtils.generateJwtToken(userDetails);
        assertNotNull(token);
        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals("TEST001", jwtUtils.getUserIdFromJwtToken(token));
    }

    @Test
    @DisplayName("Local Development: Default repository secret is allowed")
    void testLocalDevelopmentWithDefaultSecret_succeeds() {
        // Non-production environment (no prod profiles, no cloud flags)
        String resolved = jwtUtils.validateAndResolveSecret(JwtUtils.DEFAULT_DEV_SECRET, false);
        assertEquals(JwtUtils.DEFAULT_DEV_SECRET, resolved);

        jwtUtils.setJwtSecret(resolved);
        CustomUserDetails userDetails = createTestUserDetails();

        String token = jwtUtils.generateJwtToken(userDetails);
        assertNotNull(token);
        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals("TEST001", jwtUtils.getUserIdFromJwtToken(token));
    }

    @Test
    @DisplayName("Local Development: Missing secret gracefully falls back to default dev secret")
    void testLocalDevelopmentWithBlankSecret_fallsBackToDefault() {
        String resolvedNull = jwtUtils.validateAndResolveSecret(null, false);
        assertEquals(JwtUtils.DEFAULT_DEV_SECRET, resolvedNull);

        String resolvedBlank = jwtUtils.validateAndResolveSecret("", false);
        assertEquals(JwtUtils.DEFAULT_DEV_SECRET, resolvedBlank);
    }

    @Test
    @DisplayName("Environment Detection: Correctly identifies production triggers")
    void testProductionEnvironmentTriggers() {
        // 1. Profile 'prod'
        MockEnvironment env1 = new MockEnvironment();
        env1.setActiveProfiles("prod");
        jwtUtils.setEnvironment(env1);
        assertTrue(jwtUtils.isProductionEnvironment());

        // 2. Profile 'production'
        MockEnvironment env2 = new MockEnvironment();
        env2.setActiveProfiles("production");
        jwtUtils.setEnvironment(env2);
        assertTrue(jwtUtils.isProductionEnvironment());

        // 3. Render cloud marker
        MockEnvironment env3 = new MockEnvironment();
        env3.setProperty("RENDER", "true");
        jwtUtils.setEnvironment(env3);
        assertTrue(jwtUtils.isProductionEnvironment());

        // 4. Render apps-script mail provider
        MockEnvironment env4 = new MockEnvironment();
        env4.setProperty("app.mail.provider", "apps-script");
        jwtUtils.setEnvironment(env4);
        assertTrue(jwtUtils.isProductionEnvironment());

        // 5. Vercel production frontend URL
        MockEnvironment env5 = new MockEnvironment();
        env5.setProperty("app.frontend.url", "https://college-service-management.vercel.app");
        jwtUtils.setEnvironment(env5);
        assertTrue(jwtUtils.isProductionEnvironment());

        // 6. MongoDB Atlas cloud URI
        MockEnvironment env6 = new MockEnvironment();
        env6.setProperty("spring.data.mongodb.uri", "mongodb+srv://admin:pass@cluster0.mongodb.net/collegeservices_db");
        jwtUtils.setEnvironment(env6);
        assertTrue(jwtUtils.isProductionEnvironment());

        // 7. Explicit property override
        MockEnvironment env7 = new MockEnvironment();
        env7.setProperty("app.jwt.production", "true");
        jwtUtils.setEnvironment(env7);
        assertTrue(jwtUtils.isProductionEnvironment());

        // 8. Standard local dev environment (no markers)
        MockEnvironment envDev = new MockEnvironment();
        envDev.setProperty("app.frontend.url", "http://localhost:5173");
        envDev.setProperty("app.mail.provider", "local");
        envDev.setProperty("spring.data.mongodb.uri", "mongodb://127.0.0.1:27017/collegeservices_db");
        jwtUtils.setEnvironment(envDev);
        assertFalse(jwtUtils.isProductionEnvironment());
    }

    @Test
    @DisplayName("Init Lifecycle: validateConfiguration rejects startup in production with default secret")
    void testInitLifecycle_failsWhenProductionHasDefaultSecret() {
        mockEnvironment.setActiveProfiles("prod");
        jwtUtils.setJwtSecret(JwtUtils.DEFAULT_DEV_SECRET);

        assertThrows(IllegalStateException.class, () -> jwtUtils.validateConfiguration());
    }

    @Test
    @DisplayName("Init Lifecycle: validateConfiguration succeeds in production with strong secret")
    void testInitLifecycle_succeedsWhenProductionHasStrongSecret() {
        mockEnvironment.setActiveProfiles("prod");
        jwtUtils.setJwtSecret(STRONG_TEST_SECRET);

        assertDoesNotThrow(() -> jwtUtils.validateConfiguration());
        assertEquals(STRONG_TEST_SECRET, jwtUtils.getJwtSecret());
    }
}

