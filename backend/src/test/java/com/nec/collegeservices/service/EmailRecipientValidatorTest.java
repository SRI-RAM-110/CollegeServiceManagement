package com.nec.collegeservices.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EmailRecipientValidatorTest {

    @Test
    @DisplayName("Normalization trims whitespace and converts to lowercase Locale.ROOT without stripping quotes")
    void testNormalizeEmail() {
        assertNull(EmailRecipientValidator.normalizeEmail(null));
        assertNull(EmailRecipientValidator.normalizeEmail(""));
        assertNull(EmailRecipientValidator.normalizeEmail("   "));
        assertEquals("principal@nrtec.in", EmailRecipientValidator.normalizeEmail("  Principal@NRTEC.IN  "));
        assertEquals("collegeservice2026@gmail.com", EmailRecipientValidator.normalizeEmail(" CollegeService2026@GMAIL.COM\t"));
        assertEquals("partner@startup.co", EmailRecipientValidator.normalizeEmail("  PARTNER@STARTUP.CO \n"));

        // Critical check: normalizeEmail MUST NOT strip single or double quotes
        assertEquals("\"principal@nrtec.in\"", EmailRecipientValidator.normalizeEmail("  \"Principal@NRTEC.IN\"  "));
        assertEquals("'principal@nrtec.in'", EmailRecipientValidator.normalizeEmail("  'Principal@NRTEC.IN'  "));
        assertEquals("\"user@domain.com", EmailRecipientValidator.normalizeEmail(" \"user@domain.com "));
        assertEquals("user@domain.com\"", EmailRecipientValidator.normalizeEmail(" user@domain.com\" "));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "principal@nrtec.in",
            "ao@nrtec.in",
            "csehod@nrtec.in",
            "viceprincipal@nrtec.in",
            "sub.dept@nrtec.in",
            "collegeservice2026@gmail.com",
            "test.user+tag@gmail.com",
            "user@yahoo.com",
            "user@outlook.com",
            "user@domain.org",
            "user@academic.edu.in",
            "partner@startup.co",
            "support@fintech.co",
            "user@service.co.uk",
            "contact@company.co"
    })
    @DisplayName("Valid institutional, consumer, and legitimate .co domains pass validation")
    void testValidRecipients(String email) {
        assertTrue(EmailRecipientValidator.isValidRecipient(email), "Expected valid: " + email);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "principal@nrtec.i",        // Truncated institutional domain (.i)
            "user@nrtec.com",           // Malformed institutional domain (.com instead of .in)
            "user@nrtec.co",            // Malformed institutional domain (.co instead of .in)
            "nipsprincipal07@gmail.co", // Truncated consumer domain (@gmail.co)
            "test@gmail.co",            // Truncated consumer domain (@gmail.co)
            "user@outlook.co",          // Truncated consumer domain (@outlook.co)
            "user@yahoo.co",            // Truncated consumer domain (@yahoo.co without ccTLD)
            "notanemail",               // Missing @ and domain
            "@missinguser.com",         // Missing local part
            "user@",                    // Missing domain
            "user@domain",              // Missing TLD
            "user@domain.c",            // 1-character TLD
            "user@@domain.com",         // Double @
            "   ",                      // Whitespace only
            ""                          // Empty
    })
    @DisplayName("Invalid, truncated, and malformed email addresses are rejected")
    void testInvalidRecipients(String email) {
        assertFalse(EmailRecipientValidator.isValidRecipient(email), "Expected invalid: " + email);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "\"principal@nrtec.in\"",       // Enclosing double quotes
            "'principal@nrtec.in'",         // Enclosing single quotes
            "\"collegeservice@gmail.com\"", // Enclosing double quotes on consumer domain
            "'collegeservice@gmail.com'",   // Enclosing single quotes on consumer domain
            "\"principal@nrtec.in",         // Unmatched leading double quote
            "principal@nrtec.in\"",         // Unmatched trailing double quote
            "'principal@nrtec.in",          // Unmatched leading single quote
            "principal@nrtec.in'",          // Unmatched trailing single quote
            "prin\"cipal@nrtec.in",         // Embedded double quote in local-part
            "prin'cipal@nrtec.in",          // Embedded single quote in local-part
            "principal@nr\"tec.in",         // Embedded double quote in domain
            "principal@nr'tec.in",          // Embedded single quote in domain
            "\"user\"@nrtec.in",            // Quoted-string local part (disallowed unexpected quote)
            "\"\"@nrtec.in"                 // Empty quotes local part
    })
    @DisplayName("Unexpected quote characters are strictly rejected rather than stripped")
    void testQuoteCharactersRejected(String emailWithQuotes) {
        assertFalse(EmailRecipientValidator.isValidRecipient(emailWithQuotes),
                "Expected address with unexpected quotes to be rejected: " + emailWithQuotes);
    }

    @Test
    @DisplayName("Null email is rejected")
    void testNullRecipient() {
        assertFalse(EmailRecipientValidator.isValidRecipient(null));
    }

    @Test
    @DisplayName("validateAndNormalizePrimary returns clean email or throws IllegalArgumentException")
    void testValidateAndNormalizePrimary() {
        assertEquals("principal@nrtec.in", EmailRecipientValidator.validateAndNormalizePrimary("  Principal@NRTEC.IN "));
        assertEquals("partner@startup.co", EmailRecipientValidator.validateAndNormalizePrimary(" partner@startup.CO "));

        assertThrows(IllegalArgumentException.class, () -> EmailRecipientValidator.validateAndNormalizePrimary(null));
        assertThrows(IllegalArgumentException.class, () -> EmailRecipientValidator.validateAndNormalizePrimary("   "));
        assertThrows(IllegalArgumentException.class, () -> EmailRecipientValidator.validateAndNormalizePrimary("principal@nrtec.i"));
        assertThrows(IllegalArgumentException.class, () -> EmailRecipientValidator.validateAndNormalizePrimary("user@gmail.co"));
        assertThrows(IllegalArgumentException.class, () -> EmailRecipientValidator.validateAndNormalizePrimary("bademail"));
        assertThrows(IllegalArgumentException.class, () -> EmailRecipientValidator.validateAndNormalizePrimary("\"user@nrtec.in\""));
        assertThrows(IllegalArgumentException.class, () -> EmailRecipientValidator.validateAndNormalizePrimary("'user@nrtec.in'"));
    }

    @Test
    @DisplayName("validateSecondaryRecipients categorizes valid, invalid, and primary duplicate recipients")
    void testValidateSecondaryRecipientsCategorization() {
        String primary = "ao@nrtec.in";
        List<String> rawCcs = List.of(
                "  AO@NRTEC.IN ",           // Duplicate of primary
                "ao@nrtec.in",              // Duplicate of primary
                "CSEHOD@NRTEC.IN",          // Valid institutional CC
                "  csehod@nrtec.in ",       // Duplicate valid CC in list (must be deduplicated)
                "\"quoted@nrtec.in\"",      // Enclosing quotes (must be rejected as invalid)
                "'singlequote@nrtec.in'",   // Single quotes (must be rejected as invalid)
                "unmatched\"@nrtec.in",     // Embedded quote (must be rejected as invalid)
                "partner@startup.co",       // Valid .co CC
                "bad@gmail.co",             // Truncated consumer domain (must be rejected as invalid)
                "bad@nrtec.i",              // Truncated institutional domain (must be rejected as invalid)
                "  ",                       // Blank (must be skipped without categorizing as invalid)
                "valid.external@gmail.com"  // Valid Gmail CC
        );

        EmailRecipientValidator.SecondaryValidationResult result =
                EmailRecipientValidator.validateSecondaryRecipients(rawCcs, primary);

        // Valid recipients: deduplicated, normalized, preserved order
        List<String> valids = result.getValidRecipients();
        assertEquals(3, valids.size());
        assertEquals("csehod@nrtec.in", valids.get(0));
        assertEquals("partner@startup.co", valids.get(1));
        assertEquals("valid.external@gmail.com", valids.get(2));

        // Invalid recipients: all malformed/quoted addresses captured
        List<String> invalids = result.getInvalidRecipients();
        assertEquals(5, invalids.size());
        assertTrue(invalids.contains("\"quoted@nrtec.in\""));
        assertTrue(invalids.contains("'singlequote@nrtec.in'"));
        assertTrue(invalids.contains("unmatched\"@nrtec.in"));
        assertTrue(invalids.contains("bad@gmail.co"));
        assertTrue(invalids.contains("bad@nrtec.i"));

        // Primary duplicates: captured
        List<String> primaryDups = result.getPrimaryDuplicates();
        assertEquals(2, primaryDups.size());
        assertEquals("ao@nrtec.in", primaryDups.get(0));
        assertEquals("ao@nrtec.in", primaryDups.get(1));
    }

    @Test
    @DisplayName("validateAndNormalizeSecondaryList delegates to validateSecondaryRecipients.getValidRecipients()")
    void testValidateAndNormalizeSecondaryList() {
        String primary = "ao@nrtec.in";
        List<String> rawCcs = List.of(
                "  AO@NRTEC.IN ",           // Same as primary (must be excluded)
                "ao@nrtec.in",              // Duplicate of primary (must be excluded)
                "CSEHOD@NRTEC.IN",          // Valid institutional CC
                "  csehod@nrtec.in ",       // Duplicate CC (must be deduplicated)
                "partner@startup.co",       // Valid .co CC
                "\"quoted@nrtec.in\"",      // Quoted address (must be rejected)
                "bad@gmail.co",             // Truncated consumer (must be rejected)
                "bad@nrtec.i",              // Truncated institutional (must be rejected)
                "  ",                       // Blank (must be skipped)
                "valid.external@gmail.com"  // Valid Gmail CC
        );

        List<String> cleanCcs = EmailRecipientValidator.validateAndNormalizeSecondaryList(rawCcs, primary);

        assertEquals(3, cleanCcs.size());
        assertEquals("csehod@nrtec.in", cleanCcs.get(0));
        assertEquals("partner@startup.co", cleanCcs.get(1));
        assertEquals("valid.external@gmail.com", cleanCcs.get(2));
    }

    @Test
    @DisplayName("validateAndNormalizeSecondaryList handles null and empty input safely")
    void testValidateAndNormalizeSecondaryListNullSafe() {
        assertTrue(EmailRecipientValidator.validateAndNormalizeSecondaryList(null, "primary@nrtec.in").isEmpty());
        assertTrue(EmailRecipientValidator.validateAndNormalizeSecondaryList(List.of(), "primary@nrtec.in").isEmpty());
    }
}
