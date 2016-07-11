var bodyParser = require('body-parser').json();

module.exports = function(protoValidator) {
	protoValidator.bodyParser = function(schema, options) {
		if(!schema) throw new Error('skeemas.bodyParser called without schema');

		options = options || {};

		var validator = this,
			addDefaults = typeof options.addDefaults === 'boolean' ? options.addDefaults : true,
			failureCode = options.failureCode || 422,
			failureResponse = options.failureResponse || function(result) {
				return {
					status: 'fail',
					data: {
						validation: result.errors
					}
				};
			};

		return [bodyParser, function(req, res, next) {
			var result = validator.validate(req.body, schema, { cleanWithDefaults:addDefaults });

			if(!result.valid) return res.status(failureCode).json(failureResponse(result));

			req.body = result.cleanInstance;

			next();
		}];
	};
};
