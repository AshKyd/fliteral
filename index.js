const server = require('./lib/server')({
  root: process.env.LITERAL_PATH || require('path').join(__dirname, 'functions'),
  port: 8080,
  timeout: 1000 * 60,
});
