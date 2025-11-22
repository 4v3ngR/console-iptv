(function() {
	const mpv = require('node-mpv-2');
	let mpvPlayer = null; //new mpv();

	const load = async (entry, title) => {
		const parts = entry.split('|');
		const url = parts.shift();
		const headers = [];
		for (let part of parts) {
			const [ key, value ] = part.split('=');
			headers.push(`${key.toLowerCase()}: ${value.replace(/^"+|"+$/g,'')}`);
		}
		const option = `--http-header-fields=${headers}`;

		try {
			await mpvPlayer.start();
		} catch (ex) {}

		try {
			await mpvPlayer.commandJSON({
				"command": [
					"set_property",
					"http-header-fields",
					headers
				]
			});
			await mpvPlayer.load(url);
			await mpvPlayer.commandJSON({
				"command": [
					"set_property",
					"geometry",
					'712x400'
				]
			});
			await mpvPlayer.play();

			// TODO: work out why this doesn't change the window title (kwin)
			await mpvPlayer.commandJSON({
				"command": [
					"set_property",
					"title",
					title
				]
			});
			// interrupting a load can cause an exception, let's just catch
			// and ignore everything
		} catch (ex) {}
	}

	const initPlayer = async () => {
		mpvPlayer = new mpv({}, [ '--title="Console IPTV"' ]);
		mpvPlayer.on('started', function() {
			process.send({
				type: 'mpv_state_change',
				state: 'playing'
			});
		});

		mpvPlayer.on('quit', function() {
			initPlayer();
			process.send({
				type: 'mpv_state_change',
				state: 'stopped'
			});
		});

	}

	const run = async (config) => {
		await initPlayer();
		process.on('message', async (msg) => {
			switch (msg.type) {
				case 'quit':
					try {
						await mpvPlayer.quit();
					} catch (ex) {}
					process.exit(0);
					break;
				case 'start_playback':
					if (msg.url) load(msg.url, msg.title);
					else console.error('no url in', msg);
					break;
				case 'stop_playback':
					break;
			}
		});
	}

	exports = module.exports = { run };
})();
