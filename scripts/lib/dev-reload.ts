/**
 * Browser auto-reload functionality for development
 */

import * as path from 'path';
import fse from 'fs-extra';
import type * as http from 'http';
import type { IConfig } from '../interfaces.js';

const DEV_RELOAD_ENDPOINT = '/__nanogen_reload';

const buildDevReloadScript = (): string => `\n<script>\n(() => {\n  const endpoint = '${DEV_RELOAD_ENDPOINT}';\n  let version = null;\n\n  const check = async () => {\n    try {\n      const response = await fetch(endpoint, { cache: 'no-store' });\n      if (!response.ok) return;\n\n      const data = await response.json();\n      const nextVersion = Number(data?.version ?? 0);\n\n      if (version === null) {\n        version = nextVersion;\n        return;\n      }\n\n      if (nextVersion !== version) {\n        window.location.reload();\n      }\n    } catch (_) {\n      // ignore network errors during local development\n    }\n  };\n\n  check();\n  setInterval(check, 1000);\n})();\n</script>\n`;

const injectDevReloadScript = (html: string): string => {
    const script = buildDevReloadScript();
    if (html.includes(DEV_RELOAD_ENDPOINT)) {
        return html;
    }

    const closeBodyTag = '</body>';
    const bodyIndex = html.lastIndexOf(closeBodyTag);

    if (bodyIndex === -1) {
        return `${html}${script}`;
    }

    return `${html.slice(0, bodyIndex)}${script}${html.slice(bodyIndex)}`;
};

const getHtmlCandidates = (distPath: string, pathname: string): string[] => {
    const relativePath = pathname.replace(/^\/+/, '');
    const decodedPath = decodeURIComponent(relativePath);
    const normalizedPath = path.normalize(decodedPath).replace(/^\.\.(?:[/\\]|$)+/, '');
    const isDirectoryPath = pathname.endsWith('/');
    const extension = path.extname(normalizedPath);

    if (extension === '.html') {
        return [path.join(distPath, normalizedPath)];
    }

    if (extension !== '') {
        return [];
    }

    if (normalizedPath === '') {
        return [path.join(distPath, 'index.html')];
    }

    if (isDirectoryPath) {
        return [path.join(distPath, normalizedPath, 'index.html')];
    }

    return [
        path.join(distPath, normalizedPath, 'index.html'),
        path.join(distPath, `${normalizedPath}.html`)
    ];
};

export const tryServeHtmlWithDevScript = async (
    config: IConfig,
    req: http.IncomingMessage,
    res: http.ServerResponse
): Promise<boolean> => {
    const distPath = path.resolve(config.site.distPath ?? './public');
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const candidates = getHtmlCandidates(distPath, requestUrl.pathname);

    for (const candidatePath of candidates) {
        if (await fse.pathExists(candidatePath)) {
            const stats = await fse.stat(candidatePath);
            if (!stats.isFile()) {
                continue;
            }

            const html = await fse.readFile(candidatePath, 'utf8');
            const output = injectDevReloadScript(html);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(output);
            return true;
        }
    }

    return false;
};

export { DEV_RELOAD_ENDPOINT };
