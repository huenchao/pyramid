const  { Service }  = require('egg');

class TestCase extends Service {
    index(chuck){
        if (typeof chuck === 'object' && typeof chuck.targetUrl === 'string' && typeof +chuck.recordId === 'number') {
            const flag = this.app.PuppeteerManager.producer.write(chuck);
            const feedback = {
                code: flag ? 1000000 : 1000001,
                message: flag ? '成功' : '系统繁忙',
            };
            return feedback;
        }else{
            return {
                code: 1000003,
                message: '入参不对',
            };
        }
    }
    async customTask(browser, c){
        const page = await browser.newPage();
        await page.goto('https://www.baidu.com', { waitUntil: 'domcontentloaded' });
        await page.waitFor(300000);
     }

}
module.exports = TestCase