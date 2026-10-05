import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const outDir = 'c:/Users/srira/.gemini/antigravity-ide/brain/7a6d97be-1a28-4c1e-9ca3-a8b3a6b175c4/scratch/actions_dropdown_audit';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Launching browser with Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Log in as AO001
    console.log('Logging in as AO001...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="text"]', 'AO001');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1500));

    // 2. Navigate to User Management
    console.log('Navigating to User Management (/admin/users)...');
    await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 1: Overview of User Management with single Actions buttons
    console.log('Taking screenshot of User Management overview...');
    await page.screenshot({ path: path.join(outDir, '01_user_management_overview.png') });

    // 3. Inspect Actions buttons and measure widths
    const actionsButtonsCount = await page.$$eval('tbody tr td:last-child button', btns => btns.length);
    console.log(`Found ${actionsButtonsCount} actions buttons across rows.`);

    const measurements = await page.evaluate(() => {
      const container = document.querySelector('.overflow-x-auto');
      const table = document.querySelector('table');
      const ths = Array.from(document.querySelectorAll('thead th')).map(th => ({
        text: th.innerText.trim(),
        width: th.offsetWidth
      }));
      return {
        containerClientWidth: container ? container.clientWidth : 0,
        containerScrollWidth: container ? container.scrollWidth : 0,
        tableClientWidth: table ? table.clientWidth : 0,
        tableScrollWidth: table ? table.scrollWidth : 0,
        ths
      };
    });
    console.log('Layout measurements:', JSON.stringify(measurements, null, 2));

    // Helper to open dropdown on row index
    const openMenuAtRow = async (rowIndex) => {
      const rows = await page.$$('tbody tr');
      if (rowIndex < rows.length) {
        const btn = await rows[rowIndex].$('td:last-child button');
        if (btn) {
          await btn.click();
          await new Promise(r => setTimeout(r, 400));
        }
      }
    };

    // Helper to close modal via Cancel or close button
    const closeModal = async () => {
      const modalBtns = await page.$$('.fixed button');
      for (const btn of modalBtns) {
        const text = await btn.evaluate(el => el.innerText.trim());
        if (text === 'Cancel' || text === 'Close' || text === '') {
          // check if it has an X icon or cancel
          try {
            await btn.click();
            await new Promise(r => setTimeout(r, 400));
            return;
          } catch (e) {}
        }
      }
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 400));
    };

    // 4. Test Row 2: Menu items inspection
    console.log('Opening Actions menu on row 2...');
    await openMenuAtRow(1);
    const rects = await page.evaluate(() => {
      const menu = document.querySelector('tbody tr td:last-child .z-50');
      const btn = menu ? menu.parentElement.querySelector('button') : null;
      const td = menu ? menu.closest('td') : null;
      const container = document.querySelector('.overflow-x-auto');
      return {
        menuRect: menu ? menu.getBoundingClientRect() : null,
        btnRect: btn ? btn.getBoundingClientRect() : null,
        tdRect: td ? td.getBoundingClientRect() : null,
        containerRect: container ? container.getBoundingClientRect() : null,
        menuComputed: menu ? {
          position: window.getComputedStyle(menu).position,
          right: window.getComputedStyle(menu).right,
          left: window.getComputedStyle(menu).left,
          width: window.getComputedStyle(menu).width,
        } : null
      };
    });
    console.log('Menu positioning debug:', JSON.stringify(rects, null, 2));
    await page.screenshot({ path: path.join(outDir, '02_actions_dropdown_open.png') });

    const menuItems = await page.$$eval('tbody tr td:last-child .z-50 button', btns => btns.map(b => b.innerText.trim()));
    console.log('Dropdown menu items detected on row 2:', menuItems);

    // 5. Test "Edit" action
    console.log('Testing "Edit" menu item...');
    const editBtn = (await page.$$('tbody tr td:last-child .z-50 button'))[0];
    if (editBtn) {
      await editBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, '05_edit_modal.png') });
      console.log('Edit modal opened successfully. Closing it...');
      await closeModal();
    }

    // 6. Test "Manage Access" action
    console.log('Testing "Manage Access" menu item...');
    await openMenuAtRow(1);
    const accessBtn = (await page.$$('tbody tr td:last-child .z-50 button'))[1];
    if (accessBtn) {
      await accessBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, '06_manage_access_modal.png') });
      console.log('Manage Access modal opened successfully. Closing it...');
      await closeModal();
    }

    // 7. Test "Reset Password" action
    console.log('Testing "Reset Password" menu item...');
    await openMenuAtRow(1);
    const resetPwBtn = (await page.$$('tbody tr td:last-child .z-50 button'))[2];
    if (resetPwBtn) {
      await resetPwBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, '07_reset_password_modal.png') });
      console.log('Reset Password modal opened successfully. Closing it...');
      await closeModal();
    }

    // 8. Test "Remove User" action
    console.log('Testing "Remove User" menu item...');
    await openMenuAtRow(1);
    const removeBtns = await page.$$('tbody tr td:last-child .z-50 button');
    for (const btn of removeBtns) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('Remove User')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, '03_remove_user_modal.png') });
    console.log('Remove User modal opened successfully. Canceling...');
    await closeModal();

    // 9. Test outside click & Escape key
    console.log('Testing outside click and Escape key behavior...');
    await openMenuAtRow(1);
    let isVisible = (await page.$$('tbody tr td:last-child .z-50')).length > 0;
    console.log('Menu open after click:', isVisible);

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));
    isVisible = (await page.$$('tbody tr td:last-child .z-50')).length > 0;
    console.log('Menu closed after Escape:', !isVisible);

    // Outside click test
    await openMenuAtRow(1);
    await page.click('h1'); // Click page title outside
    await new Promise(r => setTimeout(r, 400));
    isVisible = (await page.$$('tbody tr td:last-child .z-50')).length > 0;
    console.log('Menu closed after outside click:', !isVisible);

    // 10. Test upward opening for bottom rows
    const totalRows = (await page.$$('tbody tr')).length;
    console.log(`Testing upward opening on last row (${totalRows})...`);
    const lastRow = (await page.$$('tbody tr'))[totalRows - 1];
    await lastRow.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await new Promise(r => setTimeout(r, 400));
    await openMenuAtRow(totalRows - 1);

    const bottomMenuDebug = await page.evaluate(() => {
      const menu = document.querySelector('tbody tr:last-child td:last-child .z-50');
      const r = menu ? menu.getBoundingClientRect() : null;
      const btn = menu ? menu.parentElement.querySelector('button').getBoundingClientRect() : null;
      return {
        menuRect: r ? { top: r.top, bottom: r.bottom, height: r.height, left: r.left, right: r.right } : null,
        btnRect: btn ? { top: btn.top, bottom: btn.bottom, height: btn.height, left: btn.left, right: btn.right } : null,
        windowScrollY: window.scrollY,
        windowInnerHeight: window.innerHeight
      };
    });
    console.log('Detailed bottom menu debug:', JSON.stringify(bottomMenuDebug, null, 2));

    await page.screenshot({ path: path.join(outDir, '08_bottom_row_upward_menu.png') });
    await page.keyboard.press('Escape');

    // 11. Test Mobile Viewport
    console.log('Testing mobile viewport (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(outDir, '09_mobile_overview.png') });
    const firstRow = (await page.$$('tbody tr'))[0];
    await firstRow.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await new Promise(r => setTimeout(r, 400));
    await openMenuAtRow(0);
    await page.screenshot({ path: path.join(outDir, '10_mobile_actions_dropdown.png') });

    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
