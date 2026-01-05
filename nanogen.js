#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/cli.ts
var path3 = __toESM(require("path"));
var fse2 = __toESM(require("fs-extra"));

// scripts/page-builder.ts
var fse = __toESM(require("fs-extra"));
var path2 = __toESM(require("path"));

// scripts/page.ts
var path = __toESM(require("path"));
var import_urijs = __toESM(require("urijs"));
var Page = class _Page {
  constructor(pathname, config) {
    this.externalLink = false;
    this.parsedPath = path.parse(pathname);
    this.isIndex = this.parsedPath.name === config.site.indexPageName;
    this.applyMeta(config.pageMetaDefault);
    if (!this.externalLink) {
      this.url = this.buildUrl(config.site);
    }
    _Page.pages.all.push(this);
  }
  static {
    this.pages = { all: [] };
  }
  bindParent() {
    this.parent = _Page.pages.all.find((p) => this.isParent(p));
  }
  bindChildren() {
    this.children = _Page.pages.all.filter((page) => page.parent === this);
    this.children.forEach((child) => child.siblings = this.children);
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
    return p.isIndex && (this.isIndex ? path.resolve(p.parsedPath.dir) === path.resolve(this.parsedPath.dir, "..") : !this.isIndex && p.parsedPath.dir === this.parsedPath.dir);
  }
  isAncestor(other) {
    return other === this || this.ancestors.some((ancestor) => ancestor === other);
  }
  storeById() {
    if (this.id) {
      if (this.id in _Page.pages) {
        const other = _Page.pages[this.id];
        throw `Duplicate page ID "${this.id}" in ${this.parsedPath.dir}/${this.parsedPath.name}${this.parsedPath.ext} and ${other.parsedPath.dir}/${other.parsedPath.name}${other.parsedPath.ext}`;
      }
      _Page.pages[this.id] = this;
    }
  }
  applyMeta(meta) {
    if (meta !== null && typeof meta === "object") {
      for (const key in meta) {
        if (meta[key] !== void 0) {
          this[key] = meta[key];
        }
      }
      if (!this.title) {
        this.title = this.isIndex ? path.basename(this.parsedPath.dir) : this.parsedPath.name;
      }
      if (!this.menuTitle) {
        this.menuTitle = this.title;
      }
    }
  }
  isPublished() {
    return this.publish !== false && // default is true
    (!this.parent || this.parent.isPublished());
  }
  buildUrl(siteConfig) {
    const relativeUrl = this.buildRelativeUrl(siteConfig);
    const url = siteConfig.rootUrl == "/" && relativeUrl == "/" ? "/" : siteConfig.rootUrl + relativeUrl;
    return url;
  }
  buildRelativeUrl(siteConfig) {
    if (this.isIndex) {
      return (this.parsedPath.dir || "") + "/";
    }
    let url = this.parsedPath.name + (siteConfig.fileOutputMode === "folders" ? "/" : siteConfig.outputExtension);
    if (this.parsedPath.dir) {
      url = (0, import_urijs.default)(url).directory(this.parsedPath.dir).href();
    }
    return url;
  }
  /** Generates a string representation of the page, mainly used for debug */
  toString() {
    return JSON.stringify({
      id: this.id,
      title: this.title,
      url: this.url,
      parent: this.parent?.title ?? null
    });
  }
};

