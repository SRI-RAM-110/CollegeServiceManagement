const { MongoClient } = require('../frontend/node_modules/mongodb');

async function run() {
  const uri = 'mongodb://127.0.0.1:27017/collegeservices_db';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('collegeservices_db');
    console.log('Connected to MongoDB: collegeservices_db\n');

    // 1. Update HODs
    const hodUpdates = [
      {
        userId: 'csehod',
        name: 'Dr. S. N. Thirumala Rao',
        email: 'csehod@nrtec.in',
        designation: 'Professor & HOD - CSE',
        phone: '+91 98852 71324'
      },
      {
        userId: 'ecehod',
        name: 'Dr. V. Venkata Rao',
        email: 'ecehod@nrtec.in',
        designation: 'Professor & HOD - ECE',
        phone: '+91 98480 22001'
      },
      {
        userId: 'eeehod',
        name: 'Dr. Shaik Mahammad Shareef',
        email: 'eeehod@nrtec.in',
        designation: 'Associate Professor & HOD - EEE',
        phone: '+91 98480 33001'
      },
      {
        userId: 'mechhod',
        name: 'Dr. B. Venkata Siva',
        email: 'mechhod@nrtec.in',
        designation: 'Professor & HOD - Mechanical',
        phone: '+91 98480 44001'
      },
      {
        userId: 'civilhod',
        name: 'Dr. P. Naga Sowjanya',
        email: 'civilhod@nrtec.in',
        designation: 'Professor & HOD - Civil',
        phone: '+91 98480 55001'
      },
      {
        userId: 'aihod',
        name: 'Dr. B. Jhansi Vazram',
        email: 'aihod@nrtec.in',
        designation: 'Professor & HOD - AI & IT',
        phone: '+91 98480 66001'
      },
      {
        userId: 'mbahod',
        name: 'Dr. Y. Anki Reddy',
        email: 'mbahod@nrtec.in',
        designation: 'Professor & HOD - MBA',
        phone: '+91 98480 77001'
      },
      {
        userId: 'pharmhod',
        name: 'Sample Pharmacy HOD',
        email: 'sample.pharm.hod@nrtec.in',
        designation: 'Sample HOD - Pharmacy',
        phone: '+91 98480 88001'
      }
    ];

    console.log('--- Updating HOD Accounts ---');
    for (const h of hodUpdates) {
      const res = await db.collection('users').updateOne(
        { userId: h.userId },
        {
          $set: {
            name: h.name,
            email: h.email.trim().toLowerCase(),
            designation: h.designation,
            phone: h.phone,
            updatedAt: new Date()
          }
        }
      );
      console.log(`Updated ${h.userId} -> Name: "${h.name}", Email: "${h.email}" (Matched: ${res.matchedCount}, Modified: ${res.modifiedCount})`);
    }

    // 2. Update Seminar Coordinators
    const coordUpdates = [
      { userId: 'seminarcoordinator1', email: 'seminarcoordinator1@nrtec.in', hall: 'SH-1' },
      { userId: 'seminarcoordinator2', email: 'seminarcoordinator2@nrtec.in', hall: 'SH-2' },
      { userId: 'seminarcoordinator3', email: 'seminarcoordinator3@nrtec.in', hall: 'SH-3' },
      { userId: 'seminarcoordinator4', email: 'seminarcoordinator4@nrtec.in', hall: 'SH-4' },
      { userId: 'seminarcoordinator5', email: 'seminarcoordinator5@nrtec.in', hall: 'SH-5' },
      { userId: 'seminarcoordinator6', email: 'seminarcoordinator6@nrtec.in', hall: 'SH-6' }
    ];

    console.log('\n--- Updating Seminar Coordinator Accounts ---');
    for (const c of coordUpdates) {
      const res = await db.collection('users').updateOne(
        { userId: c.userId },
        {
          $set: {
            email: c.email.trim().toLowerCase(),
            assignedHallIds: [c.hall],
            designation: 'Seminar Coordinator',
            updatedAt: new Date()
          }
        }
      );
      console.log(`Updated ${c.userId} -> Email: "${c.email}", Hall: [${c.hall}] (Matched: ${res.matchedCount}, Modified: ${res.modifiedCount})`);
    }

    // 3. Update Department Head Names
    console.log('\n--- Updating Department Heads in departments collection ---');
    const deptHeadUpdates = [
      { code: 'CSE', headOfDept: 'Dr. S. N. Thirumala Rao' },
      { code: 'ECE', headOfDept: 'Dr. V. Venkata Rao' },
      { code: 'EEE', headOfDept: 'Dr. Shaik Mahammad Shareef' },
      { code: 'ME', headOfDept: 'Dr. B. Venkata Siva' },
      { code: 'CIVIL', headOfDept: 'Dr. P. Naga Sowjanya' },
      { code: 'AI', headOfDept: 'Dr. B. Jhansi Vazram' },
      { code: 'MBA', headOfDept: 'Dr. Y. Anki Reddy' },
      { code: 'PHARM', headOfDept: 'Sample Pharmacy HOD' }
    ];

    for (const d of deptHeadUpdates) {
      const res = await db.collection('departments').updateOne(
        { code: d.code },
        { $set: { headOfDept: d.headOfDept } }
      );
      console.log(`Updated Department ${d.code} -> headOfDept: "${d.headOfDept}"`);
    }

    // 4. Update Seminar Halls Coordinator Mapping
    console.log('\n--- Updating Seminar Halls Coordinator Mapping ---');
    const hallCoordUpdates = [
      { hallId: 'SH-1', coordinatorUserIds: ['seminarcoordinator1'] },
      { hallId: 'SH-2', coordinatorUserIds: ['seminarcoordinator2'] },
      { hallId: 'SH-3', coordinatorUserIds: ['seminarcoordinator3'] },
      { hallId: 'SH-4', coordinatorUserIds: ['seminarcoordinator4'] },
      { hallId: 'SH-5', coordinatorUserIds: ['seminarcoordinator5'] },
      { hallId: 'SH-6', coordinatorUserIds: ['seminarcoordinator6'] }
    ];

    for (const hc of hallCoordUpdates) {
      await db.collection('seminar_halls').updateOne(
        { hallId: hc.hallId },
        { $set: { coordinatorUserIds: hc.coordinatorUserIds } }
      );
      console.log(`Updated Seminar Hall ${hc.hallId} -> coordinatorUserIds: [${hc.coordinatorUserIds.join(', ')}]`);
    }

    console.log('\nAll updates applied successfully!');
  } finally {
    await client.close();
  }
}

run().catch(console.error);
