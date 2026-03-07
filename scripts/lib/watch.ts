/**
 * File watching and automatic rebuild
 */

import { build } from '../page-builder.js';
import type { IBuildOptions, IConfig } from '../interfaces.js';
import * as chokidar from 'chokidar';
import lodash from 'lodash';

/**
 * Start watching for file changes and rebuild automatically
 * @param config Site configuration
 * @param onRebuild Optional callback invoked after each rebuild
 * @param buildOptions Optional build options reused for each rebuild
 */
export const watch = (config: IConfig, onRebuild?: () => void, buildOptions: IBuildOptions = {}): void => {
    console.log(`Watching ${config.site.srcPath} for changes...`);
    chokidar.watch(config.site.srcPath).on(
        'all',
        lodash.debounce(() => {
            build(config, buildOptions);
            onRebuild?.();
            console.log('Waiting for changes...');
        }, 500)
    );
};
