# NanoGen

Static site generator in Node.js

See the post: https://medium.com/douglas-matoso-english/build-static-site-generator-nodejs-8969ebe34b22

## Main differences

Compared to the repository it has been forked from, here are the main differences:

- templates have access to a `page` object having a simple interface with the following properties that greatly help generating navigation links:
	- `parent` gives access to the parent page having the same interface.
	- `children` an array of child pages
	- `siblings` an array of sibling pages
	- `ancestors` an array of all ancestors of this page, starting from the home page
	- `url` the URL of this page, can be used to build links
	- see other properties in ` IPage` definition in `scripts/interfaces.ts`.
- if a page has an `id` (for instance `{id:'featured'}`) in its meta data, the page is accessible with `pages.featured`.
- page meta data is a versatile JSON structure at the top of the file
- the building script was rewritten in TypeScript

## Using NanoGen as a Dev Dependency

### Adding to Your Project

1. **Add NanoGen to your `package.json`:**

You can either install it directly:
```console
npm install --save-dev nanogen
```

Or add it manually to your `package.json`:
```json
{
  "name": "my-website",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "nanogen",
    "dev": "nanogen -w",
    "serve": "nanogen -s"
  },
  "devDependencies": {
    "nanogen": "^0.0.2"
  }
}
```

Then run `npm install` to install dependencies.

2. **Configure your build workflow:**

The npm scripts above allow you to:
- `npm run build` - Build your site once (useful for CI/CD)
- `npm run dev` - Watch for changes and rebuild automatically during development
- `npm run serve` - Serve the built site on a local server

### Project Structure

Create the following structure in your project:
```
my-project/
├── site.config.js          # Site configuration
├── src/
│   ├── assets/            # Static assets (CSS, images, etc.)
│   │   ├── css/
│   │   └── images/
│   ├── layouts/           # EJS layout templates
│   │   ├── default.ejs
│   │   └── partials/
│   └── pages/             # Your content pages (.md, .ejs, .html)
│       └── index.md
└── public/                # Generated output (gitignored)
```

### Configuration

Create a `site.config.js` in your project root:
```js
export default {
	pageMetaDefault: {
		// Default meta values for all pages
	},
	site: {
		srcPath: './src',
		distPath: './public',
		title: 'My Site',
		description: 'My static site',
		fileOutputMode: 'files', // or 'folders'
	},
	sitemap: {
		generate: true,
		domain: 'https://example.com'
	}
}
```

### Running NanoGen

Once configured, use the npm scripts to work with your site:

**Build your site for production:**
```console
npm run build
```
This generates the static files in your `public/` directory (or wherever `distPath` points).

**Development with auto-rebuild:**
```console
npm run dev
```
This watches your source files and rebuilds automatically when changes are detected.

**Preview your site locally:**
```console
npm run serve
```
This starts a local web server to preview your built site.

**Development workflow:**
For the best development experience, run both watch and serve in separate terminals:
```console
# Terminal 1: Watch and rebuild
npm run dev

# Terminal 2: Serve the site
npm run serve
```

You can also run NanoGen directly with npx if needed:
```console
npx nanogen -h              # View all options
npx nanogen site.config.js  # Build with custom config file
```

### Deployment

After running `npm run build`, deploy the contents of your `public/` directory to any static hosting service (Netlify, Vercel, GitHub Pages, AWS S3, etc.).

Example CI/CD workflow:
```yaml
# .github/workflows/deploy.yml
- run: npm ci
- run: npm run build
- uses: peaceiris/actions-gh-pages@v3
  with:
    publish_dir: ./public
```

## Local Development of NanoGen

For local development of NanoGen itself:
```console
npm i
npm run compile
```

Install `nanogen` as a command tool while developing this repo:
```console
npm link
```
Otherwise the tool is invoked with `node nanogen.js`.

As you write pages for your website, run these commands in two separate consoles, to watch and serve the pages, respectively. 
```console
nanogen -w
nanogen -s
```

Go to the indicated URL in a browser to see the generated site.

## Configuration

All the configurable values are in `site.config.js`.

The properties of `pageMetaDefault` will be assigned to each page then overriden by meta data if present.

## Programmatic use

NanoGen can be called directly from Node for custom pipelines:
```ts
import { build, defaultSiteConfig } from 'nanogen';

await build({
	pageMetaDefault: {},
	site: { ...defaultSiteConfig, srcPath: './src', distPath: './public' }
});
```

## Build the builder

If you made changes to the TypeScript files in `/scripts`, execute `npm run compile` which will bundle the TypeScript files (using ES modules) into a single `nanogen.js` file in the root directory.

Install the CLI with `npm link` on the root folder, then you can call `nanogen -h` to get available command options.