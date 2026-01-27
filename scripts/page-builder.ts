import fse from 'fs-extra';
import * as path from 'path';
import { Page, IConfig } from './page.js';
import * as glob from 'glob';
import * as ejs from 'ejs';
import { marked } from 'marked';
import lodash from 'lodash';
import json5 from 'json5';

/**
 * Represents a page build process
 */
class Build {
	public readonly page: Page;
	public readonly renderData: Record<string, unknown>;
	#parts: Record<string, string> = {};
	#contents: Record<string, string> = {};
	#layout!: string;
	#destPath: string;

	/**
	 * Create a new Build instance
	 * @param pathname Path to the page file
	 * @param config Site configuration
	 */
	constructor(public readonly pathname: string, public readonly config: IConfig) {
		this.page = new Page(pathname, this.config);
		this.#destPath = path.join(this.config.site.distPath, this.page.parsedPath.dir);
		this.renderData = { ...config, page: this.page, pages: Page.pages };
		const source = this.#loadSource();
		this.#splitParts(source);
	}
	#loadSource(): string {
		const fullPath = path.join(this.config.site.srcPath, 'pages', this.pathname);
		return fse.readFileSync(fullPath, { encoding: 'utf8' });
	}
	#splitParts(source: string): void {
		const pattern = `^${this.config.site.metaSeparator}([a-zA-Z_$][0-9a-zA-Z_$]*)?$`;
		const reSeparator = new RegExp(pattern, 'gm');

		// Before the first separator we can find optional meta information or the body part
		const match = reSeparator.exec(source);
		if (match !== null && match.index > 0) {
			const firstPart = source.substring(0, match.index).trim();
			if (firstPart.length > 0) {
				if (firstPart[0] === '{') {
					this.page.applyMeta(json5.parse(firstPart));
				} else {
					this.#parts.body = firstPart;
				}
			}
		}

		if (match === null) { // No separator at all means the whole content is the page body
			this.#parts.body = source;
		} else {
			let currentMatch = match;
			while (currentMatch !== null) {
				const partId = currentMatch[1] || 'body';

				// The content between previous separator and the next (or end of file) is the next part
				const start = reSeparator.lastIndex;
				const nextMatch = reSeparator.exec(source);
				const end = nextMatch ? nextMatch.index : undefined;

				const part = source.substring(start, end).trim();
				this.#parts[partId] = part;
				currentMatch = nextMatch;
			}
		}
	}

	/**
	 * Build the page
	 */
	public build(): void {
		if (this.page.externalLink) {
			return;
		}

		fse.mkdirsSync(this.#destPath);

		this.#buildContents();
		this.#buildLayout();
		this.#writeFile();
	}
	#buildContents(): void {
		for (const partId in this.#parts) {
			this.#contents[partId] = this.#buildContent(this.#parts[partId]);
		}
		// Clear parts after processing
		this.#parts = {};
	}
	#buildContent(partSource: string): string {
		switch (this.page.parsedPath.ext) {
			case '.ejs':
				// Pre-process includes in EJS content
				const templateDir = path.dirname(path.join(this.config.site.srcPath, 'pages', this.pathname));
				const processedSource = this.#preprocessEjsIncludes(partSource, templateDir);
				return ejs.render(processedSource, this.renderData, {
					filename: this.pathname
				});
			case '.md':
				return marked(partSource);
			default:
				return partSource;
		}
	}
	#preprocessEjsIncludes(source: string, baseDir: string): string {
		// Match <%- include('path') %> patterns
		const includeRegex = /<%-\s*include\(['"]([^'"]+)['"]\)\s*%>/g;
		
		return source.replace(includeRegex, (match, includePath) => {
			try {
				// Try different extensions like EJS does
				const extensions = ['', '.ejs', '.html', '.md', '.js'];
				let resolvedPath: string | null = null;
				
				for (const ext of extensions) {
					const candidate = path.resolve(baseDir, includePath + ext);
					if (fse.existsSync(candidate)) {
						resolvedPath = candidate;
						break;
					}
				}
				
				if (!resolvedPath) {
					resolvedPath = path.resolve(baseDir, includePath);
				}
				
				let content = fse.readFileSync(resolvedPath, 'utf8');
				
				// Process Markdown files
				if (resolvedPath.endsWith('.md')) {
					content = marked(content);
				}
				
				// Escape the content for safe inclusion in EJS
				return content.replace(/<%/g, '<%%').replace(/%>/g, '%%>');
			} catch (err) {
				throw new Error(`EJS include failed: "${includePath}" not found. Searched in: ${baseDir}`);
			}
		});
	}

	#buildLayout(): void {
		// The page layout is defined by order of priority on the page, its parent or on the site level.
		const layout = this.page.layout ?? this.page.parent?.childLayout ?? this.config.site.defaultLayout;

		const fullPath = path.join(this.config.site.srcPath, 'layouts', `${layout}.ejs`);
		let source = fse.readFileSync(fullPath, { encoding: 'utf8' });

		// Pre-process includes in layout
		const layoutsDir = path.join(this.config.site.srcPath, 'layouts');
		source = this.#preprocessEjsIncludes(source, layoutsDir);

		const renderData = { ...this.renderData, contents: this.#contents };

		this.#layout = ejs.render(source, renderData, {
			filename: fullPath
		});

		// Clear contents after processing
		this.#contents = {};
	}
	#writeFile(): void {
		let destPathname: string;

		if (this.config.site.fileOutputMode === 'folders' && !this.page.isIndex) {
			const folder = path.join(this.#destPath, this.page.parsedPath.name);
			fse.mkdirSync(folder);
			destPathname = path.join(folder, `${this.config.site.indexPageName}${this.config.site.outputExtension}`);
		} else {
			destPathname = path.join(this.#destPath, `${this.page.parsedPath.name}${this.config.site.outputExtension}`);
		}

		fse.writeFileSync(destPathname, this.#layout);
	}
}

function buildSitemap(config: IConfig, builds: readonly Build[]): void {
	const tags = builds.map(build => {
		const url = new URL(build.page.url, config.sitemap!.domain).href;
		const escaped = url
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
		return `<url>
	<loc>${escaped}</loc>
</url>`;
	});

	const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tags.join('\n')}
</urlset>`;

	const destPathname = path.join(config.site.distPath, 'sitemap.xml');
	fse.writeFileSync(destPathname, content);
}

/**
 * Build the entire site
 * @param config Site configuration
 */
function build(config: IConfig): void {
	const startTime = process.hrtime();

	Page.pages = { all: [] };

	// clear destination folder
	fse.emptyDirSync(config.site.distPath);

	// copy assets folder
	fse.copySync(`${config.site.srcPath}/assets`, config.site.distPath);

	// build the pages
	const pathnames = glob.sync('**/*.@(ejs|md|html)', { cwd: `${config.site.srcPath}/pages` });
	let builds = pathnames.map(pathname => new Build(pathname, config));
	builds.forEach(build => build.page.bindParent());
	builds = builds.filter(build => {
		const isPublished = build.page.isPublished();
		if (!isPublished) {
			lodash.remove(Page.pages.all, build.page);
		}
		return isPublished;
	});
	builds.forEach(build => build.page.storeById());
	builds.forEach(build => build.page.bindChildren());
	builds.forEach(build => build.build());

	// build the sitemap
	if (config.sitemap) {
		buildSitemap(config, builds);
	}

	// display build time
	const timeDiff = process.hrtime(startTime);
	const duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
	const round = (d: number) => Math.round(d * 10) / 10;
	console.log(`${new Date().toLocaleString()} Successfully built ${builds.length} pages in ${round(duration)} ms, ${round(duration / builds.length)} ms/page`);
}

export { build, IConfig }