const EventEmitter = require('events');
const url = require('url');
const os = require('os');
const detect = require('detect-port');
const puppeteer = require('puppeteer');
const { execSync }  = require('child_process');
const { Transform, Writable } = require('stream');


const _isLinux = process.platform === 'linux';
const ErrorCodes = { tcpError: 1, tcpHealthy: 0};

const _MAX_WSE = Symbol('PuppeteerManager#Others#maxWse');
const _HEADLESS = Symbol('PuppeteerManager#Configs#headless');
const _ARGS = Symbol('PuppeteerManager#Configs#args');
const _CRASHED = 'Crashed';


class PuppeteerManager extends EventEmitter {
    constructor(options){
        super();
        PuppeteerManager.app = options.app;
        this[_MAX_WSE] = os.cpus().length;
        this[_HEADLESS] = _isLinux;
        this[_ARGS] = [
            '--single-process​',
            '--no-first-run',
            // fix: https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-http-background-page',
            '--allow-http-screen-capture',
            '--ignore-certificate-errors',
            '--allow-running-insecure-content',
            '--disable-features=site-per-process',
            '--no-sandbox',
            // fix: https://www.stevenrombauts.be/2017/04/how-to-disable-chrome-security-checks/
            '--no-zygote',
          ];
    }
    launchOneBrowser(){
       return puppeteer.launch({
            headless: this[_HEADLESS],
            args: this[_ARGS],
            handleSIGINT: true,
            defaultViewport: {
              deviceScaleFactor: 2,
              width: 980,
              height: 980,
            },
            ignoreHTTPSErrors: true,
       });
    }
    async getWsEndpointsWithStatuses(MAX_WSE = 1){
        const WSE_LIST = [];
        for (let i = 0; i < MAX_WSE; i++) {
            const browser = await this.launchOneBrowser();
            const browserWSEndpoint = browser.wsEndpoint();
            WSE_LIST[i] = {
              browserWSEndpoint,
              status: 0,
            };
          }
        return WSE_LIST;
    }
    async conn2SpecialBrowser(browserWSEndpoint){
        if(typeof browserWSEndpoint !== 'string'){
            return ErrorCodes.tcpError
        }
        let port;
        try {
             port = url.parse(`${browserWSEndpoint}`).port;
        } catch (error) {
            PuppeteerManager.app.logger.error(`the argument browserWSEndpoint must be the  type of ws protocol`)
            res(ErrorCodes.tcpError);
        }

        const errCode = await new Promise((res, _) => {
            detect(port, (err, _port) => {
              if (err) {
                PuppeteerManager.app.logger.error('something happened error When we try to detect the port', err.message);
                res(ErrorCodes.tcpError);
              }
              if (port === `${_port}`) {
                PuppeteerManager.app.logger.info(`${port} was not occupied, the special browser has crashed.`);
                res(ErrorCodes.tcpError);
              } else {
                PuppeteerManager.app.logger.info(`${port} was occupied, the special browser is running. `);
                res(ErrorCodes.tcpHealthy);
              }
            });
        });
        if (errCode) {
            return errCode;
        }
        const browser = await puppeteer.connect({ browserWSEndpoint });
        return browser;
    }

    async cleanTheSpecialBrowser(browserInstance, crashed = false, pid = ''){
        if (browserInstance && !crashed) {
            browserInstance.removeAllListeners();
            await browserInstance.close();
        } else {
            PuppeteerManager.app.logger.info(`the next step wanna kill the browser whose pid is ${pid}`);
            try {
              pid && execSync(`kill -9 ${pid}`);
            } catch (error) {
                PuppeteerManager.app.logger.error(`pid=${pid} could not be closed`);
            }
        }
        browserInstance = null;
    }
}

const _CRAWLER_CB = Symbol('TaskScheduler#Crawler#func');
const _SCHEDULE_CB = Symbol('TaskScheduler#Schedule#func');
const _SCHEDULE_CONFIG = Symbol('TaskScheduler#Schedule#config');
class TaskScheduler extends EventEmitter {
    constructor(options){
        super();
        const self = this;
        this.acc = 0;
        this.WSE_LIST = [];
        TaskScheduler.app = options.app;
        this.highWaterMark = options.highWaterMark || 200;
        this.scheduleArr = [];
        this.watchDogs = [];
        this.producer = new Transform({
            highWaterMark: this.highWaterMark,
            objectMode: true,
            writableObjectMode: true,
            readableObjectMode: true,
            transform(c, _, cb) {
              self.acc++;
              cb(null, c);
            },
        });
        this.consumer = new Writable({
            objectMode: true,
            highWaterMark: this.highWaterMark,
            write(c, _, cb) {
                TaskScheduler.app.logger.info(`the NO.${self.acc} task wanna to be executed`);
                let freeExecutors = 0;
                const freeExecutorsArray = [];
                let index;
                self.WSE_LIST.forEach((item, i) => {
                    if (item.status === 0) {
                      freeExecutorsArray[freeExecutors++] = i;
                    }
                });
                if (freeExecutors === 1) {
                    index = freeExecutorsArray[0];
                    self.WSE_LIST[index].status = 1;
                }else{
                    const _index = Math.floor(Math.random() * freeExecutorsArray.length);
                    index = freeExecutorsArray[_index];
                    self.WSE_LIST[index].status = 1;
                }
                self.watchDogs[index] = self.vm({ c, index }).then(res => {
                    return {
                        res,
                        index,
                        err: null,
                      };
                }).catch(err => {
                    if (err.message === _CRASHED) {
                        self.app.PuppeteerManager.launchOneBrowser().then(browser => {
                            const browserWSEndpoint = browser.wsEndpoint();
                            self.WSE_LIST[index].browserWSEndpoint = browserWSEndpoint;
                        })
                    }else{
                        return {
                            res: null,
                            index,
                            err,
                        };
                    }
                }).then(res => {
                    const index = res.index;
                    self.WSE_LIST[index].status = 0;
                    return res;
                })
                if (freeExecutors === 1) {
                    Promise.race(self.watchDogs.filter(c => { return typeof c !== 'undefined'; })).then((res) => {
                        cb(null, res);
                    });
                }else{
                    cb(null);
                }
            }
        })
        this.producer.pipe(this.consumer);
    }

