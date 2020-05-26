const Subscription = require('egg').Subscription;
class ClusterTask extends Subscription {
  static get schedule() {
    return {
      type: 'cluster',
    };
  }
  async subscribe() {
     console.log('我的定时任务可以执行了。。。');
     console.log('this.app.getCurScheduleTask',this.app.getCurScheduleTask )
  }
}
module.exports = ClusterTask;