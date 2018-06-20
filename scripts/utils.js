"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.fixLooseJson = fixLooseJson;
