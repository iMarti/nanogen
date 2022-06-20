#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var path = __importStar(require("path"));
var fse = __importStar(require("fs-extra"));
var page_builder_1 = require("./page-builder");
var live_server_1 = __importDefault(require("live-server"));
var chokidar = __importStar(require("chokidar"));
var lodash_1 = require("lodash");
var args = process.argv.slice(2);
var configFileName = args.length > 0 && !args[0].startsWith('-') ? args[0] : 'site.config.js';
function getBoolArg(abbr, full) {
    return args.includes('-' + abbr) || args.includes('--' + full);
}
function getIntArg(abbr, full, defaultValue) {
    if (getBoolArg(abbr, full)) {
        var pos = args.indexOf('-' + abbr);
        if (pos === -1)
            pos = args.indexOf('--' + full);
        if (pos !== -1)
            return +args[pos + 1];
    }
    return defaultValue;
}
function watch(config) {
    chokidar.watch(config.site.srcPath).on('all', (0, lodash_1.debounce)(function () {
        (0, page_builder_1.build)(config);
        console.log('Waiting for changes...');
    }, 500));
}
;
function serve(config, port) {
    console.log("Starting local server at http://localhost:".concat(port));
    live_server_1.default.start({
        port: port,
        root: config.site.distPath,
        open: false,
        logLevel: 0
    });
}
if (getBoolArg('h', 'help'))
    console.log("\nUsage\n  $ nanogen [config-file] [...options]\n  The config file parameter defaults to 'site-config.js' if not informed.\nOptions\n  -w, --watch     Start local server and watch for file changes\n  -p, --port      Port to use for local server (default: 3000)\n  \n  -h, --help      Display this help text\n");
else {
    // load config file
    var configFile = path.resolve(configFileName);
    if (!fse.existsSync(configFile))
        throw "The configuration file \"".concat(configFile, "\" is missing");
    var config = require(configFile);
    var defaultSiteConfig = {
        rootUrl: '/',
        metaSeparator: '!!!',
        fileOutputMode: 'files',
        outputExtension: '.html',
        indexPageName: 'index',
        defaultLayout: 'default'
    };
    config.site = __assign(__assign({}, defaultSiteConfig), config.site);
    if (getBoolArg('w', 'watch')) {
        watch(config);
    }
    else if (getBoolArg('s', 'serve')) {
        var port = getIntArg('p', 'port', 3000);
        serve(config, port);
    }
    else {
        (0, page_builder_1.build)(config);
    }
}
