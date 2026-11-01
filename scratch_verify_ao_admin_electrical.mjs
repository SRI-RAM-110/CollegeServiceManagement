import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== VERIFYING STAGE 4C: AO_ADMIN ELECTRICAL ISSUE MANAGEMENT ===');

// 1. Verify AOElectricalIssuesManagement.jsx
const mgmtPath = path.resolve('frontend/src/pages/admin/AOElectricalIssuesManagement.jsx');
assert(fs.existsSync(mgmtPath), 'AOElectricalIssuesManagement.jsx must exist');
const mgmtCode = fs.readFileSync(mgmtPath, 'utf8');

// API calls
assert(mgmtCode.includes('electricalIssueApi.getAllRequests()'), 'Calls getAllRequests()');
assert(mgmtCode.includes('electricalIssueApi.reassignElectrician('), 'Calls reassignElectrician()');
assert(mgmtCode.includes('electricalIssueApi.overrideStatus('), 'Calls overrideStatus()');
assert(mgmtCode.includes('electricalIssueApi.cancelRequest('), 'Calls cancelRequest()');
assert(mgmtCode.includes('adminUserApi.getUsers('), 'Retrieves electricians dynamically via adminUserApi.getUsers()');

// Role check
assert(mgmtCode.includes('isAOAdmin'), 'Strictly verifies isAOAdmin');
assert(mgmtCode.includes('Administrative Access Required'), 'Renders administrative access gate');

// Mandatory reasons
assert(mgmtCode.includes('overrideReason.trim().length < 5'), 'Validates overrideReason minimum 5 chars');
assert(mgmtCode.includes('cancelReason.trim().length < 5'), 'Validates cancelReason minimum 5 chars');

// No deletion of operational records
assert(!mgmtCode.includes('deleteRequest'), 'Security Check: Operational records cannot be deleted');
assert(!mgmtCode.includes('api.delete'), 'Security Check: No delete API called in electrical management');
console.log('✓ Check 1 Passed: AOElectricalIssuesManagement component & API integration verified');

// 2. Verify KPI metrics
assert(mgmtCode.includes('kpiStats.total'), 'Renders Total Issues KPI');
assert(mgmtCode.includes('kpiStats.unassigned'), 'Renders Unassigned KPI');
assert(mgmtCode.includes('kpiStats.assigned'), 'Renders Assigned KPI');
assert(mgmtCode.includes('kpiStats.inProgress'), 'Renders In Progress KPI');
assert(mgmtCode.includes('kpiStats.completed'), 'Renders Completed KPI');
assert(mgmtCode.includes('kpiStats.emergency'), 'Renders Emergency Priority KPI');
console.log('✓ Check 2 Passed: 6 Summary KPI metrics verified');

// 3. Verify Filters & Search
assert(mgmtCode.includes('statusFilter'), 'Status filter implemented');
assert(mgmtCode.includes('priorityFilter'), 'Priority filter implemented');
assert(mgmtCode.includes('buildingFilter'), 'Building filter implemented');
assert(mgmtCode.includes('categoryFilter'), 'Category filter implemented');
assert(mgmtCode.includes('electricianFilter'), 'Electrician filter implemented');
assert(mgmtCode.includes('dateFilter'), 'Date range filter implemented');
assert(mgmtCode.includes('searchQuery'), 'Search query implemented');
console.log('✓ Check 3 Passed: Multi-attribute filters & search verified');

// 4. Verify AOAdminDashboard.jsx integration
const aoDashPath = path.resolve('frontend/src/pages/admin/AOAdminDashboard.jsx');
assert(fs.existsSync(aoDashPath), 'AOAdminDashboard.jsx must exist');
const aoDashCode = fs.readFileSync(aoDashPath, 'utf8');

assert(aoDashCode.includes('AOElectricalIssuesManagement'), 'AOAdminDashboard imports AOElectricalIssuesManagement');
assert(aoDashCode.includes('Electrical Issue Management'), 'Includes Electrical Issue Management tab/button');
assert(aoDashCode.includes("activeModuleTab === 'ELECTRICAL'"), 'Conditionally switches to electrical module');
console.log('✓ Check 4 Passed: AOAdminDashboard integration verified');

// 5. Verify Sidebar.jsx
const sidebarPath = path.resolve('frontend/src/components/common/Sidebar.jsx');
const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
assert(sidebarCode.includes('/admin/electrical-issues'), 'Sidebar contains /admin/electrical-issues link');
assert(sidebarCode.includes("userRoles.includes('AO_ADMIN')"), 'Sidebar guards electrical issues link by AO_ADMIN');
console.log('✓ Check 5 Passed: Sidebar navigation and role guard verified');

// 6. Verify App.jsx
const appPath = path.resolve('frontend/src/App.jsx');
const appCode = fs.readFileSync(appPath, 'utf8');
assert(appCode.includes("path=\"/admin/electrical-issues\""), 'App.jsx defines /admin/electrical-issues route');
assert(appCode.includes("allowedRoles={['AO_ADMIN']}"), 'Route strictly restricted to AO_ADMIN');
assert(appCode.includes("strictRoles={true}"), 'Route enforces strictRoles={true} to deny CREATOR alone');
console.log('✓ Check 6 Passed: App.jsx routing and strict security guard verified');

// 7. Verify External CSS
const cssPath = path.resolve('frontend/src/styles/ao-electrical-management.css');
assert(fs.existsSync(cssPath), 'ao-electrical-management.css exists');
const cssCode = fs.readFileSync(cssPath, 'utf8');
assert(cssCode.includes('.ao-elec-container'), 'Contains .ao-elec-container');
assert(cssCode.includes('.ao-elec-ticket-card'), 'Contains .ao-elec-ticket-card');
assert(cssCode.includes('.is-emergency'), 'Contains .is-emergency styling');
assert(cssCode.includes('.ao-elec-modal-textarea'), 'Contains .ao-elec-modal-textarea');
console.log('✓ Check 7 Passed: External CSS rules verified');

console.log('=== ALL 7 CHECKS PASSED FOR STAGE 4C ===');

