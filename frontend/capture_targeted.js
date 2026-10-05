import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const outDir = 'c:/Users/srira/.gemini/antigravity-ide/brain/7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4/scratch/screenshots';

async function capture() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Log in as department
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"]', 'CSE001');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  // Seminar booking page
  await page.goto('http://localhost:5173/seminar-booking', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Top view
  await page.screenshot({ path: path.join(outDir, 'seminar_top_1920.png') });

  // Scroll to Seminar Hall & Slots
  await page.evaluate(() => window.scrollBy(0, 550));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'seminar_mid_1920.png') });

  // Scroll further to Slot availability & Booking form
  await page.evaluate(() => window.scrollBy(0, 500));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, 'seminar_form_1920.png') });

  // Let's also capture Accommodation
  await page.goto('http://localhost:5173/accommodation', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'accommodation_1920.png') });

  // Transport
  await page.goto('http://localhost:5173/transport', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'transport_1920.png') });

  // Stationery
  await page.goto('http://localhost:5173/stationery', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'stationery_1920.png') });

  // Meals
  await page.goto('http://localhost:5173/snacks-meals', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'meals_1920.png') });

  // My Requests
  await page.goto('http://localhost:5173/my-requests', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'my_requests_1920.png') });

  // Now login as Admin and capture admin pages
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"]', 'AO001');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'admin_dashboard_1920.png') });

  await page.goto('http://localhost:5173/admin/seminar', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'admin_seminar_1920.png') });

  await page.goto('http://localhost:5173/admin/accommodation', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'admin_accommodation_1920.png') });

  await page.goto('http://localhost:5173/admin/transport', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'admin_transport_1920.png') });

  await page.goto('http://localhost:5173/admin/stationery', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'admin_stationery_1920.png') });

  await page.goto('http://localhost:5173/admin/meals', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'admin_meals_1920.png') });

  console.log('Targeted screenshots completed successfully!');
  await browser.close();
}

capture().catch(err => {
  console.error('Targeted capture failed:', err);
  process.exit(1);
});
