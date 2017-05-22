const fs = require('fs');
const path  =require('path');
const loggly  =require('loggly');

let logger;
const logglyFilePath = path.join(__dirname, 'loggly.json');
if(fs.existsSync(logglyFilePath)){
  const logglyConf = require(logglyFilePath);
  var client = loggly.createClient(logglyConf);
  logger = function(){
    client.log(...arguments);
  }
}

const server = require('./lib/server')({
  logger,
  root: process.env.LITERAL_PATH || path.join(__dirname, 'functions'),
  port: 8080,
  timeout: 1000 * 60,
});
