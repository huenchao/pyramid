const Subscription = require('egg').Subscription;
class ClusterTask extends Subscription {
  static get schedule() {
    return {
      type: 'cluster',
    };
  }
  async subscribe() {
     await this.app.getCurScheduleTask();
  }
}
module.exports = ClusterTask;