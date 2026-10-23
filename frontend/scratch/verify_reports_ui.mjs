import puppeteer from 'puppeteer';

async function runAudit() {
  console.log('====================================================');
  console.log('REPORTS & ANALYTICS: INTERACTIVE GRAPHS VERIFICATION');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.error('UNCAUGHT EXCEPTION:', err.message);
    errors.push(err.message);
  });

  // 1. Desktop Viewport
  await page.setViewport({ width: 1440, height: 1050 });
  console.log('\n[1/5] Logging in as AO Admin (ao@nrtec.in)...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'ao@nrtec.in');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n[2/5] Navigating to Reports & Analytics page...');
  await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));

  // Scroll down slightly so the graphs section is in full view
  await page.evaluate(() => {
    const el = document.querySelector('h2');
    const graphsEl = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Visual Analytics'));
    if (graphsEl) graphsEl.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));

  // Take screenshot of Desktop view with graphs
  await page.screenshot({ path: './frontend/scratch/reports_graphs_desktop_grid.png' });
  console.log('Saved screenshot: reports_graphs_desktop_grid.png');

  // Check 3: Test Facility sub-tab switching (e.g. click Accommodation tab)
  console.log('\n[4/5] Testing Facility Sub-Tab Switching...');
  const clickedAcc = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const accBtn = buttons.find(b => b.textContent.includes('Accommodation'));
    if (accBtn) {
      accBtn.click();
      return true;
    }
    return false;
  });
  console.log(`Clicked Accommodation facility tab: ${clickedAcc}`);
  await new Promise(r => setTimeout(r, 600));

  // Take screenshot with Accommodation facility tab active
  await page.screenshot({ path: './frontend/scratch/reports_facility_accommodation.png' });
  console.log('Saved screenshot: reports_facility_accommodation.png');

  // Check 4: Test Resource/Facility filter (SH-6)
  console.log('\n[5/5] Testing Facility Filter with specific hall (SH-6)...');
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const hallSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'SH-6'));
    if (hallSelect) {
      hallSelect.value = 'SH-6';
      hallSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  // Take screenshot of filtered to SH-6
  await page.screenshot({ path: './frontend/scratch/reports_graphs_sh6.png' });
  console.log('Saved screenshot: reports_graphs_sh6.png');

  // Mobile Viewport Check (375x812)
  console.log('\nTesting Mobile Viewport (375x812)...');
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: './frontend/scratch/reports_graphs_mobile.png', fullPage: true });
  console.log('Saved screenshot: reports_graphs_mobile.png');

  await browser.close();
  console.log('\n====================================================');
  console.log(`AUDIT FINISHED. Errors logged: ${errors.length}`);
  console.log('====================================================');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
