package com.nec.collegeservices.controller;

import com.nec.collegeservices.security.AuthEntryPointJwt;
import com.nec.collegeservices.security.CustomAccessDeniedHandler;
import com.nec.collegeservices.security.CustomUserDetailsService;
import com.nec.collegeservices.security.JwtAuthenticationFilter;
import com.nec.collegeservices.security.JwtUtils;
import com.nec.collegeservices.security.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = HealthController.class,
        excludeAutoConfiguration = {
                MongoAutoConfiguration.class,
                MongoDataAutoConfiguration.class
        }
)
@Import({
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        AuthEntryPointJwt.class,
        CustomAccessDeniedHandler.class
})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean(name = "mongoMappingContext")
    private MongoMappingContext mongoMappingContext;

    @Test
    @DisplayName("GET /api/health returns HTTP 200 without authentication and exposes status UP")
    void getHealth_returns200WithoutAuth() throws Exception {
        mockMvc.perform(get("/api/health").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("College Services Backend"))
                .andExpect(content().string(not(containsString("mongodb"))))
                .andExpect(content().string(not(containsString("secret"))))
                .andExpect(content().string(not(containsString("password"))));
    }

    @Test
    @DisplayName("HEAD /api/health returns HTTP 200 without authentication for external probes")
    void headHealth_returns200WithoutAuth() throws Exception {
        mockMvc.perform(head("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Existing protected endpoints remain protected (401 Unauthorized without JWT)")
    void protectedEndpoints_remainProtectedWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/requests/my"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/seminar/halls/all"))
                .andExpect(status().isUnauthorized());
    }
}

