#!/usr/bin/env node

// scripts/cli.ts
import * as path3 from "path";
import { pathToFileURL } from "url";
import fse2 from "fs-extra";

// scripts/page-builder.ts
import fse from "fs-extra";
import fs from "fs";
import * as path2 from "path";

// scripts/page.ts
import * as path from "path";
import URI from "urijs";
import lodash from "lodash";
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
    this.children = lodash.sortBy(_Page.pages.all.filter((page) => page.parent === this), (p) => p.id || p.url);
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
import lodash2 from "lodash";
import json5 from "json5";
function writeFileIfChanged(filePath, content) {
  if (fse.existsSync(filePath)) {
    const existingContent = fse.readFileSync(filePath, "utf8");
    if (existingContent === content) {
      return false;
    }
  }
  fse.writeFileSync(filePath, content);
  return true;
}
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
   * @returns true if file was written, false if skipped (unchanged)
   */
  build() {
    if (this.page.externalLink) {
      return false;
    }
    fse.mkdirsSync(this.#destPath);
    this.#buildContents();
    this.#buildLayout();
    return this.#writeFile();
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
        const templateDir = path2.dirname(path2.join(this.config.site.srcPath, "pages", this.pathname));
        const processedSource = this.#preprocessEjsIncludes(partSource, templateDir);
        return ejs.render(processedSource, this.renderData, {
          filename: this.pathname
        });
      case ".md":
        return marked(partSource);
      default:
        return partSource;
    }
  }
  #preprocessEjsIncludes(source, baseDir) {
    const includeRegex = /<%-\s*include\(['"]([^'"]+)['"]\)\s*%>/g;
    return source.replace(includeRegex, (match, includePath) => {
      try {
        const extensions = ["", ".ejs", ".html", ".md", ".js"];
        let resolvedPath = null;
        for (const ext of extensions) {
          const candidate = path2.resolve(baseDir, includePath + ext);
          if (fse.existsSync(candidate)) {
            resolvedPath = candidate;
            break;
          }
        }
        if (!resolvedPath) {
          resolvedPath = path2.resolve(baseDir, includePath);
        }
        let content = fse.readFileSync(resolvedPath, "utf8");
        if (resolvedPath.endsWith(".md")) {
          content = marked(content);
        }
        return content;
      } catch (err) {
        throw new Error(`EJS include failed: "${includePath}" not found. Searched in: ${baseDir}`);
      }
    });
  }
  #buildLayout() {
    const layout = this.page.layout ?? this.page.parent?.childLayout ?? this.config.site.defaultLayout;
    const fullPath = path2.join(this.config.site.srcPath, "layouts", `${layout}.ejs`);
    let source = fse.readFileSync(fullPath, { encoding: "utf8" });
    const layoutsDir = path2.join(this.config.site.srcPath, "layouts");
    source = this.#preprocessEjsIncludes(source, layoutsDir);
    const renderData = { ...this.renderData, contents: this.#contents };
    this.#layout = ejs.render(source, renderData, {
      filename: fullPath
    });
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
    return writeFileIfChanged(destPathname, this.#layout);
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
  return writeFileIfChanged(destPathname, content);
}
function copyAssetsIfChanged(srcPath, destPath) {
  const assetsPath = path2.join(srcPath, "assets");
  if (!fse.existsSync(assetsPath)) {
    return { total: 0, skipped: 0 };
  }
  const assetFiles = glob.sync("**/*", { cwd: assetsPath, nodir: true });
  let skipped = 0;
  for (const file of assetFiles) {
    const srcFile = path2.join(assetsPath, file);
    const destFile = path2.join(destPath, file);
    fse.mkdirpSync(path2.dirname(destFile));
    if (fse.existsSync(destFile)) {
      const srcContent = fs.readFileSync(srcFile);
      const destContent = fs.readFileSync(destFile);
      if (srcContent.equals(destContent)) {
        skipped++;
        continue;
      }
    }
    fse.copyFileSync(srcFile, destFile);
  }
  return { total: assetFiles.length, skipped };
}
function build(config) {
  const startTime = process.hrtime();
  Page.pages = { all: [] };
  if (config.site.clean) {
    fse.emptyDirSync(config.site.distPath);
  }
  const assetCopy = copyAssetsIfChanged(config.site.srcPath, config.site.distPath);
  const pathnames = glob.sync("**/*.@(ejs|md|html)", { cwd: `${config.site.srcPath}/pages` });
  let builds = pathnames.map((pathname) => new Build(pathname, config));
  builds.forEach((build2) => build2.page.bindParent());
  builds = builds.filter((build2) => {
    const isPublished = build2.page.isPublished();
    if (!isPublished) {
      lodash2.remove(Page.pages.all, build2.page);
    }
    return isPublished;
  });
  builds.forEach((build2) => build2.page.storeById());
  builds.forEach((build2) => build2.page.bindChildren());
  const writeResults = builds.map((build2) => build2.build());
  const skippedCount = builds.filter((build2, i) => !build2.page.externalLink && !writeResults[i]).length;
  let sitemapSkipped = 0;
  if (config.sitemap) {
    const sitemapWritten = buildSitemap(config, builds);
    if (!sitemapWritten) {
      sitemapSkipped = 1;
    }
  }
  const timeDiff = process.hrtime(startTime);
  const duration = timeDiff[0] * 1e3 + timeDiff[1] / 1e6;
  const round = (d) => Math.round(d * 10) / 10;
  const totalSkipped = skippedCount + assetCopy.skipped + sitemapSkipped;
  const parts = [];
  if (skippedCount > 0) parts.push(`${skippedCount} page${skippedCount !== 1 ? "s" : ""}`);
  if (assetCopy.skipped > 0) parts.push(`${assetCopy.skipped} asset${assetCopy.skipped !== 1 ? "s" : ""}`);
  if (sitemapSkipped > 0) parts.push("sitemap");
  const skippedMsg = parts.length > 0 ? ` (${parts.join(", ")} unchanged)` : "";
  console.log(`${(/* @__PURE__ */ new Date()).toLocaleString()} Successfully built ${builds.length} pages in ${round(duration)} ms, ${round(duration / builds.length)} ms/page${skippedMsg}`);
}

