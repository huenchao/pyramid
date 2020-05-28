'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
   render() {
    const ctx = this.ctx;
    // use service defined in framework
    const body =  ctx.service.test.index(this.ctx.request.body);
    ctx.logger.info('request#body', this.ctx.request.body);
    ctx.body = body;
  }
}

module.exports = HomeController;
