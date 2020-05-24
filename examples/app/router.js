'use strict';

module.exports = app => {
  app.router.all('/', app.controller.index.render);
};
