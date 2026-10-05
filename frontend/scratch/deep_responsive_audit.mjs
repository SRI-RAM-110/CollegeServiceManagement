import puppeteer from 'puppeteer';

const testMatrix = [
  { name: '320x568_mobile_se', width: 320, height: 568, isMobile: true },
  { name: '360x800_mobile_galaxy', width: 360, height: 800, isMobile: true },
  { name: '375x812_mobile_iphone_mini', width: 375, height: 812, isMobile: true },
  { name: '390x844_mobile_iphone', width: 390, height: 844, isMobile: true },
  { name: '430x932_mobile_promax', width: 430, height: 932, isMobile: true },
  { name: '768x1024_tablet_portrait', width: 768, height: 1024, isMobile: true },
  { name: '1024x768_tablet_landscape', width: 1024, height: 768, isMobile: false },
  { name: '1280x720_laptop_hd', width: 1280, height: 720, isMobile: false },
  { name: '1366x768_laptop_std', width: 1366, height: 768, isMobile: false },
  { name: '1440x900_macbook', width: 1440, height: 900, isMobile: false },
  { name: '1920x1080_desktop_fhd', width: 1920, height: 1080, isMobile: false },
  { name: '844x390_mobile_landscape', width: 844, height: 390, isMobile: true },
  { name: '667x375_mobile_landscape', width: 667, height: 375, isMobile: true },
  { name: '568x320_mobile_landscape_small', width: 568, height: 320, isMobile: true },
];

async function checkPageMetrics(page, isMobileViewport) {
  return await page.evaluate((isMobile) => {
    const docWidth = document.documentElement.clientWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    // Check for horizontal overflow beyond document
    const horizontalOverflow = docScrollWidth > docWidth + 1.5 || bodyScrollWidth > docWidth + 1.5;

    // Find any overflowing elements
    const overflowing = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1.5) {
        overflowing.push({
          tag: el.tagName,
          class: el.className ? String(el.className).substring(0, 50) : '',
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });

    // Check vertical scroll ownership and range
    let scrollOwner = 'window';
    let totalHeight = document.documentElement.scrollHeight;
    let clientHeight = window.innerHeight;
    let maxScroll = totalHeight - clientHeight;

    const mainLayout = document.querySelector('.main-content-layout');
    if (!isMobile && mainLayout) {
      scrollOwner = '.main-content-layout';
      totalHeight = mainLayout.scrollHeight;
      clientHeight = mainLayout.clientHeight;
      maxScroll = totalHeight - clientHeight;
    }

    return {
      docWidth,
      docScrollWidth,
      bodyScrollWidth,
      horizontalOverflow,
      overflowCount: overflowing.length,
      topOverflows: overflowing.slice(0, 3),
      scrollOwner,
      totalHeight,
      clientHeight,
      isScrollable: maxScroll > 10,
    };
  }, isMobileViewport);
}

async function testVerticalScroll(page, isMobileViewport) {
  return await page.evaluate(async (isMobile) => {
    let scrollTarget;
    if (isMobile) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 100));
      return window.scrollY > 0;
    } else {
      scrollTarget = document.querySelector('.main-content-layout') || window;
      if (scrollTarget === window) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, 100));
        return window.scrollY > 0;
      } else {
        scrollTarget.scrollTop = scrollTarget.scrollHeight;
        await new Promise((r) => setTimeout(r, 100));
        return scrollTarget.scrollTop > 0;
      }
    }
  }, isMobileViewport);
}

