const projects = require('./src/data/projects')

module.exports = {
  pageMetaDefault: {
    title: 'No Title',
    layout: 'default'
  },
  site: {
    srcPath: './src',
    distPath: './public',
    rootUrl: '/',
    metaSeparator: '!!!',
    title: 'NanoGen',
    description: 'Static Site Generator in Node.js',
    projects
  }
}