const assert = require('assert');
const mock = require('egg-mock');
describe('test/extend/helper.test.js', () => {
    let app;
    before(() => {
      // 创建当前应用的 app 实例
      app = mock.app();
      // 等待 app 启动成功，才能执行测试用例
      return app.ready();
    });
    it('should initial PuppeteerManager', () => {
        assert(typeof app.PuppeteerManager === 'object');
    });
    it('should initial TaskScheduler', () => {
      assert(typeof app.TaskScheduler === 'object');
  });

});