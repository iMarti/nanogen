#!/usr/bin/env node

import * as path from 'path';
import fse from 'fs-extra';
import { build, IConfig } from './page-builder.js';
import { ISiteConfig } from './interfaces.js';
import liveServer from 'live-server';
import * as chokidar from 'chokidar';
import lodash from 'lodash';

/**
 * Parsed command-line arguments
 */
const args = process.argv.slice(2);

/**
 * Determine the config file name from arguments
 */
const configFileName = args.find(arg => !arg.startsWith('-')) ?? 'site.config.js';

/**
 * Check if a boolean flag is present
 * @param abbr Short flag (e.g., 'h')
 * @param full Long flag (e.g., 'help')
 * @returns True if flag is present
 */
const getBoolArg = (abbr: string, full: string): boolean =>
	args.includes(`-${abbr}`) || args.includes(`--${full}`);

/**
 * Get an integer argument value
 * @param abbr Short flag
 * @param full Long flag
 * @param defaultValue Default value if not found
 * @returns The parsed integer value
 */
const getIntArg = (abbr: string, full: string, defaultValue: number): number => {
	const abbrIndex = args.indexOf(`-${abbr}`);
	const fullIndex = args.indexOf(`--${full}`);
	const pos = abbrIndex !== -1 ? abbrIndex : fullIndex;
	return pos !== -1 && pos + 1 < args.length ? +args[pos + 1] : defaultValue;
};

/**
 * Start watching for file changes and rebuild automatically
 * @param config Site configuration
 */
const watch = (config: IConfig): void => {
	chokidar.watch(config.site.srcPath).on(
		'all',
		lodash.debounce(() => {
			build(config);
			console.log('Waiting for changes...');
		}, 500)
	);
};

/**
 * Start a local development server
 * @param config Site configuration
 * @param port Port number to listen on
 */
const serve = (config: IConfig, port: number): void => {
	console.log(`Starting local server at http://localhost:${port}`);
	liveServer.start({
		port,
		root: config.site.distPath,
		open: false,
		logLevel: 0
	});
};

/**
 * Default site configuration values
 */
const defaultSiteConfig: ISiteConfig = {
	rootUrl: '/',
	metaSeparator: '!!!',
	fileOutputMode: 'files',
	outputExtension: '.html',
	indexPageName: 'index',
	defaultLayout: 'default'
} satisfies ISiteConfig;

if (getBoolArg('h', 'help')) {
	console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'site.config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  -h, --help      Display this help text
`);
} else {
	// load config file
	const configFile = path.resolve(configFileName);
	if (!fse.existsSync(configFile)) {
		throw new Error(`The configuration file "${configFile}" is missing`);
	}

	const config: IConfig = (await import(configFile)).default;

	// Merge with defaults
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