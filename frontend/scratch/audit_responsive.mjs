import puppeteer from 'puppeteer';

const viewports = [
  { name: '320_small_mobile', width: 320, height: 568 },
  { name: '360_samsung', width: 360, height: 800 },
  { name: '390_iphone', width: 390, height: 844 },
  { name: '430_promax', width: 430, height: 932 },
  { name: '600_phablet', width: 600, height: 960 },
  { name: '768_tablet', width: 768, height: 1024 },
  { name: '1024_ipad_pro', width: 1024, height: 768 },
  { name: '1280_laptop', width: 1280, height: 800 },
  { name: '1440_desktop', width: 1440, height: 900 },
  { name: '1920_large_desktop', width: 1920, height: 1080 },
  { name: '844_landscape_mobile', width: 844, height: 390 },
];

async function checkOverflow(page) {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    const overflowingElements = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1.5) { // 1.5px tolerance for subpixel antialiasing
        overflowingElements.push({
          tag: el.tagName,
          id: el.id,
          className: el.className ? String(el.className).substring(0, 80) : '',
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          docWidth
        });
      }
    }
    return {
      docWidth,
      scrollWidth,
      bodyScrollWidth,
      hasOverflow: scrollWidth > docWidth || bodyScrollWidth > docWidth,
      topOverflows: overflowingElements.slice(0, 5)
    };
  });
}

async function runAudit() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const summary = [];

  console.log('--- STARTING COMPREHENSIVE RESPONSIVE AUDIT ---');

  // 1. Audit LoginPage across all viewports
  console.log('\n[1/3] Auditing Auth / Login Page...');
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));
    const res = await checkOverflow(page);
    summary.push({ page: 'Login', viewport: vp.name, width: vp.width, ...res });
    if (res.hasOverflow) {
      console.warn(`  ❌ OVERFLOW on Login @ ${vp.name} (${vp.width}px): scrollWidth=${res.scrollWidth}, docWidth=${res.docWidth}`);
      console.warn('     Elements:', res.topOverflows);
    } else {
      console.log(`  ✓ Login @ ${vp.name} (${vp.width}px): Clean (docWidth=${res.docWidth})`);
    }
  }

  // 2. Department Login & Pages
  console.log('\n[2/3] Logging in as Department User (csehod@nrtec.in)...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'csehod@nrtec.in');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1800));

  const deptPages = [
    { name: 'DepartmentDashboard', url: 'http://localhost:5173/dashboard' },
    { name: 'SeminarBooking', url: 'http://localhost:5173/seminar-booking' },
    { name: 'Accommodation', url: 'http://localhost:5173/accommodation' },
    { name: 'Transport', url: 'http://localhost:5173/transport' },
    { name: 'Stationery', url: 'http://localhost:5173/stationery' },
    { name: 'SnacksMeals', url: 'http://localhost:5173/snacks-meals' },
    { name: 'MyRequests', url: 'http://localhost:5173/my-requests' },
  ];

  for (const dp of deptPages) {
    console.log(`\nAuditing Department Page: ${dp.name}...`);
    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(dp.url, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 350));
      const res = await checkOverflow(page);
      summary.push({ page: dp.name, viewport: vp.name, width: vp.width, ...res });
      if (res.hasOverflow) {
        console.warn(`  ❌ OVERFLOW on ${dp.name} @ ${vp.name} (${vp.width}px): scrollWidth=${res.scrollWidth}, docWidth=${res.docWidth}`);
        console.warn('     Elements:', res.topOverflows);
      } else {
        console.log(`  ✓ ${dp.name} @ ${vp.name} (${vp.width}px): Clean`);
      }
    }
  }

  // 3. Admin Login & Pages
  console.log('\n[3/3] Logging in as AO Admin (ao@nrtec.in)...');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'ao@nrtec.in');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1800));

  const adminPages = [
    { name: 'AOAdminDashboard', url: 'http://localhost:5173/admin/dashboard' },
    { name: 'SeminarAdmin', url: 'http://localhost:5173/admin/seminar' },
    { name: 'AccommodationAdmin', url: 'http://localhost:5173/admin/accommodation' },
    { name: 'TransportAdmin', url: 'http://localhost:5173/admin/transport' },
    { name: 'StationeryAdmin', url: 'http://localhost:5173/admin/stationery' },
    { name: 'MealsAdmin', url: 'http://localhost:5173/admin/meals' },
    { name: 'UserManagement', url: 'http://localhost:5173/admin/users' },
    { name: 'Reports', url: 'http://localhost:5173/reports' },
  ];

  for (const ap of adminPages) {
    console.log(`\nAuditing Admin Page: ${ap.name}...`);
    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(ap.url, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 350));
      const res = await checkOverflow(page);
      summary.push({ page: ap.name, viewport: vp.name, width: vp.width, ...res });
      if (res.hasOverflow) {
        console.warn(`  ❌ OVERFLOW on ${ap.name} @ ${vp.name} (${vp.width}px): scrollWidth=${res.scrollWidth}, docWidth=${res.docWidth}`);
        console.warn('     Elements:', res.topOverflows);
      } else {
        console.log(`  ✓ ${ap.name} @ ${vp.name} (${vp.width}px): Clean`);
      }
    }
  }

  await browser.close();

  const totalChecks = summary.length;
  const overflowCount = summary.filter(s => s.hasOverflow).length;
  console.log('\n==================================================');
  console.log(`AUDIT FINISHED: ${totalChecks - overflowCount}/${totalChecks} checks passed.`);
  if (overflowCount === 0) {
    console.log('🎉 100% CLEAN: ZERO HORIZONTAL OVERFLOW DETECTED ON ANY PAGE ACROSS ALL VIEWPORTS!');
  } else {
    console.log(`⚠️ ${overflowCount} OVERFLOWS DETECTED.`);
  }
  console.log('==================================================\n');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
