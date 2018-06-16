import * as path from 'path';
import * as urljoin from 'url-join';
import { IPage, IPageMeta, IConfig, ISiteConfig } from './interfaces';

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
	};

	public id?: string;
	public title: string;
	public menuTitle: string;
	public description?: string;
	public layout?: string;
	public publish?: boolean;
	public isIndex: boolean;

	public parent: IPage;
	public children: IPage[];
	public siblings: IPage[];
	public ancestors: IPage[];

	public parsedPath: path.ParsedPath;
	public url: string;

	constructor(pathname: string, config: IConfig) {
		this.parsedPath = path.parse(pathname);
		this.isIndex = this.parsedPath.name === config.site.indexPageName;

		this.url = this.buildUrl(config.site.rootUrl, config.site);

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
		return p.isIndex && (this.isIndex ?
			path.resolve(p.parsedPath.dir) === path.resolve(this.parsedPath.dir, '..') :
			!this.isIndex && p.parsedPath.dir === this.parsedPath.dir);
	}
	public isAncestor(other: Page): boolean {
		return other === this || this.ancestors.some(ancestor => ancestor === other);
	}

	public storeMeta(sMeta: string): void {
		const meta = JSON.parse(fixLooseJson(sMeta));
		this.applyMeta(meta);
	}
	public storeById(): void {
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

			// By default use the file name as title
			if (!this.title)
				this.title = this.isIndex ? path.basename(this.parsedPath.dir) : this.parsedPath.name;

				// By default the title is used for menu labels
			if (!this.menuTitle)
				this.menuTitle = this.title;
		}
	}
	public isPublished(): boolean {
		return this.publish !== false && // default is true
			(!this.parent || this.parent.isPublished());
	}

	private buildUrl(rootUrl: string, siteConfig: ISiteConfig): string {
		return this.isIndex ?
			urljoin(rootUrl, (this.parsedPath.dir ? this.parsedPath.dir : '') + '/') :
			urljoin(rootUrl, this.parsedPath.dir, this.parsedPath.name + siteConfig.outputExtension);
	}

	/** Generates a string representation of the page, mainly used for debug */
	public toString(): string{
		return JSON.stringify({
			id: this.id,
			title: this.title,
			url: this.url,
			parent: this.parent ? this.parent.title : null
		});
	}
}

export { Page, IConfig };