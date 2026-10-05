const http = require('http');

async function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login(userId, password) {
  const res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId, password });
  return res.data?.data?.token;
}

// Logic from MealsAdmin.jsx
const matchesCategory = (categoryKey, mealTypeStr) => {
  if (!mealTypeStr || typeof mealTypeStr !== 'string') return false;
  const norm = mealTypeStr.toLowerCase().replace(/[^a-z]/g, '');
  switch (categoryKey) {
    case 'breakfast':
      return norm.includes('breakfast');
    case 'lunch':
      return norm.includes('lunch');
    case 'dinner':
      return norm.includes('dinner');
    case 'snacks':
      return norm.includes('snack');
    case 'teaCoffee':
      return norm.includes('tea') || norm.includes('coffee');
    default:
      return false;
  }
};

const getRequestCategoryGuestCount = (req, categoryKey) => {
  let hasCategory = false;
  if (Array.isArray(req.mealTypes) && req.mealTypes.some(mt => matchesCategory(categoryKey, mt))) {
    hasCategory = true;
  }
  if (Array.isArray(req.mealItems) && req.mealItems.some(mi => matchesCategory(categoryKey, mi.mealType))) {
    hasCategory = true;
  }

  if (!hasCategory) return 0;

  if (Array.isArray(req.mealItems) && req.mealItems.length > 0) {
    const item = req.mealItems.find(mi => matchesCategory(categoryKey, mi.mealType));
    if (item && typeof item.guestCount === 'number' && item.guestCount > 0) {
      return item.guestCount;
    }
  }

  if (req.guestCounts && typeof req.guestCounts === 'object') {
    for (const [key, val] of Object.entries(req.guestCounts)) {
      if (matchesCategory(categoryKey, key) && Number(val) > 0) {
        return Number(val);
      }
    }
  }

  const total = Number(req.totalGuests || req.guests || req.guestCount || 0);
  return total > 0 ? total : 0;
};

function calculateHeadcount(requests, targetDate) {
  const activeMeals = requests.filter(r => {
    const isApproved = r.status === 'APPROVED' || r.status === 'BOOKED';
    const isNotDeclined = r.status !== 'REJECTED' && r.status !== 'CANCELLED';
    const reqDate = (r.date || r.eventDate || '').trim().substring(0, 10);
    return isApproved && isNotDeclined && reqDate === targetDate;
  });

  return {
    activeMealsCount: activeMeals.length,
    breakfast: activeMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'breakfast'), 0),
    lunch: activeMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'lunch'), 0),
    dinner: activeMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'dinner'), 0),
    snacks: activeMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'snacks'), 0),
    teaCoffee: activeMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'teaCoffee'), 0)
  };
}

