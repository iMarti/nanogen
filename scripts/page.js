"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
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
        this.url = this.buildUrl(config.site.rootUrl);
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
        return p.parsedPath.name === 'index' && (this.parsedPath.name === 'index' ?
            path.resolve(p.parsedPath.dir) === path.resolve(this.parsedPath.dir, '..') :
            this.parsedPath.name !== 'index' && p.parsedPath.dir === this.parsedPath.dir);
    };
    Page.prototype.storeMeta = function (sMeta) {
        var meta = JSON.parse(fixLooseJson(sMeta));
        this.applyMeta(meta);
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
        }
    };
    Page.prototype.buildUrl = function (rootUrl) {
        return this.parsedPath.name === 'index' ?
            rootUrl + (this.parsedPath.dir ? this.parsedPath.dir + '/' : '') :
            path.join(rootUrl + this.parsedPath.dir, this.parsedPath.name + '.html');
    };
    Page.pages = { all: [] };
    return Page;
}());
exports.Page = Page;