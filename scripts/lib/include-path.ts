import fse from 'fs-extra';
import * as path from 'path';

const DEFAULT_INCLUDE_EXTENSIONS = ['', '.ejs', '.html', '.md', '.js'];

function resolvePath(baseDir: string, srcRoot: string, includeTarget: string): string {
	if (includeTarget.startsWith('/') || includeTarget.startsWith('\\')) {
		return path.join(srcRoot, includeTarget.replace(/^[/\\]+/, ''));
	}

	return path.resolve(baseDir, includeTarget);
}

export function resolveIncludePath(baseDir: string, srcRoot: string, includePath: string): string {
	for (const ext of DEFAULT_INCLUDE_EXTENSIONS) {
		const candidate = resolvePath(baseDir, srcRoot, includePath + ext);
		if (fse.existsSync(candidate)) {
			return candidate;
		}
	}

	return resolvePath(baseDir, srcRoot, includePath);
}