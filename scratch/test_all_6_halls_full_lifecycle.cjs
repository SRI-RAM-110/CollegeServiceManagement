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
          parsed = raw;
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
  console.log('STARTING ALL 6 HALLS FULL LIFECYCLE TESTS (SH-1..SH-6)');
  console.log('====================================================');

  // Logins
  const aoLogin = await apiCall('POST', '/auth/login', { email: 'ao001@nrtec.local', password: 'admin123' });
  const aoToken = aoLogin.data.data.token;

  const deptUserLogin = await apiCall('POST', '/auth/login', { email: 'cse001@nrtec.local', password: 'dept123' });
  const deptUserToken = deptUserLogin.data.data.token;

  const coordTokens = {};
  for (let i = 1; i <= 6; i++) {
    const res = await apiCall('POST', '/auth/login', { email: `seminarcoordinator${i}@nrtec.local`, password: 'coord123' });
    coordTokens[i] = res.data.data.token;
  }

  // Iterate over each hall
  for (let i = 1; i <= 6; i++) {
    const hallId = `SH-${i}`;
    console.log(`\n--- Testing Full Lifecycle for Hall ${hallId} ---`);

    // 1. Load hall
    const hallsRes = await apiCall('GET', '/seminar/halls', null, aoToken);
    const hallObj = (hallsRes.data.data || []).find(h => h.hallId === hallId);
    assert(hallObj != null, `${hallId} loaded successfully: "${hallObj?.name}" (Capacity: ${hallObj?.capacity})`);

    // 2. Check availability
    const uniqueDay = 10 + i;
    const testDate1 = `2027-02-${String(uniqueDay).padStart(2, '0')}`;
    const testDate2 = `2027-02-${String(uniqueDay + 10).padStart(2, '0')}`;

    const avail = await apiCall('GET', `/seminar/availability?hallId=${hallId}&date=${testDate1}`, null, deptUserToken);
    assert(avail.status === 200, `${hallId} availability checked for ${testDate1}`);

    // 3. Create booking 1 (for approval)
    const createRes1 = await apiCall('POST', '/seminar/requests', {
      hallId,
      eventTitle: `Annual Symposium in ${hallId}`,
      purpose: 'Technical paper presentations',
      date: testDate1,
      slot: 'FORENOON',
      bookingType: 'ONE_TIME',
      expectedParticipants: 100,
      additionalRequirements: 'Projector & Mic'
    }, deptUserToken);
    assert(createRes1.status === 200 && createRes1.data.data?.bookingId, `${hallId} booking 1 created: ID ${createRes1.data.data?.bookingId}`);
    const bId1 = createRes1.data.data?.bookingId;

    // 4. View booking
    const viewRes = await apiCall('GET', `/seminar/requests/${bId1}`, null, deptUserToken);
    assert(viewRes.status === 200 && viewRes.data.data?.bookingId === bId1, `${hallId} booking 1 retrieved via details API`);

    // 5. Cross-coordinator isolation check
    // If i === 1, test coordinator 2 cannot approve; otherwise test coordinator 1 cannot approve
    const wrongCoordIndex = i === 1 ? 2 : 1;
    const unauthApprove = await apiCall('PUT', `/seminar/requests/${bId1}/approve`, null, coordTokens[wrongCoordIndex]);
    assert(unauthApprove.status === 403, `${hallId} cross-coordinator isolation: Coord ${wrongCoordIndex} blocked from approving (403 Forbidden)`);

    // 6. Authorized coordinator approves
    const authApprove = await apiCall('PUT', `/seminar/requests/${bId1}/approve`, null, coordTokens[i]);
    assert(authApprove.status === 200 && authApprove.data.data?.status === 'APPROVED', `${hallId} approved by Coordinator ${i} (Status: APPROVED)`);

    // 7. Generate PDF
    const pdfRes = await apiCall('GET', `/requests/${bId1}/pdf`, null, coordTokens[i]);
    assert(pdfRes.status === 200 && (pdfRes.headers['content-type'] || '').includes('pdf'), `${hallId} official PDF generated successfully`);

    // 8. Create booking 2 (for rejection)
    const createRes2 = await apiCall('POST', '/seminar/requests', {
      hallId,
      eventTitle: `Ad-hoc Meet in ${hallId}`,
      purpose: 'Club meeting',
      date: testDate2,
      slot: 'AFTERNOON',
      bookingType: 'ONE_TIME',
      expectedParticipants: 50,
      additionalRequirements: 'None'
    }, deptUserToken);
    assert(createRes2.status === 200 && createRes2.data.data?.bookingId, `${hallId} booking 2 created: ID ${createRes2.data.data?.bookingId}`);
    const bId2 = createRes2.data.data?.bookingId;

    // 9. Authorized coordinator rejects
    const authReject = await apiCall('PUT', `/seminar/requests/${bId2}/reject`, { reason: 'Slot reserved for maintenance' }, coordTokens[i]);
    assert(authReject.status === 200 && authReject.data.data?.status === 'REJECTED', `${hallId} rejected by Coordinator ${i} (Status: REJECTED)`);

    // 10. Verify Report query includes this hall
    const reportRes = await apiCall('POST', '/reports/data', {
      service: 'SEMINAR',
      department: 'ALL',
      hallId: hallId,
      status: 'ALL',
      dateRangeType: 'ALL'
    }, aoToken);
    const hallRecords = reportRes.data.data?.detailedRecords || [];
    assert(reportRes.status === 200 && hallRecords.length > 0, `${hallId} report query successfully retrieved ${hallRecords.length} records`);
  }

  console.log('\n====================================================');
  console.log(`ALL 6 HALLS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
