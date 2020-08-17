# SveltR

**A blogdown/svelte boilerplate for creating truly epic visualizations**, *inspired by Netlify's [Victor Hugo](https://github.com/netlify-templates/victor-hugo)*

<a href="https://bookdown.org/yihui/blogdown" target="_blank">
    <img src="https://bookdown.org/yihui/blogdown/images/logo.png"
         style="max-width: 80px; opacity: 0.25;"
         alt="blogdown logo" width="10%" align="left" />
</a>

<a href="https://svelte.dev/" target="_blank">
    <img src="docs/svelte.svg"
         style="max-width: 80px; opacity: 0.25;"
         alt="svelte logo" width="12%" align="right" />
</a>

This is a boilerplate for using [blogdown (R Markdown x Hugo)](https://github.com/rstudio/blogdown/) as a static site generator and [Svelte](https://svelte.dev/) as your reactive app engine.

This project is released under the [MIT license](LICENSE). Please make sure you understand its implications and guarantees.

## Usage

### :exclamation: Prerequisites

Sveltr requires a working R with the blogdown package, the latest/LTS [node](https://nodejs.org/en/download/) and [npm](https://www.npmjs.com/get-npm). You will need to have installed the following native libraries on the host operating system in order for R to compile some of the examples (see [tech.Rmd](content/tech.Rmd)):
pandoc gdal geos proj udunits2

Next step, clone this repository and run:

```bash
npm install
```

This will take some time and will install all packages necessary to run Sveltr and its tasks.

### :construction_worker: Development

While developing your website use:

```bash
npm start:dev
```

Then visit http://localhost:4321 _- or whatever local host and port number that blogdown/servr displays in the terminal -_ to preview your new website. Svelte Dev Server will automatically reload the CSS and Javascript when the bundled stylesheets and scripts in the  src folder change, while blogdown will rebuild the static pages when the content changes.

### :package: Static build

To build a static version of the website inside the `/public` folder, run:

```bash
npm run build
```

To get a preview of posts or articles not yet published, run:

```bash
npm run build:preview
```

See [package.json](package.json#L8) for all tasks.

## Structure

```
|--content          // Pages and collections - ask if you need extra pages
|--data             // YAML data files with any data for use in examples
|--layouts          // This is where all templates go
|  |--partials      // This is where includes live
|  |--index.html    // The index page
|--static           // Files in here ends up in the public folder
|--src                 // Files that will pass through the asset pipeline
|  |--App.svelte              // Add Svelte apps with the extension .svelte
|  |--main.js         // main.js is the Svelte/Webpack entry for your reactive assets
|--themes           // Install Hugo theme here and reference in config.toml
```

## Basic Concepts

You can read more about Hugo's template language in their documentation here:

https://gohugo.io/templates/overview/

The most useful page there is the one about the available functions:

https://gohugo.io/templates/functions/

For assets that are completely static and don't need to go through the asset pipeline,
use the `static` folder. Images, font-files, etc, all go there.

Files in the static folder end up in the web root. So a file called `static/favicon.ico`
will end up being available as `/favicon.ico` and so on...

The `src/main.js` file is the entrypoint for Svelte and will be built to `/public/main.js`

You can use **ES6** and use both relative imports or import libraries from npm.

## Environment variables

To separate the development and production _- aka build -_ stages, all gulp tasks run with a node environment variable named either `development` or `production`.

You can access the environment variable inside the theme files with `getenv "NODE_ENV"`. See the following example for a conditional statement:

    {{ if eq (getenv "NODE_ENV") "development" }}You're in development!{{ end }}

All tasks starting with _build_ set the environment variable to `production` - the other will set it to `development`.

## Deploying to Netlify

- Push your clone to your own GitHub repository.
- [Create a new site on Netlify](https://app.netlify.com/start) and link the repository.

Now Netlify will build and deploy your site whenever you push to git.

You can also click this button:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/real-currents/sveltr)

## Enjoy!! 😸
