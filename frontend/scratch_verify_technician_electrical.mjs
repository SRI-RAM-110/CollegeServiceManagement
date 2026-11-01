import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- Verifying Stage 4B Seminar Technician Electrical Issue Management ---');

const dashboardPath = path.resolve('src/pages/technician/SeminarTechnicianDashboard.jsx');
assert(fs.existsSync(dashboardPath), 'SeminarTechnicianDashboard.jsx exists');
const code = fs.readFileSync(dashboardPath, 'utf8');

// 1. Check API imports
assert(code.includes('electricalIssueApi'), 'Imports electricalIssueApi');
assert(code.includes('../../styles/seminar-technician-electrical.css'), 'Imports seminar-technician-electrical.css');

// 2. Check Tab structure
assert(code.includes('activeMainTab'), 'Defines activeMainTab state');
assert(code.includes('CHECKLIST'), 'Includes CHECKLIST tab option');
assert(code.includes('ELECTRICAL'), 'Includes ELECTRICAL tab option');
assert(code.includes('AV Equipment Checklist'), 'Renders AV Equipment Checklist tab button');
assert(code.includes('Electrical Issues'), 'Renders Electrical Issues tab button');

// 3. Check Sub-tab structure
assert(code.includes('electricalSubTab'), 'Defines electricalSubTab state');
assert(code.includes('MY_ISSUES'), 'Includes MY_ISSUES sub-tab option');
assert(code.includes('REPORT'), 'Includes REPORT sub-tab option');
assert(code.includes('My Electrical Issues'), 'Renders My Electrical Issues sub-tab');
assert(code.includes('Report Electrical Issue'), 'Renders Report Electrical Issue sub-tab');

// 4. Check API integration
assert(code.includes('electricalIssueApi.getMyRequests()'), 'Calls getMyRequests()');
assert(code.includes('electricalIssueApi.createRequest(payload)'), 'Calls createRequest() with clean payload');
assert(code.includes('electricalIssueApi.reopenRequest('), 'Calls reopenRequest()');

// 5. Check Payload sanitization (Reporter identity MUST NOT be sent from frontend)
const submitMatch = code.match(/const payload = \{([\s\S]*?)\};/);
assert(submitMatch, 'Found payload object creation');
const payloadBody = submitMatch[1];
assert(!payloadBody.includes('reportedByUserId'), 'Security Check: payload does NOT send reportedByUserId');
assert(!payloadBody.includes('reportedByName'), 'Security Check: payload does NOT send reportedByName');
assert(!payloadBody.includes('reportedByDepartment'), 'Security Check: payload does NOT send reportedByDepartment');
assert(!payloadBody.includes('reportedByPhone'), 'Security Check: payload does NOT send reportedByPhone');
assert(!payloadBody.includes('status:'), 'Security Check: payload does NOT send status override');
assert(!payloadBody.includes('assignedElectricianId'), 'Security Check: payload does NOT send assignedElectricianId');
console.log('✓ Payload sanitization verified: no reporter identity or status spoofing');

// 6. Check Form Fields
assert(code.includes('locationType'), 'Form has locationType');
assert(code.includes('buildingName'), 'Form has buildingName');
assert(code.includes('floor'), 'Form has floor');
assert(code.includes('roomNumber'), 'Form has roomNumber');
assert(code.includes('specificLocation'), 'Form has specificLocation');
assert(code.includes('issueCategory'), 'Form has issueCategory');
assert(code.includes('priority'), 'Form has priority');
assert(code.includes('description'), 'Form has description');
assert(code.includes('photoUrl'), 'Form has photoUrl');

// 7. Check Priority Options
assert(code.includes("'LOW'"), 'Includes LOW priority');
assert(code.includes("'MEDIUM'"), 'Includes MEDIUM priority');
assert(code.includes("'HIGH'"), 'Includes HIGH priority');
assert(code.includes("'EMERGENCY'"), 'Includes EMERGENCY priority');

// 8. Check Reopen Modal & Validation
assert(code.includes('reopenModalIssue'), 'Includes reopen modal issue state');
assert(code.includes('reopenReason.trim().length < 5'), 'Enforces minimum 5 chars for reopenReason');

// 9. Check Preservation of AV Checklist Logic
assert(code.includes('fetchBookings'), 'Preserves fetchBookings');
assert(code.includes('activeChecklistModal'), 'Preserves activeChecklistModal');
assert(code.includes('handleSaveChecklist'), 'Preserves handleSaveChecklist');
assert(code.includes('handleOpenChecklist'), 'Preserves handleOpenChecklist');

// 10. Check CSS File Existence
const cssPath = path.resolve('src/styles/seminar-technician-electrical.css');
assert(fs.existsSync(cssPath), 'seminar-technician-electrical.css exists');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('.ste-form-card'), 'CSS contains .ste-form-card');
assert(cssContent.includes('.ste-priority-selector'), 'CSS contains .ste-priority-selector');
assert(cssContent.includes('.ste-photo-uploader'), 'CSS contains .ste-photo-uploader');
assert(cssContent.includes('.ste-modal-textarea'), 'CSS contains .ste-modal-textarea');

console.log('✓ All 10 verification assertions passed successfully!');

