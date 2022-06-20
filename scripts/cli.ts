#!/usr/bin/env node

import * as path from 'path';
import * as fse from 'fs-extra';
import { build, IConfig } from './page-builder';
import { ISiteConfig } from './interfaces';
import liveServer from 'live-server';
import * as chokidar from 'chokidar';
import { debounce } from 'lodash';

const args = process.argv.slice(2);

const configFileName = args.length > 0 && !args[0].startsWith('-') ? args[0] : 'site.config.js';

function getBoolArg(abbr: string, full: string): boolean {
	return args.includes('-' + abbr) || args.includes('--' + full);
}
function getIntArg(abbr: string, full: string, defaultValue: number): number {
	if (getBoolArg(abbr, full)) {
		let pos = args.indexOf('-' + abbr);
		if (pos === -1)
			pos = args.indexOf('--' + full);
		if (pos !== -1)
			return +args[pos + 1];
	}
	return defaultValue;
}

function watch(config: IConfig): void {
	chokidar.watch(config.site.srcPath).on(
		'all',
		debounce(() => {
			build(config);
			console.log('Waiting for changes...');
		}, 500)
	);
};

function serve(config: IConfig, port: number) {
	console.log(`Starting local server at http://localhost:${port}`);

	liveServer.start({
		port: port,
		root: config.site.distPath,
		open: false,
		logLevel: 0
	});
}

if (getBoolArg('h', 'help'))
	console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'site-config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  
  -h, --help      Display this help text
`);
else {
	// load config file
	const configFile = path.resolve(configFileName);
	if (!fse.existsSync(configFile))
		throw `The configuration file "${configFile}" is missing`;

	let config: IConfig = require(configFile);

	const defaultSiteConfig: ISiteConfig = {
		rootUrl: '/',
		metaSeparator: '!!!',
		fileOutputMode: 'files',
		outputExtension: '.html',
		indexPageName: 'index',
		defaultLayout: 'default'
	};
	config.site = { ...defaultSiteConfig, ...config.site };


	if (getBoolArg('w', 'watch')) {
		watch(config);
	} else if (getBoolArg('s', 'serve')) {
		const port = getIntArg('p', 'port', 3000);
		serve(config, port);
	} else {
		build(config);
	}
}