const request = require('supertest');
const assert = require('assert');
describe('function literal runner', function(){
  let server, baseUrl;
  before(function(done){
    server = require('../lib/server')({
      root: require('path').join(__dirname, 'functions'),
      port: 9944,
      timeout: 1000 * 60,
    });
    done();
  });

  it('should 404 on missing module', function(done){
    request(server)
      .get('/404')
      .expect(404)
      .end(err => done(err));
  });
  it('should 400 on attempted directory traverse', function(done){
    request(server)
      .get('/../inaccessiblefunction')
      .expect(400)
      .end(err => done(err));
  });
  it('should not find anything at .', function(done){
    request(server)
      .get('/.')
      .expect(404)
      .end(err => done(err));
  });
  it('should 404 on module that does not have a package.json', function(done){
    request(server)
      .get('/withoutpackagejson')
      .expect(404)
      .end(err => done(err));
  });
  it('should 500 on module that does not have a handler', function(done){
    request(server)
      .get('/withouthandler')
      .expect(500)
      .end(err => done(err));
  });
  it('should 500 on module that throws an error', function(done){
    request(server)
      .get('/uncaughterror')
      .expect(500)
      .end(err => done(err));
  });
  it('should 200 with body on module that returns a 200', function(done){
    request(server)
      .get('/helloworld')
      .expect(200)
      .end((err, response) => {
        assert(response.body, 'hello world')
        done(err);
      });
  });
  it('should pass through query string params', function(done){
    request(server)
      .get('/echotest?foo=1&bar=2')
      .expect(200)
      .end((err, response) => {
        const qs = response.body.queryStringParameters;
        assert.deepEqual(qs, {foo: '1', bar: '2'});
        done(err);
      });
  });
  it('should pass through httpMethod, path', function(done){
    request(server)
      .post('/echotest')
      .expect(200)
      .end((err, response) => {
        assert.deepEqual(response.body.httpMethod, 'POST');
        assert.deepEqual(response.body.path, '/echotest');
        done(err);
      });
  });
  it('should pass through body', function(done){
    request(server)
      .post('/echotest')
      .send({ name: 'Manny', species: 'cat' })
      .expect(200)
      .end((err, response) => {
        assert.deepEqual(response.body.body, '{"name":"Manny","species":"cat"}');
        done(err);
      });
  });
});
