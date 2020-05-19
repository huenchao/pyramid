const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');


class Application extends egg.Application {
    get [EGG_PATH]() {
      // 返回 framework 路径
      return path.dirname(__dirname);
    }
}

module.exports = Application;