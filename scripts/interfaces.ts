interface IPageMeta {
	/** Optional identifier allowing to refer to a page with `Page.myIdentifier` */
	id?: string;
	title?: string;
	description?: string;
	/** Optional layout from the `/layouts/` folder for this page */
	layout?: string;
	/** Optional layout to apply to child pages if they don't set their own */
	childLayout?: string;
}
interface ISiteConfig {
	srcPath?: string;
	distPath?: string;
	/** Root URL where the published files will be placed, default is '/' */
	rootUrl?: string;
	/** string used in source files to separate meta properties from the page content, default is '!!!' */
	metaSeparator?: string;
	/** extension to generated HTML pages, default is '.html' */
	outputExtension?: string;
	/** name of the index page of each folder (without tits extension), default is 'index' */
	indexPageName?: string;
	/** name of the default layout from the `/layouts/` folder */
	defaultLayout?: string;
};
interface ISitemapConfig {
	/**
	 * The protocol + domain to be used to generate absolute URLs needed. Required.
	 * example: https://example.com */
	domain: string;
}
interface IConfig {
	pageMetaDefault: IPageMeta;
	site: ISiteConfig;
	sitemap?: ISitemapConfig;
}
interface IPage extends IPageMeta {
	parent: IPage;
	children: IPage[];
	siblings: IPage[];
	ancestors: IPage[];

	url: string;
}

export { IPage, IPageMeta, ISiteConfig, ISitemapConfig, IConfig }