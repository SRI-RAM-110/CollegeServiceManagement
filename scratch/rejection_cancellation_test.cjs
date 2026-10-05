const { MongoClient } = require('../frontend/node_modules/mongodb');

const BASE_URL = 'http://localhost:8080/api';

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
  console.log('TESTING REJECTION, CANCELLATION & RESCHEDULE LIFECYCLES');
  console.log('====================================================');

  const csehodToken = await login('csehod', 'dept123');
  const ecehodToken = await login('ecehod', 'dept123');
  const semAdminToken = await login('SEM001', 'admin123');
  const accAdminToken = await login('ACC001', 'admin123');

  // --- A. REJECTION TEST ---
  console.log('\n--- A. Rejection Notification Test ---');
  const semDateRej = '2027-07-' + String((Date.now() % 25) + 1).padStart(2, '0');
  const semRejReq = await fetch(`${BASE_URL}/seminar/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      eventTitle: 'Event To Be Rejected',
      purpose: 'Testing Rejection Workflow',
      expectedParticipants: 50,
      hallId: 'SH-2',
      slot: 'AFTERNOON',
      date: semDateRej
    })
  });
  const semRejData = (await semRejReq.json()).data;
  const semRejId = semRejData.bookingId || semRejData.id;
  console.log(`Created request for rejection: ${semRejId}`);

  // Admin rejects request with reason
  const rejRes = await fetch(`${BASE_URL}/seminar/requests/${semRejId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${semAdminToken}` },
    body: JSON.stringify({ reason: 'Maintenance scheduled during this slot' })
  });
  console.log('Reject API Status:', rejRes.status);

  const cseNotifsAfterRej = await getNotifications(csehodToken);
  const rejNotif = cseNotifsAfterRej.find(n => (n.referenceId === semRejId || n.requestId === semRejId) && (n.title.toLowerCase().includes('reject') || n.message.toLowerCase().includes('reject')));
  console.log('Rejection Notification for csehod:', rejNotif ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterRej = await getNotifications(ecehodToken);
  const leakedRejToEce = eceNotifsAfterRej.find(n => (n.referenceId === semRejId || n.requestId === semRejId));
  console.log('Rejection Notification leaked to ecehod:', leakedRejToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  // --- B. CANCELLATION TEST ---
  console.log('\n--- B. Cancellation Workflow Test ---');
  const semDateCancel = '2027-08-' + String((Date.now() % 25) + 1).padStart(2, '0');
  const semCancelReq = await fetch(`${BASE_URL}/seminar/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      eventTitle: 'Event To Be Cancelled',
      purpose: 'Testing Cancellation Workflow',
      expectedParticipants: 60,
      hallId: 'SH-3',
      slot: 'FORENOON',
      date: semDateCancel
    })
  });
  const semCancelData = (await semCancelReq.json()).data;
  const semCancelId = semCancelData.bookingId || semCancelData.id;
  console.log(`Created request for cancellation: ${semCancelId}`);

  // Approve first
  await fetch(`${BASE_URL}/seminar/requests/${semCancelId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${semAdminToken}` }
  });

  // Requester submits cancellation request
  const cancelReqRes = await fetch(`${BASE_URL}/seminar/requests/${semCancelId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({ reason: 'Speaker unavailable' })
  });
  console.log('Cancel Request API Status:', cancelReqRes.status);

  // Admin approves cancellation
  const cancelApproveRes = await fetch(`${BASE_URL}/seminar/requests/${semCancelId}/approve-cancellation`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${semAdminToken}` }
  });
  console.log('Approve Cancellation Status:', cancelApproveRes.status);

  const cseNotifsAfterCancel = await getNotifications(csehodToken);
  const cancelNotif = cseNotifsAfterCancel.find(n => (n.referenceId === semCancelId || n.requestId === semCancelId) && (n.title.toLowerCase().includes('cancel') || n.message.toLowerCase().includes('cancel')));
  console.log('Cancellation Notification for csehod:', cancelNotif ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterCancel = await getNotifications(ecehodToken);
  const leakedCancelToEce = eceNotifsAfterCancel.find(n => (n.referenceId === semCancelId || n.requestId === semCancelId));
  console.log('Cancellation Notification leaked to ecehod:', leakedCancelToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');

  // --- C. RESCHEDULE TEST ---
  console.log('\n--- C. Reschedule Workflow Test ---');
  const semDateResched = '2027-09-' + String((Date.now() % 25) + 1).padStart(2, '0');
  const semNewDate = '2027-09-' + String(((Date.now() % 25) + 2) % 28 + 1).padStart(2, '0');
  const semReschedReq = await fetch(`${BASE_URL}/seminar/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      eventTitle: 'Event To Be Rescheduled',
      purpose: 'Testing Reschedule Workflow',
      expectedParticipants: 80,
      hallId: 'SH-4',
      slot: 'FORENOON',
      date: semDateResched
    })
  });
  const semReschedData = (await semReschedReq.json()).data;
  const semReschedId = semReschedData.bookingId || semReschedData.id;
  console.log(`Created request for reschedule: ${semReschedId}`);

  // Approve first
  await fetch(`${BASE_URL}/seminar/requests/${semReschedId}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${semAdminToken}` }
  });

  // Requester submits reschedule request
  const reschedReqRes = await fetch(`${BASE_URL}/seminar/requests/${semReschedId}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${csehodToken}` },
    body: JSON.stringify({
      newHallId: 'SH-4',
      newDate: semNewDate,
      newSlot: 'AFTERNOON',
      reason: 'Shifted schedule by keynote speaker'
    })
  });
  console.log('Reschedule Request API Status:', reschedReqRes.status);

  // Admin approves reschedule
  const reschedApproveRes = await fetch(`${BASE_URL}/seminar/requests/${semReschedId}/approve-reschedule`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${semAdminToken}` }
  });
  const reschedData = (await reschedApproveRes.json()).data;
  const newBookingId = reschedData?.bookingId;
  console.log('Approve Reschedule Status:', reschedApproveRes.status, 'New Booking ID:', newBookingId);

  const cseNotifsAfterResched = await getNotifications(csehodToken);
  const reschedNotif = cseNotifsAfterResched.find(n => (n.referenceId === semReschedId || n.referenceId === newBookingId || n.message?.includes(semReschedId)) && n.title.toLowerCase().includes('reschedule'));
  console.log('Reschedule Notification for csehod:', reschedNotif ? 'RECEIVED (PASS)' : 'MISSING (FAIL)');

  const eceNotifsAfterResched = await getNotifications(ecehodToken);
  const leakedReschedToEce = eceNotifsAfterResched.find(n => (n.referenceId === semReschedId || n.referenceId === newBookingId || n.message?.includes(semReschedId)));
  console.log('Reschedule Notification leaked to ecehod:', leakedReschedToEce ? 'YES (FAIL)' : 'NONE (PASS - Isolated)');
}

run().catch(console.error);
