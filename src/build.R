if (!require("blogdown")) {
    install.packages("blogdown")
    library(blogdown)
    blogdown::install_hugo()
}
blogdown::build_site()
