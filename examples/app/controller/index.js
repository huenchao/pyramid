'use strict';

const Controller = require('pyramid').Controller;

class HomeController extends Controller {
   render() {
    const ctx = this.ctx;
    // use service defined in framework
    const body =  ctx.service.test.index(this.ctx.request.body);
    console.log('request#body', this.ctx.request.body);
    ctx.body = body;
  }
}

module.exports = HomeController;
