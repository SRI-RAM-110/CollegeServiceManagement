package com.nec.collegeservices.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nec.collegeservices.model.PushSubscription;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.repository.PushSubscriptionRepository;
import com.nec.collegeservices.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class PushService {

    @Autowired
    private PushSubscriptionRepository subscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.vapid.public-key:BOhTIhLV2PbraKWzqTrUOz88Q33IuzrZ-nan8jWt4zsOzHkGuE4-AE0DRC94biUAEtTusgd77hOCMM09xrgOBIU}")
    private String vapidPublicKey;

    @Value("${app.vapid.private-key:${VAPID_PRIVATE_KEY:}}")
    private String vapidPrivateKey;

    @Value("${app.vapid.subject:mailto:admin@nec.edu.in}")
    private String vapidSubject;

    private nl.martijndwars.webpush.PushService webPushClient;

    @PostConstruct
    public void init() {
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            if (vapidPrivateKey != null && !vapidPrivateKey.isBlank()) {
                webPushClient = new nl.martijndwars.webpush.PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
                log.info("WebPush Service initialized successfully with VAPID subject: {}", vapidSubject);
            } else {
                log.warn("WebPush Service: VAPID private key is not configured. Web push notifications disabled.");
            }
        } catch (Exception e) {
            log.error("Failed to initialize WebPush Service: {}", e.getMessage(), e);
        }
    }

    public String getVapidPublicKey() {
        return vapidPublicKey;
    }

    public PushSubscription subscribe(String userId, String endpoint, String p256dh, String auth, String userAgent) {
        if (endpoint == null || endpoint.isBlank()) {
            throw new IllegalArgumentException("Endpoint is required for push subscription");
        }

        Optional<PushSubscription> existing = subscriptionRepository.findByEndpoint(endpoint);
        PushSubscription sub = existing.orElseGet(PushSubscription::new);
        sub.setUserId(userId);
        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        sub.setUserAgent(userAgent);
        sub.setUpdatedAt(LocalDateTime.now());
        if (sub.getId() == null) {
            sub.setCreatedAt(LocalDateTime.now());
        }
        return subscriptionRepository.save(sub);
    }

    public void unsubscribe(String endpoint) {
        if (endpoint != null && !endpoint.isBlank()) {
            subscriptionRepository.deleteByEndpoint(endpoint);
        }
    }

    public void unsubscribeUser(String userId) {
        if (userId != null && !userId.isBlank()) {
            subscriptionRepository.deleteByUserId(userId);
        }
    }

    @Async
    public CompletableFuture<Void> sendPushToUser(String userId, String title, String body, String url, String referenceId) {
        if (userId == null || userId.isBlank()) {
            return CompletableFuture.completedFuture(null);
        }
        try {
            List<PushSubscription> subs = subscriptionRepository.findByUserId(userId);
            for (PushSubscription sub : subs) {
                sendToSubscription(sub, title, body, url, referenceId);
            }
        } catch (Exception e) {
            log.warn("Error dispatching push to user {}: {}", userId, e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<Void> sendPushToRoleAndDept(String role, String dept, String title, String body, String url, String referenceId) {
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
                List<PushSubscription> subs = subscriptionRepository.findByUserIdIn(userIds);
                for (PushSubscription sub : subs) {
                    sendToSubscription(sub, title, body, url, referenceId);
                }
            }
        } catch (Exception e) {
            log.warn("Error dispatching broadcast push: {}", e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    public boolean sendToSubscription(PushSubscription sub, String title, String body, String url, String referenceId) {
        if (webPushClient == null || sub == null || sub.getEndpoint() == null) {
            return false;
        }

        try {
            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("title", title);
            payloadMap.put("body", body);
            payloadMap.put("icon", "/vite.svg");
            payloadMap.put("badge", "/vite.svg");
            payloadMap.put("timestamp", System.currentTimeMillis());

            Map<String, Object> dataMap = new HashMap<>();
            dataMap.put("url", url != null ? url : "/notifications");
            dataMap.put("referenceId", referenceId);
            payloadMap.put("data", dataMap);

            String json = objectMapper.writeValueAsString(payloadMap);

            Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    json.getBytes(StandardCharsets.UTF_8)
            );

            HttpResponse response = webPushClient.send(notification);
            int statusCode = response.getStatusLine().getStatusCode();

            if (statusCode == 201 || statusCode == 200) {
                log.info("Push notification sent successfully to user {} (status {})", sub.getUserId(), statusCode);
                return true;
            } else if (statusCode == 404 || statusCode == 410) {
                log.info("Subscription expired or unregistered (status {}). Removing endpoint {}", statusCode, sub.getEndpoint());
                subscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                return false;
            } else {
                log.warn("Push delivery returned status {}: {}", statusCode, response.getStatusLine().getReasonPhrase());
                return false;
            }
        } catch (Exception e) {
            log.warn("Failed to deliver push notification to subscription {}: {}", sub.getId(), e.getMessage());
            return false;
        }
    }
}
