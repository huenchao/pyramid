const assert = require('assert');
const mock = require('egg-mock');
const fs  = require('fs');
const { Transform } = require('stream');
const _CRAWLER_CB = Symbol.for('TaskScheduler#Crawler#func');
//const rewire = require('rewire');
// const helperModule = rewire("../../app/extend/helper");
// const PuppeteerManager = helperModule.__get__("PuppeteerManager");
// const TaskScheduler = helperModule.__get__("TaskScheduler");
const { PuppeteerManager,TaskScheduler } = require("../../app/extend/helper");

describe('test/extend/helper.test.js', () => {
    let app;
    before(() => {
      app = mock.app();
      return app.ready();
    });
    it('check out initial works', () => {
      assert(app.PuppeteerManager);
      assert(app.TaskScheduler);
    });

    it('check out proxy funcs in app', () => {
      assert(typeof app.registerCrawler === 'function');
      assert(typeof app.registerAppName === 'function' );
      assert(typeof app.updateSchedule === 'function' );
      assert(app.crawlerQueue instanceof Transform );
      assert(typeof app.getCurScheduleConfig === 'object' );
      assert(typeof app.getCurScheduleTask === 'object' );
    });

    it('set hook functions', () => {
      const func = ()=>{ return 1};
      app.registerCrawler({
        cb:func
      });
      assert(TaskScheduler[_CRAWLER_CB]() === 1)
    });

});