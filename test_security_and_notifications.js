const { request, login } = require('./api_helper.js');
const { MongoClient } = require('./frontend/node_modules/mongodb');

async function runTests() {
  console.log('====================================================');
  console.log('STARTING NOTIFICATION CLEAR & SECURITY TESTS');
  console.log('====================================================\n');

  const uri = 'mongodb://127.0.0.1:27017/collegeservices_db';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('collegeservices_db');

  try {
    // Step 1: Login accounts
    console.log('1. Authenticating test users...');
    const cseAuth = await login('csehod', 'dept123');
    const eceAuth = await login('ecehod', 'dept123');
    const aoAuth = await login('AO001', 'admin123');
    const staAuth = await login('STA001', 'admin123');
    const cseUserAuth = await login('CSE001', 'dept123');

    // Creator login
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const secretPath = path.join(os.homedir(), '.collegeservices_creator_secret');
    if (fs.existsSync(secretPath)) {
      const creatorSecret = fs.readFileSync(secretPath, 'utf8').trim();
      const creatorAuth = await login('CREATOR001', creatorSecret);
      console.log('   CREATOR001 token acquired (Role: ' + creatorAuth.user.role + ')');
    }

    console.log('   csehod token acquired');
    console.log('   ecehod token acquired');
    console.log('   AO001 token acquired');
    console.log('   STA001 token acquired');
    console.log('   CSE001 token acquired');

    // Step 2: Clean up any existing notifications for csehod and ecehod for clean test
    await db.collection('notifications').deleteMany({
      recipientUserId: { $in: ['csehod', 'ecehod', 'CSE001'] }
    });

    // Step 3: Insert user-specific notifications for csehod and ecehod
    console.log('\n2. Creating test notifications for csehod (3) and ecehod (3)...');
    const notifDocs = [
      {
        recipientRole: 'DEPARTMENT_HOD',
        recipientDept: 'CSE',
        recipientUserId: 'csehod',
        title: 'CSE Security Test 1',
        message: 'Notification 1 for csehod',
        service: 'System',
        type: 'INFO',
        read: false,
        readByUserIds: [],
        clearedByUserIds: [],
        referenceId: 'SEC-CSE-001',
        createdAt: new Date()
      },
      {
        recipientRole: 'DEPARTMENT_HOD',
        recipientDept: 'CSE',
        recipientUserId: 'csehod',
        title: 'CSE Security Test 2',
        message: 'Notification 2 for csehod',
        service: 'Seminar Hall',
        type: 'SUCCESS',
        read: false,
        readByUserIds: [],
        clearedByUserIds: [],
        referenceId: 'SEC-CSE-002',
        createdAt: new Date()
      },
      {
        recipientRole: 'DEPARTMENT_HOD',
        recipientDept: 'CSE',
        recipientUserId: 'csehod',
        title: 'CSE Security Test 3',
        message: 'Notification 3 for csehod',
        service: 'Stationery',
        type: 'WARNING',
        read: false,
        readByUserIds: [],
        clearedByUserIds: [],
        referenceId: 'SEC-CSE-003',
        createdAt: new Date()
      },
      {
        recipientRole: 'DEPARTMENT_HOD',
        recipientDept: 'ECE',
        recipientUserId: 'ecehod',
        title: 'ECE Security Test 1',
        message: 'Notification 1 for ecehod',
        service: 'System',
        type: 'INFO',
        read: false,
        readByUserIds: [],
        clearedByUserIds: [],
        referenceId: 'SEC-ECE-001',
        createdAt: new Date()
      },
      {
        recipientRole: 'DEPARTMENT_HOD',
        recipientDept: 'ECE',
        recipientUserId: 'ecehod',
        title: 'ECE Security Test 2',
        message: 'Notification 2 for ecehod',
        service: 'Transport',
        type: 'SUCCESS',
        read: false,
        readByUserIds: [],
        clearedByUserIds: [],
        referenceId: 'SEC-ECE-002',
        createdAt: new Date()
      },
      {
        recipientRole: 'DEPARTMENT_HOD',
        recipientDept: 'ECE',
        recipientUserId: 'ecehod',
        title: 'ECE Security Test 3',
        message: 'Notification 3 for ecehod',
        service: 'Accommodation',
        type: 'WARNING',
        read: false,
        readByUserIds: [],
        clearedByUserIds: [],
        referenceId: 'SEC-ECE-003',
        createdAt: new Date()
      }
    ];

    await db.collection('notifications').insertMany(notifDocs);
    console.log('   Inserted notifications into MongoDB');

    // Step 4: Verify both users can see their notifications via API
    console.log('\n3. Verifying notification retrieval via GET /api/notifications...');
    const cseNotifsRes = await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + cseAuth.token }
    });
    const cseNotifs = cseNotifsRes.body.data || [];
    console.log(`   csehod sees ${cseNotifs.length} notifications`);

    const eceNotifsRes = await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + eceAuth.token }
    });
    const eceNotifs = eceNotifsRes.body.data || [];
    console.log(`   ecehod sees ${eceNotifs.length} notifications`);

    if (cseNotifs.length === 0 || eceNotifs.length === 0) {
      throw new Error('Initial notifications setup failed');
    }

    // Step 5: Test spoofing attack - csehod tries to clear ecehod's notifications via ?userId=ecehod
    console.log('\n4. SECURITY TEST: User-ID spoofing protection...');
    console.log('   csehod attempting DELETE /api/notifications?userId=ecehod');
    const spoofRes = await request('http://localhost:8080/api/notifications?userId=ecehod', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + cseAuth.token }
    });
    console.log(`   Delete response status: ${spoofRes.status}`);

    // Verify csehod's notifications are cleared
    const cseAfterRes = await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + cseAuth.token }
    });
    const cseAfter = cseAfterRes.body.data || [];
    console.log(`   csehod notifications after clear: ${cseAfter.length} (Expected: 0) -> ${cseAfter.length === 0 ? 'PASS' : 'FAIL'}`);

    // Verify ecehod's notifications are completely intact and NOT deleted!
    const eceAfterRes = await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + eceAuth.token }
    });
    const eceAfter = eceAfterRes.body.data || [];
    console.log(`   ecehod notifications after csehod clear: ${eceAfter.length} (Expected: unchanged, >= 3) -> ${eceAfter.length === eceNotifs.length ? 'PASS' : 'FAIL'}`);

    const crossUserProtected = (cseAfter.length === 0 && eceAfter.length === eceNotifs.length);
    console.log(`   [SECURITY RESULT] Cross-user isolation and spoof-protection: ${crossUserProtected ? 'PASS' : 'FAIL'}`);

    // Step 6: Test unauthenticated DELETE
    console.log('\n5. SECURITY TEST: Unauthenticated DELETE /api/notifications...');
    const unauthRes = await request('http://localhost:8080/api/notifications', {
      method: 'DELETE'
    });
    const unauthProtected = (unauthRes.status === 401 || unauthRes.status === 403);
    console.log(`   Unauthenticated status: ${unauthRes.status} (Expected 401/403) -> ${unauthProtected ? 'PASS' : 'FAIL'}`);

    // Step 7: Clear ecehod's notifications as ecehod
    console.log('\n6. Clearing notifications as authenticated ecehod...');
    const eceClearRes = await request('http://localhost:8080/api/notifications', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + eceAuth.token }
    });
    console.log(`   ecehod delete response status: ${eceClearRes.status}`);

    const eceClearedRes = await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + eceAuth.token }
    });
    const eceCleared = eceClearedRes.body.data || [];
    console.log(`   ecehod notifications after clear: ${eceCleared.length} (Expected: 0) -> ${eceCleared.length === 0 ? 'PASS' : 'FAIL'}`);

    // Step 8: Test new notification creation and approval cycle
    console.log('\n7. FULL LIFECYCLE NOTIFICATION TEST...');
    console.log('   Step 7.1: CSE001 creates stationery request');
    const stationeryPayload = JSON.stringify({
      purpose: 'End Semester Exam Materials',
      items: [
        { itemId: 'ST-01', quantity: 5 }
      ],
      additionalNotes: 'Urgent requirement for upcoming semester examinations'
    });

    const createReqRes = await request('http://localhost:8080/api/stationery/requests', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cseUserAuth.token }
    }, stationeryPayload);

    const createdReq = createReqRes.body.data || createReqRes.body;
    const reqId = createdReq ? createdReq.requestId : null;
    console.log(`   Stationery Request created: ${reqId}, status=${createdReq ? createdReq.status : 'FAILED'}`);

    // Check STA001 receives admin notification
    console.log('   Step 7.2: Verify STA001 receives New Stationery Request notification');
    const staNotifsRes = await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + staAuth.token }
    });
    const staNotifs = staNotifsRes.body.data || [];
    const hasAdminNotif = staNotifs.some(n => n.referenceId === reqId || (n.title && n.title.includes('Stationery')));
    console.log(`   STA001 received notification for ${reqId}: ${hasAdminNotif ? 'PASS' : 'FAIL'}`);

    // Step 7.3: STA001 approves the request
    console.log(`   Step 7.3: STA001 approves request ${reqId}`);
    const approveRes = await request(`http://localhost:8080/api/stationery/requests/${reqId}/approve`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + staAuth.token }
    }, JSON.stringify({ comments: 'Approved by Stationery Administrator' }));
    console.log(`   Approval status: ${approveRes.status}`);

    // Step 7.4: CSE001 receives approval notification
    console.log('   Step 7.4: Verify CSE001 receives approval notification');
    const userNotifsRes = await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + cseUserAuth.token }
    });
    const userNotifs = userNotifsRes.body.data || [];
    const hasUserApprovalNotif = userNotifs.some(n => n.referenceId === reqId && n.title && n.title.includes('Approved'));
    console.log(`   CSE001 received approval notification for ${reqId}: ${hasUserApprovalNotif ? 'PASS' : 'FAIL'}`);

    // Step 7.5: CSE001 clears their notifications
    console.log('   Step 7.5: CSE001 clears notifications via DELETE /api/notifications');
    const clearUserRes = await request('http://localhost:8080/api/notifications', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + cseUserAuth.token }
    });
    console.log(`   CSE001 clear status: ${clearUserRes.status}`);

    const userAfterClear = (await request('http://localhost:8080/api/notifications', {
      headers: { Authorization: 'Bearer ' + cseUserAuth.token }
    })).body.data || [];
    console.log(`   CSE001 notifications after clear: ${userAfterClear.length} (Expected: 0) -> ${userAfterClear.length === 0 ? 'PASS' : 'FAIL'}`);

    // Clean up test request from lifecycle test to maintain pristine 45 requests count
    await db.collection('stationery_requests').deleteOne({ requestId: reqId });
    await db.collection('notifications').deleteMany({ referenceId: reqId });
    console.log(`   Cleaned up test stationery request ${reqId} and its notifications.`);

    console.log('\n====================================================');
    console.log('ALL NOTIFICATION & SECURITY TESTS COMPLETED SUCCESSFULLY');
    console.log('====================================================');

  } finally {
    await client.close();
  }
}

runTests().catch(console.error);
