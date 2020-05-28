const appName = require("./package.json").name;
class AppBootHook {
    constructor(app) {
      this.app = app;
    }
    async didReady() {
      // 应用已经启动完毕
      const ctx = await this.app.createAnonymousContext();
      ctx.logger.info('your application did Ready');
      ctx.app.registerCrawler({
        cb:ctx.service.crawler.customTask
      });
      ctx.app.updateSchedule({
        appName:appName,
        cb:ctx.service.crawler.schedule,
        schedule:{
          type:"all",
          immediate:true,
          disable:false,
          cron: '*/3 * * * * *',
        }
      });
    }
}
  
module.exports = AppBootHook;
  