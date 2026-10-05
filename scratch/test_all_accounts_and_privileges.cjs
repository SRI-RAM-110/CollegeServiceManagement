const http = require('http');

function apiCall(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
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
  console.log('================================================================');
  console.log('STARTING COMPLETE SYSTEM ACCOUNT & PRIVILEGE VERIFICATION SUITE');
  console.log('================================================================\n');

  // 1. Principal Login & Global Access
  console.log('--- 1. Principal Login & Verification ---');
  const principalRes = await apiCall('POST', '/auth/login', {
    email: 'principal@nrtec.in',
    password: 'admin123'
  });
  assert(
    principalRes.status === 200 &&
    principalRes.data.data?.token &&
    principalRes.data.data?.roles?.includes('AO_ADMIN'),
    `1. Principal login successful (Name: "${principalRes.data.data?.name}", Email: ${principalRes.data.data?.email}, Role: ${principalRes.data.data?.role})`
  );
  const principalToken = principalRes.data.data?.token;

  const principalDash = await apiCall('GET', '/dashboard', null, principalToken);
  assert(principalDash.status === 200, `1.1 Principal full dashboard access (Status: ${principalDash.status})`);

  const principalHalls = await apiCall('GET', '/seminar/halls', null, principalToken);
  assert(principalHalls.status === 200 && principalHalls.data.data?.length === 6, `1.2 Principal has global access to all 6 Seminar Halls`);

  // 2. Administrative Officer Login & Verification
  console.log('\n--- 2. Administrative Officer Login & Verification ---');
  const aoRes = await apiCall('POST', '/auth/login', {
    email: 'ao@nrtec.in',
    password: 'admin123'
  });
  assert(
    aoRes.status === 200 &&
    aoRes.data.data?.token &&
    aoRes.data.data?.roles?.includes('AO_ADMIN'),
    `2. AO login successful (Name: "${aoRes.data.data?.name}", Email: ${aoRes.data.data?.email}, Role: ${aoRes.data.data?.role})`
  );
  const aoToken = aoRes.data.data?.token;

  const aoDash = await apiCall('GET', '/dashboard', null, aoToken);
  assert(aoDash.status === 200, `2.1 AO full dashboard access (Status: ${aoDash.status})`);

  const aoHalls = await apiCall('GET', '/seminar/halls', null, aoToken);
  assert(aoHalls.status === 200 && aoHalls.data.data?.length === 6, `2.2 AO has global access to all 6 Seminar Halls`);

  // Confirm Principal and AO have identical report permissions
  const pPerm = await apiCall('GET', '/reports/permissions', null, principalToken);
  const aoPerm = await apiCall('GET', '/reports/permissions', null, aoToken);
  assert(
    JSON.stringify(pPerm.data.data?.allowedServices) === JSON.stringify(aoPerm.data.data?.allowedServices) &&
    pPerm.data.data?.canViewAllDepartments === true &&
    aoPerm.data.data?.canViewAllDepartments === true,
    `2.3 Principal and AO have 100% IDENTICAL global report permissions`
  );

  // 3. CSE HOD (Real faculty: Dr. S. N. Thirumala Rao)
  console.log('\n--- 3. CSE HOD Login & Scope ---');
  const cseHodLogin = await apiCall('POST', '/auth/login', {
    email: 'csehod@nrtec.in',
    password: 'dept123'
  });
  assert(
    cseHodLogin.status === 200 &&
    cseHodLogin.data.data?.name === 'Dr. S. N. Thirumala Rao' &&
    cseHodLogin.data.data?.department === 'CSE',
    `3. CSE HOD logged in as "${cseHodLogin.data.data?.name}" (Dept: ${cseHodLogin.data.data?.department})`
  );
  const cseToken = cseHodLogin.data.data?.token;
  const cseReportPerm = await apiCall('GET', '/reports/permissions', null, cseToken);
  assert(
    cseReportPerm.data.data?.department === 'CSE' &&
    cseReportPerm.data.data?.allowedHalls?.some(h => h.hallId === 'SH-1'),
    `3.1 CSE HOD reporting correctly scoped to department CSE with assigned hall SH-1`
  );

  // 4. Other Department HODs
  console.log('\n--- 4. Other HOD Accounts (ECE, EEE, ME, CIVIL, AI, MBA, PHARM) ---');
  const otherHods = [
    { email: 'ecehod@nrtec.in', dept: 'ECE', name: 'Dr. V. Venkata Rao' },
    { email: 'eeehod@nrtec.in', dept: 'EEE', name: 'Dr. Shaik Mahammad Shareef' },
    { email: 'mechhod@nrtec.in', dept: 'ME', name: 'Dr. B. Venkata Siva' },
    { email: 'civilhod@nrtec.in', dept: 'CIVIL', name: 'Dr. P. Naga Sowjanya' },
    { email: 'aihod@nrtec.in', dept: 'AI', name: 'Dr. B. Jhansi Vazram' },
    { email: 'mbahod@nrtec.in', dept: 'MBA', name: 'Dr. Y. Anki Reddy' },
    { email: 'sample.pharm.hod@nrtec.in', dept: 'PHARM', name: 'Sample Pharmacy HOD' }
  ];

  for (const h of otherHods) {
    const res = await apiCall('POST', '/auth/login', { email: h.email, password: 'dept123' });
    const u = res.data.data;
    assert(
      res.status === 200 && u?.department === h.dept && u?.name === h.name,
      `4. HOD ${h.dept} login successful (Name: "${u?.name}", Email: ${u?.email}, Dept: ${u?.department})`
    );

    const rPerm = await apiCall('GET', '/reports/permissions', null, u?.token);
    assert(
      rPerm.data.data?.canViewAllDepartments === false &&
      rPerm.data.data?.availableDepartments?.[0] === h.dept,
      `   ${h.dept} report scope strictly restricted to ${h.dept}`
    );
  }

  // 5. Standard Department User
  console.log('\n--- 5. Standard Department User ---');
  const deptUserRes = await apiCall('POST', '/auth/login', {
    email: 'ece001@nrtec.local',
    password: 'dept123'
  });
  assert(
    deptUserRes.status === 200 &&
    deptUserRes.data.data?.role === 'DEPARTMENT_USER' &&
    !deptUserRes.data.data?.roles?.includes('DEPARTMENT_HOD'),
    `5. Department User preserved as standard DEPARTMENT_USER (Email: ${deptUserRes.data.data?.email})`
  );

  // 6 - 11. Six Seminar Coordinators (SH-1 through SH-6)
  console.log('\n--- 6 - 11. Six Seminar Coordinators (SH-1 to SH-6) ---');
  const coordinators = [
    { email: 'seminarcoordinator1@nrtec.in', hall: 'SH-1' },
    { email: 'seminarcoordinator2@nrtec.in', hall: 'SH-2' },
    { email: 'seminarcoordinator3@nrtec.in', hall: 'SH-3' },
    { email: 'seminarcoordinator4@nrtec.in', hall: 'SH-4' },
    { email: 'seminarcoordinator5@nrtec.in', hall: 'SH-5' },
    { email: 'seminarcoordinator6@nrtec.in', hall: 'SH-6' }
  ];

  for (let i = 0; i < coordinators.length; i++) {
    const c = coordinators[i];
    const cRes = await apiCall('POST', '/auth/login', { email: c.email, password: 'coord123' });
    assert(
      cRes.status === 200 && cRes.data.data?.assignedHallIds?.includes(c.hall),
      `${6 + i}. Coordinator ${i + 1} (${c.email}) authenticated with assigned hall [${c.hall}]`
    );

    const cHalls = await apiCall('GET', '/seminar/halls?assignedOnly=true', null, cRes.data.data?.token);
    assert(
      cHalls.data.data?.length === 1 && cHalls.data.data[0].hallId === c.hall,
      `   Coordinator ${i + 1} assignedOnly=true returns strictly ${c.hall} ("${cHalls.data.data[0].name}")`
    );
  }

  // 12. Seminar Admin Access to ALL 6 Halls
  console.log('\n--- 12. Seminar Admin Access to ALL 6 Halls ---');
  const semAdminRes = await apiCall('POST', '/auth/login', {
    email: 'sem001@nrtec.local',
    password: 'admin123'
  });
  const semAdminHalls = await apiCall('GET', '/seminar/halls', null, semAdminRes.data.data?.token);
  assert(
    semAdminRes.status === 200 && semAdminHalls.data.data?.length === 6,
    `12. SEMINAR_ADMIN has access to all 6 Seminar Halls`
  );

  // 13. Existing Multi-Role User Retaining Full Union of Permissions
  console.log('\n--- 13. Existing Multi-Role User ---');
  const multiRoles = cseHodLogin.data.data?.roles || [];
  assert(
    multiRoles.includes('DEPARTMENT_HOD') &&
    multiRoles.includes('DEPARTMENT_USER') &&
    multiRoles.includes('SEMINAR_COORDINATOR') &&
    multiRoles.includes('SERVICE_ADMIN'),
    `13. Multi-role user csehod retains complete union of roles: [${multiRoles.join(', ')}]`
  );

  // 14. Historical Request Ownership Preserved
  console.log('\n--- 14. Historical Request Ownership Preservation ---');
  const allReqs = await apiCall('GET', '/requests/all', null, aoToken);
  const sampleReq = (allReqs.data.data || [])[0];
  assert(
    allReqs.status === 200 && sampleReq != null && sampleReq.requestId && sampleReq.requestedBy,
    `14. Historical request ownership intact: ${sampleReq?.requestId} by "${sampleReq?.requestedBy}" (${sampleReq?.department})`
  );

  // 15. Duplicate Email Rejection
  console.log('\n--- 15. Duplicate Email Rejection ---');
  const dupTest = await apiCall('POST', '/admin/users', {
    name: 'Duplicate Test',
    email: 'principal@nrtec.in',
    role: 'DEPARTMENT_USER',
    roles: ['DEPARTMENT_USER'],
    department: 'CSE',
    password: 'password123'
  }, aoToken);
  assert(
    dupTest.status === 400 || dupTest.status === 409,
    `15. Duplicate email registration rejected (Status: ${dupTest.status})`
  );

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
