#!/usr/bin/env node

// scripts/cli.ts
import * as path3 from "path";
import fse2 from "fs-extra";

// scripts/page-builder.ts
import fse from "fs-extra";
import * as path2 from "path";

// scripts/page.ts
import * as path from "path";
import URI from "urijs";
var Page = class _Page {
  /**
   * Create a new Page instance
   * @param pathname Path to the page file
   * @param config Site configuration
   */
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
      url = URI(url).directory(this.parsedPath.dir).href();
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
import * as glob from "glob";
import * as ejs from "ejs";
import { marked } from "marked";
import lodash from "lodash";
import json5 from "json5";
var Build = class {
  /**
   * Create a new Build instance
   * @param pathname Path to the page file
   * @param config Site configuration
   */
  constructor(pathname, config) {
    this.pathname = pathname;
    this.config = config;
    this.page = new Page(pathname, this.config);
    this.#destPath = path2.join(this.config.site.distPath, this.page.parsedPath.dir);
    this.renderData = { ...config, page: this.page, pages: Page.pages };
    const source = this.#loadSource();
    this.#splitParts(source);
  }
  #parts = {};
  #contents = {};
  #layout;
  #destPath;
  #loadSource() {
    const fullPath = path2.join(this.config.site.srcPath, "pages", this.pathname);
    return fse.readFileSync(fullPath, { encoding: "utf8" });
  }
  #splitParts(source) {
    const pattern = `^${this.config.site.metaSeparator}([a-zA-Z_$][0-9a-zA-Z_$]*)?$`;
    const reSeparator = new RegExp(pattern, "gm");
    const match = reSeparator.exec(source);
    if (match !== null && match.index > 0) {
      const firstPart = source.substring(0, match.index).trim();
      if (firstPart.length > 0) {
        if (firstPart[0] === "{") {
          this.page.applyMeta(json5.parse(firstPart));
        } else {
          this.#parts.body = firstPart;
        }
      }
    }
    if (match === null) {
      this.#parts.body = source;
    } else {
      let currentMatch = match;
      while (currentMatch !== null) {
        const partId = currentMatch[1] || "body";
        const start = reSeparator.lastIndex;
        const nextMatch = reSeparator.exec(source);
        const end = nextMatch ? nextMatch.index : void 0;
        const part = source.substring(start, end).trim();
        this.#parts[partId] = part;
        currentMatch = nextMatch;
      }
    }
  }
  /**
   * Build the page
   */
  build() {
    if (this.page.externalLink) {
      return;
    }
    fse.mkdirsSync(this.#destPath);
    this.#buildContents();
    this.#buildLayout();
    this.#writeFile();
  }
  #buildContents() {
    for (const partId in this.#parts) {
      this.#contents[partId] = this.#buildContent(this.#parts[partId]);
    }
    this.#parts = {};
  }
  #buildContent(partSource) {
    switch (this.page.parsedPath.ext) {
      case ".ejs":
        return ejs.render(partSource, this.renderData, { filename: this.pathname });
      case ".md":
        return marked(partSource);
      default:
        return partSource;
    }
  }
  #buildLayout() {
    const layout = this.page.layout ?? this.page.parent?.childLayout ?? this.config.site.defaultLayout;
    const fullPath = path2.join(this.config.site.srcPath, "layouts", `${layout}.ejs`);
    const source = fse.readFileSync(fullPath, { encoding: "utf8" });
    const renderData = { ...this.renderData, contents: this.#contents };
    this.#layout = ejs.render(source, renderData, { filename: fullPath });
    this.#contents = {};
  }
  #writeFile() {
    let destPathname;
    if (this.config.site.fileOutputMode === "folders" && !this.page.isIndex) {
      const folder = path2.join(this.#destPath, this.page.parsedPath.name);
      fse.mkdirSync(folder);
      destPathname = path2.join(folder, `${this.config.site.indexPageName}${this.config.site.outputExtension}`);
    } else {
      destPathname = path2.join(this.#destPath, `${this.page.parsedPath.name}${this.config.site.outputExtension}`);
    }
    fse.writeFileSync(destPathname, this.#layout);
  }
};
function buildSitemap(config, builds) {
  const tags = builds.map((build2) => {
    const url = new URL(build2.page.url, config.sitemap.domain).href;
    const escaped = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    return `<url>
	<loc>${escaped}</loc>
</url>`;
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
    if (!isPublished) {
      lodash.remove(Page.pages.all, build2.page);
    }
    return isPublished;
  });
  builds.forEach((build2) => build2.page.storeById());
  builds.forEach((build2) => build2.page.bindChildren());
  builds.forEach((build2) => build2.build());
  if (config.sitemap) {
    buildSitemap(config, builds);
  }
  const timeDiff = process.hrtime(startTime);
  const duration = timeDiff[0] * 1e3 + timeDiff[1] / 1e6;
  const round = (d) => Math.round(d * 10) / 10;
  console.log(`${(/* @__PURE__ */ new Date()).toLocaleString()} Successfully built ${builds.length} pages in ${round(duration)} ms, ${round(duration / builds.length)} ms/page`);
}

// scripts/cli.ts
import liveServer from "live-server";
import * as chokidar from "chokidar";
import lodash2 from "lodash";
var args = process.argv.slice(2);
var configFileName = args.find((arg) => !arg.startsWith("-")) ?? "site.config.js";
var getBoolArg = (abbr, full) => args.includes(`-${abbr}`) || args.includes(`--${full}`);
var getIntArg = (abbr, full, defaultValue) => {
  const abbrIndex = args.indexOf(`-${abbr}`);
  const fullIndex = args.indexOf(`--${full}`);
  const pos = abbrIndex !== -1 ? abbrIndex : fullIndex;
  return pos !== -1 && pos + 1 < args.length ? +args[pos + 1] : defaultValue;
};
var watch2 = (config) => {
  chokidar.watch(config.site.srcPath).on(
    "all",
    lodash2.debounce(() => {
      build(config);
      console.log("Waiting for changes...");
    }, 500)
  );
};
var serve = (config, port) => {
  console.log(`Starting local server at http://localhost:${port}`);
  liveServer.start({
    port,
    root: config.site.distPath,
    open: false,
    logLevel: 0
  });
};
var defaultSiteConfig = {
  rootUrl: "/",
  metaSeparator: "!!!",
  fileOutputMode: "files",
  outputExtension: ".html",
  indexPageName: "index",
  defaultLayout: "default"
};
if (getBoolArg("h", "help")) {
  console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'site.config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  -h, --help      Display this help text
`);
} else {
  const configFile = path3.resolve(configFileName);
  if (!fse2.existsSync(configFile)) {
    throw new Error(`The configuration file "${configFile}" is missing`);
  }
  const config = (await import(configFile)).default;
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
