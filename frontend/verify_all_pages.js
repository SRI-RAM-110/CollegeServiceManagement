import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const outDir = 'c:/Users/srira/.gemini/antigravity-ide/brain/7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4/scratch/final_audit';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Department Login & Pages
  console.log('Logging in as Department (CSE001)...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"]', 'CSE001');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));

  const deptPages = [
    { name: 'dashboard', url: 'http://localhost:5173/dashboard' },
    { name: 'seminar_booking', url: 'http://localhost:5173/seminar-booking' },
    { name: 'accommodation', url: 'http://localhost:5173/accommodation' },
    { name: 'transport', url: 'http://localhost:5173/transport' },
    { name: 'stationery', url: 'http://localhost:5173/stationery' },
    { name: 'meals', url: 'http://localhost:5173/snacks-meals' },
    { name: 'my_requests', url: 'http://localhost:5173/my-requests' },
  ];

  for (const p of deptPages) {
    console.log(`Auditing Department Page: ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    // Capture at 1920px
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1920.png`) });

    // Capture at 1440px
    await page.setViewport({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1440.png`) });

    // Capture at 768px (Tablet)
    await page.setViewport({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_768.png`) });

    // Capture at 390px (Mobile)
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_390.png`) });
  }

  // 2. Admin Login & Pages
  console.log('Logging in as Admin (AO001)...');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"]', 'AO001');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));

  const adminPages = [
    { name: 'admin_dashboard', url: 'http://localhost:5173/admin/dashboard' },
    { name: 'admin_seminar', url: 'http://localhost:5173/admin/seminar' },
    { name: 'admin_accommodation', url: 'http://localhost:5173/admin/accommodation' },
    { name: 'admin_transport', url: 'http://localhost:5173/admin/transport' },
    { name: 'admin_stationery', url: 'http://localhost:5173/admin/stationery' },
    { name: 'admin_meals', url: 'http://localhost:5173/admin/meals' },
  ];

  for (const p of adminPages) {
    console.log(`Auditing Admin Page: ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    // Capture at 1920px
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1920.png`) });

    // Capture at 1440px
    await page.setViewport({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1440.png`) });

    // Capture at 768px (Tablet)
    await page.setViewport({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_768.png`) });

    // Capture at 390px (Mobile)
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_390.png`) });
  }

  console.log('Final multi-viewport audit completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
