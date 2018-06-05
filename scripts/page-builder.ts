import * as fse from 'fs-extra';
import * as path from 'path';
import { Page, IConfig } from './page';
import * as glob from 'glob';
import * as ejs from 'ejs';
import * as marked from 'marked';

class Build {
	public page: Page;
	public renderData: { [key: string]: any };
	public source: string;
	public contents: string;
	public layout: string;
	private destPath: string;

	constructor(public pathname: string, public config: IConfig) {
		this.page = new Page(pathname, this.config);
		this.destPath = path.join(this.config.site.distPath, this.page.parsedPath.dir);
		this.renderData = { ...config, page: this.page, pages: Page.pages };
		this.loadSource();
		this.extractMeta();
	}
	private loadSource(): void {
		const fullPath = path.join(this.config.site.srcPath, 'pages', this.pathname);
		this.source = fse.readFileSync(fullPath, { encoding: 'utf8' });
	}
	private extractMeta(): void {
		const parts = this.source.split(this.config.site.metaSeparator);

		if (parts.length === 2) {
			this.page.storeMeta(parts[0]);
			this.source = parts[1];
		}
	}

	public build(): void {
		fse.mkdirsSync(this.destPath);

		this.buildContent();
		this.buildLayout();
		this.writeFile();
	}
	private buildContent(): void {
		switch (this.page.parsedPath.ext) {
			case '.ejs':
				this.contents = ejs.render(this.source, this.renderData, { filename: this.pathname });
				break;
			case '.md':
				this.contents = marked(this.source);
				break;
			default:
				this.contents = this.source;
				break;
		}
		delete this.source;
	}
	private buildLayout(): void {
		const fullPath = path.join(this.config.site.srcPath, 'layouts', this.page.layout + '.ejs');
		let source = fse.readFileSync(fullPath, { encoding: 'utf8' });

		const renderData = { ...this.renderData, contents: this.contents };

		this.layout = ejs.render(source, renderData, { filename: fullPath });

		delete this.contents;
	}
	private writeFile(): void {
		const destPathname = path.join(this.destPath, this.page.parsedPath.name + '.html');
		fse.writeFile(destPathname, this.layout);

		delete this.layout;
	}
}

function build(config: IConfig): void {
	const startTime = process.hrtime();

	// clear destination folder
	fse.emptyDirSync(config.site.distPath);

	// copy assets folder
	fse.copy(`${config.site.srcPath}/assets`, `${config.site.distPath}/assets`);

	// build the pages
	const pathnames = glob.sync('**/*.@(ejs|md|html)', { cwd: `${config.site.srcPath}/pages` });
	const builds = pathnames.map(pathname => new Build(pathname, config));
	builds.forEach(build => build.page.bindParent());
	builds.forEach(build => build.page.bindChildren());
	builds.forEach(build => build.build());

	// display build time
	const timeDiff = process.hrtime(startTime);
	const duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
	const round = (d: number) => Math.round(d * 10) / 10;
	console.log(`Site built succesfully in ${round(duration)} ms, ${round(duration / builds.length)} ms/page`);
}

export { build, IConfig }