const egg = require('egg');
const Application = require('./application');
const Agent = require('./agent');

// 覆盖了 Egg 的 Application
module.exports = Object.assign(egg, {
    Application,
    Agent,
});