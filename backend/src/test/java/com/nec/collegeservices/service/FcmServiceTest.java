package com.nec.collegeservices.service;

import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.SendResponse;
import com.nec.collegeservices.model.DeviceToken;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.DeviceTokenRepository;
import com.nec.collegeservices.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class FcmServiceTest {

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FcmService fcmService;

    @BeforeEach
    void setUp() {
        when(deviceTokenRepository.save(any(DeviceToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Token registration: Idempotent upsert and correct user ownership")
    void testRegisterDeviceToken_OwnershipAndUpsert() {
        when(deviceTokenRepository.findByToken("tok_12345")).thenReturn(Optional.empty());

        DeviceToken created = fcmService.registerDeviceToken("csehod", "tok_12345", "ANDROID", "Pixel 8");

        assertNotNull(created);
        assertEquals("csehod", created.getUserId());
        assertEquals("tok_12345", created.getToken());
        assertEquals("ANDROID", created.getPlatform());
        assertEquals("Pixel 8", created.getDeviceModel());
        verify(deviceTokenRepository, times(1)).save(any(DeviceToken.class));
    }

    @Test
    @DisplayName("Account switching: Handing over phone re-assigns token to new authenticated user")
    void testRegisterDeviceToken_AccountSwitchReassignsOwnership() {
        DeviceToken existing = DeviceToken.builder()
                .id("dt_1")
                .userId("csehod")
                .token("shared_device_tok")
                .platform("ANDROID")
                .createdAt(LocalDateTime.now().minusDays(2))
                .build();

        when(deviceTokenRepository.findByToken("shared_device_tok")).thenReturn(Optional.of(existing));

        // Now new user 'ecehod' logs in on same device
        DeviceToken updated = fcmService.registerDeviceToken("ecehod", "shared_device_tok", "ANDROID", "Pixel 8");

        assertNotNull(updated);
        assertEquals("ecehod", updated.getUserId(), "Device token ownership must update to current user");
        assertEquals("shared_device_tok", updated.getToken());
        verify(deviceTokenRepository, times(1)).save(existing);
    }

    @Test
    @DisplayName("Unregister token: Deletes device token by authenticated userId and token")
    void testUnregisterDeviceToken() {
        fcmService.unregisterDeviceToken("csehod", "tok_999");
        verify(deviceTokenRepository, times(1)).deleteByUserIdAndToken("csehod", "tok_999");
    }

    @Test
    @DisplayName("Missing credentials: Safe initialization and non-crashing graceful degradation")
    void testMissingCredentials_GracefulDegradation() {
        FcmService uninitService = new FcmService();
        uninitService.init();

        assertFalse(uninitService.isInitialized(), "Should be uninitialized when credentials missing");

        // Calling dispatch with uninitialized service should complete normally without error
        CompletableFuture<Void> future = uninitService.sendPushToUser("csehod", "Title", "Body", "/notifications", "REF1", "SEMINAR", "APPROVED");
        assertNotNull(future);
        assertTrue(future.isDone());
    }

    @Test
    @DisplayName("Recipient filtering: Only active matching users are retrieved for broadcast push")
    void testRecipientFiltering_ActiveAndMatchingUsersOnly() {
        fcmService.setInitialized(true);

        User activeSeminarAdmin = User.builder()
                .userId("seminar_admin_1")
                .role("SEMINAR_ADMIN")
                .department("ADMIN")
                .active(true)
                .build();

        User inactiveSeminarAdmin = User.builder()
                .userId("seminar_admin_inactive")
                .role("SEMINAR_ADMIN")
                .department("ADMIN")
                .active(false)
                .build();

        User transportAdmin = User.builder()
                .userId("transport_admin_1")
                .role("TRANSPORT_ADMIN")
                .department("ADMIN")
                .active(true)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(activeSeminarAdmin, inactiveSeminarAdmin, transportAdmin));

        DeviceToken token = DeviceToken.builder()
                .userId("seminar_admin_1")
                .token("fcm_token_active_admin")
                .platform("ANDROID")
                .build();
        when(deviceTokenRepository.findByUserIdIn(anyList())).thenReturn(List.of(token));

        fcmService.sendPushToRoleAndDept("SEMINAR_ADMIN", "ADMIN", "New Request", "Check it", "/admin/seminar", "REQ1", "SEMINAR", "NEW");

        ArgumentCaptor<List<String>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(deviceTokenRepository).findByUserIdIn(listCaptor.capture());

        List<String> queriedUserIds = listCaptor.getValue();
        assertTrue(queriedUserIds.contains("seminar_admin_1"), "Active matching user must be included");
        assertFalse(queriedUserIds.contains("seminar_admin_inactive"), "Inactive user must NOT be included");
        assertFalse(queriedUserIds.contains("transport_admin_1"), "Non-matching role must NOT be included");
    }

    @Test
    @DisplayName("Stale token removal: Prunes dead/unregistered tokens when Firebase reports UNREGISTERED")
    void testHandleBatchFailures_PrunesUnregisteredTokens() {
        List<String> tokens = List.of("valid_tok_1", "dead_tok_2", "invalid_tok_3");

        SendResponse resp1 = mock(SendResponse.class);
        when(resp1.isSuccessful()).thenReturn(true);

        SendResponse resp2 = mock(SendResponse.class);
        when(resp2.isSuccessful()).thenReturn(false);
        FirebaseMessagingException ex2 = mock(FirebaseMessagingException.class);
        when(ex2.getMessagingErrorCode()).thenReturn(MessagingErrorCode.UNREGISTERED);
        when(resp2.getException()).thenReturn(ex2);

        SendResponse resp3 = mock(SendResponse.class);
        when(resp3.isSuccessful()).thenReturn(false);
        FirebaseMessagingException ex3 = mock(FirebaseMessagingException.class);
        when(ex3.getMessagingErrorCode()).thenReturn(MessagingErrorCode.INVALID_ARGUMENT);
        when(resp3.getException()).thenReturn(ex3);

        fcmService.handleBatchFailures(tokens, List.of(resp1, resp2, resp3));

        verify(deviceTokenRepository, times(1)).deleteByToken("dead_tok_2");
        verify(deviceTokenRepository, times(1)).deleteByToken("invalid_tok_3");
        verify(deviceTokenRepository, never()).deleteByToken("valid_tok_1");
    }
}

