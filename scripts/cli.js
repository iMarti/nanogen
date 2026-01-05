#!/usr/bin/env node
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
const path = __importStar(require("path"));
const fse = __importStar(require("fs-extra"));
const page_builder_1 = require("./page-builder");
const live_server_1 = __importDefault(require("live-server"));
const chokidar = __importStar(require("chokidar"));
const lodash_1 = require("lodash");
const args = process.argv.slice(2);
const configFileName = args.length > 0 && !args[0].startsWith('-') ? args[0] : 'site.config.js';
function getBoolArg(abbr, full) {
    return args.includes('-' + abbr) || args.includes('--' + full);
}
function getIntArg(abbr, full, defaultValue) {
    if (getBoolArg(abbr, full)) {
        let pos = args.indexOf('-' + abbr);
        if (pos === -1)
            pos = args.indexOf('--' + full);
        if (pos !== -1)
            return +args[pos + 1];
    }
    return defaultValue;
}
function watch(config) {
    chokidar.watch(config.site.srcPath).on('all', (0, lodash_1.debounce)(() => {
        (0, page_builder_1.build)(config);
        console.log('Waiting for changes...');
    }, 500));
}
;
function serve(config, port) {
    console.log(`Starting local server at http://localhost:${port}`);
    live_server_1.default.start({
        port: port,
        root: config.site.distPath,
        open: false,
        logLevel: 0
    });
}
if (getBoolArg('h', 'help'))
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
    // load config file
    const configFile = path.resolve(configFileName);
    if (!fse.existsSync(configFile))
        throw `The configuration file "${configFile}" is missing`;
    let config = require(configFile);
    const defaultSiteConfig = {
        rootUrl: '/',
        metaSeparator: '!!!',
        fileOutputMode: 'files',
        outputExtension: '.html',
        indexPageName: 'index',
        defaultLayout: 'default'
    };
    config.site = { ...defaultSiteConfig, ...config.site };
    if (getBoolArg('w', 'watch')) {
        watch(config);
    }
    else if (getBoolArg('s', 'serve')) {
        const port = getIntArg('p', 'port', 3000);
        serve(config, port);
    }
    else {
        (0, page_builder_1.build)(config);
    }
}
