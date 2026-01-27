export interface IPageMeta {
	id?: string;
	title?: string;
	menuTitle?: string;
	description?: string;
	layout?: string;
	childLayout?: string;
	publish?: boolean;
	externalLink?: boolean;
	url?: string;
}

export interface ISiteConfig {
	srcPath?: string;
	distPath?: string;
	rootUrl?: string;
	metaSeparator?: string;
	fileOutputMode?: 'files' | 'folders';
	outputExtension?: string;
	indexPageName?: string;
	defaultLayout?: string;
}

export interface ISitemapConfig {
	domain: string;
}

export interface IConfig {
	pageMetaDefault: IPageMeta;
	site: ISiteConfig;
	sitemap?: ISitemapConfig;
}

export interface IPage extends IPageMeta {
	parent: IPage;
	children: IPage[];
	siblings: IPage[];
	ancestors: IPage[];
	url: string;
	isPublished(): boolean;
}

export declare class Page implements IPage {
	static pages: {
		all: Page[];
		[key: string]: Page | Page[];
	};

	id?: string;
	title: string;
	menuTitle: string;
	description?: string;
	layout?: string;
	childLayout?: string;
	publish?: boolean;
	isIndex: boolean;
	parent: IPage;
	children: IPage[];
	siblings: IPage[];
	ancestors: IPage[];
	parsedPath: import('path').ParsedPath;
	url: string;
	externalLink: boolean;

	constructor(pathname: string, config: IConfig);
	bindParent(): void;
	bindChildren(): void;
	isAncestor(other: Page): boolean;
	storeById(): void;
	applyMeta(meta: IPageMeta): void;
	isPublished(): boolean;
	toString(): string;
}

export declare const defaultSiteConfig: ISiteConfig;
export declare function build(config: IConfig): void;
export declare function watch(config: IConfig): void;
export declare function serve(config: IConfig, port: number): void;
export declare function runNanogen(argv?: string[]): Promise<void>;
