package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.model.DeviceToken;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.FcmService;
import com.nec.collegeservices.service.PushService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PushControllerFcmTest {

    @Mock
    private PushService pushService;

    @Mock
    private FcmService fcmService;

    @Mock
    private AuthService authService;

    @InjectMocks
    private PushController pushController;

    @Test
    @DisplayName("Device token registration binds to authenticated user principal only")
    void testRegisterDeviceToken_UsesAuthenticatedPrincipal() {
        User authenticatedUser = User.builder()
                .userId("csehod")
                .role("DEPARTMENT_HOD")
                .department("CSE")
                .build();
        when(authService.getCurrentUser()).thenReturn(authenticatedUser);

        DeviceToken created = DeviceToken.builder()
                .userId("csehod")
                .token("device_tok_abc")
                .platform("ANDROID")
                .build();
        when(fcmService.registerDeviceToken(eq("csehod"), eq("device_tok_abc"), eq("ANDROID"), eq("Galaxy S24")))
                .thenReturn(created);

        // Attempt by client to pass spoofed owner "super_admin"
        Map<String, String> payload = Map.of(
                "token", "device_tok_abc",
                "platform", "ANDROID",
                "deviceModel", "Galaxy S24",
                "userId", "super_admin"
        );

        ResponseEntity<ApiResponse<DeviceToken>> response = pushController.registerDeviceToken(payload);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("csehod", response.getBody().getData().getUserId());

        // Verify fcmService was called with the authenticated principal, NEVER "super_admin"
        verify(fcmService, times(1)).registerDeviceToken("csehod", "device_tok_abc", "ANDROID", "Galaxy S24");
        verify(fcmService, never()).registerDeviceToken(eq("super_admin"), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Unauthenticated registration request is rejected with 401")
    void testRegisterDeviceToken_UnauthenticatedRejection() {
        when(authService.getCurrentUser()).thenReturn(null);

        Map<String, String> payload = Map.of("token", "tok_xyz");
        ResponseEntity<ApiResponse<DeviceToken>> response = pushController.registerDeviceToken(payload);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(fcmService, never()).registerDeviceToken(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Device token unregister uses authenticated principal")
    void testUnregisterDeviceToken_UsesAuthenticatedPrincipal() {
        User authenticatedUser = User.builder()
                .userId("csehod")
                .build();
        when(authService.getCurrentUser()).thenReturn(authenticatedUser);

        Map<String, String> payload = Map.of("token", "device_tok_abc");
        ResponseEntity<ApiResponse<Void>> response = pushController.unregisterDeviceToken(payload, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(fcmService, times(1)).unregisterDeviceToken("csehod", "device_tok_abc");
    }
}