// scripts/page-builder.ts
var glob = __toESM(require("glob"));
var ejs = __toESM(require("ejs"));
var import_marked = require("marked");
var import_lodash = require("lodash");
var json5 = __toESM(require("json5"));
var Build = class {
  constructor(pathname, config) {
    this.pathname = pathname;
    this.config = config;
    this.parts = {};
    this.contents = {};
    this.page = new Page(pathname, this.config);
    this.destPath = path2.join(this.config.site.distPath, this.page.parsedPath.dir);
    this.renderData = { ...config, page: this.page, pages: Page.pages };
    const source = this.loadSource();
    this.splitParts(source);
  }
  loadSource() {
    const fullPath = path2.join(this.config.site.srcPath, "pages", this.pathname);
    return fse.readFileSync(fullPath, { encoding: "utf8" });
  }
  splitParts(source) {
    const pattern = "^" + this.config.site.metaSeparator + "([a-zA-Z_$][0-9a-zA-Z_$]*)?$";
    const reSeparator = new RegExp(pattern, "gm");
    let match = reSeparator.exec(source);
    if (match !== null && match.index > 0) {
      const firstPart = source.substr(0, match.index).trim();
      if (firstPart.length > 0) {
        if (firstPart[0] === "{")
          this.page.applyMeta(json5.parse(firstPart));
        else
          this.parts.body = firstPart;
      }
    }
    if (match === null)
      this.parts.body = source;
    else {
      while (match !== null) {
        let partId = match[1] || "body";
        const start = reSeparator.lastIndex;
        match = reSeparator.exec(source);
        const end = match ? match.index : void 0;
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
      case ".ejs":
        return ejs.render(partSource, this.renderData, { filename: this.pathname });
      case ".md":
        return (0, import_marked.marked)(partSource);
      default:
        return partSource;
    }
  }
  buildLayout() {
    const layout = this.page.layout || (this.page.parent ? this.page.parent.childLayout : void 0) || this.config.site.defaultLayout;
    const fullPath = path2.join(this.config.site.srcPath, "layouts", layout + ".ejs");
    let source = fse.readFileSync(fullPath, { encoding: "utf8" });
    const renderData = { ...this.renderData, contents: this.contents };
    this.layout = ejs.render(source, renderData, { filename: fullPath });
    delete this.contents;
  }
  writeFile() {
    let destPathname;
    if (this.config.site.fileOutputMode === "folders" && !this.page.isIndex) {
      const folder = path2.join(this.destPath, this.page.parsedPath.name);
      fse.mkdirSync(folder);
      destPathname = path2.join(folder, this.config.site.indexPageName + this.config.site.outputExtension);
    } else {
      destPathname = path2.join(this.destPath, this.page.parsedPath.name + this.config.site.outputExtension);
    }
    fse.writeFileSync(destPathname, this.layout);
    delete this.layout;
  }
};
function buildSitemap(config, builds) {
  const tags = builds.map((build2) => {
    const url = new URL(build2.page.url, config.sitemap.domain).href;
    const escaped = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    const tag = `<url>
	<loc>${escaped}</loc> 
</url>`;
    return tag;
  });
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tags.join("\n")}
</urlset>`;
  const destPathname = path2.join(config.site.distPath, "sitemap.xml");
  fse.writeFileSync(destPathname, content);
}
function build(config) {
  const startTime = process.hrtime();
  Page.pages = { all: [] };
  fse.emptyDirSync(config.site.distPath);
  fse.copySync(`${config.site.srcPath}/assets`, config.site.distPath);
  const pathnames = glob.sync("**/*.@(ejs|md|html)", { cwd: `${config.site.srcPath}/pages` });
  let builds = pathnames.map((pathname) => new Build(pathname, config));
  builds.forEach((build2) => build2.page.bindParent());
  builds = builds.filter((build2) => {
    const isPublished = build2.page.isPublished();
    if (!isPublished)
      (0, import_lodash.remove)(Page.pages.all, build2.page);
    return isPublished;
  });
  builds.forEach((build2) => build2.page.storeById());
  builds.forEach((build2) => build2.page.bindChildren());
  builds.forEach((build2) => build2.build());
  if (config.sitemap)
    buildSitemap(config, builds);
  const timeDiff = process.hrtime(startTime);
  const duration = timeDiff[0] * 1e3 + timeDiff[1] / 1e6;
  const round = (d) => Math.round(d * 10) / 10;
  console.log(`${(/* @__PURE__ */ new Date()).toLocaleString()} Succesfully built ${builds.length} pages in ${round(duration)} ms, ${round(duration / builds.length)} ms/page`);
}

// scripts/cli.ts
var import_live_server = __toESM(require("live-server"));
var chokidar = __toESM(require("chokidar"));
var import_lodash2 = require("lodash");
var args = process.argv.slice(2);
var configFileName = args.length > 0 && !args[0].startsWith("-") ? args[0] : "site.config.js";
function getBoolArg(abbr, full) {
  return args.includes("-" + abbr) || args.includes("--" + full);
}
function getIntArg(abbr, full, defaultValue) {
  if (getBoolArg(abbr, full)) {
    let pos = args.indexOf("-" + abbr);
    if (pos === -1)
      pos = args.indexOf("--" + full);
    if (pos !== -1)
      return +args[pos + 1];
  }
  return defaultValue;
}
function watch2(config) {
  chokidar.watch(config.site.srcPath).on(
    "all",
    (0, import_lodash2.debounce)(() => {
      build(config);
      console.log("Waiting for changes...");
    }, 500)
  );
}
function serve(config, port) {
  console.log(`Starting local server at http://localhost:${port}`);
  import_live_server.default.start({
    port,
    root: config.site.distPath,
    open: false,
    logLevel: 0
  });
}
if (getBoolArg("h", "help"))
  console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'site-config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  
  -h, --help      Display this help text
`);
else {
  const configFile = path3.resolve(configFileName);
  if (!fse2.existsSync(configFile))
    throw `The configuration file "${configFile}" is missing`;
  let config = require(configFile);
  const defaultSiteConfig = {
    rootUrl: "/",
    metaSeparator: "!!!",
    fileOutputMode: "files",
    outputExtension: ".html",
    indexPageName: "index",
    defaultLayout: "default"
  };
  config.site = { ...defaultSiteConfig, ...config.site };
  if (getBoolArg("w", "watch")) {
    watch2(config);
  } else if (getBoolArg("s", "serve")) {
    const port = getIntArg("p", "port", 3e3);
    serve(config, port);
  } else {
    build(config);
  }
}
