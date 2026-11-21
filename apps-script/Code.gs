/**
 * =========================================================================
 * NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)
 * College Department Services Management System
 * Production HTTPS Email Relay Web App (Google Apps Script)
 * =========================================================================
 *
 * Security & Architecture Overview:
 * 1. Executes as "Me" (the Google account owner) and permits access from "Anyone".
 *    This allows your backend on Render to make server-to-server HTTPS POST calls
 *    without needing interactive OAuth consent screens.
 * 2. Shared secret authentication:
 *    The secret is stored in Script Properties under the key "RELAY_SECRET".
 *    Incoming requests must provide { "secret": "<RELAY_SECRET>" }.
 *    Requests with missing or mismatched secrets are rejected immediately.
 * 3. Input validation:
 *    - "to" (required, valid email pattern)
 *    - "subject" (required, non-empty)
 *    - "htmlBody" or "textBody" (required, non-empty)
 *    - "cc" (optional, array or comma-separated string, validated)
 *    - "bcc" (optional, array or comma-separated string, validated)
 *    - "attachments" (optional, array of objects: { filename, mimeType, base64Data })
 * 4. Attachment Security & Guardrails:
 *    - Permitted attachment types: strictly PDF (.pdf extension and application/pdf MIME type).
 *    - PDF format verification: magic header must start with "%PDF-".
 *    - Size limits: max 10 MB per attachment, max 20 MB total per email.
 *    - Base64 payload is safely decoded using Utilities.base64Decode().
 * 5. Privacy & Reliability:
 *    - The shared secret and base64 contents are NEVER logged or returned in responses.
 *    - Idempotency key is supported and reflected in the response to assist deduplication.
 *    - Responses return structured JSON: { "success": true, ... } or { "success": false, "error": "..." }
 */

// Property key stored in Project Settings > Script Properties
var SCRIPT_PROP_SECRET = "RELAY_SECRET";

// Attachment size constraints (bytes)
var MAX_SINGLE_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
var MAX_TOTAL_ATTACHMENTS_BYTES = 20 * 1024 * 1024; // 20 MB
var MAX_ATTACHMENT_COUNT = 5;

/**
 * Handles HTTP GET requests - Safe Health Check
 */
