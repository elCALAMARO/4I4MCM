var assert = require('chai').assert,
	skeemas = require('skeemas'),
	skeemasBodyParser = require('../');

function response(res) {
	return {
		status: function(status) {
			if(res) res.status = status;
			return this;
		},
		json: function(json) {
			if(res) res.json = json;
			return this;
		}
	};
}

function noop() {}

describe('skeemas-body-parser plugin', function() {
	skeemas.use(skeemasBodyParser);

	it('should attach to validator instance', function() {
		var validator = skeemas();
		assert.isFunction(validator.bodyParser);
	});

	it('should error if called without schema', function() {
		var validator = skeemas();
		assert.throws(function() {
			validator.bodyParser();
		});
	});

	it('should return array of middleware', function() {
		var validator = skeemas(),
			middleware = validator.bodyParser({});
		assert.isArray(middleware);
		assert.lengthOf(middleware, 2);
	});

	describe('middleware', function() {
		var validator = skeemas();

		it('should call continuation function when body is valid', function() {
			var middleware = validator.bodyParser({ type:'integer' })[1],
				called = false;

			middleware({
				body: 1337
			}, {}, function() {
				called = true;
			});

			assert.isTrue(called);
		});

		it('should not call continuation function when body is invalid', function() {
			var middleware = validator.bodyParser({ type:'integer' })[1],
				called = false;

			middleware({
				body: 42.1337
			}, response(), function() {
				called = true;
			});

			assert.isFalse(called);
		});

		it('should pass the request body through when valid', function() {
			var middleware = validator.bodyParser({})[1],
				req = { body:1337 },
				res = {};

			middleware(req, response(res), noop);

			assert.strictEqual(req.body, 1337);
		});

		it('should clean the request body when valid', function() {
			var middleware = validator.bodyParser({
					properties: {
						foo: { type:'string' },
						boo: {},
						nested: {
							properties: {
								stuff: {
									type: 'array',
									items: { type:'integer' }
								}
							}
						}
					}
				})[1],
				req = {
					body : {
						foo: 'bar',
						nested: {
							stuff: [1, 2, 3],
							ignoreMe: 'undeclared property'
						}
					}
				},
				res = {};

			middleware(req, response(res), noop);

			assert.deepEqual(req.body, {
				foo: 'bar',
				nested: {
					stuff: [1, 2, 3]
				}
			});
		});

		it('should add defaults', function() {
			var middleware = validator.bodyParser({
					properties: {
						foo: { type:'string' },
						boo: { default:'far' },
					}
				})[1],
				req = {
					body : {}
				},
				res = {};

			middleware(req, response(res), noop);

			assert.deepEqual(req.body, {
				boo: 'far'
			});
		});

		it('should not add defaults with addDefaults:false', function() {
			var middleware = validator.bodyParser({
					properties: {
						foo: { type:'string' },
						boo: { default:'far' },
					}
				}, { addDefaults:false })[1],
				req = {
					body : {}
				},
				res = {};

			middleware(req, response(res), noop);

			assert.deepEqual(req.body, {});
		});
	});
});
