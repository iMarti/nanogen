#!/usr/bin/env node

// scripts/cli.ts
import * as path6 from "path";
import fse5 from "fs-extra";

// scripts/page-builder.ts
import fse3 from "fs-extra";
import fs from "fs";
import * as path4 from "path";

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
import * as glob2 from "glob";
import * as ejs from "ejs";
import { marked } from "marked";
import lodash2 from "lodash";
import json5 from "json5";

// scripts/lib/include-path.ts
import fse from "fs-extra";
import * as path2 from "path";
var DEFAULT_INCLUDE_EXTENSIONS = ["", ".ejs", ".html", ".md", ".js"];
function resolvePath(baseDir, srcRoot, includeTarget) {
  if (includeTarget.startsWith("/") || includeTarget.startsWith("\\")) {
    return path2.join(srcRoot, includeTarget.replace(/^[/\\]+/, ""));
  }
  return path2.resolve(baseDir, includeTarget);
}
function resolveIncludePath(baseDir, srcRoot, includePath) {
  for (const ext of DEFAULT_INCLUDE_EXTENSIONS) {
    const candidate = resolvePath(baseDir, srcRoot, includePath + ext);
    if (fse.existsSync(candidate)) {
      return candidate;
    }
  }
  return resolvePath(baseDir, srcRoot, includePath);
}

