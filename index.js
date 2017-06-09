const path = require('path');
const loggly = require('loggly');

let logger;

const logglyConfig = {
  token: process.env.LITERAL_LOGGLY_TOKEN,
  subdomain: process.env.LITERAL_LOGGLY_SUBDOMAIN,
  tags: [process.env.LITERAL_LOGGLY_TAG || 'fliteral'],
  json: true,
};

if (logglyConfig.token && logglyConfig.subdomain) {
  const client = loggly.createClient(logglyConfig);
  logger = function () {
    client.log(...arguments);
  };
  logger({ message: 'starting server' }, (error) => {
    if (error) console.log(error);
  });
} else {
  console.log('No loggly config provided. Skipping.');
}

const server = require('./lib/server')({
  logger,
  root: process.env.LITERAL_PATH || path.join(__dirname, 'functions'),
  port: 8080,
  timeout: Number(process.env.LITERAL_TIMEOUT) || (1000 * 15),
});

process.on('uncaughtException', (e) => {
  console.error(String(e));
});
