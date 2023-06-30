exports.id = 'google';
exports.name = 'Google';
exports.author = 'John Doe';
exports.icon = 'fab fa-google';
exports.version = '1.0.0';
exports.summary = 'OAuth 2.0 for Google';

exports.readme = `
- A callback endpoint \`{0}/oauth/google/\``;

exports.configuration = [];
exports.configuration.push({ name: 'id', text: 'Client ID', type: 'string', required: true, placeholder: 'Application identifer' });
exports.configuration.push({ name: 'secret', text: 'Client Secret', type: 'string', required: true, placeholder: 'A secret key' });

exports.config = {};

exports.make = function() {

	var obj = {};

	obj.login = function(controller, session) {
		var options = {};
		options.client_id = exports.config.id;
		options.redirect_uri = session.redirecturl;
		options.state = session.id;
		options.access_type = 'offline';
		options.response_type= 'code';
		options.include_granted_scopes = true;
		options.scope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'].join(' ');
		controller.redirect('https://accounts.google.com/o/oauth2/v2/auth' + QUERIFY(options));
	};

	obj.callback = function(controller, session, callback) {

		var code = controller.query.code;

		if (!code) {
			callback('Invalid code');
			return;
		}

		var data = {};
		data.code = code;
		data.grant_type = 'authorization_code';
		data.redirect_uri = session.redirecturl;
		data.client_id = exports.config.id;
		data.client_secret = exports.config.secret;

		RESTBuilder.make(function(builder) {

			builder.method('POST');
			builder.url('https://oauth2.googleapis.com/token');
			builder.header('Content-Type', 'application/x-www-form-urlencoded');
			builder.urlencoded(data);

			builder.callback(function(err, response, full) {
				if (response.access_token) {
					RESTBuilder.make(function(builder2) {

						builder2.method('GET');
						builder2.url('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + response.access_token);
						builder2.auth('Bearer ' + response.id_token);

						builder2.callback(function(err, profile, output) {
							if (output.status === 200) {
								var model = {};
								model.id = profile.id.toString();
								model.nick = profile.name || '';
								model.name = profile.name || '';
								model.firstname = profile.given_name || '';
								model.lastname = profile.family_name || '';
								model.email = profile.email || '';
								model.gender = '';
								model.response = profile;
								model.photo = profile.picture || '';
								model.access_token = response.access_token;
								model.expire = NOW.add(response.expires_in + ' seconds');
								callback(null, model);
							} else
								callback(response.error ? response.error.message : err.message);
						});
					});
				} else
					callback(response.error ? response.error.message : err.message);
			});

		});

	};

	MAIN.oauth.google = obj;

};

exports.uninstall = function() {
	delete MAIN.oauth.google;
};