import fs from 'fs';

const projects = JSON.parse(fs.readFileSync('./src/data/projects.json', 'utf8'));

export default {
	pageMetaDefault: {
	},
	site: {
		srcPath: './src',
		distPath: './public',
		title: 'NanoGen',
		description: 'Static Site Generator in Node.js',
		fileOutputMode: 'files',
		projects
	},
	sitemap: {
		generate: true,
		domain: 'https://example.com'
	}
}