const { MongoClient } = require('../frontend/node_modules/mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('collegeservices_db');
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const name = c.name;
    const countUserId = await db.collection(name).countDocuments({
      $or: [
        { requestedBy: 'AO001' },
        { requestedBy: /AO001/i },
        { requesterUserId: 'AO001' },
        { requesterUserId: /AO001/i },
        { approvedBy: 'AO001' },
        { approvedBy: /AO001/i },
        { rejectedBy: 'AO001' },
        { userId: 'AO001' },
        { createdBy: 'AO001' },
        { user: 'AO001' }
      ]
    });
    const countEmail = await db.collection(name).countDocuments({
      $or: [
        { requestedBy: /ao001/i },
        { requesterUserId: /ao001/i },
        { approvedBy: /ao001/i },
        { rejectedBy: /ao001/i },
        { email: /ao001/i },
        { requesterEmail: /ao001/i }
      ]
    });
    console.log(`Collection ${name}: ${countUserId} userId refs, ${countEmail} email refs`);
  }
  await client.close();
}

main().catch(console.error);
