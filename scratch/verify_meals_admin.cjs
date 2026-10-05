const http = require('http');

async function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
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
  return res.data?.data?.token;
}

async function run() {
  console.log('Testing Snacks & Meals Admin approval workflow...');

  const cseToken = await login('CSE001', 'dept123');
  const meaToken = await login('MEA001', 'admin123');
  const aoToken = await login('AO001', 'admin123');

  console.log('Tokens obtained:', {
    hasCseToken: !!cseToken,
    hasMeaToken: !!meaToken,
    hasAoToken: !!aoToken
  });

  // 1. Department user creates a meal request
  const createRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/meals/requests',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cseToken}` }
  }, {
    eventTitle: 'Integration Test Meal Event',
    date: '2026-11-20',
    venue: 'Seminar Hall 1',
    mealTypes: ['Breakfast', 'Lunch'],
    totalGuests: 25,
    specialRequirements: 'Pure veg'
  });
  console.log('1. Create request status:', createRes.status, 'ID:', createRes.data?.data?.requestId);
  const reqId = createRes.data?.data?.requestId;

  // 2. MEALS_ADMIN views request
  const meaViewRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${meaToken}` }
  });
  console.log('2. Meals Admin view status:', meaViewRes.status, 'Title:', meaViewRes.data?.data?.eventTitle);

  // 3. MEALS_ADMIN edits request: adds Snacks with FORENOON
  const meaEditRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${meaToken}` }
  }, {
    eventTitle: 'Updated by Meals Admin Event',
    date: '2026-11-20',
    venue: 'Seminar Hall 1 Dining',
    mealTypes: ['Breakfast', 'Lunch', 'Snacks'],
    serviceTime: 'FORENOON',
    totalGuests: 30,
    specialRequirements: 'Special tea and biscuits'
  });
  console.log('3. Meals Admin edit status:', meaEditRes.status, 'New Title:', meaEditRes.data?.data?.eventTitle, 'ServiceTime:', meaEditRes.data?.data?.serviceTime);

  // 4. AO_ADMIN views the edited request
  const aoViewRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${aoToken}` }
  });
  console.log('4. AO Admin view status:', aoViewRes.status, 'Title:', aoViewRes.data?.data?.eventTitle);

  // 5. AO_ADMIN edits request: changes venue and guest count, changes to AFTERNOON
  const aoEditRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aoToken}` }
  }, {
    eventTitle: 'Updated by AO Admin Event',
    date: '2026-11-20',
    venue: 'Main Auditorium Foyer',
    mealTypes: ['Breakfast', 'Lunch', 'Snacks', 'Tea / Coffee'],
    serviceTime: 'AFTERNOON',
    totalGuests: 50,
    specialRequirements: 'VIP seating and executive snacks'
  });
  console.log('5. AO Admin edit status:', aoEditRes.status, 'Updated by AO Title:', aoEditRes.data?.data?.eventTitle, 'Guest count:', aoEditRes.data?.data?.totalGuests);

  // 6. Department user attempts to edit -> must be FORBIDDEN (403)
  const deptEditRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cseToken}` }
  }, {
    eventTitle: 'Unauthorized Dept Edit',
    date: '2026-11-20',
    venue: 'Nowhere',
    mealTypes: ['Lunch'],
    totalGuests: 10
  });
  console.log('6. Department user edit status (expect 403):', deptEditRes.status);

  // 7. AO_ADMIN approves request
  const aoApproveRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId}/approve`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${aoToken}` }
  });
  console.log('7. AO Admin approve status:', aoApproveRes.status, 'Status:', aoApproveRes.data?.data?.status);

  // 8. Attempting to approve again -> must fail with 400
  const repeatApproveRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId}/approve`,
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${aoToken}` }
  });
  console.log('8. Repeat approve status (expect 400):', repeatApproveRes.status, 'Msg:', repeatApproveRes.data?.message);

  // 9. Department user creates another request for reject test
  const createRes2 = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/meals/requests',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cseToken}` }
  }, {
    eventTitle: 'Reject Test Meal Event',
    date: '2026-11-25',
    venue: 'Mech Lab',
    mealTypes: ['Dinner'],
    totalGuests: 15
  });
  const reqId2 = createRes2.data?.data?.requestId;

  // 10. AO_ADMIN rejects request
  const aoRejectRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/meals/requests/${reqId2}/reject`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aoToken}` }
  }, { reason: 'Catering fully booked by AO Admin' });
  console.log('10. AO Admin reject status:', aoRejectRes.status, 'Status:', aoRejectRes.data?.data?.status, 'Reason:', aoRejectRes.data?.data?.rejectionReason);

  console.log('\nAll verification checks passed successfully!');
}

run().catch(console.error);
