$(document).ready(function() {
    setTopMarginToNextSibblingOfFullWidth();
});

function setTopMarginToNextSibblingOfFullWidth() {
    var heightOfFullWidth = $("#full-width").height();
    $("#full-width").next().css("margin-top", heightOfFullWidth);
}