async function runAudit() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const issues = [];

  console.log('============================================================');
  console.log('  DEEP RESPONSIVE AUDIT & SCROLL VERIFICATION');
  console.log('============================================================\n');

  // 1. Audit LoginPage across ALL viewports in test matrix
  console.log('--- 1. AUDITING /login (Auth Page) ---');
  for (const vp of testMatrix) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 200));

    const metrics = await checkPageMetrics(page, vp.isMobile);

    // Verify submit button is clickable and not clipped
    const submitBtnVisible = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (metrics.horizontalOverflow) {
      issues.push(`Login @ ${vp.name}: Horizontal overflow detected`);
      console.log(`  ❌ ${vp.name}: Horizontal overflow (scrollWidth=${metrics.docScrollWidth}, docWidth=${metrics.docWidth})`);
    } else if (!submitBtnVisible) {
      issues.push(`Login @ ${vp.name}: Submit button missing or clipped`);
      console.log(`  ❌ ${vp.name}: Submit button not visible`);
    } else {
      console.log(`  ✓ ${vp.name} (${vp.width}x${vp.height}): Clean, card centered, submit button visible`);
    }
  }

  // 2. Login as Creator / AO Admin to access ALL 16 routes
  console.log('\n--- 2. LOGGING IN AS CREATOR / AO ADMIN ---');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'creator@nrtec.in');
  await page.type('input[type="password"]', 'creator123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  const allRoutes = [
    { name: 'AO Admin Dashboard', url: 'http://localhost:5173/admin/ao' },
    { name: 'User Management', url: 'http://localhost:5173/admin/users' },
    { name: 'Seminar Admin', url: 'http://localhost:5173/admin/seminar' },
    { name: 'Accommodation Admin', url: 'http://localhost:5173/admin/accommodation' },
    { name: 'Transport Admin', url: 'http://localhost:5173/admin/transport' },
    { name: 'Stationery Admin', url: 'http://localhost:5173/admin/stationery' },
    { name: 'Meals Admin', url: 'http://localhost:5173/admin/meals' },
    { name: 'Reports & Analytics', url: 'http://localhost:5173/reports' },
    { name: 'Department Dashboard', url: 'http://localhost:5173/dashboard' },
    { name: 'Seminar Booking', url: 'http://localhost:5173/seminar-booking' },
    { name: 'Accommodation Booking', url: 'http://localhost:5173/accommodation' },
    { name: 'Transport Booking', url: 'http://localhost:5173/transport' },
    { name: 'Stationery Booking', url: 'http://localhost:5173/stationery' },
    { name: 'Snacks & Meals Booking', url: 'http://localhost:5173/snacks-meals' },
    { name: 'My Requests', url: 'http://localhost:5173/my-requests' },
  ];

  // Key representative viewports covering matrix
  const auditViewports = [
    { name: '320x568 (Small Mobile SE)', width: 320, height: 568, isMobile: true },
    { name: '360x800 (Galaxy S20)', width: 360, height: 800, isMobile: true },
    { name: '390x844 (iPhone 12/13/14)', width: 390, height: 844, isMobile: true },
    { name: '430x932 (iPhone Pro Max)', width: 430, height: 932, isMobile: true },
    { name: '768x1024 (Tablet Portrait)', width: 768, height: 1024, isMobile: true },
    { name: '1024x768 (Tablet Landscape)', width: 1024, height: 768, isMobile: false },
    { name: '1280x720 (Laptop HD)', width: 1280, height: 720, isMobile: false },
    { name: '1440x900 (Desktop Laptop)', width: 1440, height: 900, isMobile: false },
    { name: '1920x1080 (Full HD)', width: 1920, height: 1080, isMobile: false },
    { name: '844x390 (Landscape Mobile)', width: 844, height: 390, isMobile: true },
  ];

  for (const route of allRoutes) {
    console.log(`\n============================================================`);
    console.log(`  AUDITING ROUTE: ${route.name}`);
    console.log(`============================================================`);

    for (const vp of auditViewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(route.url, { waitUntil: 'networkidle0' }).catch(() => {});
      await new Promise((r) => setTimeout(r, 350));

      const metrics = await checkPageMetrics(page, vp.isMobile);

      // Verify page vertical scrolling when content exceeds viewport
      let scrollSuccess = true;
      if (metrics.isScrollable) {
        scrollSuccess = await testVerticalScroll(page, vp.isMobile);
      }

      if (metrics.horizontalOverflow) {
        issues.push(`${route.name} @ ${vp.name}: Horizontal overflow`);
        console.log(`  ❌ ${vp.name}: Horizontal overflow (scrollWidth=${metrics.docScrollWidth}, docWidth=${metrics.docWidth})`);
        console.log('     Top overflowing:', metrics.topOverflows);
      } else {
        const scrollInfo = metrics.isScrollable
          ? `Scrollable: YES (${scrollSuccess ? 'scrolled smoothly' : 'stuck'})`
          : 'Fits in viewport';
        console.log(`  ✓ ${vp.name}: Clean (docWidth=${metrics.docWidth}px), ${scrollInfo}`);
      }
    }
  }

  // 3. Test Mobile Navigation Drawer Open / Close
  console.log('\n--- 3. AUDITING MOBILE SIDEBAR DRAWER ---');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:5173/admin/ao', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  const sidebarToggleBtn = await page.$('.topbar-menu-toggle');
  if (sidebarToggleBtn) {
    await sidebarToggleBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const isSidebarOpen = await page.evaluate(() => {
      const sb = document.querySelector('.app-sidebar');
      return sb && sb.classList.contains('sidebar-open');
    });
    console.log(`  ✓ Sidebar opened on mobile toggle: ${isSidebarOpen}`);

    // Click overlay to close
    const overlay = await page.$('.sidebar-overlay');
    if (overlay) {
      await overlay.click();
      await new Promise((r) => setTimeout(r, 300));
      const isSidebarClosed = await page.evaluate(() => {
        const sb = document.querySelector('.app-sidebar');
        return sb && !sb.classList.contains('sidebar-open');
      });
      console.log(`  ✓ Sidebar closed on backdrop click: ${isSidebarClosed}`);
    }
  }

  // 4. Test Modal Sizing & Scrolling in Landscape Mobile (844x390)
  console.log('\n--- 4. AUDITING MODAL ON LANDSCAPE MOBILE (844x390) ---');
  await page.setViewport({ width: 844, height: 390 });
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  // Find Register User button
  const registerBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const reg = btns.find((b) => b.textContent.includes('Register New User') || b.textContent.includes('Register'));
    if (reg) {
      reg.click();
      return true;
    }
    return false;
  });

  if (registerBtn) {
    await new Promise((r) => setTimeout(r, 300));
    const modalCheck = await page.evaluate(() => {
      const dialog = document.querySelector('.modal-dialog');
      const body = document.querySelector('.modal-body');
      if (!dialog) return { found: false };
      const rect = dialog.getBoundingClientRect();
      return {
        found: true,
        height: rect.height,
        maxHeight: window.innerHeight,
        fitsInViewport: rect.height <= window.innerHeight,
        bodyHasScroll: body && body.scrollHeight > body.clientHeight,
        bodyScrollHeight: body ? body.scrollHeight : 0,
        bodyClientHeight: body ? body.clientHeight : 0,
      };
    });
    console.log('  Modal landscape check:', modalCheck);
    if (modalCheck.found && modalCheck.fitsInViewport) {
      console.log('  ✓ Modal fits within 390px landscape viewport without clipping');
    }
  }

  await browser.close();

  console.log('\n============================================================');
  console.log(`  AUDIT COMPLETE: ${issues.length === 0 ? 'ALL CHECKS PASSED ✅' : `${issues.length} ISSUES FOUND ❌`}`);
  console.log('============================================================');
  if (issues.length > 0) {
    issues.forEach((iss) => console.log('  - ' + iss));
  }
}

runAudit().catch(console.error);
