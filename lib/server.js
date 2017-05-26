const fs = require('fs');
const url = require('url');
const log = require('metalogger')();
const body = require('body');
const http = require('http');
const path = require('path');
const async = require('async');
const uuidV4 = require('uuid/v4')
const package = require('../package');
const resolve = require('resolve');
const querystring = require('querystring');
const defaultTimeout = 1000 * 60;
const moduleVersions = {};

function respond(options){
  const {statusCode, headers, res, body} = options;
  res.writeHead(statusCode, http.STATUS_CODES[statusCode], headers);
  if(body) res.write(body);
  res.end();
}

function respondError(res, statusCode, error){
  if(error) console.error(error);
  return respond({
    res,
    statusCode: statusCode || 500,
    headers: {'Content-Type': 'text/plain'},
    body: http.STATUS_CODES[statusCode || 500],
  })
}

function prepareEvent(req){
  const {headers, method} = req;
  const parsedUrl = url.parse(req.url);
  return {
    headers,
    body,
    resource: parsedUrl.pathname,
    path: parsedUrl.pathname,
    httpMethod: method,
    queryStringParameters: querystring.parse(parsedUrl.query),
    requestContext: {
      httpMethod: method,
      path: parsedUrl.pathname,
      stage: process.env.NODE_ENV || 'test',
      requestId: uuidV4(),
    }
  };
}

function functionExists(root, event, callback){
  const packagePath = path.join(root, event.path,'package.json');
  fs.stat(packagePath, function(error, stat){
    if(error) {
      if(error.code === 'ENOENT') return callback({ statusCode: 404 });
      log.error(event.path, error.message);
      return callback({ statusCode: 500 });
    }
    if(!stat || !stat.isFile()){
      log.error(event.path, 'package is malformed');
      return callback({ statusCode: 500 });
    }
    callback(null, stat);
  });
}

function functionRun(root, event, callback){
  const modulePath = path.join(root, event.path);
  async.auto({
    stat: (done) => functionExists(root, event, done),
    id: (done) => resolve(modulePath, {}, done),
    run: ['stat', 'id', function(results, done){
      const {stat, id} = results;
      let loadedModule;
      try{
        loadedModule = require(modulePath);
      } catch(e) {
        log.error(e);
        return done({ statusCode: 500 });
      }

      if(!loadedModule || !loadedModule.handler || typeof loadedModule.handler !== 'function'){
        log.error(event.path, 'loadedModule.handler does not exist');
        return done({ statusCode: 500 });
      }

      // invalidate cache
      const moduleCache = require.cache[id[0]];
      if(moduleCache) {
        const loadedAt = moduleCache.__fliteral_loaded_at;
        const timeNow = Number(stat.mtime);
        if(loadedAt && loadedAt !== timeNow){
          log.notice(event.path, 'invalidating cache');
          delete require.cache[id[0]];
          return functionRun(root, event, done);
        }
        moduleCache.__fliteral_loaded_at = timeNow;
      }

      try{
        loadedModule.handler(event, {}, done);
      } catch(e){
        console.error(event.path, 'Module returned error', e.message);
        return done({ statusCode: 500 });
      }
    }]
  }, function(error, result){
    callback(error, result && result.run);
  });
}

function onRequest(req, res, options){
  const {root, logger, timeout} = options;
  const start = Date.now();
  let event;
  let hasTimedOut;

  const timeoutTimer = setTimeout(function(){
    hasTimedOut = true;
    respond({
      res,
      statusCode: 504,
    });
  }, timeout);

  async.waterfall([
    (done) => body(req, done),
    (body, done) => {
      event = prepareEvent(req);
      event.body = body;
      log.info(event.path, 'request received');

      // Root requests just return the API version
      if(event.path === '/') {
        return respond({
          res,
          statusCode: 200,
          headers: {'Content-Type': 'application/json; charset=utf-8'},
          body: JSON.stringify({
            name: package.name,
            version: package.version,
          }),
        });
      }

      // Prevent directory traversal
      if(event.path.includes('..')) return respondError(res, 400);
      done();
    },
    (done) => functionRun(root, event, done),
  ], function(error, response){
    const end = Date.now();
    const duration = end - start;
    clearTimeout(timeoutTimer);
    if(hasTimedOut) {
      logger({
        path: event.path,
        duration,
        timeout: true,
      });
      log.error(event.path, 'request timeout');
      return;
    }
    if(error) return respondError(res, error.statusCode, error);
    if(typeof response !== 'object'){
      log.error(event.path, 'callback must be an object');
      return respondError(res, 500);
    }
    if(!response.statusCode) {
      log.error(event.path, 'no statusCode provided');
      return respondError(res, 500);
    }

    if(logger){
      logger({
        path: event.path,
        duration
      });
    }

    respond({
      res,
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
    });
  });
}

module.exports = function(options){
  const {logger} = options;
  const root = options.root || __dirname;
  const port = process.env.PORT || options.port || 8080;
  const timeout = options.timeout || defaultTimeout;
  const server = http.createServer(function(req, res){
    onRequest(req, res, {root, logger, timeout});
  });
  server.on('clientError', (err, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
  server.setTimeout(timeout);
  server.listen(port);
  log.info(`server started on port ${port} watching ${root}.`);
  return server;
}