// scripts/lib/asset-usage.ts
import fse2 from "fs-extra";
import * as path3 from "path";
import * as glob from "glob";
function normalizeAssetPath(pathname) {
  return pathname.split(path3.sep).join("/");
}
function getSourceAssetFiles(srcPath) {
  const assetsPath = path3.join(srcPath, "assets");
  if (!fse2.existsSync(assetsPath)) {
    return [];
  }
  return glob.sync("**/*", { cwd: assetsPath, nodir: true }).map(normalizeAssetPath);
}
function stripQueryAndHash(assetRef) {
  return assetRef.replace(/[?#].*$/, "");
}
function isLocalAssetRef(assetRef) {
  if (!assetRef) {
    return false;
  }
  const value = assetRef.trim().toLowerCase();
  if (!value || value.startsWith("#")) {
    return false;
  }
  return !(value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//") || value.startsWith("data:") || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("javascript:"));
}
function extractAssetRefsFromHtml(content) {
  const refs = [];
  const attrRegex = /\b(?:href|src)\s*=\s*(['"])(.*?)\1/gi;
  const srcsetRegex = /\bsrcset\s*=\s*(['"])(.*?)\1/gi;
  for (const match of content.matchAll(attrRegex)) {
    const ref = match[2]?.trim();
    if (ref) {
      refs.push(ref);
    }
  }
  for (const match of content.matchAll(srcsetRegex)) {
    const srcset = match[2]?.trim();
    if (!srcset) {
      continue;
    }
    for (const entry of srcset.split(",")) {
      const candidate = entry.trim().split(/\s+/)[0];
      if (candidate) {
        refs.push(candidate);
      }
    }
  }
  return refs;
}
function resolveAssetRefToSourcePath(assetRef, htmlOutputPath, distPath, sourceAssets) {
  if (!isLocalAssetRef(assetRef)) {
    return void 0;
  }
  const cleanRef = stripQueryAndHash(assetRef.trim());
  if (!cleanRef) {
    return void 0;
  }
  const decodedRef = (() => {
    try {
      return decodeURI(cleanRef);
    } catch {
      return cleanRef;
    }
  })();
  const absolutePath = decodedRef.startsWith("/") ? path3.join(distPath, decodedRef) : path3.resolve(path3.dirname(htmlOutputPath), decodedRef);
  const relativePath = path3.relative(distPath, absolutePath);
  if (!relativePath || relativePath.startsWith("..") || path3.isAbsolute(relativePath)) {
    return void 0;
  }
  const normalized = normalizeAssetPath(relativePath);
  if (!sourceAssets.has(normalized)) {
    return void 0;
  }
  return normalized;
}
function collectAssetUsage(distPath, pageOutputPaths, allAssets) {
  const sourceAssetSet = new Set(allAssets);
  const usedAssets = /* @__PURE__ */ new Set();
  for (const outputPath of pageOutputPaths) {
    if (!fse2.existsSync(outputPath)) {
      continue;
    }
    const html = fse2.readFileSync(outputPath, "utf8");
    for (const assetRef of extractAssetRefsFromHtml(html)) {
      const assetPath = resolveAssetRefToSourcePath(assetRef, outputPath, distPath, sourceAssetSet);
      if (assetPath) {
        usedAssets.add(assetPath);
      }
    }
  }
  const unusedAssets = new Set(allAssets.filter((asset) => !usedAssets.has(asset)));
  return {
    allAssets: [...allAssets],
    usedAssets,
    unusedAssets
  };
}
function printAssetList(label, assets) {
  const sorted = [...assets].sort((a, b) => a.localeCompare(b));
  console.log(`${label} (${sorted.length})`);
  if (sorted.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const asset of sorted) {
    console.log(`  ${asset}`);
  }
}

// scripts/page-builder.ts
function writeFileIfChanged(filePath, content) {
  if (fse3.existsSync(filePath)) {
    const existingContent = fse3.readFileSync(filePath, "utf8");
    if (existingContent === content) {
      return false;
    }
  }
  fse3.writeFileSync(filePath, content);
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
    this.#destPath = path4.join(this.config.site.distPath, this.page.parsedPath.dir);
    this.renderData = { ...config, page: this.page, pages: Page.pages };
    const source = this.#loadSource();
    this.#splitParts(source);
  }
  #parts = {};
  #contents = {};
  #layout;
  #destPath;
  #loadSource() {
    const fullPath = path4.join(this.config.site.srcPath, "pages", this.pathname);
    return fse3.readFileSync(fullPath, { encoding: "utf8" });
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
    fse3.mkdirsSync(this.#destPath);
    this.#buildContents();
    this.#buildLayout();
    return this.#writeFile();
  }
  getOutputPath() {
    if (this.config.site.fileOutputMode === "folders" && !this.page.isIndex) {
      return path4.join(this.#destPath, this.page.parsedPath.name, `${this.config.site.indexPageName}${this.config.site.outputExtension}`);
    }
    return path4.join(this.#destPath, `${this.page.parsedPath.name}${this.config.site.outputExtension}`);
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
        const templateDir = path4.dirname(path4.join(this.config.site.srcPath, "pages", this.pathname));
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
        const resolvedPath = resolveIncludePath(baseDir, this.config.site.srcPath, includePath);
        let content = fse3.readFileSync(resolvedPath, "utf8");
        if (resolvedPath.endsWith(".md")) {
          content = marked(content);
        }
        return content;
      } catch (err) {
        throw new Error(`EJS include failed: "${includePath}" not found. Searched relative to: ${baseDir} and site root: ${this.config.site.srcPath}`);
      }
    });
  }
  #buildLayout() {
    const layout = this.page.layout ?? this.page.parent?.childLayout ?? this.config.site.defaultLayout;
    const fullPath = path4.join(this.config.site.srcPath, "layouts", `${layout}.ejs`);
    let source = fse3.readFileSync(fullPath, { encoding: "utf8" });
    const layoutsDir = path4.join(this.config.site.srcPath, "layouts");
    source = this.#preprocessEjsIncludes(source, layoutsDir);
    const renderData = { ...this.renderData, contents: this.#contents };
    this.#layout = ejs.render(source, renderData, {
      filename: fullPath
    });
    this.#contents = {};
  }
  #writeFile() {
    const destPathname = this.getOutputPath();
    fse3.mkdirpSync(path4.dirname(destPathname));
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
  const destPathname = path4.join(config.site.distPath, "sitemap.xml");
  return writeFileIfChanged(destPathname, content);
}
function copyAssetsIfChanged(srcPath, destPath, assetFiles) {
  const assetsPath = path4.join(srcPath, "assets");
  if (!fse3.existsSync(assetsPath)) {
    return { total: 0, skipped: 0 };
  }
  let skipped = 0;
  for (const file of assetFiles) {
    const srcFile = path4.join(assetsPath, file);
    if (!fse3.existsSync(srcFile)) {
      continue;
    }
    const destFile = path4.join(destPath, file);
    fse3.mkdirpSync(path4.dirname(destFile));
    if (fse3.existsSync(destFile)) {
      const srcContent = fs.readFileSync(srcFile);
      const destContent = fs.readFileSync(destFile);
      if (srcContent.equals(destContent)) {
        skipped++;
        continue;
      }
    }
    fse3.copyFileSync(srcFile, destFile);
  }
  return { total: assetFiles.length, skipped };
}
function buildPublishedPages(config) {
  const pathnames = glob2.sync("**/*.@(ejs|md|html)", { cwd: `${config.site.srcPath}/pages` });
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
  return { builds, skippedCount };
}
function processAssets(config, builds, options) {
  const sourceAssets = getSourceAssetFiles(config.site.srcPath);
  const pageOutputPaths = builds.filter((build2) => !build2.page.externalLink).map((build2) => build2.getOutputPath());
  const assetUsage = collectAssetUsage(config.site.distPath, pageOutputPaths, sourceAssets);
  if (options.listUsedAssets) {
    printAssetList("Used assets", assetUsage.usedAssets);
  }
  if (options.listUnusedAssets) {
    printAssetList("Unused assets", assetUsage.unusedAssets);
  }
  const assetsToCopy = options.copyAllAssets ? assetUsage.allAssets : [...assetUsage.usedAssets];
  return copyAssetsIfChanged(config.site.srcPath, config.site.distPath, assetsToCopy);
}
function logBuildSummary(startTime, pageCount, skippedPages, skippedAssets, sitemapSkipped) {
  const timeDiff = process.hrtime(startTime);
  const duration = timeDiff[0] * 1e3 + timeDiff[1] / 1e6;
  const round = (d) => Math.round(d * 10) / 10;
  const parts = [];
  if (skippedPages > 0) parts.push(`${skippedPages} page${skippedPages !== 1 ? "s" : ""}`);
  if (skippedAssets > 0) parts.push(`${skippedAssets} asset${skippedAssets !== 1 ? "s" : ""}`);
  if (sitemapSkipped > 0) parts.push("sitemap");
  const skippedMsg = parts.length > 0 ? ` (${parts.join(", ")} unchanged)` : "";
  console.log(`${(/* @__PURE__ */ new Date()).toLocaleString()} Successfully built ${pageCount} pages in ${round(duration)} ms, ${round(duration / pageCount)} ms/page${skippedMsg}`);
}
function build(config, options = {}) {
  const startTime = process.hrtime();
  Page.pages = { all: [] };
  if (config.site.clean) {
    fse3.emptyDirSync(config.site.distPath);
  }
  const { builds, skippedCount } = buildPublishedPages(config);
  let sitemapSkipped = 0;
  if (config.sitemap) {
    const sitemapWritten = buildSitemap(config, builds);
    if (!sitemapWritten) {
      sitemapSkipped = 1;
    }
  }
  const assetCopy = processAssets(config, builds, options);
  logBuildSummary(startTime, builds.length, skippedCount, assetCopy.skipped, sitemapSkipped);
}

// scripts/lib/args.ts
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
var printHelp = () => {
  console.log(`
Usage
  $ nanogen [config-file] [...options]
  The config file parameter defaults to 'nanogen.config.js' if not informed.
Options
  -w, --watch     Start local server and watch for file changes
  -p, --port      Port to use for local server (default: 3000)
  -c, --clean     Clear output directory before building
  --copy-all-assets    Copy all assets from src/assets
  --list-used-assets   Print assets referenced by generated pages
  --list-unused-assets Print assets not referenced by generated pages
  -h, --help      Display this help text
  -s, --serve     Start local server to serve the generated files
  -v, --verbose   Enable verbose logging
`);
};

// scripts/lib/watch.ts
import * as chokidar from "chokidar";
import lodash3 from "lodash";
var watch2 = (config, onRebuild, buildOptions = {}) => {
  console.log(`Watching ${config.site.srcPath} for changes...`);
  chokidar.watch(config.site.srcPath).on(
    "all",
    lodash3.debounce(() => {
      build(config, buildOptions);
      onRebuild?.();
      console.log("Waiting for changes...");
    }, 500)
  );
};

// scripts/lib/server.ts
import * as http from "http";
import handler from "serve-handler";

// scripts/lib/dev-reload.ts
import * as path5 from "path";
import fse4 from "fs-extra";
var DEV_RELOAD_ENDPOINT = "/__nanogen_reload";
var buildDevReloadScript = () => `
<script>
(() => {
  const endpoint = '${DEV_RELOAD_ENDPOINT}';
  let version = null;

  const check = async () => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) return;

      const data = await response.json();
      const nextVersion = Number(data?.version ?? 0);

      if (version === null) {
        version = nextVersion;
        return;
      }

      if (nextVersion !== version) {
        window.location.reload();
      }
    } catch (_) {
      // ignore network errors during local development
    }
  };

  check();
  setInterval(check, 1000);
})();
</script>
`;
var injectDevReloadScript = (html) => {
  const script = buildDevReloadScript();
  if (html.includes(DEV_RELOAD_ENDPOINT)) {
    return html;
  }
  const closeBodyTag = "</body>";
  const bodyIndex = html.lastIndexOf(closeBodyTag);
  if (bodyIndex === -1) {
    return `${html}${script}`;
  }
  return `${html.slice(0, bodyIndex)}${script}${html.slice(bodyIndex)}`;
};
var getHtmlCandidates = (distPath, pathname) => {
  const relativePath = pathname.replace(/^\/+/, "");
  const decodedPath = decodeURIComponent(relativePath);
  const normalizedPath = path5.normalize(decodedPath).replace(/^\.\.(?:[/\\]|$)+/, "");
  const isDirectoryPath = pathname.endsWith("/");
  const extension = path5.extname(normalizedPath);
  if (extension === ".html") {
    return [path5.join(distPath, normalizedPath)];
  }
  if (extension !== "") {
    return [];
  }
  if (normalizedPath === "") {
    return [path5.join(distPath, "index.html")];
  }
  if (isDirectoryPath) {
    return [path5.join(distPath, normalizedPath, "index.html")];
  }
  return [
    path5.join(distPath, normalizedPath, "index.html"),
    path5.join(distPath, `${normalizedPath}.html`)
  ];
};
var tryServeHtmlWithDevScript = async (config, req, res) => {
  const distPath = path5.resolve(config.site.distPath ?? "./public");
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const candidates = getHtmlCandidates(distPath, requestUrl.pathname);
  for (const candidatePath of candidates) {
    if (await fse4.pathExists(candidatePath)) {
      const stats = await fse4.stat(candidatePath);
      if (!stats.isFile()) {
        continue;
      }
      const html = await fse4.readFile(candidatePath, "utf8");
      const output = injectDevReloadScript(html);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(output);
      return true;
    }
  }
  return false;
};

// scripts/lib/server.ts
var serve = (config, port, getReloadVersion = () => 0) => {
  console.log(`Starting local server at http://localhost:${port}`);
  const server = http.createServer(async (req, res) => {
    const requestPath = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname;
    if (requestPath === DEV_RELOAD_ENDPOINT) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ version: getReloadVersion() }));
      return;
    }
    const servedHtml = await tryServeHtmlWithDevScript(config, req, res);
    if (servedHtml) {
      return;
    }
    await handler(req, res, {
      public: config.site.distPath,
      headers: [{
        source: "**/*",
        headers: [{
          key: "Cache-Control",
          value: "no-store"
        }]
      }]
    });
  });
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
};

