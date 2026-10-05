const fs = require('fs');
const { request, login } = require('./api_helper.js');

async function runVerification() {
  const results = {
    loginTests: [],
    authTests: [],
    deptConsistency: [],
    isolationTests: []
  };

  console.log('====================================================');
  console.log('1. FUNCTIONAL LOGIN TEST FOR ALL 27 USERS');
  console.log('====================================================');

  const testAccounts = [
    // AO Admin
    { userId: 'AO001', pass: 'admin123', expectedRole: 'AO_ADMIN', expectedDept: 'ADMIN', category: 'AO Admin' },
    // Department Users
    { userId: 'CSE001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'CSE', category: 'Department User' },
    { userId: 'ECE001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'ECE', category: 'Department User' },
    { userId: 'EEE001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'EEE', category: 'Department User' },
    { userId: 'ME001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'ME', category: 'Department User' },
    { userId: 'CIVIL001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'CIVIL', category: 'Department User' },
    { userId: 'AI001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'AI', category: 'Department User' },
    { userId: 'MBA001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'MBA', category: 'Department User' },
    { userId: 'PHARM001', pass: 'dept123', expectedRole: 'DEPARTMENT_USER', expectedDept: 'PHARM', category: 'Department User' },
    // HOD Users
    { userId: 'csehod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'CSE', category: 'HOD User' },
    { userId: 'ecehod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'ECE', category: 'HOD User' },
    { userId: 'eeehod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'EEE', category: 'HOD User' },
    { userId: 'mechhod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'ME', category: 'HOD User' },
    { userId: 'civilhod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'CIVIL', category: 'HOD User' },
    { userId: 'aihod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'AI', category: 'HOD User' },
    { userId: 'mbahod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'MBA', category: 'HOD User' },
    { userId: 'pharmhod', pass: 'dept123', expectedRole: 'DEPARTMENT_HOD', expectedDept: 'PHARM', category: 'HOD User' },
    // Service Admins
    { userId: 'SEM001', pass: 'admin123', expectedRole: 'SEMINAR_ADMIN', expectedDept: 'SEMINAR', category: 'Service Admin' },
    { userId: 'ACC001', pass: 'admin123', expectedRole: 'ACCOMMODATION_ADMIN', expectedDept: 'HOSTEL', category: 'Service Admin' },
    { userId: 'TRN001', pass: 'admin123', expectedRole: 'TRANSPORT_ADMIN', expectedDept: 'TRANSPORT', category: 'Service Admin' },
    { userId: 'STA001', pass: 'admin123', expectedRole: 'STATIONERY_ADMIN', expectedDept: 'STORE', category: 'Service Admin' },
    { userId: 'MEA001', pass: 'admin123', expectedRole: 'MEALS_ADMIN', expectedDept: 'CANTEEN', category: 'Service Admin' },
    // Seminar Coordinators
    { userId: 'seminarcoordinator1', pass: 'coord123', expectedRole: 'SEMINAR_COORDINATOR', expectedDept: 'CSE', category: 'Seminar Coordinator' },
    { userId: 'seminarcoordinator2', pass: 'coord123', expectedRole: 'SEMINAR_COORDINATOR', expectedDept: 'ECE', category: 'Seminar Coordinator' },
    { userId: 'seminarcoordinator3', pass: 'coord123', expectedRole: 'SEMINAR_COORDINATOR', expectedDept: 'ME', category: 'Seminar Coordinator' },
    { userId: 'seminarcoordinator4', pass: 'coord123', expectedRole: 'SEMINAR_COORDINATOR', expectedDept: 'PHARM', category: 'Seminar Coordinator' },
    { userId: 'seminarcoordinator5', pass: 'coord123', expectedRole: 'SEMINAR_COORDINATOR', expectedDept: 'AI', category: 'Seminar Coordinator' }
  ];

  const loggedInTokens = {};

  for (const acc of testAccounts) {
    try {
      const auth = await login(acc.userId, acc.pass);
      const user = auth.user;
      loggedInTokens[acc.userId] = auth.token;

      const roleMatch = user.role === acc.expectedRole || (user.roles && user.roles.includes(acc.expectedRole));
      const deptMatch = user.department === acc.expectedDept;
      const hasToken = !!auth.token;

      // Also test dashboard endpoint access for this user
      const dashRes = await request('http://localhost:8080/api/dashboard', {
        headers: { Authorization: 'Bearer ' + auth.token }
      });
      const dashOk = dashRes.status === 200;

      const passed = roleMatch && deptMatch && hasToken && dashOk;
      results.loginTests.push({
        userId: acc.userId,
        category: acc.category,
        role: user.role,
        department: user.department,
        status: passed ? 'PASS' : 'FAIL',
        details: `Token: ${hasToken}, RoleMatch: ${roleMatch}, DeptMatch: ${deptMatch}, Dashboard: ${dashRes.status}`
      });

      console.log(`[LOGIN] ${acc.userId.padEnd(20)} | Role: ${user.role.padEnd(20)} | Dept: ${user.department.padEnd(8)} | Dashboard: ${dashRes.status} -> ${passed ? 'PASS' : 'FAIL'}`);
    } catch (err) {
      results.loginTests.push({
        userId: acc.userId,
        category: acc.category,
        status: 'FAIL',
        details: err.message
      });
      console.log(`[LOGIN] ${acc.userId.padEnd(20)} | ERROR: ${err.message} -> FAIL`);
    }
  }

  console.log('\n====================================================');
  console.log('2. AUTHORIZATION BOUNDARY TESTS');
  console.log('====================================================');

  // Test 2.1: Department User (CSE001) cannot access AO Admin /api/admin/users
  const deptUserToken = loggedInTokens['CSE001'];
  const deptAdminUsersRes = await request('http://localhost:8080/api/admin/users', {
    headers: { Authorization: 'Bearer ' + deptUserToken }
  });
  const deptBlockedFromAdminUsers = deptAdminUsersRes.status === 403 || deptAdminUsersRes.status === 401;
  results.authTests.push({
    test: 'Department User blocked from /api/admin/users',
    expected: '403 Forbidden',
    actual: deptAdminUsersRes.status,
    pass: deptBlockedFromAdminUsers
  });
  console.log(`[AUTH] Department User -> /api/admin/users: status=${deptAdminUsersRes.status} (Expected 403) -> ${deptBlockedFromAdminUsers ? 'PASS' : 'FAIL'}`);

  // Test 2.2: AO Admin (AO001) can access /api/admin/users
  const aoToken = loggedInTokens['AO001'];
  const aoAdminUsersRes = await request('http://localhost:8080/api/admin/users', {
    headers: { Authorization: 'Bearer ' + aoToken }
  });
  const aoCanAccessUsers = aoAdminUsersRes.status === 200;
  results.authTests.push({
    test: 'AO Admin can access /api/admin/users',
    expected: '200 OK',
    actual: aoAdminUsersRes.status,
    pass: aoCanAccessUsers
  });
  console.log(`[AUTH] AO Admin -> /api/admin/users: status=${aoAdminUsersRes.status} (Expected 200) -> ${aoCanAccessUsers ? 'PASS' : 'FAIL'}`);

  // Test 2.3: Service Admin (TRN001) blocked from /api/admin/users
  const trnToken = loggedInTokens['TRN001'];
  const trnAdminUsersRes = await request('http://localhost:8080/api/admin/users', {
    headers: { Authorization: 'Bearer ' + trnToken }
  });
  const trnBlockedFromUsers = trnAdminUsersRes.status === 403 || trnAdminUsersRes.status === 401;
  results.authTests.push({
    test: 'Transport Admin blocked from /api/admin/users',
    expected: '403 Forbidden',
    actual: trnAdminUsersRes.status,
    pass: trnBlockedFromUsers
  });
  console.log(`[AUTH] Transport Admin -> /api/admin/users: status=${trnAdminUsersRes.status} (Expected 403) -> ${trnBlockedFromUsers ? 'PASS' : 'FAIL'}`);

  // Test 2.4: Seminar Coordinator (seminarcoordinator1) gets assigned halls (SH-1)
  const coordToken = loggedInTokens['seminarcoordinator1'];
  const coordHallsRes = await request('http://localhost:8080/api/seminar/halls/my', {
    headers: { Authorization: 'Bearer ' + coordToken }
  });
  const coordHalls = coordHallsRes.body.data || coordHallsRes.body || [];
  const coordHallsMatch = coordHalls.some(h => (h.hallId || h.id) === 'SH-1');
  results.authTests.push({
    test: 'Seminar Coordinator 1 receives assigned hall SH-1',
    expected: 'Contains SH-1',
    actual: coordHalls.map(h => h.hallId || h.id).join(', '),
    pass: coordHallsMatch
  });
  console.log(`[AUTH] Coordinator 1 -> /api/seminar/halls/my: ${coordHalls.map(h => h.hallId || h.id).join(', ')} -> ${coordHallsMatch ? 'PASS' : 'FAIL'}`);

  console.log('\n====================================================');
  console.log('3. DEPARTMENT CONSISTENCY & FILTERING TESTS');
  console.log('====================================================');

  const deptsRes = await request('http://localhost:8080/api/departments', {
    headers: { Authorization: 'Bearer ' + aoToken }
  });
  const depts = deptsRes.body.data || deptsRes.body || [];
  const canonicalCodes = ['CSE', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'MBA', 'PHARM'];
  const existingCodes = depts.map(d => d.code);

  const allCodesMatch = canonicalCodes.every(c => existingCodes.includes(c)) && existingCodes.length === 8;
  console.log(`[DEPTS] Canonical 8 codes present: ${allCodesMatch ? 'PASS' : 'FAIL'} (${existingCodes.join(', ')})`);

  // Test department filtering on unified requests endpoint
  const deptFilterRes = await request('http://localhost:8080/api/requests/all?department=CSE', {
    headers: { Authorization: 'Bearer ' + aoToken }
  });
  const cseReqs = deptFilterRes.body.data || deptFilterRes.body || [];
  const allAreCse = cseReqs.every(r => r.department === 'CSE');
  console.log(`[DEPTS] /api/requests/all?department=CSE returned ${cseReqs.length} requests, all CSE: ${allAreCse ? 'PASS' : 'FAIL'}`);

  console.log('\n====================================================');
  console.log('4. HISTORICAL DATA INTEGRITY TEST');
  console.log('====================================================');

  const allReqRes = await request('http://localhost:8080/api/requests/all', {
    headers: { Authorization: 'Bearer ' + aoToken }
  });
  const totalReqs = (allReqRes.body.data || allReqRes.body || []).length;
  console.log(`[HISTORY] Total unified requests count: ${totalReqs} (Expected: 45) -> ${totalReqs === 45 ? 'PASS' : 'FAIL'}`);

  console.log('\n====================================================');
  console.log('5. USER-SPECIFIC REQUEST & EVENT ISOLATION TESTS');
  console.log('====================================================');

  const csehodToken = loggedInTokens['csehod'];
  const ecehodToken = loggedInTokens['ecehod'];

  // Test 5.0: csehod is blocked from /api/requests/all (AO_ADMIN only)
  const csehodAllRes = await request('http://localhost:8080/api/requests/all', {
    headers: { Authorization: 'Bearer ' + csehodToken }
  });
  console.log(`[AUTH] Department HOD -> /api/requests/all: status=${csehodAllRes.status} (Expected 403) -> ${csehodAllRes.status === 403 ? 'PASS' : 'FAIL'}`);

  // Test 5.1: csehod requests isolation via /api/requests/my
  const csehodReqRes = await request('http://localhost:8080/api/requests/my', {
    headers: { Authorization: 'Bearer ' + csehodToken }
  });
  const csehodReqs = csehodReqRes.body.data || csehodReqRes.body || [];
  const csehodOnly = csehodReqs.every(r => (r.userId || r.requestedBy) === 'csehod' || r.userId === 'csehod' || r.userName === 'Dr. S. N. Thirumala Rao');

  // Test 5.2: ecehod requests isolation via /api/requests/my
  const ecehodReqRes = await request('http://localhost:8080/api/requests/my', {
    headers: { Authorization: 'Bearer ' + ecehodToken }
  });
  const ecehodReqs = ecehodReqRes.body.data || ecehodReqRes.body || [];
  const ecehodOnly = ecehodReqs.every(r => (r.userId || r.requestedBy) === 'ecehod' || r.userId === 'ecehod' || r.userName === 'Dr. V. Venkata Rao');

  // Test 5.3: cross-user isolation
  const noCseInEce = !ecehodReqs.some(r => (r.userId || r.requestedBy) === 'csehod' || r.userName === 'Dr. S. N. Thirumala Rao');
  const noEceInCse = !csehodReqs.some(r => (r.userId || r.requestedBy) === 'ecehod' || r.userName === 'Dr. V. Venkata Rao');

  // Test 5.4: upcoming events isolation
  const cseUpcomingRes = await request('http://localhost:8080/api/dashboard/upcoming', {
    headers: { Authorization: 'Bearer ' + csehodToken }
  });
  const eceUpcomingRes = await request('http://localhost:8080/api/dashboard/upcoming', {
    headers: { Authorization: 'Bearer ' + ecehodToken }
  });
  const cseUpcoming = cseUpcomingRes.body.data || cseUpcomingRes.body || [];
  const eceUpcoming = eceUpcomingRes.body.data || eceUpcomingRes.body || [];

  const cseUpcomingClean = cseUpcoming.every(r => r.userId === 'csehod' || r.userName === 'Dr. S. N. Thirumala Rao');
  const eceUpcomingClean = eceUpcoming.every(r => r.userId === 'ecehod' || r.userName === 'Dr. V. Venkata Rao');

  const isolationPass = csehodOnly && ecehodOnly && noCseInEce && noEceInCse && cseUpcomingClean && eceUpcomingClean;
  console.log(`[ISOLATION] Requests csehod count: ${csehodReqs.length}, ecehod count: ${ecehodReqs.length}`);
  console.log(`[ISOLATION] No cross-user leakage in requests: ${noCseInEce && noEceInCse ? 'PASS' : 'FAIL'}`);
  console.log(`[ISOLATION] Upcoming events csehod count: ${cseUpcoming.length}, ecehod count: ${eceUpcoming.length}`);
  console.log(`[ISOLATION] Upcoming events user-specific isolation: ${cseUpcomingClean && eceUpcomingClean ? 'PASS' : 'FAIL'}`);


  fs.writeFileSync('audit_verification_results.json', JSON.stringify({
    results,
    totalUsersTested: testAccounts.length,
    loginPassCount: results.loginTests.filter(t => t.status === 'PASS').length,
    authPassCount: results.authTests.filter(t => t.pass).length,
    totalUnifiedRequests: totalReqs
  }, null, 2));

  console.log('\nVerification suite completed successfully.');
}

runVerification().catch(console.error);
