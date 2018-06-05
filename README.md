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

## Setup

```console
$ npm i
$ npm run build
$ npm run serve
```

Go to the indicated URL in a browser to see the generated site.

## Configuration

All the configurable values are in `site.config.js`.

The properties of `pageMetaDefault` will be assigned to each page then overriden by meta data if present.

## Build the builder

If you made changes to the TypeScript files in `/scripts`, type `tsc` to transpile into Javascript.