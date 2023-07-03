exports.id = 'twitch';
exports.name = 'Twitch';
exports.author = 'John Doe';
exports.icon = 'fab fa-twitch';
exports.version = '1.0.0';
exports.summary = 'OAuth 2.0 for Twitch';

exports.readme = `
- A callback endpoint \`{0}/oauth/twitch/\``;

exports.configuration = [];
exports.configuration.push({ name: 'id', text: 'Client ID', type: 'string', required: true, placeholder: 'Application identifer' });
exports.configuration.push({ name: 'secret', text: 'Client Secret', type: 'string', required: true, placeholder: 'A secret key' });

exports.config = {};

exports.make = function() {

	var obj = {};

	obj.login = function(controller, session) {
		controller.redirect('https://id.twitch.tv/oauth2/authorize?client_id={0}&redirect_uri={1}&scope=user:read:email&response_type=code&state={2}'.format(exports.config.id, encodeURIComponent(session.redirecturl), session.id));
	};

	obj.callback = function(controller, session, callback) {

		var code = controller.query.code;

		if (!code) {
			callback('Invalid code');
			return;
		}

		RESTBuilder.POST('https://id.twitch.tv/oauth2/token', { client_id: exports.config.id, client_secret: exports.config.secret, redirect_uri: session.redirecturl, code: code, grant_type: 'authorization_code' }).exec(function(err, response) {
			if (response.access_token) {
				RESTBuilder.make(function(builder) {
					builder.method('GET');
					builder.url('https://api.twitch.tv/helix/users');
					builder.auth('Bearer ' + response.access_token);
					builder.header('Client-Id',  exports.config.id);

					builder.callback(function(err, profile, output) {
						if (output.status === 200 && profile && profile.data && profile.data.length) {

							profile = profile.data[0];

							var model = {};
							model.id = '' + profile.id;
							model.nick = profile.login;
							model.name = profile.display_name;
							model.firstname = '';
							model.lastname = '';
							model.email = profile.email || '';
							model.gender = '';
							model.response = profile;
							model.photo = profile.profile_image_url;
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

	};

	MAIN.oauth.twitch = obj;

};

exports.uninstall = function() {
	delete MAIN.oauth.twitch;
};