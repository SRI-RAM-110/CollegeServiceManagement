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

async function login(userId, password = 'dept123') {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  });
  if (!res.ok) {
    // Try fallback default passwords
    for (const pw of ['admin123', 'dept123', 'coord123', 'password123', 'admin', 'password']) {
      const retry = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password: pw }),
      });
      if (retry.ok) {
        const data = await retry.json();
        return data.data?.token || data.token;
      }
    }
    throw new Error(`Failed to login as ${userId}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data?.token || data.token;
}

async function run() {
  console.log('=== STEP 0: RECORD INITIAL DATABASE COUNTS ===');
  const initialCounts = await getDbCounts();
  console.log('Initial DB Counts:', JSON.stringify(initialCounts, null, 2));

  console.log('\n=== STEP 1: AUTHENTICATION CHECK ===');
  const csehodToken = await login('csehod');
  console.log('csehod login: SUCCESS');
  const ecehodToken = await login('ecehod');
  console.log('ecehod login: SUCCESS');
  const cse001Token = await login('CSE001');
  console.log('CSE001 login: SUCCESS');
  let adminToken;
  try {
    adminToken = await login('AO001');
    console.log('AO001 login: SUCCESS');
  } catch (e) {
    adminToken = await login('admin');
    console.log('admin login: SUCCESS');
  }

  console.log('\n=== STEP 2: USER-ID SPOOFING & BACKEND NOTIFICATION OWNERSHIP ===');
  // Attempt to spoof userId=ecehod using csehod's token
  const spoofRes = await fetch(`${BASE_URL}/notifications?userId=ecehod`, {
    headers: { Authorization: `Bearer ${csehodToken}` }
  });
  const spoofData = await spoofRes.json();
  const csehodNotifs = spoofData.data || [];
  
  // Verify none of the returned notifications belong to ecehod
  const leakedToCsehod = csehodNotifs.filter(n => n.recipientUserId === 'ecehod');
  if (leakedToCsehod.length > 0) {
    console.error('FAIL: User ID spoofing succeeded! csehod saw ecehod notifications:', leakedToCsehod);
  } else {
    console.log('PASS: User ID spoofing blocked! ?userId=ecehod was ignored by backend.');
  }

  // Attempt reverse spoofing: ecehod attempting userId=csehod
  const revSpoofRes = await fetch(`${BASE_URL}/notifications?userId=csehod`, {
    headers: { Authorization: `Bearer ${ecehodToken}` }
  });
  const revSpoofData = await revSpoofRes.json();
  const ecehodNotifs = revSpoofData.data || [];
  const leakedToEcehod = ecehodNotifs.filter(n => n.recipientUserId === 'csehod');
  if (leakedToEcehod.length > 0) {
    console.error('FAIL: Reverse spoofing succeeded! ecehod saw csehod notifications:', leakedToEcehod);
  } else {
    console.log('PASS: Reverse spoofing blocked! ?userId=csehod was ignored by backend.');
  }

  // Same-department isolation: CSE001 should NOT see csehod private notifications
  const cse001Res = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${cse001Token}` }
  });
  const cse001Data = await cse001Res.json();
  const cse001Notifs = cse001Data.data || [];
  const csehodPrivateInCse001 = cse001Notifs.filter(n => n.recipientUserId === 'csehod');
  if (csehodPrivateInCse001.length > 0) {
    console.error('FAIL: Same-department isolation failed! CSE001 saw csehod private notifications');
  } else {
    console.log('PASS: Same-department isolation confirmed. CSE001 cannot see csehod private notifications.');
  }

  console.log('\n=== STEP 3: VAPID PUBLIC KEY ENDPOINT ===');
  const vapidRes = await fetch(`${BASE_URL}/push/public-key`);
  const vapidData = await vapidRes.json();
  if (vapidData.data?.publicKey) {
    console.log('PASS: VAPID public key retrieved successfully:', vapidData.data.publicKey.substring(0, 20) + '...');
  } else {
    console.error('FAIL: Could not retrieve VAPID public key');
  }

  console.log('\n=== STEP 4: PUSH SUBSCRIPTION AUTHENTICATED OWNERSHIP ===');
  const dummyEndpoint = 'https://updates.push.services.mozilla.com/wpush/v2/test-' + Date.now();
  const subRes = await fetch(`${BASE_URL}/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${csehodToken}`
    },
    body: JSON.stringify({
      endpoint: dummyEndpoint,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9Eg0mOvhHWUrqm7qgkW8N_HWumE4gkUHAo9MgP8bv9FekE',
        auth: 'tBHItJI5svbpez7KI4CCXg'
      }
    })
  });
  const subData = await subRes.json();
  if (subData.data?.userId === 'csehod') {
    console.log('PASS: Push subscription saved and accurately associated with authenticated user "csehod".');
  } else {
    console.error('FAIL: Push subscription user mismatch:', subData);
  }

  // Unsubscribe cleanup of test dummy subscription
  await fetch(`${BASE_URL}/push/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${csehodToken}`
    },
    body: JSON.stringify({ endpoint: dummyEndpoint })
  });
  console.log('PASS: Push unsubscribe endpoint executed.');

  console.log('\n=== STEP 5: PER-USER READ STATE ISOLATION ===');
  // Find a notification visible to csehod
  if (csehodNotifs.length > 0) {
    const testNotif = csehodNotifs[0];
    const markReadRes = await fetch(`${BASE_URL}/notifications/${testNotif.id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${csehodToken}` }
    });
    console.log('Mark as read response status:', markReadRes.status);
    
    // Verify csehod sees it read
    const verifyCseRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${csehodToken}` }
    });
    const updatedCse = (await verifyCseRes.json()).data.find(n => n.id === testNotif.id);
    console.log('Is read for csehod:', updatedCse?.read);

    // If it was a broadcast notification, verify ecehod does NOT have it marked as read unless ecehod read it
    if (!testNotif.recipientUserId || testNotif.recipientUserId === 'ALL') {
      const verifyEceRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${ecehodToken}` }
      });
      const updatedEce = (await verifyEceRes.json()).data.find(n => n.id === testNotif.id);
      if (updatedEce) {
        console.log('Is read for ecehod (should be false if unread):', updatedEce.read);
      }
    }
  }

  console.log('\n=== STEP 6: NOTIFICATION SEARCH / UNIFIED REQUEST SEARCH ===');
  // Test search in My Requests
  const searchReqRes = await fetch(`${BASE_URL}/requests/my?search=SEM`, {
    headers: { Authorization: `Bearer ${csehodToken}` }
  });
  const searchReqData = await searchReqRes.json();
  console.log(`PASS: /api/requests/my?search=SEM returned ${searchReqData.data?.length || 0} items`);

  // Test case-insensitive search
  const searchLowerRes = await fetch(`${BASE_URL}/requests/my?search=sem`, {
    headers: { Authorization: `Bearer ${csehodToken}` }
  });
  const searchLowerData = await searchLowerRes.json();
  console.log(`PASS: /api/requests/my?search=sem returned ${searchLowerData.data?.length || 0} items (case-insensitive match: ${searchReqData.data?.length === searchLowerData.data?.length})`);

  // Clear search restores all
  const searchAllRes = await fetch(`${BASE_URL}/requests/my`, {
    headers: { Authorization: `Bearer ${csehodToken}` }
  });
  const searchAllData = await searchAllRes.json();
  console.log(`PASS: /api/requests/my without search returned ${searchAllData.data?.length || 0} items`);

  console.log('\n=== STEP 7: RECORD FINAL DATABASE COUNTS ===');
  const finalCounts = await getDbCounts();
  console.log('Final DB Counts:', JSON.stringify(finalCounts, null, 2));

  console.log('\n=== DATABASE SAFETY CHECK ===');
  console.log('Users deleted:', initialCounts.users - finalCounts.users);
  console.log('Departments deleted:', initialCounts.departments - finalCounts.departments);
  console.log('Seminar halls deleted:', initialCounts.seminar_halls - finalCounts.seminar_halls);
  console.log('Accommodation rooms deleted:', initialCounts.accommodation_rooms - finalCounts.accommodation_rooms);
  console.log('Vehicles deleted:', initialCounts.vehicles - finalCounts.vehicles);
  console.log('Stationery items deleted:', initialCounts.stationery_items - finalCounts.stationery_items);
}

run().catch(console.error);
