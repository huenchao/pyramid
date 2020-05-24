module.exports = {
   async customTask(c, browser){
       const page = await browser.newPage();
       await page.goto('https://www.baidu.com', { waitUntil: 'domcontentloaded' });
       await page.waitFor(300000);
    }
}
