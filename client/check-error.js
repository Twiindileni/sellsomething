const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('https://www.sellsomething.online', { waitUntil: 'networkidle0' });
  console.log("Page loaded. Any errors should be printed above.");
  await browser.close();
})();
