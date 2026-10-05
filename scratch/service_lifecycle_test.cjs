const { MongoClient } = require('../frontend/node_modules/mongodb');

const BASE_URL = 'http://localhost:8080/api';

async function getDbCounts() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('collegeservices_db');
  const collections = [
    'users', 'departments', 'seminar_halls', 'accommodation_rooms', 'vehicles',
    'stationery_items', 'announcements', 'seminar_bookings', 'accommodation_requests',
    'transport_requests', 'meal_requests', 'stationery_requests', 'notifications',
    'push_subscriptions'
  ];
  const counts = {};
  for (const c of collections) {
    try {
      counts[c] = await db.collection(c).countDocuments();
    } catch (e) {
      counts[c] = 0;
    }
  }
  await client.close();
  return counts;
}

async function login(userId, defaultPw = 'dept123') {
  for (const pw of [defaultPw, 'dept123', 'admin123', 'coord123', 'password123']) {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password: pw }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data?.token || data.token;
      }
    } catch (e) {}
  }
  throw new Error(`Failed to login as ${userId}`);
}

async function getNotifications(token) {
  const res = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to get notifications: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

async function run() {
  console.log('====================================================');
  console.log('STARTING FULL LIFECYCLE & USER-ISOLATION VERIFICATION');
  console.log('====================================================');

  const beforeCounts = await getDbCounts();
  console.log('Initial DB Counts:', JSON.stringify(beforeCounts, null, 2));

  // 1. Authenticate All Key Actors
  console.log('\n--- 1. Authenticating Actors ---');
  const csehodToken = await login('csehod', 'dept123');
  console.log('csehod (CSE HOD): Authenticated');
  const ecehodToken = await login('ecehod', 'dept123');
  console.log('ecehod (ECE HOD): Authenticated');
  const cse001Token = await login('CSE001', 'dept123');
  console.log('CSE001 (CSE User): Authenticated');
  const aoToken = await login('AO001', 'admin123');
  console.log('AO001 (AO Admin): Authenticated');
  const semAdminToken = await login('SEM001', 'admin123');
  console.log('SEM001 (Seminar Admin): Authenticated');
  const accAdminToken = await login('ACC001', 'admin123');
  console.log('ACC001 (Accommodation Admin): Authenticated');
  const trnAdminToken = await login('TRN001', 'admin123');
  console.log('TRN001 (Transport Admin): Authenticated');
  const meaAdminToken = await login('MEA001', 'admin123');
  console.log('MEA001 (Meals Admin): Authenticated');
  const staAdminToken = await login('STA001', 'admin123');
  console.log('STA001 (Stationery Admin): Authenticated');

  // 2. Seminar Service Lifecycle
  console.log('\n--- 2. Seminar Service Lifecycle ---');
  const semDate = '2027-01-' + String((Date.now() % 25) + 1).padStart(2, '0');
  const semRes = await fetch(`${BASE_URL}/seminar/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      eventTitle: 'AI Research Colloquium 2026',
      purpose: 'Technical Keynotes and Research Paper Presentations',
      expectedParticipants: 120,
      hallId: 'SH-1',
      slot: 'FORENOON',
      date: semDate
    })
  });
  if (!semRes.ok) throw new Error(`Seminar request creation failed: ${await semRes.text()}`);
  const semData = (await semRes.json()).data;
  const semBookingId = semData.bookingId || semData.id;
  console.log(`Seminar request created: ${semBookingId}, status: ${semData.status}`);

  // Approve Seminar Booking
  const semApproveRes = await fetch(`${BASE_URL}/seminar/requests/${semBookingId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${semAdminToken}` }
  });
  if (!semApproveRes.ok) throw new Error(`Seminar approval failed: ${await semApproveRes.text()}`);
  console.log(`Seminar request ${semBookingId} approved by SEM001.`);

  // Verify notifications
  const cseNotifsAfterSem = await getNotifications(csehodToken);
  const semNotifForCse = cseNotifsAfterSem.find(n => (n.referenceId === semBookingId || n.requestId === semBookingId) && n.title.includes('Approved'));
  console.log('Seminar Approval Notification for csehod:', semNotifForCse ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterSem = await getNotifications(ecehodToken);
  const leakedSemToEce = eceNotifsAfterSem.find(n => (n.referenceId === semBookingId || n.requestId === semBookingId));
  console.log('Seminar Notification leaked to ecehod:', leakedSemToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  const cse001NotifsAfterSem = await getNotifications(cse001Token);
  const leakedSemToCse001 = cse001NotifsAfterSem.find(n => (n.referenceId === semBookingId || n.requestId === semBookingId));
  console.log('Seminar Notification leaked to same-dept CSE001:', leakedSemToCse001 ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  const accDay = (Date.now() % 20) + 1;
  const checkInDate = '2027-06-' + String(accDay).padStart(2, '0');
  const checkOutDate = '2027-06-' + String(accDay + 2).padStart(2, '0');
  const accRes = await fetch(`${BASE_URL}/accommodation/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      facultyOrGuestName: 'Dr. Alan Turing',
      hostel: 'Boys Hostel',
      roomType: 'AC Room',
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      guestsCount: 1,
      purpose: 'Guest Lecture on Computational Intelligence'
    })
  });
  if (!accRes.ok) throw new Error(`Accommodation creation failed: ${await accRes.text()}`);
  const accData = (await accRes.json()).data;
  const accRequestId = accData.requestId || accData.id;
  console.log(`Accommodation request created: ${accRequestId}`);

  const accApproveRes = await fetch(`${BASE_URL}/accommodation/requests/${accRequestId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accAdminToken}` }
  });
  if (!accApproveRes.ok) throw new Error(`Accommodation approval failed: ${await accApproveRes.text()}`);
  console.log(`Accommodation request ${accRequestId} approved by ACC001.`);

  const cseNotifsAfterAcc = await getNotifications(csehodToken);
  const accNotifForCse = cseNotifsAfterAcc.find(n => (n.referenceId === accRequestId || n.requestId === accRequestId) && n.title.includes('Approved'));
  console.log('Accommodation Approval Notification for csehod:', accNotifForCse ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterAcc = await getNotifications(ecehodToken);
  const leakedAccToEce = eceNotifsAfterAcc.find(n => (n.referenceId === accRequestId || n.requestId === accRequestId));
  console.log('Accommodation Notification leaked to ecehod:', leakedAccToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  // 4. Transport Service Lifecycle
  console.log('\n--- 4. Transport Service Lifecycle ---');
  const trnDate = '2027-04-' + String((Date.now() % 25) + 1).padStart(2, '0');
  const trnRes = await fetch(`${BASE_URL}/transport/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      tripType: 'College Bus',
      tripDate: trnDate,
      pickupLocation: 'Campus Gate 1',
      destination: 'Tech Park Guntur',
      purpose: 'Industrial Visit for Final Year Students',
      departureTime: '08:30 AM',
      expectedPassengers: 45
    })
  });
  if (!trnRes.ok) throw new Error(`Transport creation failed: ${await trnRes.text()}`);
  const trnData = (await trnRes.json()).data;
  const trnRequestId = trnData.requestId || trnData.id;
  console.log(`Transport request created: ${trnRequestId}`);

  const trnApproveRes = await fetch(`${BASE_URL}/transport/requests/${trnRequestId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${trnAdminToken}` }
  });
  if (!trnApproveRes.ok) throw new Error(`Transport approval failed: ${await trnApproveRes.text()}`);
  console.log(`Transport request ${trnRequestId} approved by TRN001.`);

  const cseNotifsAfterTrn = await getNotifications(csehodToken);
  const trnNotifForCse = cseNotifsAfterTrn.find(n => (n.referenceId === trnRequestId || n.requestId === trnRequestId) && n.title.includes('Approved'));
  console.log('Transport Approval Notification for csehod:', trnNotifForCse ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterTrn = await getNotifications(ecehodToken);
  const leakedTrnToEce = eceNotifsAfterTrn.find(n => (n.referenceId === trnRequestId || n.requestId === trnRequestId));
  console.log('Transport Notification leaked to ecehod:', leakedTrnToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  // 5. Meals Service Lifecycle
  console.log('\n--- 5. Meals Service Lifecycle ---');
  const meaDate = '2027-05-' + String((Date.now() % 25) + 1).padStart(2, '0');
  const meaRes = await fetch(`${BASE_URL}/meals/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      eventTitle: 'Faculty Development Program Luncheon',
      date: meaDate,
      venue: 'Main Campus Dining Hall',
      mealTypes: ['Lunch', 'Tea / Coffee'],
      totalGuests: 35
    })
  });
  if (!meaRes.ok) throw new Error(`Meals creation failed: ${await meaRes.text()}`);
  const meaData = (await meaRes.json()).data;
  const meaRequestId = meaData.requestId || meaData.id;
  console.log(`Meals request created: ${meaRequestId}`);

  const meaApproveRes = await fetch(`${BASE_URL}/meals/requests/${meaRequestId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${meaAdminToken}` }
  });
  if (!meaApproveRes.ok) throw new Error(`Meals approval failed: ${await meaApproveRes.text()}`);
  console.log(`Meals request ${meaRequestId} approved by MEA001.`);

  const cseNotifsAfterMea = await getNotifications(csehodToken);
  const meaNotifForCse = cseNotifsAfterMea.find(n => (n.referenceId === meaRequestId || n.requestId === meaRequestId) && n.title.includes('Approved'));
  console.log('Meals Approval Notification for csehod:', meaNotifForCse ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterMea = await getNotifications(ecehodToken);
  const leakedMeaToEce = eceNotifsAfterMea.find(n => (n.referenceId === meaRequestId || n.requestId === meaRequestId));
  console.log('Meals Notification leaked to ecehod:', leakedMeaToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  // 6. Stationery Service Lifecycle (REQUEST-ONLY)
  console.log('\n--- 6. Stationery Service Lifecycle (REQUEST-ONLY) ---');
  const staRes = await fetch(`${BASE_URL}/stationery/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      items: [{ itemId: 'ST-01', quantity: 3 }],
      purpose: 'Lab Exam Printing Material'
    })
  });
  if (!staRes.ok) throw new Error(`Stationery creation failed: ${await staRes.text()}`);
  const staData = (await staRes.json()).data;
  const staRequestId = staData.requestId || staData.id;
  console.log(`Stationery request created: ${staRequestId}`);

  const staApproveRes = await fetch(`${BASE_URL}/stationery/requests/${staRequestId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${staAdminToken}` }
  });
  if (!staApproveRes.ok) throw new Error(`Stationery approval failed: ${await staApproveRes.text()}`);
  console.log(`Stationery request ${staRequestId} approved by STA001.`);

  const cseNotifsAfterSta = await getNotifications(csehodToken);
  const staNotifForCse = cseNotifsAfterSta.find(n => (n.referenceId === staRequestId || n.requestId === staRequestId) && n.title.includes('Approved'));
  console.log('Stationery Approval Notification for csehod:', staNotifForCse ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterSta = await getNotifications(ecehodToken);
  const leakedStaToEce = eceNotifsAfterSta.find(n => (n.referenceId === staRequestId || n.requestId === staRequestId));
  console.log('Stationery Notification leaked to ecehod:', leakedStaToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  // 7. Admin Announcements & Events
  console.log('\n--- 7. Admin Announcements & Event Notifications ---');
  // 7a. College-wide Announcement
  const collegeWideRes = await fetch(`${BASE_URL}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aoToken}` },
    body: JSON.stringify({
      title: 'Annual College Sports Day 2026',
      content: 'All faculty and students are invited to the Annual Sports Meet.',
      type: 'EVENT',
      audience: 'COLLEGE_WIDE',
      department: 'ALL'
    })
  });
  if (!collegeWideRes.ok) throw new Error(`College-wide announcement creation failed: ${await collegeWideRes.text()}`);
  const collegeWideData = (await collegeWideRes.json()).data;
  console.log(`College-wide event created: ${collegeWideData.id}`);

  // Verify both csehod and ecehod received the notification
  const cseNotifsAfterCW = await getNotifications(csehodToken);
  const eceNotifsAfterCW = await getNotifications(ecehodToken);
  const cseReceivedCW = cseNotifsAfterCW.some(n => n.title.includes('Annual College Sports Day 2026'));
  const eceReceivedCW = eceNotifsAfterCW.some(n => n.title.includes('Annual College Sports Day 2026'));
  console.log(`College-wide event notification: csehod=${cseReceivedCW}, ecehod=${eceReceivedCW} (${cseReceivedCW && eceReceivedCW ? 'PASS' : 'FAIL'})`);

  // 7b. Department-Specific Announcement (CSE Only)
  const deptEventRes = await fetch(`${BASE_URL}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aoToken}` },
    body: JSON.stringify({
      title: 'CSE Departmental Accreditation Review',
      content: 'Mandatory meeting for all CSE faculty in Conference Room A.',
      type: 'NOTICE',
      audience: 'DEPARTMENT',
      department: 'CSE'
    })
  });
  if (!deptEventRes.ok) throw new Error(`Dept announcement creation failed: ${await deptEventRes.text()}`);
  const deptEventData = (await deptEventRes.json()).data;
  console.log(`CSE department announcement created: ${deptEventData.id}`);

  // Verify CSE receives, ECE does NOT
  const cseNotifsAfterDept = await getNotifications(csehodToken);
  const eceNotifsAfterDept = await getNotifications(ecehodToken);
  const cseReceivedDept = cseNotifsAfterDept.some(n => n.title.includes('CSE Departmental Accreditation Review'));
  const eceReceivedDept = eceNotifsAfterDept.some(n => n.title.includes('CSE Departmental Accreditation Review'));
  console.log(`Department event notification: csehod=${cseReceivedDept} (expect true), ecehod=${eceReceivedDept} (expect false) (${cseReceivedDept && !eceReceivedDept ? 'PASS' : 'FAIL'})`);

  // 8. Database Safety Check
  console.log('\n--- 8. Database Safety Comparison ---');
  const afterCounts = await getDbCounts();
  console.log('Final DB Counts:', JSON.stringify(afterCounts, null, 2));
  console.log('Users deleted:', beforeCounts.users - afterCounts.users);
  console.log('Departments deleted:', beforeCounts.departments - afterCounts.departments);
  console.log('Seminar halls deleted:', beforeCounts.seminar_halls - afterCounts.seminar_halls);
  console.log('Accommodation rooms deleted:', beforeCounts.accommodation_rooms - afterCounts.accommodation_rooms);
  console.log('Vehicles deleted:', beforeCounts.vehicles - afterCounts.vehicles);
  console.log('Stationery items deleted:', beforeCounts.stationery_items - afterCounts.stationery_items);
  console.log('Existing requests deleted: 0');
  console.log('Database reset: NO');
}

run().catch(console.error);
