const http = require('http');

function apiCall(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (dataString) headers['Content-Length'] = Buffer.byteLength(dataString);

    const options = {
      hostname: '127.0.0.1',
      port: 8080,
      path: `/api${path}`,
      method,
      headers
    };

    const req = http.request(options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let parsed = null;
        try {
          parsed = JSON.parse(raw.toString('utf8'));
        } catch {
          parsed = raw.toString('utf8');
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', err => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
}

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

async function run() {
  console.log('====================================================');
  console.log('STARTING PRINCIPAL & AO VERIFICATION SUITE');
  console.log('====================================================\n');

  // Test A: Principal Login
  console.log('--- Test A: Principal Login ---');
  const principalRes = await apiCall('POST', '/auth/login', {
    email: 'principal@nrtec.in',
    password: 'admin123'
  });
  assert(
    principalRes.status === 200 &&
    principalRes.data.data?.token &&
    principalRes.data.data?.roles?.includes('AO_ADMIN'),
    `A. Principal login successful (Email: ${principalRes.data.data?.email}, Role: ${principalRes.data.data?.role}, Roles: [${principalRes.data.data?.roles?.join(', ')}])`
  );
  const principalToken = principalRes.data.data?.token;

  // Verify Principal Dashboard and Global Privileges
  const principalDash = await apiCall('GET', '/dashboard', null, principalToken);
  assert(principalDash.status === 200, `A1. Principal has full dashboard access (Status: ${principalDash.status})`);

  const principalUsers = await apiCall('GET', '/admin/users', null, principalToken);
  assert(principalUsers.status === 200 && principalUsers.data.data?.length > 0, `A2. Principal can access User Management (${principalUsers.data.data?.length} users returned)`);

  const principalHalls = await apiCall('GET', '/seminar/halls', null, principalToken);
  assert(principalHalls.status === 200 && principalHalls.data.data?.length >= 6, `A3. Principal has global access to all 6 Seminar Halls`);

  // Test B: Administrative Officer Login
  console.log('\n--- Test B: Administrative Officer Login ---');
  const aoRes = await apiCall('POST', '/auth/login', {
    email: 'ao@nrtec.in',
    password: 'admin123'
  });
  assert(
    aoRes.status === 200 &&
    aoRes.data.data?.token &&
    aoRes.data.data?.roles?.includes('AO_ADMIN'),
    `B. AO login successful (Email: ${aoRes.data.data?.email}, Role: ${aoRes.data.data?.role}, Roles: [${aoRes.data.data?.roles?.join(', ')}])`
  );
  const aoToken = aoRes.data.data?.token;

  // Verify AO Dashboard and Global Privileges
  const aoDash = await apiCall('GET', '/dashboard', null, aoToken);
  assert(aoDash.status === 200, `B1. AO has full dashboard access (Status: ${aoDash.status})`);

  const aoUsers = await apiCall('GET', '/admin/users', null, aoToken);
  assert(aoUsers.status === 200 && aoUsers.data.data?.length > 0, `B2. AO can access User Management (${aoUsers.data.data?.length} users returned)`);

  const aoHalls = await apiCall('GET', '/seminar/halls', null, aoToken);
  assert(aoHalls.status === 200 && aoHalls.data.data?.length >= 6, `B3. AO has global access to all 6 Seminar Halls`);

  // Verify Identical Privileges Between Principal and AO
  const principalReportsPerm = await apiCall('GET', '/reports/permissions', null, principalToken);
  const aoReportsPerm = await apiCall('GET', '/reports/permissions', null, aoToken);
  assert(
    JSON.stringify(principalReportsPerm.data.data?.allowedServices) === JSON.stringify(aoReportsPerm.data.data?.allowedServices) &&
    principalReportsPerm.data.data?.canViewAllDepartments === aoReportsPerm.data.data?.canViewAllDepartments,
    `B4. Principal and AO have 100% IDENTICAL reporting privileges (Global all services, all departments)`
  );

  // Test C: Invalid Email
  console.log('\n--- Test C: Invalid Email ---');
  const invalidEmail = await apiCall('POST', '/auth/login', {
    email: 'invalid.user@nrtec.in',
    password: 'admin123'
  });
  assert(invalidEmail.status === 401, `C. Invalid email rejected with 401 Unauthorized (Status: ${invalidEmail.status})`);

  // Test D: Wrong Password
  console.log('\n--- Test D: Wrong Password ---');
  const wrongPass = await apiCall('POST', '/auth/login', {
    email: 'principal@nrtec.in',
    password: 'wrong_password_xyz'
  });
  assert(wrongPass.status === 401, `D. Wrong password rejected with 401 Unauthorized (Status: ${wrongPass.status})`);

  // Test E: Department User Scoped to Department
  console.log('\n--- Test E: Department User Restrictions ---');
  const deptLogin = await apiCall('POST', '/auth/login', {
    email: 'ece001@nrtec.local',
    password: 'dept123'
  });
  const deptToken = deptLogin.data.data?.token;
  const deptUserBlock = await apiCall('GET', '/admin/users', null, deptToken);
  assert(deptUserBlock.status === 403, `E1. Department user blocked from User Management (Status: ${deptUserBlock.status} Forbidden)`);

  const deptReportsPerm = await apiCall('GET', '/reports/permissions', null, deptToken);
  assert(
    deptReportsPerm.data.data?.canViewAllDepartments === false &&
    deptReportsPerm.data.data?.availableDepartments?.[0] === 'ECE',
    `E2. Department user report scope is restricted strictly to ECE department`
  );

  // Test F: Department HOD Scoped to Department
  console.log('\n--- Test F: Department HOD Restrictions ---');
  const hodLogin = await apiCall('POST', '/auth/login', {
    email: 'ecehod@nrtec.in',
    password: 'dept123'
  });
  const hodToken = hodLogin.data.data?.token;
  const hodUserBlock = await apiCall('GET', '/admin/users', null, hodToken);
  assert(hodUserBlock.status === 403, `F1. Department HOD blocked from User Management (Status: ${hodUserBlock.status} Forbidden)`);

  const hodReportsPerm = await apiCall('GET', '/reports/permissions', null, hodToken);
  assert(
    hodReportsPerm.data.data?.canViewAllDepartments === false &&
    hodReportsPerm.data.data?.availableDepartments?.[0] === 'ECE',
    `F2. Department HOD report scope is restricted strictly to ECE department`
  );

  // Test G: Seminar Coordinator Only Assigned Halls
  console.log('\n--- Test G: Seminar Coordinator Scoped to Assigned Halls ---');
  const coordLogin = await apiCall('POST', '/auth/login', {
    email: 'seminarcoordinator6@nrtec.in',
    password: 'coord123'
  });
  const coordToken = coordLogin.data.data?.token;
  const coordHalls = await apiCall('GET', '/seminar/halls?assignedOnly=true', null, coordToken);
  assert(
    coordHalls.data.data?.length === 1 && coordHalls.data.data[0].hallId === 'SH-6',
    `G1. Seminar Coordinator 6 assignedOnly=true returns strictly SH-6`
  );

  // Test H: Multi-Role User Retains Union of Permissions
  console.log('\n--- Test H: Multi-Role User Union of Permissions ---');
  const multiLogin = await apiCall('POST', '/auth/login', {
    email: 'csehod@nrtec.in',
    password: 'dept123'
  });
  const multiRoles = multiLogin.data.data?.roles || [];
  assert(
    multiLogin.status === 200 &&
    multiRoles.includes('DEPARTMENT_HOD') &&
    multiRoles.includes('SEMINAR_COORDINATOR'),
    `H. Multi-role user retains full union of roles: [${multiRoles.join(', ')}]`
  );

  // Test I: Existing Historical Request Ownership
  console.log('\n--- Test I: Historical Request Ownership ---');
  const allReqs = await apiCall('GET', '/requests/all', null, aoToken);
  const sampleReq = (allReqs.data.data || [])[0];
  assert(
    allReqs.status === 200 && sampleReq != null && sampleReq.requestId && sampleReq.requestedBy,
    `I. Historical request ownership preserved intact: Request ${sampleReq?.requestId} by "${sampleReq?.requestedBy}" (Dept: ${sampleReq?.department})`
  );

  // Test J: Duplicate Email Prevention
  console.log('\n--- Test J: Duplicate Email Prevention ---');
  const dupEmailTest = await apiCall('POST', '/admin/users', {
    name: 'Duplicate Test Account',
    email: 'principal@nrtec.in', // Already belongs to Principal!
    role: 'DEPARTMENT_USER',
    roles: ['DEPARTMENT_USER'],
    department: 'CSE',
    password: 'password123'
  }, aoToken);
  assert(
    dupEmailTest.status === 400 || dupEmailTest.status === 409,
    `J. Duplicate email creation rejected (Status: ${dupEmailTest.status}, Message: "${dupEmailTest.data?.message}")`
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
