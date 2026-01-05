"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = build;
const fse = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const page_1 = require("./page");
const glob = __importStar(require("glob"));
const ejs = __importStar(require("ejs"));
const marked_1 = require("marked");
const lodash_1 = require("lodash");
const json5 = __importStar(require("json5"));
class Build {
    constructor(pathname, config) {
        this.pathname = pathname;
        this.config = config;
        this.parts = {};
        this.contents = {};
        this.page = new page_1.Page(pathname, this.config);
        this.destPath = path.join(this.config.site.distPath, this.page.parsedPath.dir);
        this.renderData = { ...config, page: this.page, pages: page_1.Page.pages };
        const source = this.loadSource();
        this.splitParts(source);
    }
    loadSource() {
        const fullPath = path.join(this.config.site.srcPath, 'pages', this.pathname);
        return fse.readFileSync(fullPath, { encoding: 'utf8' });
    }
    splitParts(source) {
        const pattern = '^' + this.config.site.metaSeparator + '([a-zA-Z_$][0-9a-zA-Z_$]*)?$';
        const reSeparator = new RegExp(pattern, 'gm');
        // Before the first separator we can find optional meta information or the body part
        let match = reSeparator.exec(source);
        if (match !== null && match.index > 0) {
            const firstPart = source.substr(0, match.index).trim();
            if (firstPart.length > 0) {
                if (firstPart[0] === '{')
                    this.page.applyMeta(json5.parse(firstPart));
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
    build() {
        if (this.page.externalLink)
            return;
        fse.mkdirsSync(this.destPath);
        this.buildContents();
        this.buildLayout();
        this.writeFile();
    }
    buildContents() {
        for (let partId in this.parts) {
            this.contents[partId] = this.buildContent(this.parts[partId]);
        }
        delete this.parts;
    }
    buildContent(partSource) {
        switch (this.page.parsedPath.ext) {
            case '.ejs':
                return ejs.render(partSource, this.renderData, { filename: this.pathname });
            case '.md':
                return (0, marked_1.marked)(partSource);
            default:
                return partSource;
        }
    }
    buildLayout() {
        // The page layout is defined by order of priority on the page, its parent or on the site level.
        const layout = this.page.layout ||
            (this.page.parent ? this.page.parent.childLayout : undefined) ||
            this.config.site.defaultLayout;
        const fullPath = path.join(this.config.site.srcPath, 'layouts', layout + '.ejs');
        let source = fse.readFileSync(fullPath, { encoding: 'utf8' });
        const renderData = { ...this.renderData, contents: this.contents };
        this.layout = ejs.render(source, renderData, { filename: fullPath });
        delete this.contents;
    }
    writeFile() {
        let destPathname;
        if (this.config.site.fileOutputMode === 'folders' && !this.page.isIndex) {
            const folder = path.join(this.destPath, this.page.parsedPath.name);
            fse.mkdirSync(folder);
            destPathname = path.join(folder, this.config.site.indexPageName + this.config.site.outputExtension);
        }
        else {
            destPathname = path.join(this.destPath, this.page.parsedPath.name + this.config.site.outputExtension);
        }
        fse.writeFileSync(destPathname, this.layout);
        delete this.layout;
    }
}
function buildSitemap(config, builds) {
    const tags = builds.map(build => {
        const url = new URL(build.page.url, config.sitemap.domain).href;
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
function build(config) {
    const startTime = process.hrtime();
    page_1.Page.pages = { all: [] };
    // clear destination folder
    fse.emptyDirSync(config.site.distPath);
    // copy assets folder
    fse.copySync(`${config.site.srcPath}/assets`, config.site.distPath);
    // build the pages
    const pathnames = glob.sync('**/*.@(ejs|md|html)', { cwd: `${config.site.srcPath}/pages` });
    let builds = pathnames.map(pathname => new Build(pathname, config));
    builds.forEach(build => build.page.bindParent());
    builds = builds.filter(build => {
        const isPublished = build.page.isPublished();
        if (!isPublished)
            (0, lodash_1.remove)(page_1.Page.pages.all, build.page);
        return isPublished;
    });
    builds.forEach(build => build.page.storeById());
    builds.forEach(build => build.page.bindChildren());
    builds.forEach(build => build.build());
    // build the sitemap
    if (config.sitemap)
        buildSitemap(config, builds);
    // display build time
    const timeDiff = process.hrtime(startTime);
    const duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
    const round = (d) => Math.round(d * 10) / 10;
    console.log(`${new Date().toLocaleString()} Succesfully built ${builds.length} pages in ${round(duration)} ms, ${round(duration / builds.length)} ms/page`);
}
