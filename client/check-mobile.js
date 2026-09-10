const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Emulate mobile device
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
  });
  
  page.on('console', msg => {
    console.log('CONSOLE:', msg.text());
  });

  await page.goto('https://www.sellsomething.online', { waitUntil: 'networkidle0' });
  
  // Take a screenshot to see what it looks like
  await page.screenshot({ path: 'mobile-screenshot.png' });
  
  console.log("Page loaded and screenshot taken.");
  await browser.close();
})();