    setCustomTaskHook(options){
        if(typeof options !== 'object'){
            return TaskScheduler.app.logger.warn('[ctx.app.registerCrawler(options)] the argument `options` must be a Object containing cb<function>.');
        }
        if(typeof options.cb === 'function'){
            TaskScheduler[_CRAWLER_CB] = options.cb;
        }
    }

    setCustomScheduleTaskHook(options){
        if(typeof options !== 'object'){
            return TaskScheduler.app.logger.warn('the argument `options` must be a Object containing cb<function> and  schedule<object>.');
        }
        if(typeof options.cb === 'function'){
            TaskScheduler[_SCHEDULE_CB] = options.cb ;
        }
        if(typeof options.schedule === 'object'){
            TaskScheduler[_SCHEDULE_CONFIG] = {
                ...TaskScheduler[_SCHEDULE_CONFIG],
                ...options.schedule
            }
        }
        TaskScheduler.app.messenger.sendToAgent('update_action',TaskScheduler[_SCHEDULE_CONFIG])
    }

    vm(taskParams){
        return new Promise(async (task_res, task_rej) => {
            const { index,c } = taskParams;
            const browserWSEndpoint = this.WSE_LIST[index].browserWSEndpoint;
            let browser;
            let pid;
            try {
                browser = await TaskScheduler.app.PuppeteerManager.conn2SpecialBrowser(browserWSEndpoint);
                if (typeof browser === 'number') {
                    return task_rej(Error(_CRASHED));
                }
                pid = browser && browser.process() && browser.process().pid;
              } catch (error) {
                TaskScheduler.app.logger.info('the function conn2SpecialBrowser called fail,', error);
                return task_rej(error);
            }
            let disconnected = false;
            browser.once('disconnected', () => {
                disconnected = true;
            });
            if(!TaskScheduler[_CRAWLER_CB]){
                TaskScheduler.app.logger.error('your must set some codes which like  `ctx.app.setTask(ctx.service.test.customTask);` in app.js. ');
            }
            try {
                await TaskScheduler[_CRAWLER_CB]({
                    browser,
                    taskParams:c
                });
            } catch (error) {
                TaskScheduler.app.logger.error(error.message);
                TaskScheduler.app.logger.error('then relaunch a new browser.');
                await TaskScheduler.app.PuppeteerManager.cleanTheSpecialBrowser(browser, disconnected, pid);
                return task_rej(error);
            }
            browser.disconnect();
            browser.removeAllListeners();
            browser = null;
            TaskScheduler.app.logger.info('done');
            task_res();
        })
    }
}
TaskScheduler[_CRAWLER_CB] = null;
TaskScheduler[_SCHEDULE_CB] = null;
TaskScheduler[_SCHEDULE_CONFIG] = {type:"all",disable:true};

module.exports = {
    initManagers(){
        // TODO mix egg configs to PuppeteerManager constructor so that it can be controlled by user level @lianshan
        this.app.PuppeteerManager = new PuppeteerManager({ app: this.app});
        this.app.TaskScheduler = new TaskScheduler({ app: this.app});
        module.exports.proxy(this.app);
    },
    // public API
    proxy(_app){
        const app = Object.getPrototypeOf(_app);
        Object.defineProperty(app,'registerCrawler',{
            get:function (){
                return _app.TaskScheduler.setCustomTaskHook;
            }
        });
        Object.defineProperty(app,'updateSchedule',{
            get:function (){
                return _app.TaskScheduler.setCustomScheduleTaskHook;
            }
        });
        Object.defineProperty(app,'getCurScheduleConfig',{
            get:function (){
                return _app.TaskScheduler[_SCHEDULE_CONFIG];
            }
        });
        Object.defineProperty(app,'getCurScheduleTask',{
            get:function (){
                return _app.TaskScheduler[_SCHEDULE_CB];
            }
        });
        Object.defineProperty(app,'crawlerQueue',{
            get:function (){
                return _app.TaskScheduler.producer;
            }
        });
        
    }
};

