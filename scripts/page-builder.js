"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
var fse = __importStar(require("fs-extra"));
var path = __importStar(require("path"));
var page_1 = require("./page");
var glob = __importStar(require("glob"));
var ejs = __importStar(require("ejs"));
var marked_1 = require("marked");
var lodash_1 = require("lodash");
var json5 = __importStar(require("json5"));
var Build = /** @class */ (function () {
    function Build(pathname, config) {
        this.pathname = pathname;
        this.config = config;
        this.parts = {};
        this.contents = {};
        this.page = new page_1.Page(pathname, this.config);
        this.destPath = path.join(this.config.site.distPath, this.page.parsedPath.dir);
        this.renderData = __assign(__assign({}, config), { page: this.page, pages: page_1.Page.pages });
        var source = this.loadSource();
        this.splitParts(source);
    }
    Build.prototype.loadSource = function () {
        var fullPath = path.join(this.config.site.srcPath, 'pages', this.pathname);
        return fse.readFileSync(fullPath, { encoding: 'utf8' });
    };
    Build.prototype.splitParts = function (source) {
        var pattern = '^' + this.config.site.metaSeparator + '([a-zA-Z_$][0-9a-zA-Z_$]*)?$';
        var reSeparator = new RegExp(pattern, 'gm');
        // Before the first separator we can find optional meta information or the body part
        var match = reSeparator.exec(source);
        if (match !== null && match.index > 0) {
            var firstPart = source.substr(0, match.index).trim();
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
                var partId = match[1] || 'body';
                // The content between previous separator and the next (or end of file) is the next part
                var start = reSeparator.lastIndex;
                match = reSeparator.exec(source);
                var end = match ? match.index : undefined;
                var part = source.substring(start, end).trim();
                this.parts[partId] = part;
            }
        }
    };
    Build.prototype.build = function () {
        if (this.page.externalLink)
            return;
        fse.mkdirsSync(this.destPath);
        this.buildContents();
        this.buildLayout();
        this.writeFile();
    };
    Build.prototype.buildContents = function () {
        for (var partId in this.parts) {
            this.contents[partId] = this.buildContent(this.parts[partId]);
        }
        delete this.parts;
    };
    Build.prototype.buildContent = function (partSource) {
        switch (this.page.parsedPath.ext) {
            case '.ejs':
                return ejs.render(partSource, this.renderData, { filename: this.pathname });
            case '.md':
                return (0, marked_1.marked)(partSource);
            default:
                return partSource;
        }
    };
    Build.prototype.buildLayout = function () {
        // The page layout is defined by order of priority on the page, its parent or on the site level.
        var layout = this.page.layout ||
            (this.page.parent ? this.page.parent.childLayout : undefined) ||
            this.config.site.defaultLayout;
        var fullPath = path.join(this.config.site.srcPath, 'layouts', layout + '.ejs');
        var source = fse.readFileSync(fullPath, { encoding: 'utf8' });
        var renderData = __assign(__assign({}, this.renderData), { contents: this.contents });
        this.layout = ejs.render(source, renderData, { filename: fullPath });
        delete this.contents;
    };
    Build.prototype.writeFile = function () {
        var destPathname;
        if (this.config.site.fileOutputMode === 'folders' && !this.page.isIndex) {
            var folder = path.join(this.destPath, this.page.parsedPath.name);
            fse.mkdirSync(folder);
            destPathname = path.join(folder, this.config.site.indexPageName + this.config.site.outputExtension);
        }
        else {
            destPathname = path.join(this.destPath, this.page.parsedPath.name + this.config.site.outputExtension);
        }
        fse.writeFileSync(destPathname, this.layout);
        delete this.layout;
    };
    return Build;
}());
function buildSitemap(config, builds) {
    var tags = builds.map(function (build) {
        var url = new URL(build.page.url, config.sitemap.domain).href;
        var escaped = url
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        var tag = "<url>\n\t<loc>".concat(escaped, "</loc> \n</url>");
        return tag;
    });
    var content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n".concat(tags.join('\n'), "\n</urlset>");
    var destPathname = path.join(config.site.distPath, 'sitemap.xml');
    fse.writeFileSync(destPathname, content);
}
function build(config) {
    var startTime = process.hrtime();
    page_1.Page.pages = { all: [] };
    // clear destination folder
    fse.emptyDirSync(config.site.distPath);
    // copy assets folder
    fse.copySync("".concat(config.site.srcPath, "/assets"), config.site.distPath);
    // build the pages
    var pathnames = glob.sync('**/*.@(ejs|md|html)', { cwd: "".concat(config.site.srcPath, "/pages") });
    var builds = pathnames.map(function (pathname) { return new Build(pathname, config); });
    builds.forEach(function (build) { return build.page.bindParent(); });
    builds = builds.filter(function (build) {
        var isPublished = build.page.isPublished();
        if (!isPublished)
            (0, lodash_1.remove)(page_1.Page.pages.all, build.page);
        return isPublished;
    });
    builds.forEach(function (build) { return build.page.storeById(); });
    builds.forEach(function (build) { return build.page.bindChildren(); });
    builds.forEach(function (build) { return build.build(); });
    // build the sitemap
    if (config.sitemap)
        buildSitemap(config, builds);
    // display build time
    var timeDiff = process.hrtime(startTime);
    var duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
    var round = function (d) { return Math.round(d * 10) / 10; };
    console.log("".concat(new Date().toLocaleString(), " Succesfully built ").concat(builds.length, " pages in ").concat(round(duration), " ms, ").concat(round(duration / builds.length), " ms/page"));
}
exports.build = build;
