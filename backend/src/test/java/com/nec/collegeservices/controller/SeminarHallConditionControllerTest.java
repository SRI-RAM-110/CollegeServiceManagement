package com.nec.collegeservices.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.model.SeminarHall;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.security.*;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.SeminarService;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = SeminarController.class,
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
class SeminarHallConditionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SeminarService seminarService;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean(name = "mongoMappingContext")
    private MongoMappingContext mongoMappingContext;

    @Test
    @DisplayName("Coordinator can call PUT /api/seminar/halls/{hallId}/condition for assigned hall")
    @WithMockUser(username = "COORD01", roles = {"SEMINAR_COORDINATOR"})
    void testCoordinatorUpdateCondition_AssignedHall_Success() throws Exception {
        User coordinator = User.builder()
                .userId("COORD01")
                .role("SEMINAR_COORDINATOR")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-1"))
                .build();

        when(authService.getCurrentUser()).thenReturn(coordinator);

        SeminarHall updatedHall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .status("Under Maintenance")
                .active(false)
                .build();

        when(seminarService.updateHallCondition(eq("SH-1"), eq("Under Maintenance"), eq(false), any(User.class)))
                .thenReturn(updatedHall);

        Map<String, Object> payload = Map.of(
                "status", "Under Maintenance",
                "active", false
        );

        mockMvc.perform(put("/api/seminar/halls/SH-1/condition")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("Under Maintenance"))
                .andExpect(jsonPath("$.data.active").value(false));
    }

    @Test
    @DisplayName("Coordinator calling PUT /api/seminar/halls/{hallId}/condition for unassigned hall returns 403 Forbidden")
    @WithMockUser(username = "COORD01", roles = {"SEMINAR_COORDINATOR"})
    void testCoordinatorUpdateCondition_UnassignedHall_Forbidden() throws Exception {
        User coordinator = User.builder()
                .userId("COORD01")
                .role("SEMINAR_COORDINATOR")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-1"))
                .build();

        when(authService.getCurrentUser()).thenReturn(coordinator);

        when(seminarService.updateHallCondition(eq("SH-2"), any(), any(), any(User.class)))
                .thenThrow(new AccessDeniedException("Unauthorized: Coordinator COORD01 is not assigned to seminar hall SH-2."));

        Map<String, Object> payload = Map.of(
                "status", "Under Maintenance",
                "active", false
        );

        mockMvc.perform(put("/api/seminar/halls/SH-2/condition")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Department user without coordinator or admin role is rejected by Spring Security (403 Forbidden)")
    @WithMockUser(username = "FAC01", roles = {"DEPARTMENT_USER"})
    void testDepartmentUser_UpdateCondition_Forbidden() throws Exception {
        Map<String, Object> payload = Map.of(
                "status", "Under Maintenance",
                "active", false
        );

        mockMvc.perform(put("/api/seminar/halls/SH-1/condition")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated caller receives 401 Unauthorized")
    void testUnauthenticated_UpdateCondition_Unauthorized() throws Exception {
        Map<String, Object> payload = Map.of(
                "status", "Under Maintenance",
                "active", false
        );

        mockMvc.perform(put("/api/seminar/halls/SH-1/condition")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Legacy PUT /api/seminar/halls/{hallId}/status route functions for coordinators and admins")
    @WithMockUser(username = "COORD01", roles = {"SEMINAR_COORDINATOR"})
    void testLegacyStatusRoute_Success() throws Exception {
        User coordinator = User.builder()
                .userId("COORD01")
                .role("SEMINAR_COORDINATOR")
                .roles(List.of("SEMINAR_COORDINATOR"))
                .assignedHallIds(List.of("SH-1"))
                .build();

        when(authService.getCurrentUser()).thenReturn(coordinator);

        SeminarHall updatedHall = SeminarHall.builder()
                .hallId("SH-1")
                .name("Seminar Hall 1")
                .status("Reserved")
                .active(true)
                .build();

        when(seminarService.updateHallCondition(eq("SH-1"), eq("Reserved"), isNull(), any(User.class)))
                .thenReturn(updatedHall);

        Map<String, Object> payload = Map.of("status", "Reserved");

        mockMvc.perform(put("/api/seminar/halls/SH-1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("Reserved"));
    }
}

