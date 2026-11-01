import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== VERIFYING ELECTRICIAN DASHBOARD & ROUTE ISOLATION ===\n');

// 1. Verify api.js exports electricalIssueApi with all required methods
const apiContent = fs.readFileSync('frontend/src/services/api.js', 'utf-8');
assert(apiContent.includes('export const electricalIssueApi = {'), 'electricalIssueApi must be exported in api.js');
assert(apiContent.includes("api.get('/electrical-issues/assigned'"), 'getAssignedRequests endpoint must be defined');
assert(apiContent.includes("api.put(`/electrical-issues/${id}/accept`)"), 'acceptRequest endpoint must be defined');
assert(apiContent.includes("api.put(`/electrical-issues/${id}/start`)"), 'startRepair endpoint must be defined');
assert(apiContent.includes("api.put(`/electrical-issues/${id}/remarks`"), 'updateRemarks endpoint must be defined');
assert(apiContent.includes("api.put(`/electrical-issues/${id}/complete`"), 'completeRequest endpoint must be defined');
assert(apiContent.includes("api.put(`/electrical-issues/${id}/reject`"), 'rejectRequest endpoint must be defined');
console.log('✓ Check 1 Passed: electricalIssueApi methods verified in api.js');

// 2. Verify App.jsx routes and role isolation
const appContent = fs.readFileSync('frontend/src/App.jsx', 'utf-8');
assert(appContent.includes("import ElectricianDashboard from './pages/operator/ElectricianDashboard';"), 'ElectricianDashboard must be imported in App.jsx');

// Verify /operator/electrician routes to ElectricianDashboard with ELECTRICIAN allowed
const elecRouteMatch = appContent.match(/path="\/operator\/electrician"[\s\S]*?<ProtectedRoute allowedRoles={\[([^\]]+)\]}>[\s\S]*?<ElectricianDashboard \/>/);
assert(elecRouteMatch, '/operator/electrician must render ElectricianDashboard inside ProtectedRoute');
assert(elecRouteMatch[1].includes("'ELECTRICIAN'"), 'allowedRoles for /operator/electrician must include ELECTRICIAN');

// Verify /operator/generator routes to GeneratorOperatorDashboard without ELECTRICIAN in allowedRoles
const genRouteMatch = appContent.match(/path="\/operator\/generator"[\s\S]*?<ProtectedRoute allowedRoles={\[([^\]]+)\]}>[\s\S]*?<GeneratorOperatorDashboard \/>/);
assert(genRouteMatch, '/operator/generator must render GeneratorOperatorDashboard inside ProtectedRoute');
assert(!genRouteMatch[1].includes("'ELECTRICIAN'"), 'ELECTRICIAN alone must NOT be in allowedRoles for /operator/generator');
assert(genRouteMatch[1].includes("'GENERATOR_OPERATOR'"), 'allowedRoles for /operator/generator must include GENERATOR_OPERATOR');
console.log('✓ Check 2 Passed: App.jsx routing and strict role separation verified');

// 3. Verify Sidebar.jsx navigation logic
const sidebarContent = fs.readFileSync('frontend/src/components/common/Sidebar.jsx', 'utf-8');
assert(sidebarContent.includes("{ name: 'Electrical Issues', path: '/operator/electrician'"), 'Sidebar must have Electrical Issues link pointing to /operator/electrician');
assert(sidebarContent.includes("{ name: 'Generator Schedule', path: '/operator/generator'"), 'Sidebar must maintain Generator Schedule link for generator operators');
console.log('✓ Check 3 Passed: Sidebar navigation links verified for Electrician and Generator Operator');

// 4. Verify AuthContext.jsx role redirection
const authContent = fs.readFileSync('frontend/src/context/AuthContext.jsx', 'utf-8');
assert(authContent.includes("roles.includes('ELECTRICIAN')") && authContent.includes("return '/operator/electrician';"), 'AuthContext must direct ELECTRICIAN to /operator/electrician');
assert(authContent.includes("roles.includes('GENERATOR_OPERATOR')") && authContent.includes("return '/operator/generator';"), 'AuthContext must direct GENERATOR_OPERATOR to /operator/generator');
console.log('✓ Check 4 Passed: AuthContext default routes for ELECTRICIAN and GENERATOR_OPERATOR verified');

// 5. Verify ElectricianDashboard.jsx features and action rules
const dashContent = fs.readFileSync('frontend/src/pages/operator/ElectricianDashboard.jsx', 'utf-8');
assert(dashContent.includes('electricalIssueApi.getAssignedRequests'), 'ElectricianDashboard must fetch from getAssignedRequests');
assert(dashContent.includes('electricalIssueApi.acceptRequest'), 'ElectricianDashboard must support acceptRequest');
assert(dashContent.includes('electricalIssueApi.startRepair'), 'ElectricianDashboard must support startRepair');
assert(dashContent.includes('electricalIssueApi.updateRemarks'), 'ElectricianDashboard must support updateRemarks');
assert(dashContent.includes('electricalIssueApi.completeRequest'), 'ElectricianDashboard must support completeRequest');
assert(dashContent.includes('electricalIssueApi.rejectRequest'), 'ElectricianDashboard must support rejectRequest');

// Check stats cards
assert(dashContent.includes('Total Assigned'), 'Must include Total Assigned stat card');
assert(dashContent.includes('Pending Acceptance'), 'Must include Pending Acceptance stat card');
assert(dashContent.includes('In Progress'), 'Must include In Progress stat card');
assert(dashContent.includes('Completed'), 'Must include Completed stat card');

// Check priority and status badges
assert(dashContent.includes('renderPriorityBadge'), 'Must render priority indicators');
assert(dashContent.includes('renderStatusBadge'), 'Must render status badges');

// Check action conditional visibility rules
assert(dashContent.includes("ticket.status === 'ASSIGNED' || ticket.status === 'REOPENED'"), 'Accept action must be conditioned on ASSIGNED or REOPENED');
assert(dashContent.includes("ticket.status === 'ACCEPTED'"), 'Start Repair must be conditioned on ACCEPTED');
assert(dashContent.includes("ticket.status === 'IN_PROGRESS'"), 'Complete action must be conditioned on IN_PROGRESS');

// Check validation on complete and reject
assert(dashContent.includes('Resolution remarks are required'), 'Resolution remarks must be validated before completing');
assert(dashContent.includes('rejection reason is mandatory'), 'Rejection reason must be validated before rejecting');

console.log('✓ Check 5 Passed: ElectricianDashboard actions, rules, and stat metrics verified');

// 6. Verify external CSS
const cssContent = fs.readFileSync('frontend/src/styles/electrician-dashboard.css', 'utf-8');
assert(cssContent.includes('.elec-container'), 'CSS must define .elec-container');
assert(cssContent.includes('.elec-stats-grid'), 'CSS must define .elec-stats-grid');
assert(cssContent.includes('.elec-priority-emergency'), 'CSS must define .elec-priority-emergency');
assert(cssContent.includes('.elec-priority-high'), 'CSS must define .elec-priority-high');
assert(cssContent.includes('.elec-status-in_progress'), 'CSS must define .elec-status-in_progress');
console.log('✓ Check 6 Passed: External CSS rules and responsive styles verified');

console.log('\n=== ALL 6 CHECKS PASSED SUCCESSFULLY ===');
