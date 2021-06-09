/* eslint-env node */
const { createDefaultConfig } = require('@open-wc/testing-karma');
const merge = require('deepmerge');

module.exports = config => {
	config.set(
		merge(createDefaultConfig(config), {
			// from https://support.saucelabs.com/hc/en-us/articles/225104707-Karma-Tests-Disconnect-Particularly-When-Running-Tests-on-Safari
			// to avoid DISCONNECTED messages
			browserDisconnectTimeout: 10000, // default 2000
			browserDisconnectTolerance: 1, // default 0
			browserNoActivityTimeout: 4 * 60 * 1000, //default 10000
			captureTimeout: 4 * 60 * 1000, //default 60000
			browserConsoleLogOptions: { level: 'log', format: '%b %T: %m', terminal: true },
			files: [
				// runs all files ending with .test in the test folder,
				// can be overwritten by passing a --grep flag. examples:
				//
				// npm run test -- --grep test/foo/bar.test.js
				// npm run test -- --grep test/bar/*
				{ pattern: config.grep ? config.grep : 'test/**/*.test.js', type: 'module' },
			],
			// see the karma-esm docs for all options
			esm: {
				// if you are using 'bare module imports' you will need this option
				nodeResolve: true,
			},
			client: {
				mocha: {
					timeout: 20000 // 20 seconds
				}
			}
		}),
	);
	return config;
};
