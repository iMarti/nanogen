interface IPageMeta {
	/** Optional identifier allowing to refer to a page with `Page.myIdentifier` */
	id?: string;
	title?: string;
	description?: string;
	/** Optional layout from the `/layouts/` folder for this page */
	layout?: string;
}
interface IConfig {
	pageMetaDefault: IPageMeta;
	site: {
		srcPath: string;
		distPath: string;
		/** Root URL where the published files will be placed */
		rootUrl: string;
		/** string used in source files to separate meta properties from the page content */
		metaSeparator: string;
	};
}
interface IPage extends IPageMeta {
	parent: IPage;
	children: IPage[];
	siblings: IPage[];
	ancestors: IPage[];

	url: string;
}

export { IPage, IPageMeta, IConfig }