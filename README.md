Hades 1.0.0 - A robust framework designed specifically for puppeteer&&egg app
=========================

<!-- [START badges] -->
[![Build status](https://img.shields.io/travis/com/puppeteer/puppeteer/master.svg)]() [![npm puppeteer package](https://img.shields.io/npm/v/puppeteer.svg)]() [![Issue resolution status](https://isitmaintained.com/badge/resolution/puppeteer/puppeteer.svg)]()
<!-- [END badges] -->

# Introduction
Hades is an upper framework based on egg, which aims to protect puppeteer related applications. If you don't want to care about Crashed targets which might be caused by chromium bug, OOM, memory corruption etc. Hades is a good choice, because it will help you deal with these problems gracefully.
<img src="https://user-images.githubusercontent.com/14048126/83109725-785c4a00-a0f4-11ea-9c06-fdc1953de708.png"  height="200px" align="right">


<!-- [START usecases] -->
###### What features does it support?

1. Monitor whether the browser is running normally. If the browser suddenly crashes, it will automatically restart.
2. Dynamic back-pressure and scheduling for puppeteer-based tasks.
3. Support a scheduleStrategy which works in the cluster.





## Getting Started

### Installation

To use Hades in your project, run:

```bash
npm i @msfe/Hades
# or "yarn add @msfe/Hades"
```

### Usage
The name of framework, default as egg, is a indispensable option to launch an application, set by `egg.framwork` of `package.json`,then Loader loads the exported app of a module named it. If we consider use Hades, we need to replace `egg` with `@msfe/Hades`.

```javascript 
{
  "scripts": {
    "dev": "egg-bin dev"
  },
  "egg": {
    "framework": "@msfe/Hades"
  }
}

```
Find more infos at [egg ](https://eggjs.org/en/advanced/framework.html)