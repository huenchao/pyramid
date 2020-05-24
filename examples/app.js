class AppBootHook {
    constructor(app) {
      this.app = app;
    }
    async didReady() {
      // 应用已经启动完毕
      const ctx = await this.app.createAnonymousContext();
      ctx.app.setTask(ctx.service.test.customTask);
    }
  }
  
  module.exports = AppBootHook;
  