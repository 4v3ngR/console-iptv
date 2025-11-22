(function() {
	const blessed = require('blessed');
	const config = require('./config.js');

	const screen = blessed.screen({
		dockBorders: true,
		smartCSR: true
	});
	screen.title = 'Console-IPTV';

	let selectedEntry = null;
	let selectedIndex = null;

	screen.key('x', () => {
		if (selectedEntry) {
			const { tvg } = selectedEntry;
			const id = tvg?.id;
			if (id) config.addExcludedChannelId(id);
		}
	});

	screen.key(['C-c','q'], (ch, key) => {
		process.send({ type: 'quit' });
	});

	let playlist = null;
	let epg = null;
	let nowPlaying = '';

	let mainView = null;
	let loadingView = null;
	let channelView = null;
	let detailView = null;
	let statusView = null;

	const formatDate = (str) => {
		const date = new Date(str);
		let h = date.getHours();
		let m = date.getMinutes();
		let s = h < 12 ? 'am' : 'pm';
		h = h > 12 ? h - 12 : h;
		m = m < 10 ? `0${m}` : m;

		return `${h}:${m}${s}`;
	}

	const unescapeString = (str) => {
		return str.replace(/&amp;/g, '&');
	}

	const getEpgEntries = (id) => {
		const programs = this.epg.programs || [];

		let shows = [];
		let currTime = (new Date).toISOString();

		for (let program of programs) {
			if (id === program.channel) {
				if (currTime < program.stop) {
					shows.push({
						name: unescapeString(program.title[0]?.value || ''),
						start: formatDate(program.start),
						end: formatDate(program.stop),
						desc: unescapeString(program.desc[0]?.value || ''),
						tv: ''
					});
				}
			}
		}
		return shows;
	}

	const getEpgData = () => {
		const plItems = this.playlist?.items || [];

		const epgData = plItems.map(i => i.name);
		return epgData;
	}

	const renderEpg = () => {
		loadingView.hide();
		mainView.show();

		const epgData = getEpgData();

		channelView.setItems(epgData);
		if (selectedIndex > channelView.items.length) selectedIndex--;
		if (selectedIndex) channelView.select(selectedIndex);

		channelView.focus();
		screen.render();
	}

	const setDetails = (index) => {
		const entry = this.playlist?.items[index] || {};
		if (entry) {
			selectedEntry = entry;
			selectedIndex = index;

			const { name, tvg } = entry;
			if (!tvg) return;

			let shows = [];
			if (this.epg) shows = getEpgEntries(tvg.id);

			const group = entry.group[0] || '';
			let text = `${group} - ${name}\n`;
			for (let show of shows) {
				if (!show.start) break;
				text += `\n{bold}${show.start} - ${show.end}\n${show.name}{/}\n\n${show.desc || ''}\n`;
			}

			detailView.setContent(text);
			screen.render();
		}
	}

	const init = (config) => {
		mainView = blessed.box({
			parent: screen,
			left: 0,
			top: 0,
			width: '100%',
			height: '100%',
			border: { type: 'line' }
		});

		mainView.hide();

		loadingView = blessed.box({
			parent: screen,
			left: 'center',
			top: 'center',
			width: 14,
			height: 3,
			border: { type: 'line' },
			content: ' Loading...'
		});

		channelView = blessed.list({
			parent: mainView,
			top: 0,
			left: 0,
			width: 30,
			align: 'left',
			keys: true,
			mouse: true,
			style: {
				item: {
					hover: {
						bg: 'blue'
					}
				},
				selected: {
					bg: 'blue',
					bold: true
				}
			}
		});

		const line = blessed.line({
			parent: mainView,
			top: 0,
			left: 32,
			width: 1,
			height: '100%',
			orientation: 'vertical'
		});

		detailView = blessed.box({
			parent: mainView,
			align: 'left',
			left: 35,
			top: 0,
			right: 0,
			bottom: 1,
			scrollable: true,
			alwaysScroll: true,
			mouse: true,
			tags: true
		});

		statusView = blessed.box({
			parent: mainView,
			right: 0,
			bottom: 0,
			left: 35,
			height: 1,
			align: 'right',
			content: ''
		});

		channelView.on('select item', (item, index) => {
			setDetails(index);
		});

		channelView.on('select', (item, index) => {
			const entry = this.playlist?.items[index] || {};
			if (entry) {
				statusView.setContent('Loading...');
				screen.render();
				const { name, url } = entry;
				nowPlaying = name;
				process.send({
					type: 'start_playback',
					url,
					name
				});
			}
		});

		detailView.on('focus', () => {
			channelView.focus();
		});

		channelView.focus();
		screen.render();
	}

	const handleMpvStateChange = (state) => {
		switch (state) {
			case 'playing':
				statusView.setContent(`Now playing ${nowPlaying}`);
				break;
			case 'stopped':
				nowPlaying = '';
				statusView.setContent('');
				break;
		}
		screen.render();
	}

	const run = (config) => {
		process.on('message', (msg) => {
			const { type = false } = msg;

			switch (type) {
				case 'quit':
					process.exit(0);
					break;
				case 'playlist_loaded':
					this.playlist = msg.playlist;
					renderEpg();
					break;
				case 'epg_loaded':
					this.epg = msg.epg;
					setDetails(channelView.selected);
					break;
				case 'config_changed':
					break;
				case 'mpv_state_change':
					handleMpvStateChange(msg.state);
					break;
			}
		});
		init(config || {});
	}

	exports = module.exports = { run };
})();
