/* eslint-env node */
const { createDefaultConfig } = require('@open-wc/testing-karma');
const merge = require('deepmerge');

const customLaunchers = {
	chrome: {
		base: 'SauceLabs',
		browserName: 'chrome',
		platform: 'OS X 10.13',
	},
	firefox: {
		base: 'SauceLabs',
		browserName: 'firefox',
		platform: 'OS X 10.13'
	},
	safari: {
		base: 'SauceLabs',
		browserName: 'safari',
		platform: 'OS X 10.13'
	},
	edge: {
		base: 'SauceLabs',
		browserName: 'microsoftedge',
		platform: 'Windows 10'
	}
};

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
			sauceLabs: {
				testName: 'Unit Tests',
				idleTimeout: 300 // 5 minutes
			},
			customLaunchers: customLaunchers,
			browsers: Object.keys(customLaunchers),
			reporters: ['dots', 'saucelabs'],
			singleRun: true,
			client: {
				mocha: {
					timeout: 20000 // 20 seconds
				}
			}
		}),
	);
	return config;
};
