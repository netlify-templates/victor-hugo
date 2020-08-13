if (!require("blogdown")) {
    install.packages("blogdown")
    library(blogdown)
    blogdown::install_hugo()
}

remotes::install_version('glmnet', version = '2.0-18')

install.packages(c(
    "caret","cluster","ggplot2","dplyr","gridExtra","repr","kknn",
    "hexbin","GGally","ROCR","pROC","glmnet","MASS","randomForest",
    "MLmetrics","e1071","klaR","nnet","plotly"
))
