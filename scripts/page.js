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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = void 0;
var path = __importStar(require("path"));
//import urlJoin from 'url-join';
var urijs_1 = __importDefault(require("urijs"));
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
    Page.prototype.storeById = function () {
        if (this.id) {
            if (this.id in Page.pages) {
                var other = Page.pages[this.id];
                throw "Duplicate page ID \"".concat(this.id, "\" in ").concat(this.parsedPath.dir, "/").concat(this.parsedPath.name).concat(this.parsedPath.ext, " and ").concat(other.parsedPath.dir, "/").concat(other.parsedPath.name).concat(other.parsedPath.ext);
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
        var relativeUrl = this.buildRelativeUrl(siteConfig);
        var url = (siteConfig.rootUrl == '/' && relativeUrl == '/') ? '/' : siteConfig.rootUrl + relativeUrl;
        return url;
    };
    Page.prototype.buildRelativeUrl = function (siteConfig) {
        if (this.isIndex)
            return (this.parsedPath.dir || '') + '/';
        var url = this.parsedPath.name + (siteConfig.fileOutputMode === 'folders' ? '/' : siteConfig.outputExtension);
        if (this.parsedPath.dir)
            url = (0, urijs_1.default)(url).directory(this.parsedPath.dir).href();
        return url;
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
