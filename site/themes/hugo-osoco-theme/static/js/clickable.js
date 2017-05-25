jQuery(document).ready(function ($) {


    $('.divPortfolioPicture').click(function(event) {
        event.preventDefault();
        console.log($(this).attr('data-url'));
        parent.location=($(this).attr('data-url'));

    });

});    
