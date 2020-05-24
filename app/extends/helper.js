const EventEmitter = require('events');
const path = require('path');
const url = require('url');
const fs = require('fs');
const os = require('os');
const detect = require('detect-port');
const puppeteer = require('puppeteer');
const { execSync }  = require('child_process');

const _isLinux = process.platform === 'linux';

const _MAX_WSE = Symbol('PuppeteerManager#Others#maxWse');
const _HEADLESS = Symbol('PuppeteerManager#Configs#headless');
const _ARGS = Symbol('PuppeteerManager#Configs#args');


class PuppeteerManager extends EventEmitter {
    constructor(options){
        this[_MAX_WSE] = options.maxWse || os.cpus().length;
        this[_HEADLESS] = options.headless || _isLinux;
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
    /**
     * 
     * 
     * */
    launchOneBrowser(){
       return puppeteer.launch({
            headless,
            args,
            handleSIGINT: true,
            defaultViewport: {
              deviceScaleFactor: 2,
              width: 980,
              height: 980,
            },
            ignoreHTTPSErrors: true,
       });
    }
    /**
     * 
     * 
     * */
    async getWsEndpointsWithStatuses(MAX_WSE){
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
    /**
     * 
     * 
     * */
    async conn2SpecialBrowser(wsEndpoint){
        const port = url.parse(wsEndpoint).port;
        const errCode = await new Promise((res, _) => {
            detect(port, (err, _port) => {
              if (err) {
                console.error('something happened error When we try to detect the port', err.message);
                res(1);
              }
              if (port === `${_port}`) {
                console.log(`${port} was not occupied, the special browser has crashed.`);
                res(1);
              } else {
                console.log(`${port} was occupied, the special browser is running. `);
                res(0);
              }
            });
        });
        if (errCode) {
            return errCode;
        }
        const browser = await puppeteer.connect({ wsEndpoint });
        return browser;
    }

    /**
     * 
     * 
     * */
    async cleanTheSpecialBrowser(browserInstance, crashed = false, pid = ''){
        if (browserInstance && !crashed) {
            browserInstance.removeAllListeners();
            await browserInstance.close();
        } else {
            console.log(`the next step wanna kill the browser whose pid is ${pid}`);
            try {
              pid && execSync(`kill -9 ${pid}`);
            } catch (error) {
              console.error(`pid=${pid} could not be closed`);
            }
        }
        browserInstance = null;
    }
  
}

module.exports = {
    init(){
        this.app.PuppeteerManager = new PuppeteerManager();
    }
}

