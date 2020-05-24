class AppBootHook {
    constructor(app) {
      this.app = app;
    }
    async didReady() {
      // 应用已经启动完毕
      console.info('start to launch a browser.')
      const ctx = await this.app.createAnonymousContext();
      ctx.helper.initManagers();
      //TODO user config
      this.app.TaskScheduler.WSE_LIST = await this.app.PuppeteerManager.getWsEndpointsWithStatuses();
    }
  }
  
  module.exports = AppBootHook;
  