/**
 * File watching and automatic rebuild
 */

import { build } from '../page-builder.js';
import type { IConfig } from '../interfaces.js';
import * as chokidar from 'chokidar';
import lodash from 'lodash';

/**
 * Start watching for file changes and rebuild automatically
 * @param config Site configuration
 * @param onRebuild Optional callback invoked after each rebuild
 */
export const watch = (config: IConfig, onRebuild?: () => void): void => {
    console.log(`Watching ${config.site.srcPath} for changes...`);
    chokidar.watch(config.site.srcPath).on(
        'all',
        lodash.debounce(() => {
            build(config);
            onRebuild?.();
            console.log('Waiting for changes...');
        }, 500)
    );
};
