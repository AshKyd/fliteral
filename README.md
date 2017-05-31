Function literal runner
=======================

A small Node app to run function literals, largely compatible with AWS Lambda + web gateway.

Use it for testing, or use it on your own server.

> Do not allow untrusted code to run on your infrastructure. These are not sandboxed in any way.

Literals
--------
These are really just Node modules with a standardised API. A literal consists of a folder, a package.json and an export.

Sample literal to echo response back to sender:
```
module.exports = {
  handler: (event, context, callback) => {
    callback(null, {
      statusCode: '200',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(event),
    });
  }
}
```

Usage
-----
Run on the command line as follows:

```
LITERAL_PATH=foo fliteral
```

This will open the default HTTP port (see below), and any requests to
`http://myserver/*` will run & return the literal named `*`.

Environment Variables
---------------------
The following variables may be configured:

Variable name   | Description          | Default             
----------------|----------------------|---------------------
PORT            | HTTP port to open    | 8080
LITERAL_PATH    | Path which contains function literals. | `path.join(__dirname, functions)`
LITERAL_TIMEOUT | Number of milliseconds after which the server will send a 502 gateway timeout. | 15000               
