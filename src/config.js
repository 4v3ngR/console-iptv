(function() {
	const fs = require('fs');

	let config = {};
	let configFile = '';

	const loadConfig = (filename) => {
		let raw = '';

		try {
			raw = fs.readFileSync(filename, 'utf-8');
		} catch (ex) {}

		if (raw) try {
			config = JSON.parse(raw);
		} catch (ex) {
			config = {};
		}
		configFile = filename;
		return config;
	}

	const getConfig = () => config;

	const addExcludedChannelId = (id) => {
		if (!config.excludedChannelIds) {
			config.excludedChannelIds = [];
		}
		const ids = new Set([ ...config.excludedChannelIds, id ]);
		config.excludedChannelIds = [ ...ids ];
		if (configFile) try {
			fs.writeFileSync(configFile, JSON.stringify(config));
		} catch (ex) {
			// TODO: alert about the error
		}

		try {
			process.send({ type: 'config_changed', config });
		} catch (ex) {}
	}

  exports = module.exports = { loadConfig, getConfig, addExcludedChannelId };
})();
