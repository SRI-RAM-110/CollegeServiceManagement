package com.nec.collegeservices.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.*;
import com.nec.collegeservices.model.DeviceToken;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.DeviceTokenRepository;
import com.nec.collegeservices.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FcmService {

    public static final String NOTIFICATION_CHANNEL_ID = "college_services_channel";

    @Autowired
    private DeviceTokenRepository deviceTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${app.firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${app.firebase.credentials-json:}")
    private String credentialsJson;

    private boolean initialized = false;
    private FirebaseApp firebaseApp;

    @PostConstruct
    public void init() {
        try {
            if (credentialsJson != null && !credentialsJson.isBlank()) {
                log.info("FCM Service: Loading credentials from configured JSON string.");
                try (InputStream stream = new ByteArrayInputStream(credentialsJson.trim().getBytes(StandardCharsets.UTF_8))) {
                    initializeWithStream(stream);
                }
            } else if (credentialsPath != null && !credentialsPath.isBlank()) {
                File file = new File(credentialsPath.trim());
                if (file.exists() && file.isFile()) {
                    log.info("FCM Service: Loading credentials from file path: {}", credentialsPath);
                    try (InputStream stream = new FileInputStream(file)) {
                        initializeWithStream(stream);
                    }
                } else {
                    log.warn("FCM Service: Credentials file path '{}' does not exist.", credentialsPath);
                }
            } else {
                log.warn("FCM Service: No Firebase credentials provided. FCM push notifications disabled.");
            }
        } catch (Exception e) {
            log.warn("FCM Service: Failed to initialize FirebaseApp: {}. FCM push disabled.", e.getMessage());
            initialized = false;
        }
    }

    private void initializeWithStream(InputStream stream) throws Exception {
        GoogleCredentials credentials = GoogleCredentials.fromStream(stream);
        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        if (FirebaseApp.getApps().isEmpty()) {
            firebaseApp = FirebaseApp.initializeApp(options);
        } else {
            firebaseApp = FirebaseApp.getInstance();
        }
        initialized = true;
        log.info("FCM Service: FirebaseApp initialized successfully.");
    }

    public boolean isInitialized() {
        return initialized;
    }

    // Package-private setter for unit testing
    void setInitialized(boolean initialized) {
        this.initialized = initialized;
    }

    public DeviceToken registerDeviceToken(String userId, String token, String platform, String deviceModel) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Device token is required");
        }
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("User ID is required");
        }
        String cleanToken = token.trim();
        String cleanUserId = userId.trim();

        // Find existing token mapping if any (idempotent upsert & account switch reassignment)
        Optional<DeviceToken> existing = deviceTokenRepository.findByToken(cleanToken);
        DeviceToken deviceToken = existing.orElseGet(DeviceToken::new);

        // Always bind to authenticated user
        deviceToken.setUserId(cleanUserId);
        deviceToken.setToken(cleanToken);
        deviceToken.setPlatform(platform != null && !platform.isBlank() ? platform.trim().toUpperCase() : "ANDROID");
        deviceToken.setDeviceModel(deviceModel);
        deviceToken.setUpdatedAt(LocalDateTime.now());
        if (deviceToken.getId() == null) {
            deviceToken.setCreatedAt(LocalDateTime.now());
        }
        return deviceTokenRepository.save(deviceToken);
    }

    public void unregisterDeviceToken(String userId, String token) {
        if (token != null && !token.isBlank() && userId != null && !userId.isBlank()) {
            deviceTokenRepository.deleteByUserIdAndToken(userId.trim(), token.trim());
        }
    }

    @Async
    public CompletableFuture<Void> sendPushToUser(String userId, String title, String body, String url, String referenceId, String service, String type) {
        if (!initialized || userId == null || userId.isBlank()) {
            return CompletableFuture.completedFuture(null);
        }
        try {
            List<DeviceToken> tokens = deviceTokenRepository.findByUserId(userId.trim());
            if (!tokens.isEmpty()) {
                sendToDeviceTokens(tokens, title, body, url, referenceId, service, type);
            }
        } catch (Exception e) {
            log.warn("FCM error dispatching to user {}: {}", userId, e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<Void> sendPushToRoleAndDept(String role, String dept, String title, String body, String url, String referenceId, String service, String type) {
        if (!initialized) {
            return CompletableFuture.completedFuture(null);
        }
        try {
            List<User> targetUsers = userRepository.findAll().stream()
                    .filter(u -> Boolean.TRUE.equals(u.getActive()))
                    .filter(u -> {
                        boolean roleMatch = "ALL".equalsIgnoreCase(role) || u.hasRole(role) || u.hasServicePermission(role);
                        boolean deptMatch = "ALL".equalsIgnoreCase(dept) || "ADMIN".equalsIgnoreCase(u.getDepartment()) || (u.getDepartment() != null && u.getDepartment().equalsIgnoreCase(dept));
                        return roleMatch && deptMatch;
                    })
                    .toList();

            List<String> userIds = targetUsers.stream().map(User::getUserId).filter(Objects::nonNull).toList();
            if (!userIds.isEmpty()) {
                List<DeviceToken> tokens = deviceTokenRepository.findByUserIdIn(userIds);
                if (!tokens.isEmpty()) {
                    sendToDeviceTokens(tokens, title, body, url, referenceId, service, type);
                }
            }
        } catch (Exception e) {
            log.warn("FCM error dispatching broadcast push: {}", e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    public void sendToDeviceTokens(List<DeviceToken> tokens, String title, String body, String url, String referenceId, String service, String type) {
        if (!initialized || tokens == null || tokens.isEmpty()) {
            return;
        }

        // Deduplicate tokens
        Set<String> distinctTokens = tokens.stream()
                .map(DeviceToken::getToken)
                .filter(t -> t != null && !t.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (distinctTokens.isEmpty()) {
            return;
        }

        List<String> tokenList = new ArrayList<>(distinctTokens);
        int batchSize = 500;
        for (int i = 0; i < tokenList.size(); i += batchSize) {
            List<String> batch = tokenList.subList(i, Math.min(i + batchSize, tokenList.size()));
            sendBatch(batch, title, body, url, referenceId, service, type);
        }
    }

    private void sendBatch(List<String> tokenBatch, String title, String body, String url, String referenceId, String service, String type) {
        try {
            MulticastMessage.Builder builder = MulticastMessage.builder()
                    .addAllTokens(tokenBatch)
                    .setNotification(Notification.builder()
                            .setTitle(title != null ? title : "NEC Portal")
                            .setBody(body != null ? body : "")
                            .build())
                    .putData("title", title != null ? title : "NEC Portal")
                    .putData("body", body != null ? body : "")
                    .putData("url", url != null ? url : "/notifications")
                    .putData("referenceId", referenceId != null ? referenceId : "")
                    .putData("service", service != null ? service : "")
                    .putData("type", type != null ? type : "")
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(AndroidNotification.builder()
                                    .setChannelId(NOTIFICATION_CHANNEL_ID)
                                    .setSound("default")
                                    .setDefaultSound(true)
                                    .setDefaultVibrateTimings(true)
                                    .build())
                            .build());

            BatchResponse response = executeMulticast(builder.build());
            if (response != null) {
                log.info("FCM batch dispatched: {} success, {} failure out of {} tokens",
                        response.getSuccessCount(), response.getFailureCount(), tokenBatch.size());

                if (response.getFailureCount() > 0) {
                    handleBatchFailures(tokenBatch, response.getResponses());
                }
            }
        } catch (Exception e) {
            log.warn("FCM batch sending failed: {}", e.getMessage());
        }
    }

    protected BatchResponse executeMulticast(MulticastMessage message) throws Exception {
        FirebaseMessaging messaging = (firebaseApp != null)
                ? FirebaseMessaging.getInstance(firebaseApp)
                : FirebaseMessaging.getInstance();
        return messaging.sendEachForMulticast(message);
    }

    void handleBatchFailures(List<String> tokens, List<SendResponse> responses) {
        if (tokens == null || responses == null) return;
        List<String> tokensToRemove = new ArrayList<>();
        for (int k = 0; k < Math.min(tokens.size(), responses.size()); k++) {
            SendResponse sr = responses.get(k);
            if (!sr.isSuccessful()) {
                FirebaseMessagingException ex = sr.getException();
                MessagingErrorCode errorCode = ex != null ? ex.getMessagingErrorCode() : null;
                if (errorCode == MessagingErrorCode.UNREGISTERED || errorCode == MessagingErrorCode.INVALID_ARGUMENT) {
                    tokensToRemove.add(tokens.get(k));
                }
            }
        }
        if (!tokensToRemove.isEmpty()) {
            log.info("FCM pruning {} dead/unregistered tokens from MongoDB", tokensToRemove.size());
            for (String deadToken : tokensToRemove) {
                try {
                    deviceTokenRepository.deleteByToken(deadToken);
                } catch (Exception e) {
                    log.warn("Failed to delete stale FCM token {}: {}", deadToken, e.getMessage());
                }
            }
        }
    }
}