// scripts/lib/config.ts
import { pathToFileURL } from "url";
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

// scripts/cli.ts
var runNanogen = async (argv = process.argv.slice(2)) => {
  const verbose = getBoolArg(argv, "v", "verbose");
  const log = createLogger(verbose);
  if (getBoolArg(argv, "h", "help")) {
    printHelp();
    return;
  }
  const configFileName = pickConfigFile(argv);
  const configFile = path6.resolve(configFileName);
  log(`Using configuration file: ${configFileName} resolved to: ${configFile}`);
  if (!fse5.existsSync(configFile)) {
    throw new Error(`The configuration file "${configFile}" is missing`);
  }
  const config = await loadConfig(configFile);
  const clean = getBoolArg(argv, "c", "clean");
  config.site = { ...defaultSiteConfig, ...config.site, clean };
  log("Site configuration:", config.site.srcPath, config.site.distPath, config.site.rootUrl);
  const shouldWatch = getBoolArg(argv, "w", "watch");
  const shouldServe = getBoolArg(argv, "s", "serve");
  const buildOptions = {
    copyAllAssets: getBoolArg(argv, "", "copy-all-assets"),
    listUsedAssets: getBoolArg(argv, "", "list-used-assets"),
    listUnusedAssets: getBoolArg(argv, "", "list-unused-assets")
  };
  build(config, buildOptions);
  let reloadVersion = 0;
  if (shouldWatch) {
    watch2(config, () => {
      reloadVersion += 1;
    }, buildOptions);
  }
  if (shouldServe) {
    const port = getIntArg(argv, "p", "port", 3e3);
    serve(config, port, () => reloadVersion);
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
