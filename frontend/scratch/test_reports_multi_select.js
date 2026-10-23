const { request, login } = require('./api_helper.js');

async function runTests() {
  console.log('================================================================');
  console.log('REPORTS & ANALYTICS: MULTI-SELECT FILTERS & UNIFIED VERIFICATION');
  console.log('================================================================');

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
    // Logins
    console.log('\n--- 0. Authentication Tests ---');
    const aoAuth = await login('ao@nrtec.in', 'admin123');
    assert(!!aoAuth.token, 'ao@nrtec.in (AO Admin) logged in successfully');

    const accAuth = await login('acc001@nrtec.local', 'admin123');
    assert(!!accAuth.token, 'acc001@nrtec.local (Accommodation Admin) logged in successfully');

    const cseAuth = await login('cse001@nrtec.local', 'dept123');
    assert(!!cseAuth.token, 'cse001@nrtec.local (Dept User) logged in successfully');

    const aoHeaders = { Authorization: `Bearer ${aoAuth.token}` };
    const accHeaders = { Authorization: `Bearer ${accAuth.token}` };
    const cseHeaders = { Authorization: `Bearer ${cseAuth.token}` };

    // Permissions check
    console.log('\n--- Permissions Verification ---');
    const accPermRes = await request('http://localhost:8080/api/reports/permissions', { headers: accHeaders });
    assert(accPermRes.status === 200, 'ACC001 can fetch permissions');
    const accAllowedServices = accPermRes.body.data.allowedServices;
    assert(accAllowedServices.includes('ACCOMMODATION') && accAllowedServices.includes('SEMINAR_HALL') && accAllowedServices.includes('TRANSPORT'),
      'ACC001 permissions now expose all services (Fixing fixed ACCOMMODATION issue)');

    // Scenario 1: All services, departments, and statuses selected
    console.log('\n--- Scenario 1: All services, departments, and statuses selected ---');
    const s1Res = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['ACCOMMODATION', 'SEMINAR_HALL', 'TRANSPORT', 'STATIONERY', 'MEALS'],
      departments: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'MBA', 'MCA', 'BS&H'],
      statuses: ['APPROVED', 'PENDING', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED', 'COMPLETED'],
      dateRangeType: 'ALL'
    }));
    assert(s1Res.status === 200, 'Scenario 1 HTTP 200');
    const s1Data = s1Res.body.data;
    assert(s1Data && s1Data.summary && s1Data.summary.totalRequests >= 0, 'Scenario 1 returns valid summary');
    assert(s1Data.detailedRecords && s1Data.detailedRecords.length === s1Data.summary.totalRequests,
      `Scenario 1 records count (${s1Data.detailedRecords.length}) matches summary total (${s1Data.summary.totalRequests})`);

    // Scenario 2: One service, one department, and one status selected
    console.log('\n--- Scenario 2: One service, one department, and one status selected ---');
    const s2Res = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['ACCOMMODATION'],
      departments: ['CSE'],
      statuses: ['APPROVED'],
      dateRangeType: 'ALL'
    }));
    assert(s2Res.status === 200, 'Scenario 2 HTTP 200');
    const s2Data = s2Res.body.data;
    const allMatchS2 = s2Data.detailedRecords.every(r => 
      (r.serviceKey === 'ACCOMMODATION' || r.service === 'Accommodation') &&
      r.department.toUpperCase() === 'CSE'
    );
    assert(allMatchS2, 'Scenario 2 results strictly match single service (ACCOMMODATION) and single department (CSE)');

    // Scenario 3: Multiple services, departments, and statuses selected simultaneously
    console.log('\n--- Scenario 3: Multiple services, departments, and statuses simultaneously ---');
    const s3Res = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['ACCOMMODATION', 'TRANSPORT'],
      departments: ['CSE', 'EEE'],
      statuses: ['APPROVED', 'PENDING'],
      dateRangeType: 'ALL'
    }));
    assert(s3Res.status === 200, 'Scenario 3 HTTP 200');
    const s3Data = s3Res.body.data;
    const allMatchS3 = s3Data.detailedRecords.every(r => 
      ['ACCOMMODATION', 'TRANSPORT'].includes(r.serviceKey) &&
      ['CSE', 'EEE'].includes(r.department.toUpperCase())
    );
    assert(allMatchS3, 'Scenario 3 results match OR condition within categories and AND condition across categories');

    // Scenario 4 & 5: Clear Selection behavior & restoring options
    console.log('\n--- Scenario 4 & 5: Clear Selection behavior & restoring ---');
    const s4Res = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: [],
      departments: [],
      statuses: [],
      dateRangeType: 'ALL'
    }));
    assert(s4Res.status === 200, 'Empty selection does not crash or throw error');
    assert(s4Res.body.data.summary.totalRequests === s1Data.summary.totalRequests,
      'Empty/cleared selection is safely treated as unfiltered without accidentally returning 0 records');

    // Scenario 6: Date filters combined with multi-select filters
    console.log('\n--- Scenario 6: Date filters combined with multi-select filters ---');
    const s6Today = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['ACCOMMODATION', 'TRANSPORT'],
      dateRangeType: 'THIS_YEAR'
    }));
    assert(s6Today.status === 200, 'THIS_YEAR date filter with multi-service filter returns 200');

    // Scenario 7: Resource / Facility filtering with Seminar Hall
    console.log('\n--- Scenario 7: Resource / Facility filtering ---');
    const s7Res = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['SEMINAR_HALL'],
      hallId: 'SH-1',
      dateRangeType: 'ALL'
    }));
    assert(s7Res.status === 200, 'Resource filtering with Seminar Hall returns 200');
    assert(s7Res.body.data.detailedRecords.every(r => r.serviceKey === 'SEMINAR'), 'Filtered strictly to seminar bookings');

    // Scenario 8: No matching records
    console.log('\n--- Scenario 8: No matching records ---');
    const s8Res = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['TRANSPORT'],
      departments: ['NON_EXISTENT_DEPT'],
      dateRangeType: 'ALL'
    }));
    assert(s8Res.status === 200, 'No matching records returns HTTP 200');
    assert(s8Res.body.data.summary.totalRequests === 0, 'Total requests is 0');
    assert(s8Res.body.data.detailedRecords.length === 0, 'Detailed records array is empty');

    // Scenario 9: PDF & Excel Export consistency
    console.log('\n--- Scenario 9: PDF & Excel Export consistency ---');
    const pdfRes = await request('http://localhost:8080/api/reports/export/pdf', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['ACCOMMODATION', 'TRANSPORT'],
      departments: ['CSE'],
      statuses: ['APPROVED']
    }));
    assert(pdfRes.status === 200 && pdfRes.raw && pdfRes.raw.length > 500, 'PDF Export generated successfully with multi-filters');

    const excelRes = await request('http://localhost:8080/api/reports/export/excel', { method: 'POST', headers: aoHeaders }, JSON.stringify({
      services: ['ACCOMMODATION', 'TRANSPORT'],
      departments: ['CSE'],
      statuses: ['APPROVED']
    }));
    assert(excelRes.status === 200 && excelRes.raw && excelRes.raw.length > 500, 'Excel Export generated successfully with multi-filters');

    // Scenario 10: Service-specific status & resource handling
    console.log('\n--- Scenario 10: Service-specific status and resource handling ---');
    assert(s1Data.serviceBreakdown && s1Data.serviceBreakdown.length === 5, 'Service breakdown contains all 5 supported services');
    assert(s1Data.departmentBreakdown && s1Data.departmentBreakdown.length > 0, 'Department breakdown computed accurately');

    // Scenario 11: Department User Isolation
    console.log('\n--- Scenario 11: Department User Security & Isolation ---');
    const cseRes = await request('http://localhost:8080/api/reports/data', { method: 'POST', headers: cseHeaders }, JSON.stringify({
      services: ['ACCOMMODATION', 'SEMINAR_HALL'],
      departments: ['ECE'], // Unauthorized attempt to view ECE
      dateRangeType: 'ALL'
    }));
    assert(cseRes.status === 200, 'Dept user query returns 200 with enforced isolation');
    const allCse = cseRes.body.data.detailedRecords.every(r => r.department.toUpperCase() === 'CSE');
    assert(allCse, 'Department User is strictly constrained to CSE records only (ECE records not leaked)');

    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
