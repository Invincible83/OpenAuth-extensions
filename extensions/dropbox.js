exports.id = 'dropbox';
exports.name = 'Dropbox';
exports.author = 'John Doe';
exports.icon = 'fab fa-dropbox';
exports.version = '1.0.0';
exports.summary = 'OAuth 2.0 for Dropbox';

exports.readme = `
- A callback endpoint \`{0}/oauth/dropbox/\``;

exports.configuration = [];
exports.configuration.push({ name: 'id', text: 'App key', type: 'string', required: true, placeholder: 'Application identifer' });
exports.configuration.push({ name: 'secret', text: 'App secret', type: 'string', required: true, placeholder: 'A secret key' });

exports.config = {};

exports.make = function() {

	var obj = {};

	obj.login = function(controller, session) {
		controller.redirect('https://www.dropbox.com/oauth2/authorize?client_id={0}&redirect_uri={1}&state={2}&response_type=code'.format(exports.config.id, encodeURIComponent(session.redirecturl), session.id));
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
			builder.url('https://api.dropboxapi.com/oauth2/token/');
			builder.urlencoded(data);

			builder.callback(function(err, response) {
				if (response.access_token) {
					RESTBuilder.make(function(builder2) {

						builder2.method('POST');
						builder2.url('https://api.dropboxapi.com/2/users/get_current_account/');
						builder2.auth('Bearer ' + response.access_token);

						builder2.callback(function(err, profile, output) {
							if (output.status === 200) {
								var model = {};
								model.id = profile.account_id.toString();
								model.nick = profile.name != null && profile.name.familiar_name != null ? profile.name.familiar_name : '';
								model.name = profile.name != null && profile.name.display_name != null ? profile.name.display_name : '';
								model.firstname = profile.name != null && profile.name.given_name != null ? profile.name.given_name : '';
								model.lastname = profile.name != null && profile.name.surname != null ? profile.name.surname : '';
								model.email = profile.email || '';
								model.gender = '';
								model.response = profile;
								model.photo = profile.profile_photo_url || '';
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

	MAIN.oauth.dropbox = obj;

};

exports.uninstall = function() {
	delete MAIN.oauth.dropbox;
};