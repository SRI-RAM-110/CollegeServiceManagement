import puppeteer from 'puppeteer';

async function testDept() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'csehod@nrtec.in');
  await page.type('input[type="password"]', 'dept123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1800));

  const viewports = [
    { name: '320', width: 320, height: 568 },
    { name: '360', width: 360, height: 800 },
    { name: '390', width: 390, height: 844 },
    { name: '430', width: 430, height: 932 },
    { name: '600', width: 600, height: 960 },
    { name: '768', width: 768, height: 1024 },
    { name: '1024', width: 1024, height: 768 },
    { name: '1280', width: 1280, height: 800 },
    { name: '1440', width: 1440, height: 900 },
    { name: '1920', width: 1920, height: 1080 },
    { name: '844_landscape', width: 844, height: 390 },
  ];

  let allClean = true;
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const res = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;

      const bad = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 1.5) {
          bad.push({
            tag: el.tagName,
            className: el.className ? String(el.className).substring(0, 60) : '',
            right: Math.round(r.right),
            docW
          });
        }
      }
      return { docW, scrollW, bodyW, hasOverflow: scrollW > docW || bodyW > docW, bad: bad.slice(0, 3) };
    });
    if (res.hasOverflow) {
      console.log('FAIL:', vp.name, res);
      allClean = false;
    } else {
      console.log('PASS:', vp.name, `(docW: ${res.docW}, scrollW: ${res.scrollW})`);
    }
  }
  await browser.close();
  if (allClean) console.log('\n🎉 ALL VIEWPORTS ON DEPARTMENT DASHBOARD ARE 100% CLEAN!');
}

testDept().catch(console.error);
