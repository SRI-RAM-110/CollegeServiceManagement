package com.nec.collegeservices.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for the controlled administrative email attachment test endpoint.
 * Note: The recipient field is strictly validated against the server-side allowlist.
 * If omitted, the server automatically defaults to the configured allowlist recipient.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestEmailAttachmentRequestDTO {
    private String recipient;
    private String notes;
}
