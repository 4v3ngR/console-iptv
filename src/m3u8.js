(function() {
	const parser = require('iptv-parser');

	let m3u8Url = '';
	let groupFilter = false;
	let channelFilter = false;
	let excluded = false;

	const filter = (playlist) => {
		playlist.items = playlist.items.filter(item => {
			if (groupFilter) {
				const rgxp = new RegExp(groupFilter);
				for (let group of item.group) {
					if (rgxp.test(group)) return false;
				}
			}

			if (channelFilter) {
				const rgxp = new RegExp(channelFilter);
				if (rgxp.test(item.name)) return false;
			}

			if (excluded) {
				if (item.tvg?.id && Object.keys(excluded).includes(item.tvg.id)) {
					return false;
				}
			}

			return true;
		});

		return playlist;
	}

	const loadM3u8 = async (url, headers) => {
		if (url) {
			const resp = await fetch(url, { method: 'GET', headers });
			const txt = await resp.text();
			if (txt) {
				const playlist = parser.parsePlaylist(txt);
				if (playlist) {
					process.send({
						type: 'playlist_loaded',
						playlist: filter(playlist)
					});
				}
			}
		}
	}

	// TODO: add caching and automatic reload
	const init = (config) => {
		if (
			groupFilter === config.groupFilter &&
			channelFilter === config.channelFilter &&
			m3u8 === config.m3u8 &&
			excluded === config.excludedChannelIds
		) return;

		groupFilter = config.groupFilter;
		channelFilter = config.channelFilter;
		m3u8 = config.m3u8;
		excluded = config.excludedChannelIds;

		loadM3u8(m3u8, config.headers);
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

	exports = module.exports = { run };
})();
