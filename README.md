# Hugo + Webpack Boilerplate

This is a boilerplate for using Hugo as a static site generator and Weback as the
asset pipeline.

It's setup to use post-css and babel for CSS and JavaScript.

## Usage

Clone this repository and run:

```bash
npm install
npm start
```

Then visit http://localhost:3009/

To build your static output, use:

```bash
npm run build
```

## Deploying to netlify

Push your clone to your own GitHub repo, then start a new netlify project, pick
your repository and configure it like this:

* **Build Command:** npm run build
* **Directory:** dist

Now netlify will build and deploy your site whenever you push to git.
