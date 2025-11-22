(function() {
	const cluster = require('cluster');
	const path = require('path');
	const { loadConfig } = require('./src/config');

	const workers = {};

	const config = loadConfig(`${process.env.HOME}/.config/console-iptv.json`) ||
		loadConfig(path.join(__dirname, './config.json'));

	const tasks = [ 'm3u8', 'mpv', 'xmltv', 'ui' ];
	if (cluster.isMaster) {
		process.title = 'Console IPTV';

		for (let task of tasks) {
			const worker = cluster.fork();
			workers[task] = worker;

			worker.on('message', (msg) => {
				for (let t in workers) {
					if (workers[t]) {
						workers[t].send(msg, (e) => {});
					}
				}
				if (msg.type === 'quit') {
					for (let i in workers) {
						// need to kill the xmltv worker to break parsing
						if (i === 'xmltv') workers[i].process.kill();
						workers[i] = null;
					}
				}
			});
		// }

		// assign the workers to the tasks
		// for (let task of tasks) {
			workers[task].send({ task });
		}
	} else {
		const handleMsg = (msg) => {
			if (msg.task) {
				process.off('message', handleMsg);
				process.title = `[console-iptv/${msg.task}]`;
				const p = require(`./src/${msg.task}.js`);
				p.run(config);
			}
		};

		process.on('message', handleMsg);
	}
})();
