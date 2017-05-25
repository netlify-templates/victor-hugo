# Strata Theme

The Strata theme is a responsive and minimal one-page-portfolio based on the self-named template made by [HTML5UP](//html5up.net/). Noteworthy features of this Hugo theme are a custom about section, a portfolio with gallery for photographs or client works and a contact form.

![Screenshot](https://raw.githubusercontent.com/digitalcraftsman/hugo-strata-theme/dev/images/screenshot.png)


## Installation

Inside the folder of your Hugo site run:

    $ cd themes
    $ git clone https://github.com/digitalcraftsman/hugo-strata-theme.git

For more information read the official [setup guide](//gohugo.io/overview/installing/) of Hugo.


## Getting started

After installing the Strata Theme successfully it requires a just a few more steps to get your site finally running.


### The config file

Take a look inside the [`exampleSite`](https://github.com/digitalcraftsman/hugo-strata-theme/tree/dev/exampleSite) folder of this theme. You'll find a file called [`config.toml`](//github.com/digitalcraftsman/hugo-strata-theme/blob/dev/exampleSite/config.toml). To use it, copy the [`config.toml`](//github.com/digitalcraftsman/hugo-strata-theme/blob/dev/exampleSite/config.toml) in the root folder of your Hugo site. Feel free to customize this theme as you like.

### Sidebar

The sidebar provides a small overview of who you are. One of the first elements that will be spottet is the avatar in the sidebar. Replace it with a nice picture of you by either swapping the [`avatar.jpg`](https://github.com/digitalcraftsman/hugo-strata-theme/blob/dev/static/images/avatar.jpg) or by setting a new path to an image in [`config.toml`](//github.com/digitalcraftsman/hugo-strata-theme/blob/dev/exampleSite/config.toml):

```toml
[params.sidebar]
    avatar = "avatar.jpg"
```

The path is relative to [`./static/images`](https://github.com/digitalcraftsman/hugo-strata-theme/tree/dev/static/images).

Last but not least add a few words about you and your work.


### Build up your portfolio

As photograph or freelancer, your most important piece in the resume is the work you've done. Within the [`config.toml`](//github.com/digitalcraftsman/hugo-strata-theme/blob/dev/exampleSite/config.toml) add the following snippet to add a new item to the gallery:

```toml
[params.portfolio]

        # The images and thumbnails are stored under static/images
        # Create and change subfolders as you like
        [[params.portfolio.gallery]]
            image = "fulls/01.jpg"
            thumb = "thumbs/01.jpg"
            title = "Lorem ipsum dolor."
            description = "Lorem ipsum dolor sit amet."
```

### Make the contact form working

Since this page will be static, you can use [formspree.io](//formspree.io/) as proxy to send the actual email. Each month, visitors can send you up to one thousand emails without incurring extra charges. Begin the setup by following the steps below:

1. Enter your email address under 'email' in the [`config.toml`](//github.com/digitalcraftsman/hugo-strata-theme/blob/dev/exampleSite/config.toml)
2. Upload the generated site to your server
3. Send a dummy email yourself to confirm your account
4. Click the confirm link in the email from [formspree.io](//formspree.io/)
5. You're done. Happy mailing!


### Menu

You can also define the items menu entries as you like in the left sidebar. E.g. let's link a post that you've written. We can do this in the frontmatter of the post's content file by setting `menu` to `main`.

```
+++
menu = "main"
+++
```

Alternatively, we can add entries from the config file. Back in the config.toml you'll find a section for the menu:

```
[[menu.main]]
	name = "Home"
	url  = "/"
	weight = 0
```

The `weight` attribute allows your to change the order of the entries. Heavier weighted entries appear further down in the menu.

### Nearly finished

In order to see your site in action, run Hugo's built-in local server.

    $ hugo server

Now enter [`localhost:1313`](//localhost:1313) in the address bar of your browser.

To be able to access your site from anywhere, use the following:

    $ hugo server --bind=[Your IP] --port=80 --baseURL=https://example.com --appendPort=false


## Changelog

All modifications to this theme are listed in the [Changelog](//github.com/digitalcraftsman/hugo-strata-theme/blob/master/CHANGELOG.md).

## Contributing

Did you found a bug or got an idea for a new feature? Feel free to use the [issue tracker](//github.com/digitalcraftsman/hugo-strata-theme/issues) to let me know. Or make directly a [pull request](//github.com/digitalcraftsman/hugo-strata-theme/pulls).


## License

This theme is released under the Creative Commons Attribution 3.0 Unported  License. For more information read the [License](//github.com/digitalcraftsman/hugo-strata-theme/blob/dev/LICENSE.md).


## Annotations

Thanks to

- [HTML5UP](//html5up.net/) for creating the original theme
- [Steve Francia](//github.com/spf13) for creating [Hugo](//gohugo.io) and the awesome community around the project.
