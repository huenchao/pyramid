const schedule = require('node-schedule');
const ms = require('ms');
const fs = require('fs');
const path = require('path');

module.exports = agent => {
    class ClusterStrategy extends agent.ScheduleStrategy {
        action(){
          if(Array.isArray(this.config.env) && !this.config.env.includes(process.env.EGG_SERVER_ENV)){
              return;
          }
          if(this.config.type === 'all'){
            this.sendAll();
          }else if(this.config.type === 'worker'){
           this.sendOne();
          }else{
            return agent.logger.error('you should set `type` whose value refers https://eggjs.org/zh-cn/basics/schedule.html#%E7%B1%BB%E5%9E%8B');
          }
        }
        _cancel(){
          if(this.timer){
            clearInterval(this.timer);
            this.timer = null;
          }
          if(this.job){
            this.job.cancel();
          }
        }
        __init__(){
          if(!this.loaded){
            this.loaded = true;
            this.agent = agent;
            this.timer = null;
            this.job = null;
            this.config = {disable:true};
            this.agent.mq.on("msg_config",(message_str)=>{
              const message = JSON.parse(message_str);
              if(!this.appName){
                const fileName = path.resolve(__dirname,'./appName');
                this.appName = fs.readFileSync(fileName,{
                  encoding:'utf8'
                });
              }
              if(message.targetName === this.appName){
                this.config = message.data;
                this.start();
              }
            })
            this.agent.messenger.on('update_action',(message)=>{
              if(message.type === 'broadcast'){
                this.agent.mq._write(JSON.stringify({
                  data:message.data,
                  type:'receive',
                  targetName: message.target,
                }))
              }
            });
         }
        }
        start() {
          this._cancel();
          this.__init__();
          if(!this.config.disable){
              if(this.config.interval){
                let _ms = 0;
                if(typeof this.config.interval === 'string'){
                  try {
                    _ms =  ms(this.config.interval);
                  } catch (error) {
                    return agent.logger.error('type of the arguments `interval` must be number(eg.1000) or string(`1s`)')
                  }
                }else if(typeof this.config.interval === 'number'){

                    _ms = this.config.interval;
                }else{
                  return agent.logger.error('type of the arguments `interval` must be number(eg.1000) or string(`1s`)');
                }
                this.timer = setInterval(() => {
                    this.action();
                  }, _ms);
                if(this.config.immediate){
                  this.action();
                }
              }else if(typeof this.config.cron === 'string'){
                try {
                  this.job = schedule.scheduleJob(this.config.cron, ()=>{
                    this.action();
                   });
                   if(this.config.immediate){
                    this.action();
                  }
                } catch (error) {
                  agent.logger.error(error.message);
                  return agent.logger.error('you should set `type` whose value refers https://eggjs.org/zh-cn/basics/schedule.html#cron');
                }
              }
            }
        }
    }
    agent.schedule.use('cluster', ClusterStrategy);
};