function doGet(e) {
  var configured = false;
  try {
    var storedSecret = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_SECRET);
    configured = (storedSecret !== null && storedSecret.trim().length > 0);
  } catch (err) {}

  return createJsonResponse({
    success: true,
    status: "ONLINE",
    service: "NEC College Service Management - Email Relay",
    secretConfigured: configured,
    attachmentSupport: true,
    supportedMimeTypes: ["application/pdf"],
    maxAttachmentSizeMb: 10,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handles HTTP POST requests - Authenticated Email Dispatch (with optional PDF attachments)
 */
function doPost(e) {
  try {
    // 1. Validate payload presence
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: "Malformed request: Empty request body."
      });
    }

    // 2. Parse JSON payload
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse({
        success: false,
        error: "Malformed request: Request body must be valid JSON."
      });
    }

    // 3. Authenticate shared secret against Script Properties
    var storedSecret = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_SECRET);
    if (!storedSecret || storedSecret.trim() === "") {
      return createJsonResponse({
        success: false,
        error: "Relay configuration error: RELAY_SECRET is not configured in Apps Script Script Properties."
      });
    }

    var providedSecret = data.secret ? String(data.secret).trim() : "";
    if (providedSecret !== storedSecret.trim()) {
      return createJsonResponse({
        success: false,
        error: "Unauthorized: Invalid or missing shared secret."
      });
    }

    // 4. Validate recipient ("to")
    var to = data.to ? String(data.to).trim() : "";
    if (!to || !isValidEmail(to)) {
      return createJsonResponse({
        success: false,
        error: "Invalid request: 'to' recipient email address is invalid or missing."
      });
    }

    // 5. Validate subject
    var subject = data.subject ? String(data.subject).trim() : "";
    if (!subject) {
      return createJsonResponse({
        success: false,
        error: "Invalid request: 'subject' is required."
      });
    }

    // 6. Validate email body (text or HTML)
    var htmlBody = data.htmlBody ? String(data.htmlBody) : "";
    var textBody = data.textBody ? String(data.textBody) : "";
    if (!htmlBody && !textBody) {
      return createJsonResponse({
        success: false,
        error: "Invalid request: Either 'htmlBody' or 'textBody' is required."
      });
    }

    // 7. Process CC list (if provided)
    var ccList = [];
    if (data.cc) {
      if (Array.isArray(data.cc)) {
        for (var i = 0; i < data.cc.length; i++) {
          var email = String(data.cc[i]).trim();
          if (email && isValidEmail(email) && email.toLowerCase() !== to.toLowerCase()) {
            ccList.push(email);
          }
        }
      } else if (typeof data.cc === "string" && data.cc.trim().length > 0) {
        var rawTokens = data.cc.split(",");
        for (var j = 0; j < rawTokens.length; j++) {
          var token = rawTokens[j].trim();
          if (token && isValidEmail(token) && token.toLowerCase() !== to.toLowerCase()) {
            ccList.push(token);
          }
        }
      }
    }

    // Deduplicate CC list
    var uniqueCc = [];
    for (var k = 0; k < ccList.length; k++) {
      if (uniqueCc.indexOf(ccList[k]) === -1) {
        uniqueCc.push(ccList[k]);
      }
    }

    // 8. Process BCC list (if provided)
    var bccList = [];
    if (data.bcc) {
      if (Array.isArray(data.bcc)) {
        for (var b = 0; b < data.bcc.length; b++) {
          var bccEmail = String(data.bcc[b]).trim();
          if (bccEmail && isValidEmail(bccEmail) && bccEmail.toLowerCase() !== to.toLowerCase() && uniqueCc.indexOf(bccEmail) === -1) {
            bccList.push(bccEmail);
          }
        }
      } else if (typeof data.bcc === "string" && data.bcc.trim().length > 0) {
        var rawBccTokens = data.bcc.split(",");
        for (var m = 0; m < rawBccTokens.length; m++) {
          var bccToken = rawBccTokens[m].trim();
          if (bccToken && isValidEmail(bccToken) && bccToken.toLowerCase() !== to.toLowerCase() && uniqueCc.indexOf(bccToken) === -1) {
            bccList.push(bccToken);
          }
        }
      }
    }

    // Deduplicate BCC list
    var uniqueBcc = [];
    for (var n = 0; n < bccList.length; n++) {
      if (uniqueBcc.indexOf(bccList[n]) === -1) {
        uniqueBcc.push(bccList[n]);
      }
    }

    // 9. Process attachments (if provided) - Strict PDF validation
    var blobs = [];
    var attachmentNames = [];
    var totalAttachmentBytes = 0;

    if (data.attachments !== undefined && data.attachments !== null) {
      if (!Array.isArray(data.attachments)) {
        return createJsonResponse({
          success: false,
          error: "Invalid request: 'attachments' must be an array."
        });
      }

      if (data.attachments.length > MAX_ATTACHMENT_COUNT) {
        return createJsonResponse({
          success: false,
          error: "Invalid request: Maximum " + MAX_ATTACHMENT_COUNT + " attachments allowed per email."
        });
      }

      for (var a = 0; a < data.attachments.length; a++) {
        var att = data.attachments[a];
        if (!att || typeof att !== "object") {
          return createJsonResponse({
            success: false,
            error: "Invalid attachment object at index " + a + "."
          });
        }

        var filename = att.filename ? String(att.filename).trim() : "";
        if (!filename) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Filename is required for attachment at index " + a + "."
          });
        }

        // Sanitize filename & enforce .pdf extension
        filename = filename.replace(/[/\\?%*:|"<>]/g, "_");
        if (!/\.pdf$/i.test(filename)) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Only PDF attachments are permitted ('" + filename + "')."
          });
        }

        var mimeType = att.mimeType ? String(att.mimeType).trim().toLowerCase() : "application/pdf";
        if (mimeType !== "application/pdf") {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Invalid MIME type '" + mimeType + "'. Only 'application/pdf' is permitted."
          });
        }

        var base64Data = att.base64Data ? String(att.base64Data).trim() : "";
        if (!base64Data) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Empty base64Data for attachment '" + filename + "'."
          });
        }

        // Strip data URI scheme prefix if included (e.g. "data:application/pdf;base64,")
        if (base64Data.indexOf(",") > -1) {
          base64Data = base64Data.split(",")[1].trim();
        }

        // Quick pre-decode size estimation (Base64 character length * 0.75)
        var estimatedDecodedSize = Math.floor((base64Data.length * 3) / 4);
        if (estimatedDecodedSize > (MAX_SINGLE_ATTACHMENT_BYTES * 1.05)) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Attachment '" + filename + "' exceeds maximum size limit of 10 MB."
          });
        }

        var decodedBytes;
        try {
          decodedBytes = Utilities.base64Decode(base64Data);
        } catch (decodeErr) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Corrupted or invalid base64 encoding for attachment '" + filename + "'."
          });
        }

        if (!decodedBytes || decodedBytes.length === 0) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Decoded attachment '" + filename + "' is empty."
          });
        }

        // Validate PDF magic header: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
        if (decodedBytes.length < 5) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: File '" + filename + "' is too small to be a valid PDF."
          });
        }

        var magicHeader = String.fromCharCode(
          decodedBytes[0] & 0xFF,
          decodedBytes[1] & 0xFF,
          decodedBytes[2] & 0xFF,
          decodedBytes[3] & 0xFF,
          decodedBytes[4] & 0xFF
        );

        if (magicHeader !== "%PDF-") {
          return createJsonResponse({
            success: false,
            error: "Attachment error: File '" + filename + "' does not contain a valid PDF magic header (%PDF-)."
          });
        }

        if (decodedBytes.length > MAX_SINGLE_ATTACHMENT_BYTES) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Attachment '" + filename + "' exceeds maximum size limit of 10 MB."
          });
        }

        totalAttachmentBytes += decodedBytes.length;
        if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENTS_BYTES) {
          return createJsonResponse({
            success: false,
            error: "Attachment error: Total attachments size exceeds aggregate limit of 20 MB."
          });
        }

        var blob = Utilities.newBlob(decodedBytes, "application/pdf", filename);
        blobs.push(blob);
        attachmentNames.push(filename);
      }
    }

    // 10. Construct MailApp options
    var mailOptions = {
      to: to,
      subject: subject,
      body: textBody || "Please view this email in an HTML-compatible email reader.",
      name: data.senderName ? String(data.senderName).trim() : "NEC Service Management"
    };

    if (htmlBody) {
      mailOptions.htmlBody = htmlBody;
    }

    if (uniqueCc.length > 0) {
      mailOptions.cc = uniqueCc.join(", ");
    }

    if (uniqueBcc.length > 0) {
      mailOptions.bcc = uniqueBcc.join(", ");
    }

    if (blobs.length > 0) {
      mailOptions.attachments = blobs;
    }

    // 11. Dispatch via built-in MailApp
    MailApp.sendEmail(mailOptions);

    // 12. Return structured success response (never expose secret or base64)
    var responseData = {
      success: true,
      message: blobs.length > 0
        ? "Email with " + blobs.length + " attachment(s) accepted and dispatched successfully."
        : "Email accepted and dispatched successfully.",
      recipient: to,
      ccCount: uniqueCc.length,
      bccCount: uniqueBcc.length,
      attachmentCount: blobs.length,
      attachmentNames: attachmentNames,
      timestamp: new Date().toISOString()
    };

    if (data.idempotencyKey) {
      responseData.idempotencyKey = String(data.idempotencyKey).trim();
    }

    return createJsonResponse(responseData);

  } catch (error) {
    // Sanitized error handling - never leak secret or attachment contents
    var errorMessage = error && error.message ? error.message : String(error);
    return createJsonResponse({
      success: false,
      error: "Apps Script dispatch error: " + errorMessage
    });
  }
}

/**
 * Validates standard email address format
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Helper to construct JSON response
 */
function createJsonResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
