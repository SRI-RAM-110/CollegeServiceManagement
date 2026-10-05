const { MongoClient } = require('./frontend/node_modules/mongodb');

async function inspect() {
  const uri = 'mongodb://127.0.0.1:27017/collegeservices_db';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('collegeservices_db');
    console.log('Connected to collegeservices_db\n');

    // 1. Collection inventory & counts
    const collections = await db.listCollections().toArray();
    console.log('====================================================');
    console.log('1. DATABASE INVENTORY & DOCUMENT COUNTS');
    console.log('====================================================');
    const counts = {};
    for (const col of collections) {
      const c = await db.collection(col.name).countDocuments();
      counts[col.name] = c;
      console.log(`${col.name.padEnd(30)}: ${c}`);
    }

    // 2. Users audit
    console.log('\n====================================================');
    console.log('2. USERS AUDIT');
    console.log('====================================================');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Total users: ${users.length}`);
    for (const u of users) {
      console.log(JSON.stringify({
        userId: u.userId,
        name: u.name,
        email: u.email,
        department: u.department,
        roles: u.roles || [u.role],
        servicePermissions: u.servicePermissions || [],
        assignedHallIds: u.assignedHallIds || [],
        active: u.active
      }));
    }

    // 3. Notifications audit
    console.log('\n====================================================');
    console.log('3. NOTIFICATIONS AUDIT');
    console.log('====================================================');
    const notifs = await db.collection('notifications').find({}).toArray();
    console.log(`Total notifications: ${notifs.length}`);
    for (const n of notifs) {
      console.log(JSON.stringify({
        id: n._id ? n._id.toString() : n.id,
        recipientRole: n.recipientRole,
        recipientDept: n.recipientDept,
        recipientUserId: n.recipientUserId,
        title: n.title,
        service: n.service,
        read: n.read,
        readByUserIds: n.readByUserIds,
        clearedByUserIds: n.clearedByUserIds,
        referenceId: n.referenceId,
        createdAt: n.createdAt
      }));
    }

    // 4. Push subscriptions
    console.log('\n====================================================');
    console.log('4. PUSH SUBSCRIPTIONS AUDIT');
    console.log('====================================================');
    const subs = await db.collection('push_subscriptions').find({}).toArray();
    console.log(`Total push subscriptions: ${subs.length}`);
    for (const s of subs) {
      console.log(JSON.stringify({
        id: s._id ? s._id.toString() : s.id,
        userId: s.userId,
        role: s.role,
        department: s.department,
        endpoint: s.endpoint ? s.endpoint.substring(0, 50) + '...' : null
      }));
    }

    // 5. Announcements audit
    console.log('\n====================================================');
    console.log('5. ANNOUNCEMENTS AUDIT');
    console.log('====================================================');
    if (counts['announcements']) {
      const anns = await db.collection('announcements').find({}).toArray();
      for (const a of anns) {
        console.log(JSON.stringify({
          id: a._id ? a._id.toString() : a.id,
          title: a.title,
          createdBy: a.createdBy,
          createdAt: a.createdAt
        }));
      }
    }

    // 6. Test Transaction Data check across request collections
    console.log('\n====================================================');
    console.log('6. TRANSACTION DATA AUDIT (LOOKING FOR TEST/DEMO PATTERNS)');
    console.log('====================================================');
    const requestCols = [
      'seminar_bookings',
      'accommodation_requests',
      'transport_requests',
      'meal_requests',
      'stationery_requests'
    ];
    for (const colName of requestCols) {
      if (!counts[colName]) continue;
      const docs = await db.collection(colName).find({}).toArray();
      console.log(`\n--- ${colName} (${docs.length} total) ---`);
      for (const d of docs) {
        const id = d.requestId || d.bookingId || (d._id ? d._id.toString() : '');
        const titleOrEvent = d.eventName || d.title || d.purpose || d.reason || d.description || '';
        const user = d.userId || d.requestedBy || '';
        const isSuspicious = /test|demo|dummy|sample|e2e/i.test(titleOrEvent) || /test|demo|dummy|sample|e2e/i.test(user) || /test|demo|dummy|sample|e2e/i.test(id);
        if (isSuspicious) {
          console.log(`[SUSPICIOUS TEST] ${id} | User: ${user} | Title/Event: ${titleOrEvent}`);
        } else {
          // print summary of legitimate record
          console.log(`[LEGITIMATE] ${id} | User: ${user} | Title/Event: ${titleOrEvent}`);
        }
      }
    }

  } finally {
    await client.close();
  }
}

inspect().catch(console.error);
