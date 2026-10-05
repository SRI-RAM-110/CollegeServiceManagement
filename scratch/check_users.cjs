const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('collegeservices_db');
  const users = await db.collection('users').find({
    userId: { $in: ['csehod', 'ecehod', 'admin', 'creator', 'CSE001'] }
  }).toArray();
  console.log(users.map(u => ({
    userId: u.userId,
    role: u.role,
    roles: u.roles,
    department: u.department,
    servicePermissions: u.servicePermissions
  })));
  await client.close();
}

run().catch(console.error);
