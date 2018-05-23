import * as path from 'path';
import { IPage, IPageMeta, IConfig } from './interfaces';

/** Adds quotes to JSON keys allowing non standard JSON to be parsed */
function fixLooseJson(looseJson: string): string {
	// https://stackoverflow.com/a/39050609/183386
	return looseJson
		// Replace ":" with "@colon@" if it's between double-quotes
		.replace(/:\s*"([^"]*)"/g, function (match, p1) {
			return ': "' + p1.replace(/:/g, '@colon@') + '"';
		})

		// Replace ":" with "@colon@" if it's between single-quotes
		.replace(/:\s*'([^']*)'/g, function (match, p1) {
			return ': "' + p1.replace(/:/g, '@colon@') + '"';
		})

		// Add double-quotes around any tokens before the remaining ":"
		.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?\s*:/g, '"$2": ')

		// Turn "@colon@" back into ":"
		.replace(/@colon@/g, ':');
}

class Page implements IPage {
	static pages: {
		all: Page[]
	} = { all: [] };

	public id?: string;
	public title: string;
	public description?: string;
	public layout?: string;

	public parent: IPage;
	public children: IPage[];
	public siblings: IPage[];
	public ancestors: IPage[];

	public parsedPath: path.ParsedPath;
	public url: string;

	constructor(pathname: string, config: IConfig) {
		this.parsedPath = path.parse(pathname);

		this.url = this.buildUrl(config.site.rootUrl);

		this.applyMeta(config.pageMetaDefault);

		Page.pages.all.push(this);
	}
	public bindParent(): void {
		this.parent = Page.pages.all.find(p => this.isParent(p));
	}
	public bindChildren(): void {
		this.children = Page.pages.all.filter(page => page.parent === this);

		this.children.forEach(child => child.siblings = this.children);

		if (!this.parent)
			this.siblings = [];

		this.getAncestors();
	}
	private getAncestors(): void {
		this.ancestors = [];
		let p = this.parent;
		while (p) {
			this.ancestors.unshift(p);
			p = p.parent;
		}
	}

	private isParent(p: Page): boolean {
		return p.parsedPath.name === 'index' && (this.parsedPath.name === 'index' ?
			path.resolve(p.parsedPath.dir) === path.resolve(this.parsedPath.dir, '..') :
			this.parsedPath.name !== 'index' && p.parsedPath.dir === this.parsedPath.dir);
	}

	public storeMeta(sMeta: string): void {
		const meta = JSON.parse(fixLooseJson(sMeta));
		this.applyMeta(meta);

		if (this.id) {
			if (this.id in Page.pages) {
				const other: Page = Page.pages[this.id];
				throw `Duplicate page ID "${this.id}" in ${this.parsedPath.dir}/${this.parsedPath.name}${this.parsedPath.ext} and ${other.parsedPath.dir}/${other.parsedPath.name}${other.parsedPath.ext}`;
			}
			Page.pages[this.id] = this;
		}
	}
	private applyMeta(meta: IPageMeta): void {
		if (meta !== null && typeof meta === 'object') {
			for (let key in meta) {
				if (meta[key] !== undefined)
					this[key] = meta[key];
			}
		}
	}

	private buildUrl(rootUrl: string): string {
		return this.parsedPath.name === 'index' ?
			rootUrl + (this.parsedPath.dir ? this.parsedPath.dir + '/' : '') :
			path.join(rootUrl + this.parsedPath.dir, this.parsedPath.name + '.html');
	}
}

export { Page, IConfig };