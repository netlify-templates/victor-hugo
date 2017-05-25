window.addEventListener("load", loadArrows);

$(window).on('scroll', function() {
    showMenuPrimaryMenuArrows();
    showMenuSecondaryMenuArrows();
});


$("#contentMenuPrimary").on('scroll', function() {

                removeMenuPrimaryMenuArrows();
                showMenuPrimaryMenuArrows();

});
$("#contentMenuSecondary").on('scroll', function() {

                removeMenuSecondaryMenuArrows();
                showMenuSecondaryMenuArrows();

});


$('#menuArrow-1').on("click", function(){
            var trigger_position = document.getElementById('menuArrow-1-trigger').offsetLeft;
            $('#contentMenuPrimary').animate({scrollLeft:trigger_position}, 200);
});
$('#menuArrow-2').on("click", function(){
            var trigger_position = $('#menuArrow-1-trigger').outerWidth();
            $('#contentMenuPrimary').animate({scrollLeft:trigger_position}, 200);
});
$('#menuArrow-3').on("click", function(){
            var trigger_position = document.getElementById('menuArrow-2-trigger').offsetLeft;
            $('#contentMenuSecondary').animate({scrollLeft:trigger_position}, 200);
});
$('#menuArrow-4').on("click", function(){
            var trigger_position = $('#menuArrow-2-trigger').outerWidth();
            $('#contentMenuSecondary').animate({scrollLeft:trigger_position}, 200);
});







function loadArrows () {

    showMenuPrimaryMenuArrows();
    showMenuSecondaryMenuArrows();
    };


function showMenuPrimaryMenuArrows () {
            removeMenuPrimaryMenuArrows();

            if ($('#menuArrow-1-trigger').length) {
                var posElement1 = document.getElementById('menuArrow-1-trigger').getBoundingClientRect();
                if (posElement1.left < 0) {
                    $('#menuArrow-1').addClass('show');
                };

                if ((posElement1.right - 1) > $(window).width()) {
                    $('#menuArrow-2').addClass('show');
                };
            };
    };

function removeMenuPrimaryMenuArrows () {
                $('#menuArrow-1').removeClass('show');
                $('#menuArrow-2').removeClass('show');
    };


function showMenuSecondaryMenuArrows () {
            removeMenuSecondaryMenuArrows();

            if ($('#menuArrow-2-trigger').length) {
                var posElement2 = document.getElementById('menuArrow-2-trigger').getBoundingClientRect();
                if (posElement2.left < 0) {
                    $('#menuArrow-3').addClass('show');
                };

                if ((posElement2.right - 1) > $(window).width()) {
                    $('#menuArrow-4').addClass('show');
                };
            };
    };

function removeMenuSecondaryMenuArrows () {
                $('#menuArrow-3').removeClass('show');
                $('#menuArrow-4').removeClass('show');
    };