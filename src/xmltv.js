(function() {
	const parser = require('epg-parser');

	let xmltv = '';

	const loadXmlTV = async (url, headers) => {
		if (url) {
			const resp = await fetch(url, { method: 'GET', headers });
			const txt = await resp.text();

			if (txt) {
				const epg = parser.parse(txt);
				if (epg) {
					process.send({
						type: 'epg_loaded',
						epg
					});
				}
			}
		}
	}

	const init = (config) => {
		if (xmltv === config.xmltv) return;

		xmltv = config.xmltv;
		loadXmlTV(xmltv, config.headers);
	}

	const run = (config) => {
		process.on('message', (msg) => {
			const { type = false } = msg;

			switch (type) {
				case 'quit':
					process.exit(0);
					break;
				case 'config_changed':
					init(msg.config || {});
					break;
			}
		});

		init(config || {});
	}

	exports = module.exports = { run }
})();
