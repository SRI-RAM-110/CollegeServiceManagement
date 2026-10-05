import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function verifySeminarMobile() {
  console.log('🚀 Starting Seminar Coordinator Mobile Responsiveness Verification...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'csehod@nrtec.in');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));

  // Navigate to Seminar Admin/Coordinator page
  await page.goto('http://localhost:5173/admin/seminar', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const testViewports = [
    { name: '320_small_phone', width: 320, height: 568 },
    { name: '360_samsung_galaxy', width: 360, height: 800 },
    { name: '375_iphone_se', width: 375, height: 667 },
    { name: '390_iphone_14', width: 390, height: 844 },
    { name: '430_iphone_pro_max', width: 430, height: 932 },
    { name: '768_ipad_portrait', width: 768, height: 1024 },
    { name: '1024_ipad_landscape', width: 1024, height: 768 },
    { name: '1280_desktop', width: 1280, height: 800 },
    { name: '1440_desktop_large', width: 1440, height: 900 },
    { name: '1920_full_hd', width: 1920, height: 1080 },
  ];

  const artifactDir = 'C:\\Users\\srira\\.gemini\\antigravity-ide\\brain\\41105b87-4ca5-468d-b602-2c51796a80f0';

  let hasErrors = false;

  for (const vp of testViewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 400));

    const metrics = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;

      const header = document.querySelector('.topbar-header');
      const headerRect = header ? header.getBoundingClientRect() : null;

      const title = document.querySelector('.coordinator-portal-title');
      const titleRect = title ? title.getBoundingClientRect() : null;

      const badge = document.querySelector('.coordinator-role-badge');
      const badgeRect = badge ? badge.getBoundingClientRect() : null;

      const refreshBtn = document.querySelector('.coordinator-refresh-btn');
      const refreshRect = refreshBtn ? refreshBtn.getBoundingClientRect() : null;

      const statCards = Array.from(document.querySelectorAll('.stat-card-gradient')).map(c => {
        const r = c.getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height) };
      });

      const assignedCard = document.querySelector('.coordinator-assigned-halls-card');
      const assignedRect = assignedCard ? assignedCard.getBoundingClientRect() : null;

      const userPill = document.querySelector('.user-menu-pill');
      const userPillRect = userPill ? userPill.getBoundingClientRect() : null;

      const userName = document.querySelector('.user-name');
      const userNameVisible = userName ? window.getComputedStyle(userName).display !== 'none' : false;

      // Find any element overflowing viewport
      const overflowingElements = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 1.5) {
          overflowingElements.push({
            tag: el.tagName,
            cls: el.className ? String(el.className).substring(0, 50) : '',
            right: Math.round(r.right),
            docW
          });
        }
      });

      // Page scroll metrics
      const scrollH = document.documentElement.scrollHeight;
      const clientH = document.documentElement.clientHeight;

      return {
        docW,
        scrollW,
        bodyW,
        headerHeight: headerRect ? Math.round(headerRect.height) : 0,
        userPillWidth: userPillRect ? Math.round(userPillRect.width) : 0,
        userNameVisible,
        titleWidth: titleRect ? Math.round(titleRect.width) : 0,
        badgeWidth: badgeRect ? Math.round(badgeRect.width) : 0,
        refreshBtnHeight: refreshRect ? Math.round(refreshRect.height) : 0,
        statCards,
        assignedCardPadding: assignedCard ? window.getComputedStyle(assignedCard).padding : null,
        scrollH,
        clientH,
        overflowingElements: overflowingElements.slice(0, 3)
      };
    });

    const isHorizontalOverflow = metrics.scrollW > metrics.docW || metrics.bodyW > metrics.docW;

    console.log(`\n--- Viewport ${vp.name} (${vp.width}x${vp.height}) ---`);
    console.log(`  Width check: docW=${metrics.docW}, scrollW=${metrics.scrollW} -> ${isHorizontalOverflow ? '❌ OVERFLOW' : '✅ FIT'}`);
    console.log(`  Header height: ${metrics.headerHeight}px (User pill width: ${metrics.userPillWidth}px, Name visible: ${metrics.userNameVisible})`);
    console.log(`  Title width: ${metrics.titleWidth}px, Badge width: ${metrics.badgeWidth}px, Refresh btn height: ${metrics.refreshBtnHeight}px`);
    if (metrics.statCards.length > 0) {
      console.log(`  Stat cards count: ${metrics.statCards.length}, first card: ${metrics.statCards[0].width}x${metrics.statCards[0].height}px`);
    }

    if (isHorizontalOverflow) {
      console.log('  ❌ Overflowing elements:', metrics.overflowingElements);
      hasErrors = true;
    }

    // Save screenshots at 360, 390, and 1280
    if (['360_samsung_galaxy', '390_iphone_14', '1280_desktop'].includes(vp.name)) {
      const screenshotPath = path.join(artifactDir, `seminar_coordinator_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  📸 Screenshot saved: ${screenshotPath}`);
    }
  }

  // Also test scrolling down to bottom
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 400));
  const bottomScreenshotPath = path.join(artifactDir, 'seminar_coordinator_390_bottom.png');
  await page.screenshot({ path: bottomScreenshotPath, fullPage: false });
  console.log(`  📸 Bottom scroll screenshot saved: ${bottomScreenshotPath}`);

  await browser.close();
  if (hasErrors) {
    console.error('\n❌ SOME CHECKS FAILED!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL CHECKS PASSED FOR ALL VIEWPORTS!');
  }
}

verifySeminarMobile().catch(err => {
  console.error(err);
  process.exit(1);
});
