interface IPageMeta {
	/** Optional identifier allowing to refer to a page with `Page.myIdentifier` */
	id?: string;
	/** Title of the page to be put in the head title tag and often in a h1 tag */
	title?: string;
	/** Label to be used when referring to this page in a menu, where space is limited.
	 * Usually a shorter version of the title.
	 * If omitted, the title is used.
	*/
	menuTitle?: string;
	/** Page description to be put into the description meta tag */
	description?: string;
	/** Optional layout from the `/layouts/` folder for this page */
	layout?: string;
	/** Optional layout to apply to child pages if they don't set their own */
	childLayout?: string;
	/** Optional flag indicating whether that page is to be published. Default: true.
	 * All its ancestors must be published in order for this page to be actually published.
	 */
	publish?: boolean;

	/** An external link is not generated as a page but defines its URL, defaults to false. */
	externalLink?: boolean;
	/** When an external link, this value is preserved an not overridden like for standard pages. */
	url?: string;
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
	isPublished: () => boolean;

	url: string;
}

export { IPage, IPageMeta, ISiteConfig, ISitemapConfig, IConfig }