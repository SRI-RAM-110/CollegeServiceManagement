import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  // 1. Login as CSE001
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder*="ID"], input[name="userId"], input[type="text"]', 'CSE001');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  const deptRoutes = [
    { name: '01_dashboard', path: '/dashboard' },
    { name: '02_accommodation', path: '/accommodation' },
    { name: '03_transport', path: '/transport' },
    { name: '04_stationery', path: '/stationery' },
    { name: '05_meals', path: '/snacks-meals' },
    { name: '06_my_requests', path: '/my-requests' }
  ];

  for (const route of deptRoutes) {
    await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
      path: `C:\\Users\\srira\\.gemini\\antigravity-ide\\brain\\7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4\\audit_${route.name}.png`,
      fullPage: false
    });
    console.log(`Captured ${route.name}`);
  }

  // 2. Login as AO001 (Admin)
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  // Clear inputs or reload
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder*="ID"], input[name="userId"], input[type="text"]', 'AO001');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  const adminRoutes = [
    { name: '07_admin_dashboard', path: '/admin/dashboard' },
    { name: '08_admin_seminar', path: '/admin/seminar' },
    { name: '09_admin_accommodation', path: '/admin/accommodation' },
    { name: '10_admin_transport', path: '/admin/transport' },
    { name: '11_admin_stationery', path: '/admin/stationery' },
    { name: '12_admin_meals', path: '/admin/meals' }
  ];

  for (const route of adminRoutes) {
    await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
      path: `C:\\Users\\srira\\.gemini\\antigravity-ide\\brain\\7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4\\audit_${route.name}.png`,
      fullPage: false
    });
    console.log(`Captured ${route.name}`);
  }

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
