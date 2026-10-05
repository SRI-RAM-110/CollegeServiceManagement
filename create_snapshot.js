const { MongoClient } = require('./frontend/node_modules/mongodb');
const fs = require('fs');

async function createSnapshot() {
  const uri = 'mongodb://127.0.0.1:27017/collegeservices_db';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('collegeservices_db');
    console.log('Connected to MongoDB collegeservices_db for pre-cleanup snapshot...');

    const collections = await db.listCollections().toArray();
    const counts = {};
    for (const c of collections) {
      counts[c.name] = await db.collection(c.name).countDocuments();
    }

    // Users snapshot without passwords/hashes
    const rawUsers = await db.collection('users').find({}).toArray();
    const sanitizedUsers = rawUsers.map(u => ({
      id: u._id ? u._id.toString() : u.id,
      userId: u.userId,
      name: u.name,
      email: u.email,
      phone: u.phone,
      department: u.department,
      designation: u.designation,
      role: u.role,
      roles: u.roles || [u.role],
      assignedHallIds: u.assignedHallIds || [],
      servicePermissions: u.servicePermissions || [],
      active: u.active,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

    // Transactions snapshot
    const seminarBookings = (await db.collection('seminar_bookings').find({}).toArray()).map(b => ({
      id: b._id ? b._id.toString() : '',
      bookingId: b.bookingId,
      department: b.department,
      eventTitle: b.eventTitle,
      purpose: b.purpose,
      hallId: b.hallId,
      status: b.status,
      requestedBy: b.requestedBy,
      createdAt: b.createdAt
    }));

    const accommodationRequests = (await db.collection('accommodation_requests').find({}).toArray()).map(a => ({
      id: a._id ? a._id.toString() : '',
      requestId: a.requestId,
      department: a.department,
      purpose: a.purpose,
      status: a.status,
      requestedBy: a.requestedBy,
      createdAt: a.createdAt
    }));

    const transportRequests = (await db.collection('transport_requests').find({}).toArray()).map(t => ({
      id: t._id ? t._id.toString() : '',
      requestId: t.requestId,
      department: t.department,
      purpose: t.purpose,
      status: t.status,
      requestedBy: t.requestedBy,
      createdAt: t.createdAt
    }));

    const mealRequests = (await db.collection('meal_requests').find({}).toArray()).map(m => ({
      id: m._id ? m._id.toString() : '',
      requestId: m.requestId,
      department: m.department,
      eventTitle: m.eventTitle,
      status: m.status,
      requestedBy: m.requestedBy,
      createdAt: m.createdAt
    }));

    const stationeryRequests = (await db.collection('stationery_requests').find({}).toArray()).map(s => ({
      id: s._id ? s._id.toString() : '',
      requestId: s.requestId,
      department: s.department,
      purpose: s.purpose,
      status: s.status,
      requestedBy: s.requestedBy,
      createdAt: s.createdAt
    }));

    const announcements = (await db.collection('announcements').find({}).toArray()).map(a => ({
      id: a._id ? a._id.toString() : '',
      title: a.title,
      type: a.type,
      active: a.active,
      createdAt: a.createdAt
    }));

    const snapshot = {
      timestamp: new Date().toISOString(),
      database: 'collegeservices_db',
      collectionCounts: counts,
      users: sanitizedUsers,
      transactions: {
        seminar_bookings: seminarBookings,
        accommodation_requests: accommodationRequests,
        transport_requests: transportRequests,
        meal_requests: mealRequests,
        stationery_requests: stationeryRequests
      },
      announcements: announcements,
      notificationsCount: counts['notifications'] || 0,
      pushSubscriptionsCount: counts['push_subscriptions'] || 0
    };

    fs.writeFileSync('before_cleanup_snapshot.json', JSON.stringify(snapshot, null, 2));
    console.log('Snapshot successfully saved to before_cleanup_snapshot.json');
    console.log('Collection counts before cleanup:', JSON.stringify(counts, null, 2));
  } finally {
    await client.close();
  }
}

createSnapshot().catch(console.error);
