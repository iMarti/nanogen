"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var urljoin = require("url-join");
/** Adds quotes to JSON keys allowing non standard JSON to be parsed */
function fixLooseJson(looseJson) {
    // https://stackoverflow.com/a/39050609/183386
    return looseJson
        // Replace ":" with "@colon@" if it's between double-quotes
        .replace(/:\s*"([^"]*)"/g, function (match, p1) {
        return ': "' + p1.replace(/:/g, '@colon@') + '"';
    })
        // Replace ":" with "@colon@" if it's between single-quotes
        .replace(/:\s*'([^']*)'/g, function (match, p1) {
        return ': "' + p1.replace(/:/g, '@colon@') + '"';
    })
        // Add double-quotes around any tokens before the remaining ":"
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?\s*:/g, '"$2": ')
        // Turn "@colon@" back into ":"
        .replace(/@colon@/g, ':');
}
var Page = /** @class */ (function () {
    function Page(pathname, config) {
        this.parsedPath = path.parse(pathname);
        this.isIndex = this.parsedPath.name === config.site.indexPageName;
        this.url = this.buildUrl(config.site.rootUrl, config.site);
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
        var meta = JSON.parse(fixLooseJson(sMeta));
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
    Page.prototype.buildUrl = function (rootUrl, siteConfig) {
        return this.isIndex ?
            urljoin(rootUrl, (this.parsedPath.dir ? this.parsedPath.dir : '') + '/') :
            urljoin(rootUrl, this.parsedPath.dir, this.parsedPath.name + siteConfig.outputExtension);
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
