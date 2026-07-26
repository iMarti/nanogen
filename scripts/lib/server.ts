/**
 * Local development server with live-reload support
 */

import * as http from 'http';
import * as path from 'path';
import fse from 'fs-extra';
import type { IConfig } from '../interfaces.js';
import { DEV_RELOAD_ENDPOINT, tryServeHtmlWithDevScript } from './dev-reload.js';

const CONTENT_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8'
};

const getContentType = (filePath: string): string => {
	return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
};

const normalizeRequestPath = (urlPath: string): string => {
	const decoded = decodeURIComponent(urlPath);
	const normalized = path.normalize(decoded).replace(/^\.{2,}(?:[/\\]|$)+/, '');
	return normalized.replace(/^[/\\]+/, '');
};

const tryServeStaticFile = async (config: IConfig, req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> => {
	const distPath = path.resolve(config.site.distPath ?? './public');
	const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
	let filePath = path.join(distPath, normalizeRequestPath(requestUrl.pathname));

	const tryFile = async (candidate: string): Promise<string | null> => {
		if (await fse.pathExists(candidate)) {
			const stats = await fse.stat(candidate);
			if (stats.isFile()) {
				return candidate;
			}
		}
		return null;
	};

	const candidates = [
		filePath,
		`${filePath}.html`,
		path.join(filePath, 'index.html')
	];

	for (const candidate of candidates) {
		const actualPath = await tryFile(candidate);
		if (actualPath) {
			res.statusCode = 200;
			res.setHeader('Content-Type', getContentType(actualPath));
			res.setHeader('Cache-Control', 'no-store');
			const stream = fse.createReadStream(actualPath);
			stream.pipe(res);
			stream.on('error', () => {
				res.statusCode = 500;
				res.end('Internal Server Error');
			});
			return true;
		}
	}

	return false;
};

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

		if (requestPath === DEV_RELOAD_ENDPOINT) {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json; charset=utf-8');
			res.setHeader('Cache-Control', 'no-store');
			res.end(JSON.stringify({ version: getReloadVersion() }));
			return;
		}

		const servedHtml = await tryServeHtmlWithDevScript(config, req, res);
		if (servedHtml) {
			return;
		}

		const servedStatic = await tryServeStaticFile(config, req, res);
		if (servedStatic) {
			return;
		}

		res.statusCode = 404;
		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		res.end('Not Found');
	});

	server.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`);
	});
};
