class AppBootHook {
    constructor(app) {
      this.app = app;
    }
    async didReady() {
      // 应用已经启动完毕
      console.info('start to launch a browser.')
      const ctx = await this.app.createAnonymousContext();
      ctx.helper.init();
      this.app.scrernshotManager.WSE_LIST = await this.app.pptrManager.getBrowsers(this.app.scrernshotManager.AllBlen);
    }
  }
  
  module.exports = AppBootHook;
  