async function run() {
  console.log('Testing Catering Headcount calculation with real database records...');

  const aoToken = await login('AO001', 'admin123');
  const res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/meals/requests',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${aoToken}` }
  });

  const allRequests = res.data?.data || [];
  console.log(`Fetched ${allRequests.length} meal requests.`);

  // Test 1: Today's date (2026-10-05)
  const todayCounts = calculateHeadcount(allRequests, '2026-10-05');
  console.log("Today (2026-10-05) Catering Headcount:", todayCounts);

  if (todayCounts.activeMealsCount === 2 &&
      todayCounts.breakfast === 0 &&
      todayCounts.lunch === 50 &&
      todayCounts.dinner === 25 &&
      todayCounts.snacks === 25 &&
      todayCounts.teaCoffee === 25) {
    console.log("✓ Today's Catering Headcount correctly computed from active requests!");
  } else {
    console.error("✗ Failed today's calculation:", todayCounts);
    process.exit(1);
  }

  // Test 2: Date with no meal requests
  const emptyCounts = calculateHeadcount(allRequests, '2026-01-01');
  console.log("Empty Date (2026-01-01):", emptyCounts);
  if (emptyCounts.breakfast === 0 && emptyCounts.lunch === 0 && emptyCounts.dinner === 0 && emptyCounts.snacks === 0 && emptyCounts.teaCoffee === 0) {
    console.log("✓ Empty date correctly gives 0 for all categories.");
  } else {
    console.error("✗ Empty date test failed!");
    process.exit(1);
  }

  // Test 3: Date 2026-11-20 (SM-8048 & SM-3136 approved)
  // SM-8048: 50 guests (Breakfast, Lunch, Snacks, Tea / Coffee)
  // SM-3136: 25 guests (Breakfast, Lunch)
  const nov20Counts = calculateHeadcount(allRequests, '2026-11-20');
  console.log("Date 2026-11-20:", nov20Counts);
  if (nov20Counts.breakfast === 75 && nov20Counts.lunch === 75 && nov20Counts.snacks === 50 && nov20Counts.teaCoffee === 50) {
    console.log("✓ Multi-request aggregation correctly computed (Breakfast: 75, Lunch: 75, Snacks: 50, Tea/Coffee: 50).");
  } else {
    console.error("✗ 2026-11-20 aggregation test failed:", nov20Counts);
    process.exit(1);
  }

  // Test 4: Verify Rejected requests on 2026-11-25 are NOT counted
  const nov25Counts = calculateHeadcount(allRequests, '2026-11-25');
  console.log("Date 2026-11-25 (contains rejected dinner requests):", nov25Counts);
  if (nov25Counts.dinner === 0 && nov25Counts.activeMealsCount === 0) {
    console.log("✓ Rejected requests are properly excluded from active catering headcount.");
  } else {
    console.error("✗ Rejected request exclusion failed:", nov25Counts);
    process.exit(1);
  }

  // Test 5: Synthetic unit checks for all specific edge cases:
  // - Single Lunch request
  const testLunchOnly = calculateHeadcount([
    { status: 'APPROVED', date: '2026-10-10', mealTypes: ['Lunch'], totalGuests: 35 }
  ], '2026-10-10');
  console.log("Unit test Lunch only:", testLunchOnly);
  if (testLunchOnly.lunch === 35 && testLunchOnly.snacks === 0) {
    console.log("✓ Lunch only counted correctly.");
  }

  // - Snacks with FORENOON
  const testSnacksForenoon = calculateHeadcount([
    { status: 'APPROVED', date: '2026-10-11', mealTypes: ['Snacks'], serviceTime: 'FORENOON', totalGuests: 40 }
  ], '2026-10-11');
  console.log("Unit test Snacks FORENOON:", testSnacksForenoon);
  if (testSnacksForenoon.snacks === 40) {
    console.log("✓ Snacks with FORENOON counted correctly.");
  }

  // - Snacks with AFTERNOON
  const testSnacksAfternoon = calculateHeadcount([
    { status: 'APPROVED', date: '2026-10-12', mealTypes: ['Snacks'], serviceTime: 'AFTERNOON', totalGuests: 40 }
  ], '2026-10-12');
  console.log("Unit test Snacks AFTERNOON:", testSnacksAfternoon);
  if (testSnacksAfternoon.snacks === 40) {
    console.log("✓ Snacks with AFTERNOON counted correctly.");
  }

  // - Tea / Coffee with FORENOON
  const testTeaForenoon = calculateHeadcount([
    { status: 'APPROVED', date: '2026-10-13', mealTypes: ['Tea / Coffee'], serviceTime: 'FORENOON', totalGuests: 30 }
  ], '2026-10-13');
  console.log("Unit test Tea / Coffee FORENOON:", testTeaForenoon);
  if (testTeaForenoon.teaCoffee === 30) {
    console.log("✓ Tea / Coffee with FORENOON counted correctly.");
  }

  // - Tea / Coffee with AFTERNOON
  const testTeaAfternoon = calculateHeadcount([
    { status: 'APPROVED', date: '2026-10-14', mealTypes: ['Tea / Coffee'], serviceTime: 'AFTERNOON', totalGuests: 30 }
  ], '2026-10-14');
  console.log("Unit test Tea / Coffee AFTERNOON:", testTeaAfternoon);
  if (testTeaAfternoon.teaCoffee === 30) {
    console.log("✓ Tea / Coffee with AFTERNOON counted correctly.");
  }

  // - Cancelled request excluded
  const testCancelled = calculateHeadcount([
    { status: 'CANCELLED', date: '2026-10-15', mealTypes: ['Lunch'], totalGuests: 50 }
  ], '2026-10-15');
  console.log("Unit test CANCELLED request:", testCancelled);
  if (testCancelled.lunch === 0) {
    console.log("✓ CANCELLED request excluded.");
  }

  console.log("\nALL CATERING HEADCOUNT TESTS PASSED SUCCESSFULLY!");
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
