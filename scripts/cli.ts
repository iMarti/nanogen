#!/usr/bin/env node

import * as path from 'path';
import { pathToFileURL } from 'url';
import fse from 'fs-extra';
import { build } from './page-builder.js';
import type { IConfig, IPage, ISiteConfig, IPageMeta, ISitemapConfig } from './interfaces.js';
import * as http from 'http';
import handler from 'serve-handler';
import * as chokidar from 'chokidar';
import lodash from 'lodash';

/**
 * Parsed command-line arguments
 */
const getBoolArg = (argv: readonly string[], abbr: string, full: string): boolean =>
	argv.includes(`-${abbr}`) || argv.includes(`--${full}`);

const getIntArg = (argv: readonly string[], abbr: string, full: string, defaultValue: number): number => {
	const abbrIndex = argv.indexOf(`-${abbr}`);
	const fullIndex = argv.indexOf(`--${full}`);
	const pos = abbrIndex !== -1 ? abbrIndex : fullIndex;
	return pos !== -1 && pos + 1 < argv.length ? +argv[pos + 1] : defaultValue;
};

const pickConfigFile = (argv: readonly string[]): string => argv.find(arg => !arg.startsWith('-')) ?? 'nanogen.config.js';
const createLogger = (verbose: boolean) => verbose ? console.log : () => { };

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
	const server = http.createServer((req, res) =>
		handler(req, res, {
			public: config.site.distPath
		})
	);
	server.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`);
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

const loadConfig = async (configFile: string): Promise<IConfig> => {
	const module = await import(pathToFileURL(configFile).href);
	return module.default as IConfig;
};

const printHelp = (): void => {
	console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'nanogen.config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  -c, --clean     Clear output directory before building
  -h, --help      Display this help text
  -v, --verbose   Enable verbose logging
`);
};

const runNanogen = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
	const verbose = getBoolArg(argv, 'v', 'verbose');
	const log = createLogger(verbose);

	if (getBoolArg(argv, 'h', 'help')) {
		printHelp();
		return;
	}

	const configFileName = pickConfigFile(argv);
	const configFile = path.resolve(configFileName);
	log(`Using configuration file: ${configFileName} resolved to: ${configFile}`);

	if (!fse.existsSync(configFile)) {
		throw new Error(`The configuration file "${configFile}" is missing`);
	}

	const config = await loadConfig(configFile);
	const clean = getBoolArg(argv, 'c', 'clean');
	config.site = { ...defaultSiteConfig, ...config.site, clean };
	log('Site configuration:', config.site.srcPath, config.site.distPath, config.site.rootUrl);

	if (getBoolArg(argv, 'w', 'watch')) {
		watch(config);
	} else if (getBoolArg(argv, 's', 'serve')) {
		const port = getIntArg(argv, 'p', 'port', 3000);
		serve(config, port);
	} else {
		build(config);
	}
};

// Run CLI only if not imported as a module
// In ESM, check if this file is the main entry point
if (import.meta.url.startsWith('file://')) {
	const isCLI = process.argv[1]?.endsWith('nanogen.js') || 
	              process.argv[1]?.endsWith('nanogen');
	
	if (isCLI) {
		runNanogen().catch(err => {
			console.error(err);
			process.exitCode = 1;
		});
	}
}

export { build, watch, serve, defaultSiteConfig, runNanogen };
export { Page } from './page.js';
export type { IConfig, IPage, ISiteConfig, IPageMeta, ISitemapConfig };