import fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';

interface IAssetUsage {
	allAssets: string[];
	usedAssets: Set<string>;
	unusedAssets: Set<string>;
}

function normalizeAssetPath(pathname: string): string {
	return pathname.split(path.sep).join('/');
}

export function getSourceAssetFiles(srcPath: string): string[] {
	const assetsPath = path.join(srcPath, 'assets');

	if (!fse.existsSync(assetsPath)) {
		return [];
	}

	return glob.sync('**/*', { cwd: assetsPath, nodir: true }).map(normalizeAssetPath);
}

function stripQueryAndHash(assetRef: string): string {
	return assetRef.replace(/[?#].*$/, '');
}

function isLocalAssetRef(assetRef: string): boolean {
	if (!assetRef) {
		return false;
	}

	const value = assetRef.trim().toLowerCase();
	if (!value || value.startsWith('#')) {
		return false;
	}

	return !(
		value.startsWith('http://') ||
		value.startsWith('https://') ||
		value.startsWith('//') ||
		value.startsWith('data:') ||
		value.startsWith('mailto:') ||
		value.startsWith('tel:') ||
		value.startsWith('javascript:')
	);
}

function extractAssetRefsFromHtml(content: string): string[] {
	const refs: string[] = [];
	const attrRegex = /\b(?:href|src)\s*=\s*(['"])(.*?)\1/gi;
	const srcsetRegex = /\bsrcset\s*=\s*(['"])(.*?)\1/gi;

	for (const match of content.matchAll(attrRegex)) {
		const ref = match[2]?.trim();
		if (ref) {
			refs.push(ref);
		}
	}

	for (const match of content.matchAll(srcsetRegex)) {
		const srcset = match[2]?.trim();
		if (!srcset) {
			continue;
		}

		for (const entry of srcset.split(',')) {
			const candidate = entry.trim().split(/\s+/)[0];
			if (candidate) {
				refs.push(candidate);
			}
		}
	}

	return refs;
}

function resolveAssetRefToSourcePath(assetRef: string, htmlOutputPath: string, distPath: string, sourceAssets: Set<string>): string | undefined {
	if (!isLocalAssetRef(assetRef)) {
		return undefined;
	}

	const cleanRef = stripQueryAndHash(assetRef.trim());
	if (!cleanRef) {
		return undefined;
	}

	const decodedRef = (() => {
		try {
			return decodeURI(cleanRef);
		} catch {
			return cleanRef;
		}
	})();

	const absolutePath = decodedRef.startsWith('/')
		? path.join(distPath, decodedRef)
		: path.resolve(path.dirname(htmlOutputPath), decodedRef);

	const relativePath = path.relative(distPath, absolutePath);
	if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		return undefined;
	}

	const normalized = normalizeAssetPath(relativePath);
	if (!sourceAssets.has(normalized)) {
		return undefined;
	}

	return normalized;
}

export function collectAssetUsage(distPath: string, pageOutputPaths: readonly string[], allAssets: readonly string[]): IAssetUsage {
	const sourceAssetSet = new Set(allAssets);
	const usedAssets = new Set<string>();

	for (const outputPath of pageOutputPaths) {
		if (!fse.existsSync(outputPath)) {
			continue;
		}

		const html = fse.readFileSync(outputPath, 'utf8');
		for (const assetRef of extractAssetRefsFromHtml(html)) {
			const assetPath = resolveAssetRefToSourcePath(assetRef, outputPath, distPath, sourceAssetSet);
			if (assetPath) {
				usedAssets.add(assetPath);
			}
		}
	}

	const unusedAssets = new Set(allAssets.filter(asset => !usedAssets.has(asset)));
	return {
		allAssets: [...allAssets],
		usedAssets,
		unusedAssets
	};
}

export function printAssetList(label: string, assets: Iterable<string>): void {
	const sorted = [...assets].sort((a, b) => a.localeCompare(b));
	console.log(`${label} (${sorted.length})`);
	if (sorted.length === 0) {
		console.log('  (none)');
		return;
	}

	for (const asset of sorted) {
		console.log(`  ${asset}`);
	}
}

export type { IAssetUsage };
