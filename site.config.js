const projects = require('./src/data/projects')

module.exports = {
  pageMetaDefault: {
    title: 'No Title'
  },
  site: {
    srcPath: './src',
    distPath: './public',
    title: 'NanoGen',
    description: 'Static Site Generator in Node.js',
    projects
  },
  sitemap: {
    generate: true,
    domain: 'https://example.com'
  }
}