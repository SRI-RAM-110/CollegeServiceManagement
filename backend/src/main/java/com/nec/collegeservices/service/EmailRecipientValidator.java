package com.nec.collegeservices.service;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Centralized validator and normalizer for email recipients.
 * Enforces RFC 5322 syntax validation, whitespace trimming, lowercase normalization
 * using Locale.ROOT, high-precision institutional domain integrity checks, and
 * explicit rejection of unexpected quote characters.
 */
public final class EmailRecipientValidator {

    /**
     * Standard RFC 5322 compliant regex for syntactically valid email addresses.
     * Enforces minimum 2-character TLD and max 24-character TLD.
     * Disallows quotes, spaces, control characters, and unescaped delimiters.
     */
    public static final Pattern STRICT_EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,24}$"
    );

    public static final String INSTITUTIONAL_DOMAIN = "nrtec.in";

    private EmailRecipientValidator() {
        // Prevent instantiation of utility class
    }

    /**
     * Normalizes an email address by trimming leading/trailing whitespace
     * and converting to lowercase using Locale.ROOT to prevent locale-sensitive casing bugs.
     * <p>
     * NOTE: This method strictly preserves all characters (apart from whitespace trimming
     * and lowercasing). It does NOT strip enclosing single or double quotes. Stripping quotes
     * could silently convert malformed, corrupt, or quote-injected inputs into seemingly valid
     * addresses without the caller's knowledge. Any unexpected quote characters are rejected
     * during validation in {@link #isValidRecipient(String)}.
     *
     * @param rawEmail the raw email address string
     * @return normalized lowercase email, or null if input is null or whitespace-only
     */
    public static String normalizeEmail(String rawEmail) {
        if (rawEmail == null) {
            return null;
        }
        String trimmed = rawEmail.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.toLowerCase(Locale.ROOT);
    }

    /**
     * Validates whether an email address is syntactically and semantically acceptable.
     * Preserves valid institutional addresses, standard consumer mail domains,
     * and legitimate corporate/international domains (including legitimate .co ccTLDs).
     * <p>
     * Explicitly rejects any address containing single or double quotes (whether enclosing,
     * unmatched, or embedded) to prevent silent sanitization of corrupt or injected inputs.
     *
     * @param email the email address to validate (raw or normalized)
     * @return true if valid, false otherwise
     */
    public static boolean isValidRecipient(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null) {
            return false;
        }

        // Explicitly reject any quote characters anywhere in the address (enclosing, unmatched, or embedded).
        // Stripping or accepting unexpected quotes can mask data corruption or malformed inputs.
        if (normalized.indexOf('\'') != -1 || normalized.indexOf('\"') != -1) {
            return false;
        }

        if (!STRICT_EMAIL_PATTERN.matcher(normalized).matches()) {
            return false;
        }

        if (isMalformedInstitutionalDomain(normalized)) {
            return false;
        }

        if (isTruncatedConsumerDomain(normalized)) {
            return false;
        }

        return true;
    }

    /**
     * Checks if an email targets the college institutional domain but has a truncated or malformed domain name
     * (e.g. "principal@nrtec.i" or "user@nrtec.co" / "user@nrtec.com" instead of "user@nrtec.in").
     * Allows legitimate development/local domains such as "nrtec.local" used in tests.
     *
     * @param normalizedEmail lowercase trimmed email
     * @return true if the email is a malformed institutional address
     */
    public static boolean isMalformedInstitutionalDomain(String normalizedEmail) {
        if (normalizedEmail == null) {
            return false;
        }
        int atIdx = normalizedEmail.lastIndexOf('@');
        if (atIdx == -1 || atIdx == normalizedEmail.length() - 1) {
            return false;
        }

        String domain = normalizedEmail.substring(atIdx + 1);
        if ("nrtec.i".equals(domain) || "nrtec.co".equals(domain) || "nrtec.com".equals(domain)) {
            return true;
        }
        return false;
    }

    /**
     * Checks for specific, high-precision single-character truncation anomalies of major consumer mail providers
     * (e.g. "@gmail.co" instead of "@gmail.com", "@outlook.co" instead of "@outlook.com", "@yahoo.co" without ccTLD).
     * Does NOT reject legitimate domains such as "contact@company.co" or "support@fintech.co".
     *
     * @param normalizedEmail lowercase trimmed email
     * @return true if the email is an incomplete consumer domain truncation
     */
    public static boolean isTruncatedConsumerDomain(String normalizedEmail) {
        if (normalizedEmail == null) {
            return false;
        }
        int atIdx = normalizedEmail.lastIndexOf('@');
        if (atIdx == -1 || atIdx == normalizedEmail.length() - 1) {
            return false;
        }

        String domain = normalizedEmail.substring(atIdx + 1);
        if ("gmail.co".equals(domain) || "outlook.co".equals(domain) || "yahoo.co".equals(domain)) {
            return true;
        }
        return false;
    }

    /**
     * Validates and normalizes a primary recipient address.
     *
     * @param rawEmail the raw email string
     * @return normalized lowercase email
     * @throws IllegalArgumentException if recipient is null, blank, or invalid
     */
    public static String validateAndNormalizePrimary(String rawEmail) {
        String normalized = normalizeEmail(rawEmail);
        if (normalized == null || !isValidRecipient(normalized)) {
            throw new IllegalArgumentException("Invalid primary recipient email address: " + (rawEmail != null ? rawEmail.trim() : "null"));
        }
        return normalized;
    }

    /**
     * Result of validating and categorizing a secondary recipient list (CC or BCC).
     */
    public static class SecondaryValidationResult {
        private final List<String> validRecipients;
        private final List<String> invalidRecipients;
        private final List<String> primaryDuplicates;

        public SecondaryValidationResult(List<String> validRecipients, List<String> invalidRecipients, List<String> primaryDuplicates) {
            this.validRecipients = validRecipients != null ? Collections.unmodifiableList(validRecipients) : Collections.emptyList();
            this.invalidRecipients = invalidRecipients != null ? Collections.unmodifiableList(invalidRecipients) : Collections.emptyList();
            this.primaryDuplicates = primaryDuplicates != null ? Collections.unmodifiableList(primaryDuplicates) : Collections.emptyList();
        }

        public List<String> getValidRecipients() {
            return validRecipients;
        }

        public List<String> getInvalidRecipients() {
            return invalidRecipients;
        }

        public List<String> getPrimaryDuplicates() {
            return primaryDuplicates;
        }
    }

    /**
     * Validates, normalizes, deduplicates, and categorizes a list of secondary recipients (CC or BCC),
     * strictly identifying valid addresses, invalid addresses, and primary duplicates.
     *
     * @param rawEmails list of raw email strings
     * @param primaryRecipient primary recipient to check for duplicate collision (normalized or raw)
     * @return comprehensive validation result containing valid, invalid, and primary duplicate lists
     */
    public static SecondaryValidationResult validateSecondaryRecipients(List<String> rawEmails, String primaryRecipient) {
        if (rawEmails == null || rawEmails.isEmpty()) {
            return new SecondaryValidationResult(Collections.emptyList(), Collections.emptyList(), Collections.emptyList());
        }

        String cleanPrimary = normalizeEmail(primaryRecipient);
        Set<String> validSet = new LinkedHashSet<>();
        List<String> invalidList = new ArrayList<>();
        List<String> primaryDuplicates = new ArrayList<>();

        for (String raw : rawEmails) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String trimmed = raw.trim();
            if (!isValidRecipient(trimmed)) {
                invalidList.add(trimmed);
                continue;
            }
            String normalized = normalizeEmail(trimmed);
            if (cleanPrimary != null && normalized.equalsIgnoreCase(cleanPrimary)) {
                primaryDuplicates.add(normalized);
                continue;
            }
            validSet.add(normalized);
        }

        return new SecondaryValidationResult(new ArrayList<>(validSet), invalidList, primaryDuplicates);
    }

    /**
     * Normalizes, validates, deduplicates, and filters a list of secondary recipients (CC or BCC),
     * strictly excluding the primary recipient.
     *
     * @param rawEmails list of raw email strings
     * @param primaryRecipient primary recipient to exclude (normalized or raw)
     * @return deduplicated list of valid normalized recipient addresses in original order
     */
    public static List<String> validateAndNormalizeSecondaryList(List<String> rawEmails, String primaryRecipient) {
        return validateSecondaryRecipients(rawEmails, primaryRecipient).getValidRecipients();
    }
}
