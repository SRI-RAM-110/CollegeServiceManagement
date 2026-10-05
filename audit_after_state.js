const { request, login } = require('./api_helper.js');
const fs = require('fs');

async function testAll() {
  console.log('=== VERIFYING AFTER STATE ===\n');

  // 1. Fetch current users & departments via AO001
  const auth = await login('AO001', 'admin123');
  const token = auth.token;
  const headers = { Authorization: 'Bearer ' + token };

  const [
    usersRes,
    deptsRes,
    hallsRes,
    vehiclesRes,
    roomsRes,
    itemsRes,
    announcementsRes,
    notifsRes,
    allReqRes
  ] = await Promise.all([
    request('http://localhost:8080/api/admin/users', { headers }),
    request('http://localhost:8080/api/departments', { headers }),
    request('http://localhost:8080/api/seminar/halls', { headers }),
    request('http://localhost:8080/api/transport/vehicles', { headers }),
    request('http://localhost:8080/api/accommodation/rooms', { headers }),
    request('http://localhost:8080/api/stationery/items', { headers }),
    request('http://localhost:8080/api/announcements', { headers }),
    request('http://localhost:8080/api/notifications', { headers }),
    request('http://localhost:8080/api/requests/all', { headers })
  ]);

  const users = usersRes.body.data || usersRes.body;
  const depts = deptsRes.body.data || deptsRes.body;
  const halls = hallsRes.body.data || hallsRes.body;
  const vehicles = vehiclesRes.body.data || vehiclesRes.body;
  const rooms = roomsRes.body.data || roomsRes.body;
  const items = itemsRes.body.data || itemsRes.body;
  const announcements = announcementsRes.body.data || announcementsRes.body;
  const notifs = notifsRes.body.data || notifsRes.body;
  const allReq = allReqRes.body.data || allReqRes.body;

  console.log('--- DATABASE AFTER COUNTS ---');
  console.log('users count:', users.length);
  console.log('departments count:', depts.length);
  console.log('seminar halls count:', halls.length);
  console.log('vehicles count:', vehicles.length);
  console.log('rooms count:', rooms.length);
  console.log('stationery items count:', items.length);
  console.log('announcements count:', announcements.length);
  console.log('notifications count:', notifs.length);
  console.log('unified requests count:', allReq.length);

  fs.writeFileSync('audit_after_state.json', JSON.stringify({ users, depts }, null, 2));

  // Check departments
  console.log('\n--- DEPARTMENTS AFTER ---');
  depts.forEach(d => {
    console.log(`[${d.code}] ${d.name} | HOD: ${d.headOfDept} | Active: ${d.active}`);
  });

  // Check users
  console.log('\n--- USERS AFTER (' + users.length + ') ---');
  users.forEach((u, i) => {
    console.log(`[${i+1}] ${u.userId} | ${u.name} | ${u.email} | ${u.phone} | roles: ${JSON.stringify(u.roles)} | dept: ${u.department} | halls: ${JSON.stringify(u.assignedHallIds)} | active: ${u.active}`);
  });
}

testAll().catch(console.error);
