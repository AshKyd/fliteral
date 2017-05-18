module.exports = {
  handler: (event, context, callback) => {
    callback(null, {
      statusCode: '200',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(event),
    });
  }
}
