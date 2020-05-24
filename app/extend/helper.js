const EventEmitter = require('events');
const url = require('url');
const os = require('os');
const detect = require('detect-port');
const puppeteer = require('puppeteer');
const { execSync }  = require('child_process');
const { Transform, Writable } = require('stream');
const _isLinux = process.platform === 'linux';

const _MAX_WSE = Symbol('PuppeteerManager#Others#maxWse');
const _HEADLESS = Symbol('PuppeteerManager#Configs#headless');
const _ARGS = Symbol('PuppeteerManager#Configs#args');

const isCrashed = 'isCrashed';
const ErrorCodes = {
    tcpError: 1,
    tcpHealthy: 0,
};

// TODO 
class PuppeteerManager extends EventEmitter {
    constructor(options){
        super();
        this.app = options.app;
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
            this.app.logger.error(`the argument browserWSEndpoint must be the  type of ws protocol`)
            res(ErrorCodes.tcpError);
        }

        const errCode = await new Promise((res, _) => {
            detect(port, (err, _port) => {
              if (err) {
                this.app.logger.error('something happened error When we try to detect the port', err.message);
                res(ErrorCodes.tcpError);
              }
              if (port === `${_port}`) {
                this.app.logger.info(`${port} was not occupied, the special browser has crashed.`);
                res(ErrorCodes.tcpError);
              } else {
                this.app.logger.info(`${port} was occupied, the special browser is running. `);
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
            this.app.logger.info(`the next step wanna kill the browser whose pid is ${pid}`);
            try {
              pid && execSync(`kill -9 ${pid}`);
            } catch (error) {
              this.app.logger.error(`pid=${pid} could not be closed`);
            }
        }
        browserInstance = null;
    }
}

const hook = Symbol('TaskScheduler#hook');
const noop = ()=>{};
class TaskScheduler extends EventEmitter {
    static [hook]() {}
    setCustomTaskHook(taskFunc){
        TaskScheduler[hook] = taskFunc || noop
    }
    vm(taskParams){
        return new Promise(async (task_res, task_rej) => {
            const { index,c } = taskParams;
            const browserWSEndpoint = this.WSE_LIST[index].browserWSEndpoint;
            let browser;
            let pid;
            try {
                browser = await this.app.PuppeteerManager.conn2SpecialBrowser(browserWSEndpoint);
                if (typeof browser === 'number') {
                    return task_rej(Error(isCrashed));
                }
                pid = browser && browser.process() && browser.process().pid;
              } catch (error) {
                this.app.logger.info('the conn2SpecialBrowser called fail:', error);
                return task_rej(error);
            }
            let disconnected = false;
            browser.once('disconnected', () => {
                disconnected = true;
            });
            try {
                await TaskScheduler[hook]({
                    browser,
                    taskParams:c
                });
            } catch (error) {
                this.app.logger.error(error.message);
                this.app.logger.error('relaunch a new browser...');
                await this.app.PuppeteerManager.cleanTheSpecialBrowser(browser, disconnected, pid);
                return task_rej(error);
            }
            browser.disconnect();
            browser.removeAllListeners();
            browser = null;
            this.app.logger.info('done');
            task_res();
        })
    }
    constructor(options){
        super();
        const self = this;
        this.acc = 0;
        this.WSE_LIST = [];
        this.app = options.app;
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
                self.app.logger.info(`the NO.${self.acc} task wanna to be executed`);
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
                    if (err.message === isCrashed) {
                        const eggApp = Object.getPrototypeOf(self.application);
                        eggApp.PuppeteerManager.launchOneBrowser().then(browser => {
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

}

module.exports = {
    initManagers(){
        // TODO mix egg configs to PuppeteerManager constructor so that it can be controlled by users
        this.app.PuppeteerManager = new PuppeteerManager({ app: this.app});
        this.app.TaskScheduler = new TaskScheduler({ app: this.app});
        module.exports.proxy(this.app);
    },
    proxy(app){
        Object.defineProperty(app,'setTask',{
            get:function (){
                return app.TaskScheduler.setCustomTaskHook;
            }
        });
        Object.defineProperty(app,'taskQueue',{
            get:function (){
                return app.TaskScheduler.producer;
            }
        });
    }
};

