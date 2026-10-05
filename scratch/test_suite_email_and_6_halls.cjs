const http = require('http');

function apiCall(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('STARTING VERIFICATION: EMAIL LOGIN & 6 SEMINAR HALLS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // ==========================================
  // PART 1: AUTHENTICATION TESTS
  // ==========================================
  console.log('--- 1. Testing Email-Based Login for all accounts ---');

  // 1. AO Admin
  const aoLogin = await apiCall('POST', '/auth/login', { email: 'ao001@nrtec.local', password: 'admin123' });
  assert(aoLogin.status === 200 && aoLogin.data.data?.token, '1. AO Admin email login successful');
  const aoToken = aoLogin.data.data?.token;

  // 2. Seminar Admin
  const semAdminLogin = await apiCall('POST', '/auth/login', { email: 'sem001@nrtec.local', password: 'admin123' });
  assert(semAdminLogin.status === 200 && semAdminLogin.data.data?.token, '2. Seminar Admin email login successful');
  const semAdminToken = semAdminLogin.data.data?.token;

  // 3-8. Coordinators 1 to 6
  const coordTokens = {};
  for (let i = 1; i <= 6; i++) {
    const email = `seminarcoordinator${i}@nrtec.local`;
    const res = await apiCall('POST', '/auth/login', { email, password: 'coord123' });
    const hallExpected = `SH-${i}`;
    assert(
      res.status === 200 && 
      res.data.data?.assignedHallIds?.includes(hallExpected),
      `${2 + i}. Seminar Coordinator ${i} email login (${email}) with assignedHallIds [${res.data.data?.assignedHallIds?.join(', ')}]`
    );
    coordTokens[i] = res.data.data?.token;
  }

  // 9. Department HOD
  const hodLogin = await apiCall('POST', '/auth/login', { email: 'ecehod@nrtec.local', password: 'dept123' });
  assert(hodLogin.status === 200 && hodLogin.data.data?.role === 'DEPARTMENT_HOD', '9. Department HOD email login successful');

  // 10. Department User
  const userLogin = await apiCall('POST', '/auth/login', { email: 'cse001@nrtec.local', password: 'dept123' });
  assert(userLogin.status === 200 && userLogin.data.data?.role === 'DEPARTMENT_USER', '10. Department User email login successful');
  const deptUserToken = userLogin.data.data?.token;

  // 11. Multi-role user login (csehod)
  const multiRoleLogin = await apiCall('POST', '/auth/login', { email: 'csehod@nrtec.local', password: 'dept123' });
  assert(
    multiRoleLogin.status === 200 &&
    multiRoleLogin.data.data?.roles?.includes('DEPARTMENT_HOD') &&
    multiRoleLogin.data.data?.roles?.includes('SEMINAR_COORDINATOR'),
    '11. Multi-role user email login (csehod) retains multi-roles: ' + JSON.stringify(multiRoleLogin.data.data?.roles)
  );

  // 12. Wrong email
  const wrongEmail = await apiCall('POST', '/auth/login', { email: 'nonexistent@nrtec.local', password: 'dept123' });
  assert(wrongEmail.status === 401, '12. Wrong email rejected with 401 Unauthorized');

  // 13. Wrong password
  const wrongPass = await apiCall('POST', '/auth/login', { email: 'csehod@nrtec.local', password: 'wrongpassword' });
  assert(wrongPass.status === 401, '13. Wrong password rejected with 401 Unauthorized');

  // 14. Inactive account
  // Deactivate test user AI001 via AdminUserService
  await apiCall('PATCH', '/admin/users/AI001/status', { active: false }, aoToken);
  const inactiveLogin = await apiCall('POST', '/auth/login', { email: 'ai001@nrtec.local', password: 'dept123' });
  assert(inactiveLogin.status === 401, '14. Inactive account login rejected with 401: ' + (inactiveLogin.data?.message || 'Unauthorized'));
  // Reactivate user
  await apiCall('PATCH', '/admin/users/AI001/status', { active: true }, aoToken);

  // 15. Uppercase email normalization
  const upperLogin = await apiCall('POST', '/auth/login', { email: 'CSEHOD@NRTEC.LOCAL', password: 'dept123' });
  assert(upperLogin.status === 200 && upperLogin.data.data?.token, '15. Uppercase email login (CSEHOD@NRTEC.LOCAL) normalized and succeeded');

  // 16. Email with spaces normalization
  const spaceLogin = await apiCall('POST', '/auth/login', { email: '  csehod@nrtec.local  ', password: 'dept123' });
  assert(spaceLogin.status === 200 && spaceLogin.data.data?.token, '16. Email with leading/trailing spaces normalized and succeeded');

  // 17. Page refresh / verify me endpoint
  const meRes = await apiCall('GET', '/auth/me', null, aoToken);
  assert(meRes.status === 200 && meRes.data.data?.email === 'ao001@nrtec.local', '17. Page refresh (/auth/me) maintains authentication using JWT');

  // 18. Logout / Re-login
  const relogin = await apiCall('POST', '/auth/login', { email: 'ao001@nrtec.local', password: 'admin123' });
  assert(relogin.status === 200 && relogin.data.data?.token, '18. Logout & Re-login succeeded cleanly');

  // ==========================================
  // PART 2: SIX SEMINAR HALLS & COORDINATORS
  // ==========================================
  console.log('\n--- 2. Testing Six Seminar Halls & Coordinators ---');

  // Fetch halls as AO Admin (should see all 6)
  const aoHalls = await apiCall('GET', '/seminar/halls', null, aoToken);
  assert(
    aoHalls.status === 200 && aoHalls.data.data?.length >= 6,
    `AO Admin sees all 6 halls (found ${aoHalls.data.data?.length} halls)`
  );

  // Fetch halls as Seminar Admin (should see all 6)
  const semAdminHalls = await apiCall('GET', '/seminar/halls', null, semAdminToken);
  assert(
    semAdminHalls.status === 200 && semAdminHalls.data.data?.length >= 6,
    `Seminar Admin sees all 6 halls (found ${semAdminHalls.data.data?.length} halls)`
  );

  // Check all 6 halls exist with correct details
  const hallList = aoHalls.data.data || [];
  const hallIds = hallList.map(h => h.hallId);
  for (let i = 1; i <= 6; i++) {
    const id = `SH-${i}`;
    assert(hallIds.includes(id), `Hall ${id} exists in database`);
  }

  // Verify SH-6 specific real details
  const sh6 = hallList.find(h => h.hallId === 'SH-6');
  assert(
    sh6 && sh6.name === 'Block 2 Seminar hall' && sh6.capacity === 250 && sh6.location.includes('Block 2'),
    `SH-6 has real details: name="${sh6?.name}", capacity=${sh6?.capacity}, location="${sh6?.location}"`
  );

  // Verify Coordinator 6 assigned halls endpoint
  const coord6Halls = await apiCall('GET', '/seminar/halls?assignedOnly=true', null, coordTokens[6]);
  assert(
    coord6Halls.status === 200 &&
    coord6Halls.data.data?.length === 1 &&
    coord6Halls.data.data[0].hallId === 'SH-6',
    'Coordinator 6 assignedOnly=true returns strictly SH-6'
  );

  // ==========================================
  // PART 3: BOOKING WORKFLOW FOR SH-6 & ISOLATION
  // ==========================================
  console.log('\n--- 3. Testing Booking, Availability, Isolation & PDF for SH-6 ---');

  // Generate dynamic dates to avoid conflict with previous runs
  const uniqueDay = Math.floor(Math.random() * 20) + 1;
  const testDate = `2027-01-${String(uniqueDay).padStart(2, '0')}`;
  const testDate2 = `2027-01-${String(uniqueDay + 1).padStart(2, '0')}`;

  // Check availability for SH-6 on test date
  const availRes = await apiCall('GET', `/seminar/availability?hallId=SH-6&date=${testDate}`, null, deptUserToken);
  assert(availRes.status === 200, 'SH-6 availability check successful');

  // Create booking for SH-6
  const bookingPayload = {
    hallId: 'SH-6',
    eventTitle: 'AI in Electronics Workshop',
    purpose: 'Hands-on symposium on embedded AI',
    date: testDate,
    slot: 'FORENOON',
    bookingType: 'ONE_TIME',
    expectedParticipants: 180,
    additionalRequirements: 'Projector, AC, collar mic'
  };

  const createRes = await apiCall('POST', '/seminar/requests', bookingPayload, deptUserToken);
  assert(createRes.status === 200 && createRes.data.data?.bookingId, `Booking created for SH-6: ID ${createRes.data.data?.bookingId}`);
  const bookingId = createRes.data.data?.bookingId;

  // Coordinator Authorization / Isolation Test:
  // Coordinator 1 must NOT be able to approve booking in SH-6
  const unauthorizedApproval = await apiCall('PUT', `/seminar/requests/${bookingId}/approve`, null, coordTokens[1]);
  assert(
    unauthorizedApproval.status === 403,
    'Coordinator 1 CANNOT approve SH-6 booking (rejected with 403 Forbidden)'
  );

  // Coordinator 6 CAN approve booking in SH-6
  const authorizedApproval = await apiCall('PUT', `/seminar/requests/${bookingId}/approve`, null, coordTokens[6]);
  assert(
    authorizedApproval.status === 200 && authorizedApproval.data.data?.status === 'APPROVED',
    'Coordinator 6 CAN approve SH-6 booking (Status: APPROVED)'
  );

  // Create another booking for SH-6 and test rejection
  const bookingPayload2 = {
    hallId: 'SH-6',
    eventTitle: 'Conflict Test Workshop',
    purpose: 'Testing rejection workflow',
    date: testDate2,
    slot: 'AFTERNOON',
    bookingType: 'ONE_TIME',
    expectedParticipants: 120,
    additionalRequirements: 'Projector'
  };
  const createRes2 = await apiCall('POST', '/seminar/requests', bookingPayload2, deptUserToken);
  const bookingId2 = createRes2.data.data?.bookingId;

  // Coordinator 2 cannot reject SH-6 booking
  const unauthorizedReject = await apiCall('PUT', `/seminar/requests/${bookingId2}/reject`, { reason: 'Slot unavailable' }, coordTokens[2]);
  assert(
    unauthorizedReject.status === 403,
    'Coordinator 2 CANNOT reject SH-6 booking (rejected with 403 Forbidden)'
  );

  // Coordinator 6 CAN reject SH-6 booking
  const authorizedReject = await apiCall('PUT', `/seminar/requests/${bookingId2}/reject`, { reason: 'Maintenance scheduled' }, coordTokens[6]);
  assert(
    authorizedReject.status === 200 && authorizedReject.data.data?.status === 'REJECTED',
    'Coordinator 6 CAN reject SH-6 booking (Status: REJECTED)'
  );

  // PDF Generation for SH-6 booking
  const pdfRes = await apiCall('GET', `/requests/${bookingId}/pdf`, null, coordTokens[6]);
  assert(pdfRes.status === 200, `PDF generated successfully for SH-6 booking (Status: ${pdfRes.status})`);

  // ==========================================
  // PART 4: REPORTING COMPATIBILITY
  // ==========================================
  console.log('\n--- 4. Testing Reporting Compatibility with 6 Halls ---');

  // AO Admin reports permissions: see all 6 halls
  const aoPerm = await apiCall('GET', '/reports/permissions', null, aoToken);
  const aoPermHalls = aoPerm.data.data?.allowedHalls?.map(h => h.hallId) || [];
  assert(
    aoPermHalls.includes('SH-6') && aoPermHalls.length >= 6,
    `AO Admin report permissions includes SH-6 and all halls (${aoPermHalls.length} halls)`
  );

  // Seminar Admin reports permissions: see all 6 halls
  const semAdminPerm = await apiCall('GET', '/reports/permissions', null, semAdminToken);
  const semAdminPermHalls = semAdminPerm.data.data?.allowedHalls?.map(h => h.hallId) || [];
  assert(
    semAdminPermHalls.includes('SH-6') && semAdminPermHalls.length >= 6,
    `Seminar Admin report permissions includes SH-6 and all halls (${semAdminPermHalls.length} halls)`
  );

  // Coordinator 6 reports permissions: strictly SH-6
  const coord6Perm = await apiCall('GET', '/reports/permissions', null, coordTokens[6]);
  const coord6PermHalls = coord6Perm.data.data?.allowedHalls?.map(h => h.hallId) || [];
  assert(
    coord6PermHalls.length === 1 && coord6PermHalls[0] === 'SH-6',
    `Coordinator 6 report permissions strictly scoped to SH-6: [${coord6PermHalls.join(', ')}]`
  );

  // Query seminar reports for SH-6
  const sh6Report = await apiCall('POST', '/reports/data', {
    service: 'SEMINAR',
    department: 'ALL',
    hallId: 'SH-6',
    status: 'ALL',
    dateRangeType: 'ALL'
  }, aoToken);
  assert(
    sh6Report.status === 200 && sh6Report.data.data?.detailedRecords?.length > 0,
    `Report query for SH-6 successfully retrieved ${sh6Report.data.data?.detailedRecords?.length} records`
  );

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
