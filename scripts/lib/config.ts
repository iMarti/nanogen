/**
 * Site configuration loading and defaults
 */

import { pathToFileURL } from 'url';
import type { IConfig, ISiteConfig } from '../interfaces.js';

/**
 * Default site configuration values
 */
export const defaultSiteConfig: ISiteConfig = {
	rootUrl: '/',
	metaSeparator: '!!!',
	fileOutputMode: 'files',
	outputExtension: '.html',
	indexPageName: 'index',
	defaultLayout: 'default'
} satisfies ISiteConfig;

/**
 * Load configuration from a file
 * @param configFile Path to the configuration file
 * @returns The loaded configuration
 */
export const loadConfig = async (configFile: string): Promise<IConfig> => {
	const module = await import(pathToFileURL(configFile).href);
	return module.default as IConfig;
};
