# Victor Hugo

**A [Hugo](https://gohugo.io/) boilerplate for creating truly epic websites**

This is a boilerplate for using Hugo as a static site generator and Gulp + Webpack as your
asset pipeline.

It's setup to use post-css and babel for CSS and JavaScript.

This project is released under the [MIT license](LICENSE). Please make sure you understand its implications and guarantees.

## Usage

Be sure that you have the latest node, npm and [Hugo](https://gohugo.io/) installed. If you need to install hugo on OSX, run:

```bash
brew install hugo
```

If you don't use OSX or don't use homebrew, follow the instructions for installation here instead:

http://gohugo.io/overview/installing/

Next, clone this repository and run:

```bash
npm install
npm start
```

To build your static output to the `/dist` folder, use:

```bash
npm run build
```

Or you can build and run using [docker](https://www.docker.com):

```bash
# Default docker setup: 
./scripts/create-docker-machine-and-run-it

# -- OR --

# Run with custom machine name, specific hugo version, specific node version and run docker in detached mode:
./scripts/create-docker-machine-and-run-it -m app-devel -g 0.9 -n 6.10.0 -d
```

Then visit http://localhost:3000/ - BrowserSync will automatically reload CSS or
refresh the page when stylesheets or content changes.

**Note:** You only run the `./scripts/create-docker-machine-and-run-it` if you want to create 
a new docker machine. Once the docker machine is created, you have to use docker commands 
to manage it. Please be familiar with docker in this regard.

## Structure

```
|--site                // Everything in here will be built with hugo
|  |--content          // Pages and collections - ask if you need extra pages
|  |--data             // YAML data files with any data for use in examples
|  |--layouts          // This is where all templates go
|  |  |--partials      // This is where includes live
|  |  |--index.html    // The index page
|  |--static           // Files in here ends up in the public folder
|--src                 // Files that will pass through the asset pipeline
|  |--css              // CSS files in the root of this folder will end up in /css/...
|  |--js               // app.js will be compiled to /app.js with babel
```

## Basic Concepts

You can read more about Hugo's template language in their documentation here:

https://gohugo.io/templates/overview/

The most useful page there is the one about the available functions:

https://gohugo.io/templates/functions/

For assets that are completely static and don't need to go through the asset pipeline,
use the `site/static` folder. Images, font-files, etc, all go there.

Files in the static folder ends up in the web root. So a file called `site/static/favicon.ico`
will end up being available as `/favicon.ico` and so on...

The `src/js/app.js` file is the entrypoint for webpack and will be built to `/dist/app.js`.

You can use ES6 and use both relative imports or import libraries from npm.

Any CSS file directly under the `src/css/` folder will get compiled with [PostCSS Next](http://cssnext.io/)
to `/dist/css/{filename}.css`. Import statements will be resolved as part of the build

## Deploying to netlify

- Push your clone to your own GitHub repository.
- [Create a new site on Netlify](https://app.netlify.com/start) and link the repository.

Now netlify will build and deploy your site whenever you push to git.

You can also click this button:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/eliwilliamson/victor-hugo)



## Enjoy!!
