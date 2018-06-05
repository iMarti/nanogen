#!/usr/bin/env node
import * as path from 'path';
import * as fse from 'fs-extra';
import chalk from 'chalk';
import * as meow from 'meow';
import { build, IConfig } from './page-builder';

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

if (cli.flags.watch) {
	//build.serve(configData, cli.flags);
} else {
	build(config);
}