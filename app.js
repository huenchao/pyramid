class AppBootHook {
    constructor(app) {
      this.app = app;
    }
    async didReady() {
      // 应用已经启动完毕
      const ctx = await this.app.createAnonymousContext();
      ctx.logger.info('start to launch a browser.')
      ctx.helper.initManagers();
      //TODO user config
      this.app.TaskScheduler.WSE_LIST = await this.app.PuppeteerManager.getWsEndpointsWithStatuses();
    }
}
  
module.exports = AppBootHook;
  