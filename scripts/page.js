"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var urljoin = require("url-join");
var Util = require("./utils");
var Page = /** @class */ (function () {
    function Page(pathname, config) {
        this.parsedPath = path.parse(pathname);
        this.isIndex = this.parsedPath.name === config.site.indexPageName;
        if (!this.externalLink)
            this.url = this.buildUrl(config.site);
        this.applyMeta(config.pageMetaDefault);
        Page.pages.all.push(this);
    }
    Page.prototype.bindParent = function () {
        var _this = this;
        this.parent = Page.pages.all.find(function (p) { return _this.isParent(p); });
    };
    Page.prototype.bindChildren = function () {
        var _this = this;
        this.children = Page.pages.all.filter(function (page) { return page.parent === _this; });
        this.children.forEach(function (child) { return child.siblings = _this.children; });
        if (!this.parent)
            this.siblings = [];
        this.getAncestors();
    };
    Page.prototype.getAncestors = function () {
        this.ancestors = [];
        var p = this.parent;
        while (p) {
            this.ancestors.unshift(p);
            p = p.parent;
        }
    };
    Page.prototype.isParent = function (p) {
        return p.isIndex && (this.isIndex ?
            path.resolve(p.parsedPath.dir) === path.resolve(this.parsedPath.dir, '..') :
            !this.isIndex && p.parsedPath.dir === this.parsedPath.dir);
    };
    Page.prototype.isAncestor = function (other) {
        return other === this || this.ancestors.some(function (ancestor) { return ancestor === other; });
    };
    Page.prototype.storeMeta = function (sMeta) {
        var meta = JSON.parse(Util.fixLooseJson(sMeta));
        this.applyMeta(meta);
    };
    Page.prototype.storeById = function () {
        if (this.id) {
            if (this.id in Page.pages) {
                var other = Page.pages[this.id];
                throw "Duplicate page ID \"" + this.id + "\" in " + this.parsedPath.dir + "/" + this.parsedPath.name + this.parsedPath.ext + " and " + other.parsedPath.dir + "/" + other.parsedPath.name + other.parsedPath.ext;
            }
            Page.pages[this.id] = this;
        }
    };
    Page.prototype.applyMeta = function (meta) {
        if (meta !== null && typeof meta === 'object') {
            for (var key in meta) {
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
    };
    Page.prototype.isPublished = function () {
        return this.publish !== false && // default is true
            (!this.parent || this.parent.isPublished());
    };
    Page.prototype.buildUrl = function (siteConfig) {
        return urljoin(siteConfig.rootUrl, this.buildRelativeUrl(siteConfig));
        // if (siteConfig.fileOutputMode === 'folders')
        // 	return this.isIndex ?
        // 		urljoin(siteConfig.rootUrl, (this.parsedPath.dir ? this.parsedPath.dir : '') + '/') :
        // 		urljoin(siteConfig.rootUrl, this.parsedPath.dir, this.parsedPath.name + '/');
        // else
        // 	return this.isIndex ?
        // 		urljoin(siteConfig.rootUrl, (this.parsedPath.dir ? this.parsedPath.dir : '') + '/') :
        // 		urljoin(siteConfig.rootUrl, this.parsedPath.dir, this.parsedPath.name + siteConfig.outputExtension);
    };
    Page.prototype.buildRelativeUrl = function (siteConfig) {
        if (this.isIndex)
            return (this.parsedPath.dir || '') + '/';
        return urljoin(this.parsedPath.dir, this.parsedPath.name + (siteConfig.fileOutputMode === 'folders' ? '/' : siteConfig.outputExtension));
    };
    /** Generates a string representation of the page, mainly used for debug */
    Page.prototype.toString = function () {
        return JSON.stringify({
            id: this.id,
            title: this.title,
            url: this.url,
            parent: this.parent ? this.parent.title : null
        });
    };
    return Page;
}());
exports.Page = Page;
