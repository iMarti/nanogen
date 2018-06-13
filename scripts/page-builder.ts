import * as fse from 'fs-extra';
import * as path from 'path';
import * as urljoin from 'url-join';
import { Page, IConfig } from './page';
import * as glob from 'glob';
import * as ejs from 'ejs';
import * as marked from 'marked';

class Build {
	public page: Page;
	public renderData: { [key: string]: any };
	public parts: { [partId: string]: string } = {};
	public contents: { [partId: string]: string } = {};
	public layout: string;
	private destPath: string;

	constructor(public pathname: string, public config: IConfig) {
		this.page = new Page(pathname, this.config);
		this.destPath = path.join(this.config.site.distPath, this.page.parsedPath.dir);
		this.renderData = { ...config, page: this.page, pages: Page.pages };
		const source = this.loadSource();
		this.splitParts(source);
	}
	private loadSource(): string {
		const fullPath = path.join(this.config.site.srcPath, 'pages', this.pathname);
		return fse.readFileSync(fullPath, { encoding: 'utf8' });
	}
	private splitParts(source: string): void {
		const pattern = '^' + this.config.site.metaSeparator + '([a-zA-Z_$][0-9a-zA-Z_$]*)?$';
		const reSeparator = new RegExp(pattern, 'gm');

		// Before the first separator we can find optional meta information or the body part
		let match = reSeparator.exec(source);
		if (match !== null && match.index > 0) {
			const firstPart = source.substr(0, match.index).trim();
			if (firstPart.length > 0) {
				if (firstPart[0] === '{')
					this.page.storeMeta(firstPart);
				else
					this.parts.body = firstPart;
			}
		}

		if (match === null) // No separator at all means the whole content is the page body
			this.parts.body = source;
		else {
			while (match !== null) {
				let partId = match[1] || 'body';

				// The content between previous separator and the next (or end of file) is the next part
				const start = reSeparator.lastIndex;
				match = reSeparator.exec(source);
				const end = match ? match.index : undefined;

				const part = source.substring(start, end).trim();
				this.parts[partId] = part;
			}
		}
	}

	public build(): void {
		fse.mkdirsSync(this.destPath);

		this.buildContents();
		this.buildLayout();
		this.writeFile();
	}
	private buildContents(): void{
		for (let partId in this.parts) {
			this.contents[partId] = this.buildContent(this.parts[partId]);
		}
		delete this.parts;
	}
	private buildContent(partSource: string): string {
		switch (this.page.parsedPath.ext) {
			case '.ejs':
				return ejs.render(partSource, this.renderData, { filename: this.pathname });
			case '.md':
				return marked(partSource);
			default:
				return partSource;
		}
	}
	private buildLayout(): void {
		// The page layout is defined by order of priority on the page, its parent or on the site level.
		const layout =
			this.page.layout ||
			(this.page.parent ? this.page.parent.childLayout : undefined) ||
			this.config.site.defaultLayout;

		const fullPath = path.join(this.config.site.srcPath, 'layouts', layout + '.ejs');
		let source = fse.readFileSync(fullPath, { encoding: 'utf8' });

		const renderData = { ...this.renderData, contents: this.contents };

		this.layout = ejs.render(source, renderData, { filename: fullPath });

		delete this.contents;
	}
	private writeFile(): void {
		const destPathname = path.join(this.destPath, this.page.parsedPath.name + this.config.site.outputExtension);
		fse.writeFileSync(destPathname, this.layout);

		delete this.layout;
	}
}

function buildSitemap(config: IConfig, builds: Build[]): void {
	const tags = builds.map(build => {
		const url = urljoin(config.sitemap.domain, build.page.url);
		const escaped = url
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
		const tag = `<url>
	<loc>${escaped}</loc> 
</url>`;
		return tag;
	});

	const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tags.join('\n')}
</urlset>`;

	const destPathname = path.join(config.site.distPath, 'sitemap.xml');
	fse.writeFileSync(destPathname, content);
}

function build(config: IConfig): void {
	const startTime = process.hrtime();

	Page.pages = { all: [] };

	// clear destination folder
	fse.emptyDirSync(config.site.distPath);

	// copy assets folder
	fse.copySync(`${config.site.srcPath}/assets`, config.site.distPath);

	// build the pages
	const pathnames = glob.sync('**/*.@(ejs|md|html)', { cwd: `${config.site.srcPath}/pages` });
	const builds = pathnames.map(pathname => new Build(pathname, config));
	builds.forEach(build => build.page.bindParent());
	builds.forEach(build => build.page.bindChildren());
	builds.forEach(build => build.build());

	// build the sitemap
	if (config.sitemap)
		buildSitemap(config, builds);

	// display build time
	const timeDiff = process.hrtime(startTime);
	const duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
	const round = (d: number) => Math.round(d * 10) / 10;
	console.log(`${new Date().toLocaleString()} Succesfully built ${builds.length} pages in ${round(duration)} ms, ${round(duration / builds.length)} ms/page`);
}

export { build, IConfig }