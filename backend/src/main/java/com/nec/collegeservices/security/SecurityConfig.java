package com.nec.collegeservices.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    @Autowired
    private CustomAccessDeniedHandler accessDeniedHandler;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

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
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
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

                // Seminar Module: Accessible by CREATOR, AO_ADMIN, SEMINAR_ADMIN, SEMINAR_COORDINATOR, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/seminar/requests/*/approve", "/api/seminar/requests/*/reject",
                                 "/api/seminar/requests/*/cancel/approve", "/api/seminar/requests/*/cancel/reject",
                                 "/api/seminar/requests/*/approve-cancellation", "/api/seminar/requests/*/reject-cancellation",
                                 "/api/seminar/requests/*/reschedule/approve", "/api/seminar/requests/*/reschedule/reject",
                                 "/api/seminar/requests/*/approve-reschedule", "/api/seminar/requests/*/reject-reschedule")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN", "SEMINAR_COORDINATOR")
                .requestMatchers("/api/seminar/halls/*/status")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN", "SEMINAR_COORDINATOR")
                .requestMatchers("/api/seminar/halls/*/coordinators", "/api/seminar/test-fixture/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN")
                .requestMatchers("/api/seminar/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "SEMINAR_ADMIN", "SEMINAR_COORDINATOR", "DEPARTMENT_USER", "DEPARTMENT_HOD")

                // Accommodation Module: Accessible by CREATOR, AO_ADMIN, ACCOMMODATION_ADMIN, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/accommodation/requests/*/approve", "/api/accommodation/requests/*/reject",
                                 "/api/accommodation/requests/*/cancel/approve", "/api/accommodation/requests/*/cancel/reject",
                                 "/api/accommodation/requests/*/approve-cancellation", "/api/accommodation/requests/*/reject-cancellation",
                                 "/api/accommodation/requests/*/reschedule/approve", "/api/accommodation/requests/*/reschedule/reject",
                                 "/api/accommodation/requests/*/approve-reschedule", "/api/accommodation/requests/*/reject-reschedule",
                                 "/api/accommodation/rooms/*/status", "/api/accommodation/test-fixture/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "ACCOMMODATION_ADMIN")
                .requestMatchers("/api/accommodation/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "ACCOMMODATION_ADMIN", "DEPARTMENT_USER", "DEPARTMENT_HOD")

                // Transport Module: Accessible by CREATOR, AO_ADMIN, TRANSPORT_ADMIN, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/transport/requests/*/approve", "/api/transport/requests/*/reject", "/api/transport/vehicles/add")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "TRANSPORT_ADMIN")
                .requestMatchers("/api/transport/**")
                    .hasAnyRole("CREATOR", "AO_ADMIN", "TRANSPORT_ADMIN", "DEPARTMENT_USER", "DEPARTMENT_HOD")

                // Stationery Module: Accessible by CREATOR, AO_ADMIN, STATIONERY_ADMIN, and DEPARTMENT_USER / DEPARTMENT_HOD
                .requestMatchers("/api/stationery/requests/*/approve", "/api/stationery/requests/*/reject", "/api/stationery/requests/*/review", "/api/stationery/requests/*/ready", "/api/stationery/requests/*/collect", "/api/stationery/requests/*/status", "/api/stationery/items/add")
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
