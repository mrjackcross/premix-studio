'use strict';
var SwaggerExpress = require('swagger-express-mw');
var app = require('express')();
var https = require('https');
var httpProxy = require('http-proxy');
var Config = require('./config/config');

var config = {
  appRoot: __dirname // required config
};

/**
 * Create proxy server
 */
var proxy = httpProxy.createProxyServer({
  target: Config.omniContentUrl,
  agent  : https.globalAgent,
  headers: {
    host: Config.omniContentHostHeader
  }
}).listen(8000);

proxy.on('proxyRes', function (proxyRes, req, res) {
  proxyRes.headers['Access-Control-Allow-Origin'] = '*';
});

SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  app.use(allowCrossDomain);

  // install middleware
  swaggerExpress.register(app);


  var port = process.env.PORT || 10010;
  app.listen(port);

});

//CORS middleware
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
}

module.exports = app; // for testing
