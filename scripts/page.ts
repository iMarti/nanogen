import * as path from 'path';
import URI from 'urijs';
import { IPage, IPageMeta, IConfig, ISiteConfig } from './interfaces';

class Page implements IPage {
	static pages: {
		all: Page[];
		[key: string]: Page | Page[];
	} = { all: [] };

	public id?: string;
	public title!: string;
	public menuTitle!: string;
	public description?: string;
	public layout?: string;
	public publish?: boolean;
	public isIndex: boolean;

	public parent!: IPage;
	public children!: IPage[];
	public siblings!: IPage[];
	public ancestors!: IPage[];

	public parsedPath: path.ParsedPath;
	public url!: string;
	public externalLink: boolean = false;

	constructor(pathname: string, config: IConfig) {
		this.parsedPath = path.parse(pathname);
		this.isIndex = this.parsedPath.name === config.site.indexPageName;

		this.applyMeta(config.pageMetaDefault);

		if (!this.externalLink) {
			this.url = this.buildUrl(config.site);
		}

		Page.pages.all.push(this);
	}
	public bindParent(): void {
		this.parent = Page.pages.all.find(p => this.isParent(p))!;
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

	public storeById(): void {
		if (this.id) {
			if (this.id in Page.pages) {
				const other: Page = Page.pages[this.id] as Page;
				throw `Duplicate page ID "${this.id}" in ${this.parsedPath.dir}/${this.parsedPath.name}${this.parsedPath.ext} and ${other.parsedPath.dir}/${other.parsedPath.name}${other.parsedPath.ext}`;
			}
			Page.pages[this.id] = this;
		}
	}
	public applyMeta(meta: IPageMeta): void {
		if (meta !== null && typeof meta === 'object') {
			for (const key in meta) {
				if (meta[key as keyof IPageMeta] !== undefined) {
					(this as any)[key] = meta[key as keyof IPageMeta];
				}
			}

			// By default use the file name as title
			if (!this.title) {
				this.title = this.isIndex ? path.basename(this.parsedPath.dir) : this.parsedPath.name;
			}

			// By default the title is used for menu labels
			if (!this.menuTitle) {
				this.menuTitle = this.title;
			}
		}
	}
	public isPublished(): boolean {
		return this.publish !== false && // default is true
			(!this.parent || this.parent.isPublished());
	}

	private buildUrl(siteConfig: ISiteConfig): string {
		const relativeUrl = this.buildRelativeUrl(siteConfig);
		const url = (siteConfig.rootUrl == '/' && relativeUrl == '/') ? '/' : siteConfig.rootUrl + relativeUrl;
		return url;
	}
	private buildRelativeUrl(siteConfig: ISiteConfig): string {
		if (this.isIndex) {
			return (this.parsedPath.dir || '') + '/';
		}

		let url = this.parsedPath.name + (siteConfig.fileOutputMode === 'folders' ? '/' : siteConfig.outputExtension);
		if (this.parsedPath.dir) {
			url = URI(url).directory(this.parsedPath.dir).href();
		}

		return url;
	}

	/** Generates a string representation of the page, mainly used for debug */
	public toString(): string {
		return JSON.stringify({
			id: this.id,
			title: this.title,
			url: this.url,
			parent: this.parent?.title ?? null
		});
	}
}

export { Page, IConfig };