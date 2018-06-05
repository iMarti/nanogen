"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fse = require("fs-extra");
var path = require("path");
var page_1 = require("./page");
var glob = require("glob");
var ejs = require("ejs");
var marked = require("marked");
var Build = /** @class */ (function () {
    function Build(pathname, config) {
        this.pathname = pathname;
        this.config = config;
        this.page = new page_1.Page(pathname, this.config);
        this.destPath = path.join(this.config.site.distPath, this.page.parsedPath.dir);
        this.renderData = __assign({}, config, { page: this.page, pages: page_1.Page.pages });
        this.loadSource();
        this.extractMeta();
    }
    Build.prototype.loadSource = function () {
        var fullPath = path.join(this.config.site.srcPath, 'pages', this.pathname);
        this.source = fse.readFileSync(fullPath, { encoding: 'utf8' });
    };
    Build.prototype.extractMeta = function () {
        var parts = this.source.split(this.config.site.metaSeparator);
        if (parts.length === 2) {
            this.page.storeMeta(parts[0]);
            this.source = parts[1];
        }
    };
    Build.prototype.build = function () {
        fse.mkdirsSync(this.destPath);
        this.buildContent();
        this.buildLayout();
        this.writeFile();
    };
    Build.prototype.buildContent = function () {
        switch (this.page.parsedPath.ext) {
            case '.ejs':
                this.contents = ejs.render(this.source, this.renderData, { filename: this.pathname });
                break;
            case '.md':
                this.contents = marked(this.source);
                break;
            default:
                this.contents = this.source;
                break;
        }
        delete this.source;
    };
    Build.prototype.buildLayout = function () {
        var fullPath = path.join(this.config.site.srcPath, 'layouts', this.page.layout + '.ejs');
        var source = fse.readFileSync(fullPath, { encoding: 'utf8' });
        var renderData = __assign({}, this.renderData, { contents: this.contents });
        this.layout = ejs.render(source, renderData, { filename: fullPath });
        delete this.contents;
    };
    Build.prototype.writeFile = function () {
        var destPathname = path.join(this.destPath, this.page.parsedPath.name + '.html');
        fse.writeFile(destPathname, this.layout);
        delete this.layout;
    };
    return Build;
}());
function build(config) {
    var startTime = process.hrtime();
    // clear destination folder
    fse.emptyDirSync(config.site.distPath);
    // copy assets folder
    fse.copy(config.site.srcPath + "/assets", config.site.distPath + "/assets");
    // build the pages
    var pathnames = glob.sync('**/*.@(ejs|md|html)', { cwd: config.site.srcPath + "/pages" });
    var builds = pathnames.map(function (pathname) { return new Build(pathname, config); });
    builds.forEach(function (build) { return build.page.bindParent(); });
    builds.forEach(function (build) { return build.page.bindChildren(); });
    builds.forEach(function (build) { return build.build(); });
    // display build time
    var timeDiff = process.hrtime(startTime);
    var duration = timeDiff[0] * 1000 + timeDiff[1] / 1e6;
    var round = function (d) { return Math.round(d * 10) / 10; };
    console.log("Site built succesfully in " + round(duration) + " ms, " + round(duration / builds.length) + " ms/page");
}
exports.build = build;
