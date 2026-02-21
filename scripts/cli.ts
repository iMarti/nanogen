#!/usr/bin/env node

import * as path from 'path';
import fse from 'fs-extra';
import { build } from './page-builder.js';
import type { IConfig, IPage, ISiteConfig, IPageMeta, ISitemapConfig } from './interfaces.js';
import { getBoolArg, getIntArg, pickConfigFile, createLogger, printHelp } from './lib/args.js';
import { watch } from './lib/watch.js';
import { serve } from './lib/server.js';
import { defaultSiteConfig, loadConfig } from './lib/config.js';

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

    const shouldWatch = getBoolArg(argv, 'w', 'watch');
    const shouldServe = getBoolArg(argv, 's', 'serve');

    // Initial build
    build(config);

    let reloadVersion = 0;

    // Start watch mode if requested
    if (shouldWatch) {
        watch(config, () => {
            reloadVersion += 1;
        });
    }

    // Start server if requested
    if (shouldServe) {
        const port = getIntArg(argv, 'p', 'port', 3000);
        serve(config, port, () => reloadVersion);
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