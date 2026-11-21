package com.nec.collegeservices.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.dto.TestEmailAttachmentRequestDTO;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.AccommodationRequestRepository;
import com.nec.collegeservices.repository.EmailLogRepository;
import com.nec.collegeservices.repository.SeminarBookingRepository;
import com.nec.collegeservices.repository.UserRepository;
import com.nec.collegeservices.security.*;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = AdminEmailTestController.class,
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
@TestPropertySource(properties = {
        "app.mail.test-attachment.enabled=true",
        "app.mail.test-attachment.recipient=collegeservice2026@gmail.com"
})
class AdminEmailTestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AdminEmailTestController adminEmailTestController;

    @MockBean
    private EmailService emailService;

    @MockBean
    private EmailLogRepository emailLogRepository;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean(name = "mongoMappingContext")
    private MongoMappingContext mongoMappingContext;

    // Database repositories to prove zero database business records are created or altered
    @MockBean
    private UserRepository userRepository;

    @MockBean
    private SeminarBookingRepository seminarBookingRepository;

    @MockBean
    private AccommodationRequestRepository accommodationRequestRepository;

    private User aoUser;

    @BeforeEach
    void setUp() {
        adminEmailTestController.resetDispatchGuard();

        aoUser = User.builder()
                .userId("ao")
                .name("Mr. I. Sridhar")
                .email("ao@nrtec.in")
                .role("AO_ADMIN")
                .roles(List.of("AO_ADMIN"))
                .department("ADMIN")
                .build();

        when(authService.getCurrentUser()).thenReturn(aoUser);

        when(emailService.buildDeduplicationKey(anyString(), anyString(), anyString()))
                .thenReturn("PROD-ATTACHMENT-TEST-SINGLETON:INSPECTION_REPORT:collegeservice2026@gmail.com");

        when(emailLogRepository.existsByDeduplicationKeyAndStatusIn(anyString(), anyCollection()))
                .thenReturn(false);
    }

    @Test
    @DisplayName("Security: Unauthenticated request is rejected with HTTP 401 Unauthorized")
    void unauthenticatedRequest_isRejectedWith401() throws Exception {
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        verify(emailService, never()).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Security: Non-AO_ADMIN user (DEPARTMENT_USER) is rejected with HTTP 403 Forbidden")
    @WithMockUser(username = "USER001", roles = {"DEPARTMENT_USER"})
    void departmentUser_isRejectedWith403() throws Exception {
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verify(emailService, never()).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Security: Non-AO_ADMIN user (ELECTRICIAN) is rejected with HTTP 403 Forbidden")
    @WithMockUser(username = "ELEC001", roles = {"ELECTRICIAN"})
    void electricianUser_isRejectedWith403() throws Exception {
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verify(emailService, never()).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Feature Flag: When disabled, request is rejected with HTTP 403 Forbidden")
    void disabledFeatureFlag_isRejectedWith403() {
        AdminEmailTestController disabledController = new AdminEmailTestController(
                emailService,
                emailLogRepository,
                authService,
                false, // disabled
                "collegeservice2026@gmail.com"
        );

        ResponseEntity<ApiResponse<Map<String, Object>>> response =
                disabledController.dispatchTestAttachment(null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertTrue(response.getBody().getMessage().contains("disabled in server configuration"));

        verify(emailService, never()).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Recipient Validation: Arbitrary recipient in payload is rejected with HTTP 400 Bad Request")
    @WithMockUser(username = "ao", roles = {"AO_ADMIN"})
    void arbitraryRecipient_isRejectedWith400() throws Exception {
        TestEmailAttachmentRequestDTO dto = TestEmailAttachmentRequestDTO.builder()
                .recipient("attacker@evil.com")
                .notes("Testing bypass")
                .build();

        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Arbitrary recipients are rejected")));

        verify(emailService, never()).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Happy Path: AO_ADMIN dispatches test attachment successfully to allowlisted recipient with singleton reference ID")
    @WithMockUser(username = "ao", roles = {"AO_ADMIN"})
    void aoAdmin_dispatchesTestAttachment_success() throws Exception {
        when(emailService.sendEmailWithAttachment(
                eq("collegeservice2026@gmail.com"),
                eq(List.of()),
                contains("[PRODUCTION TEST]"),
                contains("Narasaraopeta Engineering College"),
                contains("Production PDF Attachment Relay Verification"),
                eq("NEC_Render_PDF_Test.pdf"),
                any(byte[].class),
                eq("PROD-ATTACHMENT-TEST-SINGLETON")
        )).thenReturn(true);

        TestEmailAttachmentRequestDTO dto = TestEmailAttachmentRequestDTO.builder()
                .recipient("collegeservice2026@gmail.com")
                .build();

        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Test email attachment dispatched successfully"))
                .andExpect(jsonPath("$.data.status").value("DISPATCHED"))
                .andExpect(jsonPath("$.data.recipient").value("collegeservice2026@gmail.com"))
                .andExpect(jsonPath("$.data.attachmentFilename").value("NEC_Render_PDF_Test.pdf"))
                .andExpect(jsonPath("$.data.referenceId").value("PROD-ATTACHMENT-TEST-SINGLETON"))
                .andExpect(jsonPath("$.data.attachmentSizeBytes").isNumber());

        // Verify PDF bytes structure
        ArgumentCaptor<byte[]> bytesCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(emailService, times(1)).sendEmailWithAttachment(
                eq("collegeservice2026@gmail.com"),
                eq(List.of()),
                anyString(),
                anyString(),
                anyString(),
                eq("NEC_Render_PDF_Test.pdf"),
                bytesCaptor.capture(),
                eq("PROD-ATTACHMENT-TEST-SINGLETON")
        );

        byte[] capturedBytes = bytesCaptor.getValue();
        assertNotNull(capturedBytes);
        assertTrue(capturedBytes.length > 500, "PDF should be non-trivial size");
        // Verify %PDF- magic bytes
        assertEquals('%', (char) capturedBytes[0]);
        assertEquals('P', (char) capturedBytes[1]);
        assertEquals('D', (char) capturedBytes[2]);
        assertEquals('F', (char) capturedBytes[3]);
        assertEquals('-', (char) capturedBytes[4]);

        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Persistent Deduplication: Existing claim in MongoDB email_logs blocks dispatch with HTTP 409 Conflict")
    @WithMockUser(username = "ao", roles = {"AO_ADMIN"})
    void existingEmailLogClaim_blocksDispatchWith409() throws Exception {
        when(emailLogRepository.existsByDeduplicationKeyAndStatusIn(
                eq("PROD-ATTACHMENT-TEST-SINGLETON:INSPECTION_REPORT:collegeservice2026@gmail.com"),
                anyCollection()
        )).thenReturn(true);

        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("existing dispatched or ambiguous outcome recorded in production email logs")));

        verify(emailService, never()).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("In-Memory Idempotency Guard: Duplicate dispatch calls in same process lifecycle are rejected with HTTP 409 Conflict")
    @WithMockUser(username = "ao", roles = {"AO_ADMIN"})
    void duplicateDispatch_isRejectedWith409() throws Exception {
        when(emailService.sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        )).thenReturn(true);

        // 1st Call -> 200 OK
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2nd Call -> 409 Conflict (Duplicate blocked)
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already been dispatched")));

        // Verify emailService was invoked strictly ONCE
        verify(emailService, times(1)).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Ambiguous Outcome Safety: Timeout or Exception preserves the claim and DOES NOT reset the guard")
    @WithMockUser(username = "ao", roles = {"AO_ADMIN"})
    void timeoutException_preservesClaim_doesNotResetGuard() throws Exception {
        when(emailService.sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        )).thenThrow(new RuntimeException("Apps Script relay request timed out after 30000ms"));

        // 1st Call -> 500 Internal Server Error (Ambiguous)
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("ambiguous exception")));

        // Verify guard remains locked!
        assertTrue(adminEmailTestController.isAlreadyDispatched(), "In-memory guard must remain locked after ambiguous exception");

        // 2nd Call -> 409 Conflict (Retry blocked!)
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already been dispatched or initiated")));

        // Verify EmailService was called only once despite client attempt
        verify(emailService, times(1)).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Provider Non-Acceptance Safety: When EmailService reports failure, guard remains locked to prevent automated retry loops")
    @WithMockUser(username = "ao", roles = {"AO_ADMIN"})
    void providerFailure_preservesClaim_doesNotResetGuard() throws Exception {
        when(emailService.sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        )).thenReturn(false);

        // 1st Call -> 500 Internal Server Error
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("failed or was rejected")));

        // Verify guard remains locked!
        assertTrue(adminEmailTestController.isAlreadyDispatched(), "In-memory guard must remain locked");

        // Subsequent Call -> 409 Conflict
        mockMvc.perform(post("/api/admin/email/test-attachment")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());

        verify(emailService, times(1)).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Regression Test: Ambiguous timeout followed by container restart (new instance) remains permanently blocked in MongoDB with HTTP 409")
    void ambiguousTimeout_followedByNewInstanceRestart_remainsPermanentlyBlocked() {
        // Step 1: Simulate existing ambiguous timeout log in MongoDB from previous instance
        String dedupKey = "PROD-ATTACHMENT-TEST-SINGLETON:INSPECTION_REPORT:collegeservice2026@gmail.com";
        when(emailLogRepository.existsByDeduplicationKeyAndStatusIn(eq(dedupKey), anyCollection()))
                .thenReturn(false); // Not sent/accepted

        com.nec.collegeservices.model.EmailLog timeoutLog = com.nec.collegeservices.model.EmailLog.builder()
                .referenceId("PROD-ATTACHMENT-TEST-SINGLETON")
                .deduplicationKey(dedupKey)
                .status(com.nec.collegeservices.model.EmailLog.STATUS_FAILED)
                .errorMessage("Apps Script request timed out: Apps Script relay request timed out after 30000ms")
                .build();

        when(emailLogRepository.findFirstByDeduplicationKeyAndStatus(eq(dedupKey), eq(com.nec.collegeservices.model.EmailLog.STATUS_FAILED)))
                .thenReturn(java.util.Optional.of(timeoutLog));

        // Step 2: Create a completely new controller instance (simulating container restart with fresh in-memory state)
        AdminEmailTestController freshInstanceAfterRestart = new AdminEmailTestController(
                emailService,
                emailLogRepository,
                authService,
                true, // enabled
                "collegeservice2026@gmail.com"
        );

        assertFalse(freshInstanceAfterRestart.isAlreadyDispatched(), "New instance starts with fresh in-memory guard");

        // Step 3: Call endpoint on the fresh instance
        ResponseEntity<ApiResponse<Map<String, Object>>> response =
                freshInstanceAfterRestart.dispatchTestAttachment(null);

        // Step 4: Verify blocked with HTTP 409 Conflict due to persistent timeout log
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertTrue(response.getBody().getMessage().contains("existing dispatched or ambiguous outcome recorded in production email logs"));

        // Step 5: Verify EmailService.sendEmailWithAttachment was NEVER invoked
        verify(emailService, never()).sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    @Test
    @DisplayName("Conclusive Failure Safety: Pre-dispatch failure (e.g. invalid format) does not block a corrected attempt on new instance")
    void conclusiveFailureBeforeDispatch_doesNotBlockCorrectedAttemptOnNewInstance() {
        String dedupKey = "PROD-ATTACHMENT-TEST-SINGLETON:INSPECTION_REPORT:collegeservice2026@gmail.com";
        when(emailLogRepository.existsByDeduplicationKeyAndStatusIn(eq(dedupKey), anyCollection()))
                .thenReturn(false);

        // Conclusive failure before dispatch (e.g. attachment size or format error, not a timeout)
        com.nec.collegeservices.model.EmailLog nonTimeoutFailure = com.nec.collegeservices.model.EmailLog.builder()
                .referenceId("PROD-ATTACHMENT-TEST-SINGLETON")
                .deduplicationKey(dedupKey)
                .status(com.nec.collegeservices.model.EmailLog.STATUS_FAILED)
                .errorMessage("Invalid attachment format: File does not contain a valid PDF magic header (%PDF-)")
                .build();

        when(emailLogRepository.findFirstByDeduplicationKeyAndStatus(eq(dedupKey), eq(com.nec.collegeservices.model.EmailLog.STATUS_FAILED)))
                .thenReturn(java.util.Optional.of(nonTimeoutFailure));

        when(emailService.sendEmailWithAttachment(
                anyString(), anyList(), anyString(), anyString(), anyString(), anyString(), any(), anyString()
        )).thenReturn(true);

        // Fresh instance after restart
        AdminEmailTestController freshInstance = new AdminEmailTestController(
                emailService,
                emailLogRepository,
                authService,
                true,
                "collegeservice2026@gmail.com"
        );

        ResponseEntity<ApiResponse<Map<String, Object>>> response =
                freshInstance.dispatchTestAttachment(null);

        // Corrected attempt succeeds because previous failure was conclusive before provider dispatch
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());

        verify(emailService, times(1)).sendEmailWithAttachment(
                eq("collegeservice2026@gmail.com"), anyList(), anyString(), anyString(), anyString(), anyString(), any(), eq("PROD-ATTACHMENT-TEST-SINGLETON")
        );
        verifyZeroDatabaseBusinessInteractions();
    }

    private void verifyZeroDatabaseBusinessInteractions() {
        verifyNoInteractions(userRepository);
        verifyNoInteractions(seminarBookingRepository);
        verifyNoInteractions(accommodationRequestRepository);
    }
}
