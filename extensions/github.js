exports.id = 'github';
exports.name = 'Github';
exports.author = 'John Doe';
exports.icon = 'fab fa-github';
exports.version = '1.0.0';
exports.summary = 'OAuth 2.0 for Github';

exports.readme = `
- A callback endpoint \`{0}/oauth/github/\``;

exports.configuration = [];
exports.configuration.push({ name: 'id', text: 'Client ID', type: 'string', required: true, placeholder: 'Application identifer' });
exports.configuration.push({ name: 'secret', text: 'Secret', type: 'string', required: true, placeholder: 'A secret key' });

exports.config = {};

exports.make = function() {

	var obj = {};

	obj.login = function(controller, session) {
		controller.redirect('https://github.com/login/oauth/authorize?client_id={0}&redirect_uri={1}&scope=user&state={2}'.format(exports.config.id, encodeURIComponent(session.redirecturl), session.id));
	};

	obj.callback = function(controller, session, callback) {

		var code = controller.query.code;

		if (!code) {
			callback('Invalid code');
			return;
		}

		RESTBuilder.GET('https://github.com/login/oauth/access_token?client_id={0}&redirect_uri={1}&client_secret={2}&code={3}'.format(exports.config.id, session.redirecturl, exports.config.secret, code)).exec(function(err, response) {
			if (response.access_token) {
				RESTBuilder.make(function(builder) {
					builder.method('GET');
					builder.url('https://api.github.com/user');
					builder.auth('Bearer ' + response.access_token);
					builder.callback(function(err, profile, output) {
						if (output.status === 200) {
							var model = {};
							model.id = profile.id.toString();
							model.nick = profile.login;
							model.name = profile.name;
							model.firstname = '';
							model.lastname = '';
							model.email = profile.email || '';
							model.gender = '';
							model.response = profile;
							model.photo = profile.avatar_url;
							model.access_token = response.access_token;
							model.expire = NOW.add('9 minutes');
							callback(null, model);
						} else
							callback(response.error ? response.error.message : err.message);
					});
				});
			} else
				callback(response.error ? response.error.message : err.message);
		});

	};

	MAIN.oauth.github = obj;

};

exports.uninstall = function() {
	delete MAIN.oauth.github;
};
