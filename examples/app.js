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
        cb:ctx.service.crawler.schedule,
        schedule:{
          type:"worker",
          immediate:true,
          disable:false,
          env:[],
          interval:5000

        }
      });
    }
}
  
module.exports = AppBootHook;
  