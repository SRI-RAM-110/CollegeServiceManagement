package com.nec.collegeservices.controller;

import com.nec.collegeservices.dto.ApiResponse;
import com.nec.collegeservices.model.DeviceToken;
import com.nec.collegeservices.model.PushSubscription;
import com.nec.collegeservices.model.User;
import com.nec.collegeservices.service.AuthService;
import com.nec.collegeservices.service.FcmService;
import com.nec.collegeservices.service.PushService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PushController {

    @Autowired
    private PushService pushService;

    @Autowired
    private FcmService fcmService;

    @Autowired
    private AuthService authService;

    @GetMapping("/public-key")
    public ResponseEntity<ApiResponse<Map<String, String>>> getVapidPublicKey() {
        return ResponseEntity.ok(ApiResponse.ok("VAPID public key", Map.of("publicKey", pushService.getVapidPublicKey())));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<ApiResponse<PushSubscription>> subscribe(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request
    ) {
        User user = authService.getCurrentUser();
        String endpoint = (String) payload.get("endpoint");

        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) payload.get("keys");
        String p256dh = keys != null ? keys.get("p256dh") : null;
        String auth = keys != null ? keys.get("auth") : null;

        String userAgent = request.getHeader("User-Agent");

        PushSubscription sub = pushService.subscribe(user.getUserId(), endpoint, p256dh, auth, userAgent);
        return ResponseEntity.ok(ApiResponse.ok("Push subscription saved successfully", sub));
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<ApiResponse<Void>> unsubscribe(@RequestBody Map<String, String> payload) {
        String endpoint = payload.get("endpoint");
        pushService.unsubscribe(endpoint);
        return ResponseEntity.ok(ApiResponse.ok("Push subscription removed"));
    }

    @PostMapping("/test")
    public ResponseEntity<ApiResponse<String>> sendTestPush() {
        User user = authService.getCurrentUser();
        pushService.sendPushToUser(
                user.getUserId(),
                "NEC Portal Notifications",
                "Hello " + (user.getName() != null ? user.getName() : user.getUserId()) + "! Browser Push Notifications are active and verified.",
                "/notifications",
                "TEST-" + System.currentTimeMillis()
        );
        return ResponseEntity.ok(ApiResponse.ok("Test push notification queued for user " + user.getUserId()));
    }

    @PostMapping("/device-token")
    public ResponseEntity<ApiResponse<DeviceToken>> registerDeviceToken(@RequestBody Map<String, String> payload) {
        User user = authService.getCurrentUser();
        if (user == null || user.getUserId() == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Authentication required to register device token"));
        }
        String token = payload.get("token");
        String platform = payload.get("platform");
        String deviceModel = payload.get("deviceModel");

        DeviceToken dt = fcmService.registerDeviceToken(user.getUserId(), token, platform, deviceModel);
        return ResponseEntity.ok(ApiResponse.ok("Device token registered successfully", dt));
    }

    @DeleteMapping("/device-token")
    public ResponseEntity<ApiResponse<Void>> unregisterDeviceToken(
            @RequestBody(required = false) Map<String, String> payload,
            @RequestParam(value = "token", required = false) String paramToken) {
        User user = authService.getCurrentUser();
        if (user == null || user.getUserId() == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Authentication required"));
        }
        String token = (payload != null && payload.containsKey("token")) ? payload.get("token") : paramToken;
        fcmService.unregisterDeviceToken(user.getUserId(), token);
        return ResponseEntity.ok(ApiResponse.ok("Device token unregistered successfully"));
    }
}
