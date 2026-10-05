import { MongoClient } from 'mongodb';

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('collegeservices_db');
  
  // 1. Get coordinator 1's password hash to reuse for coordinator 6
  const coord1 = await db.collection('users').findOne({ userId: 'seminarcoordinator1' });
  const coordPass = coord1 ? coord1.password : null;

  // 2. Insert or update seminarcoordinator6
  await db.collection('users').updateOne(
    { userId: 'seminarcoordinator6' },
    {
      $set: {
        userId: 'seminarcoordinator6',
        name: 'Seminar Coordinator 6',
        email: 'seminarcoordinator6@nrtec.local',
        role: 'SEMINAR_COORDINATOR',
        roles: ['SEMINAR_COORDINATOR'],
        department: 'ECE',
        designation: 'Assistant Professor & Seminar Coordinator',
        phone: '+91 90000 00036',
        assignedHallIds: ['SH-6'],
        servicePermissions: [],
        active: true,
        mustChangePassword: false,
        password: coordPass,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  // 3. Ensure seminarcoordinator1 has strictly ['SH-1']
  await db.collection('users').updateOne(
    { userId: 'seminarcoordinator1' },
    { $set: { assignedHallIds: ['SH-1'] } }
  );

  // 4. Update SH-6 to have coordinatorUserIds: ['seminarcoordinator6']
  await db.collection('seminar_halls').updateOne(
    { hallId: 'SH-6' },
    {
      $set: {
        name: 'Block 2 Seminar hall',
        location: 'Block 2 – Ground Floor',
        block: 'Block 2',
        floor: 'Ground Floor',
        capacity: 250,
        facilities: ['Projector', 'AC', 'Audio System', 'Wi-Fi'],
        image: '/assets/halls/hall2.jpg',
        status: 'Available',
        coordinatorUserIds: ['seminarcoordinator6'],
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log('MongoDB update completed successfully.');

  const coords = await db.collection('users').find({
    userId: { $in: ['seminarcoordinator1', 'seminarcoordinator2', 'seminarcoordinator3', 'seminarcoordinator4', 'seminarcoordinator5', 'seminarcoordinator6', 'csehod'] }
  }).toArray();
  console.log('\n--- Coordinators & Multi-Role ---');
  coords.forEach(c => console.log(c.userId, '| email:', c.email, '| roles:', c.roles, '| assignedHallIds:', c.assignedHallIds));

  const halls = await db.collection('seminar_halls').find({}).toArray();
  console.log('\n--- Seminar Halls ---');
  halls.forEach(h => console.log(h.hallId, '|', h.name, '| coords:', h.coordinatorUserIds));

  await client.close();
}

main().catch(console.error);
