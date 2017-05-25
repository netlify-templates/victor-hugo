# Changelog

### 4th August 2016

**With the following updates the theme requires Hugo v0.16 or greater.**

- Additions of menu in the sidebar
- Functionality for a simple blog has been added
    - Comments are powered by Disqus
- Sections on the homepage can now be hidden (look for the variable `hide` in example config file)
- Use of template inheritance (hence the required update to Hugo v0.16)
- A 404 page informs visitors about non-existing pages
- Google Analytics is now implemented with Hugo's internal template. **You have to move the `googleAnalytics` variable in order to use this feature ([Show diff](https://github.com/digitalcraftsman/hugo-strata-theme/commit/5bdca7d81b13348ad95f89d4bc4f2a7c928d3dbd))**
- Custom stylesheets and JS scripts can now be added with the `custom_css` and `custom_js` variable in the config file.
