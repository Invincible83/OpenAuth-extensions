exports.id = 'discord';
exports.name = 'Discord';
exports.author = 'John Doe';
exports.icon = 'fab fa-discord';
exports.version = '1.0.0';
exports.summary = 'OAuth 2.0 for Discord';

exports.readme = `
- A callback endpoint \`{0}/oauth/discord/\``;

exports.configuration = [];
exports.configuration.push({ name: 'id', text: 'Client ID', type: 'string', required: true, placeholder: 'Application identifer' });
exports.configuration.push({ name: 'secret', text: 'Client Secret', type: 'string', required: true, placeholder: 'A secret key' });

exports.config = {};

exports.make = function() {

	var obj = {};

	obj.login = function(controller, session) {
		controller.redirect('https://discord.com/api/oauth2/authorize?client_id={0}&redirect_uri={1}&scope=identify+email&response_type=code&state={2}'.format(exports.config.id, encodeURIComponent(session.redirecturl), session.id));
	};

	obj.callback = function(controller, session, callback) {

		var code = controller.query.code;

		if (!code) {
			callback('Invalid code');
			return;
		}

		var data = {};
		data.client_id = exports.config.id;
		data.client_secret = exports.config.secret;
		data.grant_type = 'authorization_code';
		data.code = code;
		data.redirect_uri = session.redirecturl;
		data.scope = ['identify', 'email'].join(' '),

		RESTBuilder.make(function(builder) {

			builder.method('POST');
			builder.url('https://discordapp.com/api/oauth2/token');
			builder.header('Content-Type', 'application/x-www-form-urlencoded');
			builder.urlencoded(data);
	
			builder.callback(function(err, response) {
				if (response.access_token) {
					RESTBuilder.make(function(builder2) {
						builder2.method('GET');
						builder2.url('https://discord.com/api/users/@me');
						builder2.auth('Bearer ' + response.access_token);

						builder2.callback(function(err, profile, output) {
							if (output.status === 200) {
								var model = {};
								model.id = '' + profile.id;
								model.nick = profile.username;
								model.name = profile.global_name;
								model.firstname = '';
								model.lastname = '';
								model.email = profile.email || '';
								model.gender = '';
								model.response = profile;
								model.photo = 'https://cdn.discordapp.com/avatars/{0}/{1}.jpg'.format(profile.id, profile.avatar);
								model.access_token = response.access_token;
								model.expire = NOW.add(response.expires_in + ' seconds');
								callback(null, model);
							} else
								callback(profile.error ? profile.error : err.message );
						});
					});
				} else
					callback(response.error ? response.error : err.message);
			});
		});

	};

	MAIN.oauth.discord = obj;

};

exports.uninstall = function() {
	delete MAIN.oauth.discord;
};