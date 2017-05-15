const server = require('./lib/server')({
  root: require('path').join(__dirname, 'functions'),
  port: 8080,
  timeout: 1000 * 60,
});
