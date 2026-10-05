const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(bodyBuffer.toString());
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bodyBuffer,
          bodyString: bodyBuffer.toString(),
          data: json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function login(userId, password) {
  const res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId, password });

  if (res.statusCode !== 200) {
    throw new Error(`Login failed for ${username}: ${res.statusCode} ${res.bodyString}`);
  }
  return res.data.token || res.data.data?.token;
}

async function runTests() {
  console.log('=== STARTING COMPREHENSIVE REPORTS & ANALYTICS TEST ===\n');
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

  try {
    // -------------------------------------------------------------
    // TEST 1: AO Admin Tests
    // -------------------------------------------------------------
    console.log('--- 1. Testing AO Admin (AO001) ---');
    const aoToken = await login('AO001', 'admin123');
    assert(!!aoToken, 'AO001 logged in successfully and obtained JWT');

    // 1.1 Permissions
    const aoPerm = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/permissions',
      method: 'GET',
      headers: { Authorization: `Bearer ${aoToken}` }
    });
    assert(aoPerm.statusCode === 200, 'AO Admin GET /api/reports/permissions returned 200');
    assert(aoPerm.data?.data?.aoAdmin === true, 'AO Admin has aoAdmin=true');
    assert(aoPerm.data?.data?.canViewOverall === true, 'AO Admin has canViewOverall=true');
    assert(aoPerm.data?.data?.canViewAllDepartments === true, 'AO Admin has canViewAllDepartments=true');
    assert(aoPerm.data?.data?.allowedServices?.filter(s => s !== 'ALL').length === 5, 'AO Admin has access to all 5 services');

    // 1.2 Overall Report
    const aoOverall = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aoToken}`
      }
    }, {
      service: 'ALL',
      department: 'ALL',
      dateRangeType: 'ALL'
    });
    assert(aoOverall.statusCode === 200, 'AO Admin POST /api/reports/data (Overall) returned 200');
    const summary = aoOverall.data?.data?.summary;
    console.log('Overall Summary:', JSON.stringify(summary));
    assert(summary && summary.totalRequests > 0, `Total requests found in DB: ${summary?.totalRequests}`);
    assert(aoOverall.data?.data?.serviceBreakdown?.length === 5, 'Overall service breakdown contains all 5 services');
    assert(aoOverall.data?.data?.hallBreakdown?.length > 0, `Hall breakdown contains ${aoOverall.data?.data?.hallBreakdown?.length} dynamic halls`);

    // 1.3 Seminar Hall 1 Specific Report
    const aoSh1 = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aoToken}`
      }
    }, {
      service: 'SEMINAR_HALL',
      hallId: 'SH-1',
      dateRangeType: 'ALL'
    });
    assert(aoSh1.statusCode === 200, 'AO Admin POST /api/reports/data (SH-1) returned 200');
    assert(aoSh1.data?.data?.metadata?.activeHallName !== null && aoSh1.data?.data?.metadata?.activeHallName !== undefined,
      `SH-1 Hall Name: ${aoSh1.data?.data?.metadata?.activeHallName}`);

    // 1.4 Department (CSE) + Service (SEMINAR_HALL) Report
    const aoDeptServ = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aoToken}`
      }
    }, {
      service: 'SEMINAR_HALL',
      department: 'CSE',
      dateRangeType: 'ALL'
    });
    assert(aoDeptServ.statusCode === 200, 'AO Admin POST /api/reports/data (CSE + SEMINAR_HALL) returned 200');
    assert(aoDeptServ.data?.data?.detailedRecords?.every(r => r.department === 'CSE' && r.service === 'Seminar Hall'),
      'All returned records in CSE+Seminar Hall match CSE department and Seminar Hall service');

    // 1.5 PDF Export
    const aoPdf = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/export/pdf',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aoToken}`
      }
    }, {
      service: 'ALL',
      department: 'ALL',
      dateRangeType: 'ALL'
    });
    assert(aoPdf.statusCode === 200, 'AO Admin POST /api/reports/export/pdf returned 200');
    assert(aoPdf.headers['content-type'] === 'application/pdf', 'PDF Content-Type is application/pdf');
    assert(aoPdf.bodyBuffer.slice(0, 4).toString() === '%PDF', 'PDF file binary signature starts with %PDF');
    console.log(`Generated PDF byte size: ${aoPdf.bodyBuffer.length} bytes`);

    // 1.6 Excel Export
    const aoExcel = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/export/excel',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aoToken}`
      }
    }, {
      service: 'ALL',
      department: 'ALL',
      dateRangeType: 'ALL'
    });
    assert(aoExcel.statusCode === 200, 'AO Admin POST /api/reports/export/excel returned 200');
    assert(aoExcel.headers['content-type'].includes('spreadsheetml'), 'Excel Content-Type is openxmlformats spreadsheetml');
    assert(aoExcel.bodyBuffer[0] === 0x50 && aoExcel.bodyBuffer[1] === 0x4B, 'Excel binary signature starts with PK zip header');
    console.log(`Generated Excel byte size: ${aoExcel.bodyBuffer.length} bytes`);

    // -------------------------------------------------------------
    // TEST 2: Service Admin (SEM001)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Service Admin (SEM001 - Seminar Admin) ---');
    const semToken = await login('SEM001', 'admin123');
    assert(!!semToken, 'SEM001 logged in successfully and obtained JWT');

    // 2.1 Permissions
    const semPerm = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/permissions',
      method: 'GET',
      headers: { Authorization: `Bearer ${semToken}` }
    });
    assert(semPerm.statusCode === 200, 'SEM001 GET /api/reports/permissions returned 200');
    assert(semPerm.data?.data?.serviceAdmin === true, 'SEM001 has serviceAdmin=true');
    assert(semPerm.data?.data?.allowedServices?.length === 1 && semPerm.data?.data?.allowedServices[0] === 'SEMINAR_HALL',
      'SEM001 allowed services restricted strictly to SEMINAR_HALL');

    // 2.2 Authorized Service Request (SEMINAR_HALL)
    const semValid = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${semToken}`
      }
    }, {
      service: 'SEMINAR_HALL',
      dateRangeType: 'ALL'
    });
    assert(semValid.statusCode === 200, 'SEM001 POST /api/reports/data for SEMINAR_HALL returned 200');

    // 2.3 Unauthorized Service Attempt (TRANSPORT) -> MUST BE 403
    const semUnauthorized = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${semToken}`
      }
    }, {
      service: 'TRANSPORT',
      dateRangeType: 'ALL'
    });
    assert(semUnauthorized.statusCode === 403, `SEM001 attempting TRANSPORT returned 403 Forbidden (got ${semUnauthorized.statusCode})`);

    // -------------------------------------------------------------
    // TEST 3: Seminar Coordinator (seminarcoordinator1 assigned to SH-1)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Seminar Coordinator (seminarcoordinator1 assigned to SH-1) ---');
    const coordToken = await login('seminarcoordinator1', 'coord123');
    assert(!!coordToken, 'seminarcoordinator1 logged in successfully and obtained JWT');

    // 3.1 Permissions
    const coordPerm = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/permissions',
      method: 'GET',
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(coordPerm.statusCode === 200, 'Coordinator GET /api/reports/permissions returned 200');
    assert(coordPerm.data?.data?.seminarCoordinator === true, 'Coordinator has seminarCoordinator=true');
    const assignedHalls = coordPerm.data?.data?.allowedHalls?.map(h => h.hallId);
    console.log('Coordinator allowed halls:', assignedHalls);
    assert(assignedHalls.includes('SH-1') && !assignedHalls.includes('SH-2'), 'Coordinator is restricted strictly to SH-1');

    // 3.2 Authorized Hall Request (SH-1)
    const coordValid = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordToken}`
      }
    }, {
      service: 'SEMINAR_HALL',
      hallId: 'SH-1',
      dateRangeType: 'ALL'
    });
    assert(coordValid.statusCode === 200, 'Coordinator POST /api/reports/data for SH-1 returned 200');

    // 3.3 Unauthorized Hall Attempt (SH-2) -> MUST BE 403
    const coordUnauthorized = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordToken}`
      }
    }, {
      service: 'SEMINAR_HALL',
      hallId: 'SH-2',
      dateRangeType: 'ALL'
    });
    assert(coordUnauthorized.statusCode === 403, `Coordinator attempting SH-2 returned 403 Forbidden (got ${coordUnauthorized.statusCode})`);

    // -------------------------------------------------------------
    // TEST 4: Department User (CSE001)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Department User (CSE001) ---');
    const cseToken = await login('CSE001', 'dept123');
    assert(!!cseToken, 'CSE001 logged in successfully and obtained JWT');

    // 4.1 Permissions
    const csePerm = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/permissions',
      method: 'GET',
      headers: { Authorization: `Bearer ${cseToken}` }
    });
    assert(csePerm.statusCode === 200, 'CSE001 GET /api/reports/permissions returned 200');
    assert(csePerm.data?.data?.departmentUser === true, 'CSE001 has departmentUser=true');
    assert(csePerm.data?.data?.userDepartment === 'CSE', 'CSE001 userDepartment is CSE');
    assert(csePerm.data?.data?.canViewAllDepartments === false, 'CSE001 cannot view all departments');

    // 4.2 Authorized Department Request (CSE)
    const cseValid = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cseToken}`
      }
    }, {
      department: 'CSE',
      dateRangeType: 'ALL'
    });
    assert(cseValid.statusCode === 200, 'CSE001 POST /api/reports/data for CSE returned 200');
    assert(cseValid.data?.data?.detailedRecords?.every(r => r.department === 'CSE'), 'All detailed records belong to CSE department');

    // 4.3 Personal Requests Report (viewType: 'PERSONAL')
    const csePersonal = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cseToken}`
      }
    }, {
      viewType: 'PERSONAL',
      dateRangeType: 'ALL'
    });
    assert(csePersonal.statusCode === 200, 'CSE001 POST /api/reports/data with viewType=PERSONAL returned 200');

    // 4.4 Unauthorized Department Attempt (ECE) -> MUST BE 403
    const cseUnauthorized = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reports/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cseToken}`
      }
    }, {
      department: 'ECE',
      dateRangeType: 'ALL'
    });
    assert(cseUnauthorized.statusCode === 403, `CSE001 attempting ECE returned 403 Forbidden (got ${cseUnauthorized.statusCode})`);

    console.log(`\n========================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