// scripts/cli.ts
import * as http from "http";
import handler from "serve-handler";
import * as chokidar from "chokidar";
import lodash3 from "lodash";
var getBoolArg = (argv, abbr, full) => argv.includes(`-${abbr}`) || argv.includes(`--${full}`);
var getIntArg = (argv, abbr, full, defaultValue) => {
  const abbrIndex = argv.indexOf(`-${abbr}`);
  const fullIndex = argv.indexOf(`--${full}`);
  const pos = abbrIndex !== -1 ? abbrIndex : fullIndex;
  return pos !== -1 && pos + 1 < argv.length ? +argv[pos + 1] : defaultValue;
};
var pickConfigFile = (argv) => argv.find((arg) => !arg.startsWith("-")) ?? "nanogen.config.js";
var createLogger = (verbose) => verbose ? console.log : () => {
};
var watch2 = (config) => {
  chokidar.watch(config.site.srcPath).on(
    "all",
    lodash3.debounce(() => {
      build(config);
      console.log("Waiting for changes...");
    }, 500)
  );
};
var serve = (config, port) => {
  console.log(`Starting local server at http://localhost:${port}`);
  const server = http.createServer(
    (req, res) => handler(req, res, {
      public: config.site.distPath
    })
  );
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
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
var loadConfig = async (configFile) => {
  const module = await import(pathToFileURL(configFile).href);
  return module.default;
};
var printHelp = () => {
  console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'nanogen.config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  -c, --clean     Clear output directory before building
  -h, --help      Display this help text
  -v, --verbose   Enable verbose logging
`);
};
var runNanogen = async (argv = process.argv.slice(2)) => {
  const verbose = getBoolArg(argv, "v", "verbose");
  const log = createLogger(verbose);
  if (getBoolArg(argv, "h", "help")) {
    printHelp();
    return;
  }
  const configFileName = pickConfigFile(argv);
  const configFile = path3.resolve(configFileName);
  log(`Using configuration file: ${configFileName} resolved to: ${configFile}`);
  if (!fse2.existsSync(configFile)) {
    throw new Error(`The configuration file "${configFile}" is missing`);
  }
  const config = await loadConfig(configFile);
  const clean = getBoolArg(argv, "c", "clean");
  config.site = { ...defaultSiteConfig, ...config.site, clean };
  log("Site configuration:", config.site.srcPath, config.site.distPath, config.site.rootUrl);
  if (getBoolArg(argv, "w", "watch")) {
    watch2(config);
  } else if (getBoolArg(argv, "s", "serve")) {
    const port = getIntArg(argv, "p", "port", 3e3);
    serve(config, port);
  } else {
    build(config);
  }
};
if (import.meta.url.startsWith("file://")) {
  const isCLI = process.argv[1]?.endsWith("nanogen.js") || process.argv[1]?.endsWith("nanogen");
  if (isCLI) {
    runNanogen().catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
  }
}
export {
  Page,
  build,
  defaultSiteConfig,
  runNanogen,
  serve,
  watch2 as watch
};
