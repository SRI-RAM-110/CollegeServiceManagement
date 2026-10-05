const { MongoClient } = require('../frontend/node_modules/mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('collegeservices_db');
  const principal = await db.collection('users').findOne({
    $or: [{ userId: 'PRINCIPAL001' }, { email: 'principal@nrtec.in' }]
  });
  const ao = await db.collection('users').findOne({
    $or: [{ userId: 'AO001' }, { email: 'ao@nrtec.in' }]
  });
  console.log('Principal:', principal ? {
    userId: principal.userId,
    name: principal.name,
    email: principal.email,
    role: principal.role,
    roles: principal.roles,
    designation: principal.designation,
    active: principal.active
  } : 'NOT FOUND');
  console.log('AO:', ao ? {
    userId: ao.userId,
    name: ao.name,
    email: ao.email,
    role: ao.role,
    roles: ao.roles,
    designation: ao.designation,
    active: ao.active
  } : 'NOT FOUND');
  await client.close();
}

main().catch(console.error);
