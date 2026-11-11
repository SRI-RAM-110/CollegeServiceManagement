package com.nec.collegeservices.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final Map<String, String> HEALTH_RESPONSE;

    static {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("status", "UP");
        payload.put("service", "College Services Backend");
        HEALTH_RESPONSE = Collections.unmodifiableMap(payload);
    }

    /**
     * Lightweight public health check endpoint for Render monitoring and external cron schedulers.
     * Performs no database queries and exposes no internal configuration or credentials.
     */
    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(HEALTH_RESPONSE);
    }
}

