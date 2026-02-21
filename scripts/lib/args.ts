/**
 * Command-line argument parsing utilities
 */

export const getBoolArg = (argv: readonly string[], abbr: string, full: string): boolean =>
	argv.includes(`-${abbr}`) || argv.includes(`--${full}`);

export const getIntArg = (argv: readonly string[], abbr: string, full: string, defaultValue: number): number => {
	const abbrIndex = argv.indexOf(`-${abbr}`);
	const fullIndex = argv.indexOf(`--${full}`);
	const pos = abbrIndex !== -1 ? abbrIndex : fullIndex;
	return pos !== -1 && pos + 1 < argv.length ? +argv[pos + 1] : defaultValue;
};

export const pickConfigFile = (argv: readonly string[]): string => 
	argv.find(arg => !arg.startsWith('-')) ?? 'nanogen.config.js';

export const createLogger = (verbose: boolean) => 
	verbose ? console.log : () => { };

export const printHelp = (): void => {
	console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'nanogen.config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  -c, --clean     Clear output directory before building
  -h, --help      Display this help text
  -s, --serve     Start local server to serve the generated files
  -v, --verbose   Enable verbose logging
`);
};
