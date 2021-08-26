'use strict';
const fallback = require('connect-history-api-fallback');
const log = require('connect-logger');

module.exports = {
	injectChanges: true,
	files: ['./public/*', './dist/*'],
	watchOptions: {
		ignored: 'node_modules',
	},
	server: {
		baseDir: './',
		middleware: [
			log({ format: '%date %status %method %url' }),
			fallback({
				index: './public/index.html',
				htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
			}),
		],
	},
};
