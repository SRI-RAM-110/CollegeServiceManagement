import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const outDir = 'c:/Users/srira/.gemini/antigravity-ide/brain/7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4/scratch/screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Login Page at 1920
  await page.setViewport({ width: 1920, height: 1080 });
  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, '01_login_1920.png'), fullPage: true });

  // Log in as department
  console.log('Logging in as CSE001...');
  await page.type('input[type="text"]', 'CSE001');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const deptPages = [
    { name: '02_dashboard', url: 'http://localhost:5173/dashboard' },
    { name: '03_seminar_booking', url: 'http://localhost:5173/seminar-booking' },
    { name: '04_accommodation', url: 'http://localhost:5173/accommodation' },
    { name: '05_transport', url: 'http://localhost:5173/transport' },
    { name: '06_stationery', url: 'http://localhost:5173/stationery' },
    { name: '07_meals', url: 'http://localhost:5173/snacks-meals' },
    { name: '08_my_requests', url: 'http://localhost:5173/my-requests' },
  ];

  for (const p of deptPages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // 1920px
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1920.png`), fullPage: true });

    // 1440px
    await page.setViewport({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1440.png`), fullPage: true });

    // 768px
    await page.setViewport({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_768.png`), fullPage: true });

    // 390px
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_390.png`), fullPage: true });
  }

  // Now logout and login as Admin AO001
  console.log('Logging in as Admin AO001...');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"]', 'AO001');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const adminPages = [
    { name: '09_admin_dashboard', url: 'http://localhost:5173/admin/dashboard' },
    { name: '11_admin_seminar', url: 'http://localhost:5173/admin/seminar' },
    { name: '12_admin_accommodation', url: 'http://localhost:5173/admin/accommodation' },
    { name: '13_admin_transport', url: 'http://localhost:5173/admin/transport' },
    { name: '14_admin_stationery', url: 'http://localhost:5173/admin/stationery' },
    { name: '15_admin_meals', url: 'http://localhost:5173/admin/meals' },
  ];

  for (const p of adminPages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1920.png`), fullPage: true });

    await page.setViewport({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(outDir, `${p.name}_1440.png`), fullPage: true });
  }

  console.log('All real captures completed successfully!');
  await browser.close();
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
