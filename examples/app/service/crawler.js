const  { Service }  = require('egg');

class TestCase extends Service {
    index(chuck){
        if (typeof chuck === 'object' && typeof chuck.targetUrl === 'string' && typeof +chuck.recordId === 'number') {
            const flag = this.app.crawlerQueue.write(chuck);
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
    async customTask(options){
        const { browser, taskParams} = options;
        const page = await browser.newPage();
        console.log('爬虫任务参数',taskParams)
        await page.goto(taskParams.targetUrl, { waitUntil: 'domcontentloaded' });
     }
    async schedule(options){
        console.log('爬虫任务的认识任务参数',new Date().toUTCString());
    }

}
module.exports = TestCase