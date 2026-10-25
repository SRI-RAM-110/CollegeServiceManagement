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
 * 4. Privacy:
 *    - The shared secret is NEVER returned in responses or logged to execution logs.
 *    - Responses return structured JSON: { "success": true, "message": "...", "timestamp": "..." }
 *      or { "success": false, "error": "..." }
 */

// Property key stored in Project Settings > Script Properties
var SCRIPT_PROP_SECRET = "RELAY_SECRET";

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
    timestamp: new Date().toISOString()
  });
}

/**
 * Handles HTTP POST requests - Authenticated Email Dispatch
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

    // 8. Construct MailApp options
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

    // 9. Dispatch via built-in MailApp
    MailApp.sendEmail(mailOptions);

    // 10. Return success response (never expose secret)
    return createJsonResponse({
      success: true,
      message: "Email accepted and dispatched successfully.",
      recipient: to,
      ccCount: uniqueCc.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Sanitized error handling - never leak secret
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
