if (!require("blogdown")) {
    install.packages("blogdown")
    library(blogdown)
    blogdown::install_hugo()
}
blogdown::serve_site()
