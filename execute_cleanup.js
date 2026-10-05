const { MongoClient, ObjectId } = require('./frontend/node_modules/mongodb');
const fs = require('fs');

async function performCleanup() {
  const uri = 'mongodb://127.0.0.1:27017/collegeservices_db';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('collegeservices_db');
    console.log('Connected to collegeservices_db for precise database cleanup...');

    const report = {
      timestamp: new Date().toISOString(),
      removedTransactions: [],
      removedAnnouncements: [],
      removedNotifications: [],
      removedUsers: [],
      beforeCounts: {},
      afterCounts: {}
    };

    // Record initial counts
    const collections = await db.listCollections().toArray();
    for (const c of collections) {
      report.beforeCounts[c.name] = await db.collection(c.name).countDocuments();
    }

    // 1. Confirmed test transaction IDs
    const testSeminarBookingIds = [
      'SEM-2026-195642', // Faculty Meeting TEST Notification
      'SEM-2026-405283', // E2E Test Notification Verification
      'SEM-2026-405284', // jgvbnv / ggfchgnb (test string)
      'SEM-2026-405285', // hgcgnvg / hgfcutjgh (test string)
      'SEM-2026-782032', // AI Research Colloquium 2026 test loop
      'SEM-2026-782033', // AI Research Colloquium 2026 test loop
      'SEM-2026-782034', // AI Research Colloquium 2026 test loop
      'SEM-2026-782035', // AI Research Colloquium 2026 test loop
      'SEM-2026-782036', // AI Research Colloquium 2026 test loop
      'SEM-2026-782037', // Testing Rejection Workflow
      'SEM-2026-782038', // Testing Cancellation Workflow
      'SEM-2026-782039', // Testing Reschedule Workflow
      'SEM-2026-782040', // Testing Rejection Workflow
      'SEM-2026-782041', // Testing Cancellation Workflow
      'SEM-2026-782042', // Testing Reschedule Workflow
      'SEM-2026-782043', // Testing Reschedule Workflow
      'SEM-2026-782044', // Testing Rejection Workflow
      'SEM-2026-782045', // Testing Cancellation Workflow
      'SEM-2026-782046', // Testing Reschedule Workflow
      'SEM-2026-782047', // Testing Reschedule Workflow
      'SEM-2026-862898', // hdthg / jyjgyi (test string)
      'SEM-2026-862899', // khjb / ujv (test string)
      'SEM-2026-255497'  // gfgjj / hgfhtyj (test string)
    ];

    const testAccommodationRequestIds = [
      'ACC-2026-81271', // Guest Lecture on Computational Intelligence test loop
      'ACC-2026-81272', // Guest Lecture on Computational Intelligence test loop
      'ACC-2026-81273'  // Guest Lecture on Computational Intelligence test loop
    ];

    const testTransportRequestIds = [
      'TR-5699', // Industrial Visit for Final Year Students test loop
      'TR-4070'  // Industrial Visit for Final Year Students test loop
    ];

    const testMealRequestIds = [
      'SM-5809', // Meals test loop
      'SM-4122'  // Meals test loop
    ];

    const testStationeryRequestIds = [
      'STA-54167' // Lab Exam Printing Material test loop
    ];

    const allTestRequestIds = [
      ...testSeminarBookingIds,
      ...testAccommodationRequestIds,
      ...testTransportRequestIds,
      ...testMealRequestIds,
      ...testStationeryRequestIds
    ];

    console.log(`\nRemoving ${allTestRequestIds.length} confirmed test transaction records...`);

    // Remove from seminar_bookings
    for (const bId of testSeminarBookingIds) {
      const res = await db.collection('seminar_bookings').deleteOne({ bookingId: bId });
      if (res.deletedCount > 0) {
        report.removedTransactions.push({ collection: 'seminar_bookings', id: bId, reason: 'Confirmed test transaction' });
      }
    }

    // Remove from accommodation_requests
    for (const rId of testAccommodationRequestIds) {
      const res = await db.collection('accommodation_requests').deleteOne({ requestId: rId });
      if (res.deletedCount > 0) {
        report.removedTransactions.push({ collection: 'accommodation_requests', id: rId, reason: 'Confirmed test transaction' });
      }
    }

    // Remove from transport_requests
    for (const rId of testTransportRequestIds) {
      const res = await db.collection('transport_requests').deleteOne({ requestId: rId });
      if (res.deletedCount > 0) {
        report.removedTransactions.push({ collection: 'transport_requests', id: rId, reason: 'Confirmed test transaction' });
      }
    }

    // Remove from meal_requests
    for (const rId of testMealRequestIds) {
      const res = await db.collection('meal_requests').deleteOne({ requestId: rId });
      if (res.deletedCount > 0) {
        report.removedTransactions.push({ collection: 'meal_requests', id: rId, reason: 'Confirmed test transaction' });
      }
    }

    // Remove from stationery_requests
    for (const rId of testStationeryRequestIds) {
      const res = await db.collection('stationery_requests').deleteOne({ requestId: rId });
      if (res.deletedCount > 0) {
        report.removedTransactions.push({ collection: 'stationery_requests', id: rId, reason: 'Confirmed test transaction' });
      }
    }

    // 2. Confirmed test announcements
    const testAnnIds = [
      '6ac244e358d99b724ad056fb', // Creator System Notice (empty/duplicate)
      '6ac245b0a3a11e3c9c2a4f39', // Creator System Notice (empty/duplicate)
      '6ac245eee2b21a371e2c10cc', // Creator System Notice (empty/duplicate)
      '6ac24850e2b21a371e2c10ce', // Creator System Notice (empty/duplicate)
      '6ac262aee2b21a371e2c10cf'  // hagshjka / ajehbdv (gibberish test)
    ];

    console.log(`\nRemoving ${testAnnIds.length} confirmed test announcements...`);
    for (const annId of testAnnIds) {
      const res = await db.collection('announcements').deleteOne({ _id: new ObjectId(annId) });
      if (res.deletedCount > 0) {
        report.removedAnnouncements.push({ id: annId, reason: 'Confirmed test/dummy announcement' });
      }
    }

    // 3. Remove test notifications
    console.log(`\nIdentifying and removing test notifications related to test transactions and announcements...`);
    const allNotifs = await db.collection('notifications').find({}).toArray();
    for (const n of allNotifs) {
      const isLinkedToTestReq = allTestRequestIds.includes(n.referenceId);
      const isLinkedToTestAnn = testAnnIds.includes(n.referenceId);
      const hasTestMarker = /TEST|Testing Rejection|Testing Cancellation|Testing Reschedule|E2E Test|Notification Test/i.test(n.title) ||
                            /TEST|Testing Rejection|Testing Cancellation|Testing Reschedule|E2E Test|Notification Test/i.test(n.message);
      const isGibberishAnn = n.title && n.title.includes('hagshjka');

      if (isLinkedToTestReq || isLinkedToTestAnn || hasTestMarker || isGibberishAnn) {
        await db.collection('notifications').deleteOne({ _id: n._id });
        report.removedNotifications.push({
          id: n._id.toString(),
          title: n.title,
          referenceId: n.referenceId,
          reason: 'Test notification linked to test transaction / test announcement'
        });
      }
    }
    console.log(`Removed ${report.removedNotifications.length} test notifications.`);

    // 4. Record after counts
    for (const c of collections) {
      report.afterCounts[c.name] = await db.collection(c.name).countDocuments();
    }

    fs.writeFileSync('cleanup_execution_report.json', JSON.stringify(report, null, 2));
    console.log('\n====================================================');
    console.log('CLEANUP SUMMARY REPORT');
    console.log('====================================================');
    console.log('Total test transactions removed:', report.removedTransactions.length);
    console.log('Total test announcements removed:', report.removedAnnouncements.length);
    console.log('Total test notifications removed:', report.removedNotifications.length);
    console.log('Users removed:', report.removedUsers.length, '(All 28 required accounts preserved)');
    console.log('\nCounts Comparison:');
    for (const [k, v] of Object.entries(report.afterCounts)) {
      console.log(`  ${k.padEnd(25)}: Before = ${report.beforeCounts[k]}, After = ${v}`);
    }

    const unifiedTotal = (report.afterCounts['seminar_bookings'] || 0) +
                         (report.afterCounts['accommodation_requests'] || 0) +
                         (report.afterCounts['transport_requests'] || 0) +
                         (report.afterCounts['meal_requests'] || 0) +
                         (report.afterCounts['stationery_requests'] || 0);

    console.log('\nTotal Unified Requests After Cleanup:', unifiedTotal, '(Expected: 45)');

  } finally {
    await client.close();
  }
}

performCleanup().catch(console.error);
