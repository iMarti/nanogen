#!/usr/bin/env node
"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var fse = require("fs-extra");
var chalk_1 = require("chalk");
var meow = require("meow");
var page_builder_1 = require("./page-builder");
var liveServer = require('live-server');
var chokidar = require('chokidar');
var debounce = require('lodash.debounce');
var cli = meow(chalk_1.default(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    {underline Usage}\n      $ nanogen [config-file] [...options]\n      The config file parameter defaults to 'site-config.js' if not informed.\n    {underline Options}\n      -w, --watch     Start local server and watch for file changes\n      -p, --port      Port to use for local server (default: 3000)\n      \n      -h, --help      Display this help text\n      -v, --version   Display nanogen version\n  "], ["\n    {underline Usage}\n      $ nanogen [config-file] [...options]\n      The config file parameter defaults to 'site-config.js' if not informed.\n    {underline Options}\n      -w, --watch     Start local server and watch for file changes\n      -p, --port      Port to use for local server (default: 3000)\n      \n      -h, --help      Display this help text\n      -v, --version   Display nanogen version\n  "]))), {
    flags: {
        watch: {
            type: 'boolean',
            default: false,
            alias: 'w'
        },
        serve: {
            type: 'boolean',
            default: false,
            alias: 's'
        },
        port: {
            type: 'string',
            default: '3000',
            alias: 'p'
        },
        help: {
            type: 'boolean',
            alias: 'h'
        },
        version: {
            type: 'boolean',
            alias: 'v'
        }
    }
});
// load config file
var configFile = path.resolve(cli.input.length > 0 ? cli.input[0] : 'site.config.js');
if (!fse.existsSync(configFile))
    throw "The configuration file \"" + configFile + "\" is missing";
var config = require(configFile);
function watch(options) {
    chokidar.watch(config.site.srcPath).on('all', debounce(function () {
        page_builder_1.build(config);
        console.log('Waiting for changes...');
    }, 500));
}
;
function serve(config, port) {
    console.log("Starting local server at http://localhost:" + port);
    liveServer.start({
        port: port,
        root: config.site.distPath,
        open: false,
        logLevel: 0
    });
}
if (cli.flags.watch) {
    watch(config);
}
else if (cli.flags.serve) {
    serve(config, cli.flags.port);
}
else {
    page_builder_1.build(config);
}
var templateObject_1;
