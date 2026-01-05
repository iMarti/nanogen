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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = void 0;
const path = __importStar(require("path"));
//import urlJoin from 'url-join';
const urijs_1 = __importDefault(require("urijs"));
class Page {
    constructor(pathname, config) {
        this.parsedPath = path.parse(pathname);
        this.isIndex = this.parsedPath.name === config.site.indexPageName;
        if (!this.externalLink)
            this.url = this.buildUrl(config.site);
        this.applyMeta(config.pageMetaDefault);
        Page.pages.all.push(this);
    }
    bindParent() {
        this.parent = Page.pages.all.find(p => this.isParent(p));
    }
    bindChildren() {
        this.children = Page.pages.all.filter(page => page.parent === this);
        this.children.forEach(child => child.siblings = this.children);
        if (!this.parent)
            this.siblings = [];
        this.getAncestors();
    }
    getAncestors() {
        this.ancestors = [];
        let p = this.parent;
        while (p) {
            this.ancestors.unshift(p);
            p = p.parent;
        }
    }
    isParent(p) {
        return p.isIndex && (this.isIndex ?
            path.resolve(p.parsedPath.dir) === path.resolve(this.parsedPath.dir, '..') :
            !this.isIndex && p.parsedPath.dir === this.parsedPath.dir);
    }
    isAncestor(other) {
        return other === this || this.ancestors.some(ancestor => ancestor === other);
    }
    storeById() {
        if (this.id) {
            if (this.id in Page.pages) {
                const other = Page.pages[this.id];
                throw `Duplicate page ID "${this.id}" in ${this.parsedPath.dir}/${this.parsedPath.name}${this.parsedPath.ext} and ${other.parsedPath.dir}/${other.parsedPath.name}${other.parsedPath.ext}`;
            }
            Page.pages[this.id] = this;
        }
    }
    applyMeta(meta) {
        if (meta !== null && typeof meta === 'object') {
            for (let key in meta) {
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
    }
    isPublished() {
        return this.publish !== false && // default is true
            (!this.parent || this.parent.isPublished());
    }
    buildUrl(siteConfig) {
        const relativeUrl = this.buildRelativeUrl(siteConfig);
        const url = (siteConfig.rootUrl == '/' && relativeUrl == '/') ? '/' : siteConfig.rootUrl + relativeUrl;
        return url;
    }
    buildRelativeUrl(siteConfig) {
        if (this.isIndex)
            return (this.parsedPath.dir || '') + '/';
        let url = this.parsedPath.name + (siteConfig.fileOutputMode === 'folders' ? '/' : siteConfig.outputExtension);
        if (this.parsedPath.dir)
            url = (0, urijs_1.default)(url).directory(this.parsedPath.dir).href();
        return url;
    }
    /** Generates a string representation of the page, mainly used for debug */
    toString() {
        return JSON.stringify({
            id: this.id,
            title: this.title,
            url: this.url,
            parent: this.parent ? this.parent.title : null
        });
    }
}
exports.Page = Page;
