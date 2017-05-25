
// Dejamos fixed menu y submenu cuando llega al top

var menu = $("header");
var posicion_menu = menu.position(); 


$(document).on("scroll", function(){
    var desplazamientoActual = $(document).scrollTop();
    
    if (desplazamientoActual >= posicion_menu.top) {
        $("body").addClass('js-menu-fixed') 
    }else{
        $("body").removeClass('js-menu-fixed') 
    };
});

$(function(){
    $("#navbar-toggle").click(function(event) {
        $("body").toggleClass('navbar-toggle-open');
    });
});