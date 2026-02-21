/**
 * Local development server with live-reload support
 */

import * as http from 'http';
import handler from 'serve-handler';
import type { IConfig } from '../interfaces.js';
import { DEV_RELOAD_ENDPOINT, tryServeHtmlWithDevScript } from './dev-reload.js';

/**
 * Start a local development server
 * @param config Site configuration
 * @param port Port number to listen on
 * @param getReloadVersion Optional callback to get current reload version
 */
export const serve = (config: IConfig, port: number, getReloadVersion: () => number = () => 0): void => {
	console.log(`Starting local server at http://localhost:${port}`);
    const server = http.createServer(async (req, res) => {
        const requestPath = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

        // Handle dev reload endpoint
        if (requestPath === DEV_RELOAD_ENDPOINT) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({ version: getReloadVersion() }));
            return;
        }

        // Try to serve HTML files with injected reload script
        const servedHtml = await tryServeHtmlWithDevScript(config, req, res);
        if (servedHtml) {
            return;
        }

        // Serve static files with no-cache headers in dev mode
        await handler(req, res, {
            public: config.site.distPath,
            headers: [{
                source: '**/*',
                headers: [{
                    key: 'Cache-Control',
                    value: 'no-store'
                }]
            }]
        });
    });
	server.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`);
	});
};
