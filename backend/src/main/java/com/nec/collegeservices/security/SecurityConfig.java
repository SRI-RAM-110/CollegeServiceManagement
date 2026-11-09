package com.nec.collegeservices.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    public static final List<String> PRODUCTION_ORIGINS = List.of(
            "https://college-service-management.vercel.app",
            "https://localhost",
            "capacitor://localhost",
            "http://localhost"
    );

    public static final List<String> LOCAL_ORIGINS = List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "https://localhost",
            "capacitor://localhost",
            "http://localhost"
    );

    @Autowired(required = false)
    private Environment environment;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    @Autowired
    private CustomAccessDeniedHandler accessDeniedHandler;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    public void setEnvironment(Environment environment) {
        this.environment = environment;
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
        if ("true".equalsIgnoreCase(environment.getProperty("app.cors.production"))
                || "true".equalsIgnoreCase(environment.getProperty("APP_CORS_PRODUCTION"))) {
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

    public List<String> resolveAllowedOrigins() {
        if (environment != null) {
            String custom = environment.getProperty("app.cors.allowed-origins");
            if (custom != null && !custom.trim().isEmpty()) {
                return Arrays.stream(custom.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();
            }
        }
        if (isProductionEnvironment()) {
            return PRODUCTION_ORIGINS;
        }
        return LOCAL_ORIGINS;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = resolveAllowedOrigins();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin",
                "Access-Control-Request-Method", "Access-Control-Request-Headers"
        ));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint(unauthorizedHandler)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/push/public-key").permitAll()
                .requestMatchers("/error").permitAll()

                // =========================================================================
                // Dynamic Resource Management (Strictly AO_ADMIN only)
                // =========================================================================
                .requestMatchers("/api/seminar/halls/all").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/seminar/halls").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/seminar/halls/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/seminar/halls/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/seminar/halls/*").hasRole("AO_ADMIN")
                .requestMatchers("/api/seminar/halls/*/status", "/api/seminar/halls/*/toggle-status", "/api/seminar/halls/*/coordinators", "/api/seminar/halls/*/cc-emails").hasRole("AO_ADMIN")

                .requestMatchers("/api/accommodation/rooms/all").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/accommodation/rooms").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/accommodation/rooms/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/accommodation/rooms/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/accommodation/rooms/*").hasRole("AO_ADMIN")
                .requestMatchers("/api/accommodation/rooms/*/status", "/api/accommodation/rooms/*/toggle-status").hasRole("AO_ADMIN")

                .requestMatchers("/api/transport/vehicles/all").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/transport/vehicles", "/api/transport/vehicles/add").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/transport/vehicles/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/transport/vehicles/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/transport/vehicles/*").hasRole("AO_ADMIN")
                .requestMatchers("/api/transport/vehicles/*/status", "/api/transport/vehicles/*/toggle-status").hasRole("AO_ADMIN")

                .requestMatchers("/api/stationery/items/all").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/stationery/items", "/api/stationery/items/add").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/stationery/items/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/stationery/items/*").hasRole("AO_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/stationery/items/*").hasRole("AO_ADMIN")
                .requestMatchers("/api/stationery/items/*/toggle-active", "/api/stationery/items/*/toggle-status").hasRole("AO_ADMIN")

                // =========================================================================
                // Module Operational Endpoints (Approvals, Requests, Checklists)
                // =========================================================================

                // Seminar Module: Accessible by CREATOR, AO_ADMIN, SEMINAR_ADMIN, SEMINAR_COORDINATOR, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/seminar/requests/*/approve", "/api/seminar/requests/*/reject",
                                 "/api/seminar/requests/*/cancel/approve", "/api/seminar/requests/*/cancel/reject",
                                 "/api/seminar/requests/*/approve-cancellation", "/api/seminar/requests/*/reject-cancellation",
                                 "/api/seminar/requests/*/reschedule/approve", "/api/seminar/requests/*/reschedule/reject",
                                 "/api/seminar/requests/*/approve-reschedule", "/api/seminar/requests/*/reject-reschedule")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN", "SEMINAR_COORDINATOR")
                .requestMatchers("/api/seminar/test-fixture/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN")
                .requestMatchers("/api/seminar/technician/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN", "SEMINAR_TECHNICIAN")
                .requestMatchers("/api/seminar/generator/**", "/api/seminar/electrician/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN", "GENERATOR_OPERATOR", "ELECTRICIAN")
                .requestMatchers("/api/seminar/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN", "SEMINAR_COORDINATOR", "DEPARTMENT_USER", "DEPARTMENT_HOD", "SEMINAR_TECHNICIAN")

                // Accommodation Module: Accessible by CREATOR, AO_ADMIN, ACCOMMODATION_ADMIN, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/accommodation/requests/*/approve", "/api/accommodation/requests/*/reject",
                                 "/api/accommodation/requests/*/cancel/approve", "/api/accommodation/requests/*/cancel/reject",
                                 "/api/accommodation/requests/*/approve-cancellation", "/api/accommodation/requests/*/reject-cancellation",
                                 "/api/accommodation/requests/*/reschedule/approve", "/api/accommodation/requests/*/reschedule/reject",
                                 "/api/accommodation/requests/*/approve-reschedule", "/api/accommodation/requests/*/reject-reschedule",
                                 "/api/accommodation/test-fixture/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "ACCOMMODATION_ADMIN")
                .requestMatchers("/api/accommodation/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "ACCOMMODATION_ADMIN", "DEPARTMENT_USER", "DEPARTMENT_HOD")

                // Transport Module: Accessible by CREATOR, AO_ADMIN, TRANSPORT_ADMIN, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/transport/requests/*/approve", "/api/transport/requests/*/reject")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "TRANSPORT_ADMIN")
                .requestMatchers("/api/transport/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "TRANSPORT_ADMIN", "DEPARTMENT_USER", "DEPARTMENT_HOD")

                // Stationery Module: Accessible by CREATOR, AO_ADMIN, STATIONERY_ADMIN, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/stationery/requests/*/approve", "/api/stationery/requests/*/reject", "/api/stationery/requests/*/review", "/api/stationery/requests/*/ready", "/api/stationery/requests/*/collect", "/api/stationery/requests/*/status")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "STATIONERY_ADMIN")
                .requestMatchers("/api/stationery/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "STATIONERY_ADMIN", "DEPARTMENT_USER", "DEPARTMENT_HOD")

                // Meals Module: Accessible by CREATOR, AO_ADMIN, MEALS_ADMIN, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/meals/requests/*")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "MEALS_ADMIN")
                .requestMatchers("/api/meals/requests/*/approve", "/api/meals/requests/*/reject")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "MEALS_ADMIN")
                .requestMatchers("/api/meals/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "MEALS_ADMIN", "DEPARTMENT_USER", "DEPARTMENT_HOD")

                // AO & Creator Super Admin specific endpoints
                .requestMatchers("/api/ao/**", "/api/admin/users/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN")

                // Electrical Issue Management: Accessible strictly by AO_ADMIN, SEMINAR_TECHNICIAN, ELECTRICIAN
                .requestMatchers("/api/electrical-issues/**")
                    .hasAnyRole("AO_ADMIN", "SEMINAR_TECHNICIAN", "ELECTRICIAN")

                // Reports & Analytics Module (authenticated, granular checks handled in service)
                .requestMatchers("/api/reports/**").authenticated()

                // General authenticated routes (e.g. /api/requests/my, /api/notifications/**, /api/dashboard)
                .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
