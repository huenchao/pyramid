//严重警告，不要修改这里的代码。
const EventEmitter = require('events');
class AppBootHook extends EventEmitter{
    constructor(app) {
      super();
      this.app = app;
    }
    async didReady() {
      const ctx = await this.app.createAnonymousContext();
      ctx.helper.initManagers();
      this.app.TaskScheduler.WSE_LIST = await this.app.PuppeteerManager.getWsEndpointsWithStatuses();
    }
}
  
module.exports = AppBootHook;
  