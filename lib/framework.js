const egg = require('egg');
const Application = require('./application');
const Agent = require('./agent');

class PyramidAppWorkerLoader extends egg.AppWorkerLoader {
    load() {
      super.load();
      // 自己扩展
      console.log(`PyramidAppWorkerLoader`)
    }
}

class PyramidAgentWorkerLoader extends egg.AgentWorkerLoader {
    load() {
      super.load();
      // 自己扩展
      console.log(`PyramidAgentWorkerLoader`)
    }
}

// 覆盖了 Egg 的 Application
module.exports = Object.assign(egg, {
    Application,
    AppWorkerLoader: PyramidAppWorkerLoader,
    Agent,
    AgentWorkerLoader: PyramidAgentWorkerLoader,
});