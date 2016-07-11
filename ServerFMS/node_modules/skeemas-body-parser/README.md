# skeemas-body-parser
Body parsing middleware with json-schema validation. This utility is a plugin for the [skeemas](https://github.com/Prestaul/skeemas) validation library.

## Install
```js
npm install skeemas-body-parser --save
```

This will install skeemas-body-parser, and also install [skeemas](https://github.com/Prestaul/skeemas) as a peerDependency if you haven't already installed it.

## Usage
Add the plugin to `skeemas` and then generate middleware from your schemas:
```js
var skeemas = require('skeemas'),
    skeemasBodyParser = require('skeemas-body-parser');

skeemas.use(skeemasBodyParser);

var fooSchema = {
    type: 'object',
    properties: {
        name: { type:'string' },
        things: { 
            type: 'array',
            minItems: 1
        }
    }
};

app.post('/foo', skeemas.bodyParser(fooSchema), function(req, res, next) {
    // If we get here then we know our req.body is valid according to 
    // the schema.
});
```

## Using References
Hard-coding schemas inline is rarely practical and you will usually want to add references for your schemas before generating middleware. In order to do that you will need to create a schema validator instance:

```js
var skeemas = require('skeemas'),
    skeemasBodyParser = require('skeemas-body-parser');

skeemas.use(skeemasBodyParser);

var validator = skeemas();

// Add a reference
validator.addRef('/foo', fooSchema);

// Validate against it
validator.validate(foo, '/foo').valid; // true|false

// Create middleware
app.post('/foo', skeemas.bodyParser('/foo'), newFooHandler);
```

## Invalid Bodies
In the event that an invalid `req.body` is found, a failed [jsend](http://labs.omniti.com/labs/jsend) response will be sent automatically (with statusCode 422) and your route handler will not be called.

Default 422 responses:
```js
{
    "status": "fail",
    "data": {
        "validation": [ "array of errors..." ]
    }
}
```

## Customizing Failure Responses
If you'd like to change the statusCode or format of the failure responses you can provide options when setting up your middleware:

```js
skeemas.bodyParser(schema, {
    failureCode: 400,
    failureResponse: function(result) {
        return {
            outcome: result.valid ? "boo ya" : "d'oh",
            errors: result.errors
        };
    }
});
```

## Schema Defaults
Skeemas will append your schema's default values when non-required object properties are missing in your post bodies. For example, if `foo` is not in your body it will be set to `'bar'` using this schema:

```json
{
    "type": "object",
    "properties": {
        "foo": {
            "default": "bar"
        }
    }
}
```

To disable setting of defaults, set the `addDefaults` option to `false`:

```js
skeemas.bodyParser(schema, { addDefaults: false });
```
