interface IPageMeta {
	/** Optional identifier allowing to refer to a page with `Page.myIdentifier` */
	id?: string;
	title?: string;
	description?: string;
	/** Optional layout from the `/layouts/` folder for this page */
	layout?: string;
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
};
interface IConfig {
	pageMetaDefault: IPageMeta;
	site: ISiteConfig;
}
interface IPage extends IPageMeta {
	parent: IPage;
	children: IPage[];
	siblings: IPage[];
	ancestors: IPage[];

	url: string;
}

export { IPage, IPageMeta, ISiteConfig, IConfig }