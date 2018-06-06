#!/usr/bin/env node
import * as path from 'path';
import * as fse from 'fs-extra';
import chalk from 'chalk';
import * as meow from 'meow';
import { build, IConfig } from './page-builder';
const liveServer = require('live-server');
const chokidar = require('chokidar');
const debounce = require('lodash.debounce');

const cli = meow(
	chalk`
    {underline Usage}
      $ nanogen [config-file] [...options]
      The config file parameter defaults to 'site-config.js' if not informed.
    {underline Options}
      -w, --watch     Start local server and watch for file changes
      -p, --port      Port to use for local server (default: 3000)
      
      -h, --help      Display this help text
      -v, --version   Display nanogen version
  `,
	{
		flags: {
			watch: {
				type: 'boolean',
				default: false,
				alias: 'w'
			},
			serve: {
				type: 'boolean',
				default: false,
				alias: 's'
			},
			port: {
				type: 'string',
				default: '3000',
				alias: 'p'
			},
			help: {
				type: 'boolean',
				alias: 'h'
			},
			version: {
				type: 'boolean',
				alias: 'v'
			}
		}
	}
);

// load config file
const configFile = path.resolve(cli.input.length > 0 ? cli.input[0] : 'site.config.js');
if (!fse.existsSync(configFile))
	throw `The configuration file "${configFile}" is missing`;

let config: IConfig = require(configFile);

function watch(options: IConfig): void {
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


if (cli.flags.watch) {
	watch(config);
} else if (cli.flags.serve) {
	serve(config, cli.flags.port);
} else {
	build(config);
}