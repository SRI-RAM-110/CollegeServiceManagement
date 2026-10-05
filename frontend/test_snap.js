import puppeteer from 'puppeteer';
import path from 'path';

const outDir = 'c:/Users/srira/.gemini/antigravity-ide/brain/7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4/scratch/screenshots';

async function test() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="text"]', 'CSE001');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));

  await page.goto('http://localhost:5173/seminar-booking', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  await page.setViewport({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(outDir, 'seminar_redesign_1920.png') });

  await page.setViewport({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(outDir, 'seminar_redesign_1440.png') });

  console.log('Snap captured!');
  await browser.close();
}
test();
