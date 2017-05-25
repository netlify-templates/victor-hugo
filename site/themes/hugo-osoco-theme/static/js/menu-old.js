
num = $(window).height(); //number of pixels before modifying styles

lastScrollTop = 0; //last known position before scroll

altHeaderTop = $('.headerTop').height(); // altura del logo y menu primary...según la resolución de pantalla, podría ser 96px o 64px + 64px o 42px
altHeaderBottom  = $('.headerBottom').height(); // altura del headerBottom, que podría ser de 64px o 42px
positionOne = num - (altHeaderTop + altHeaderBottom);

$(window).bind('scroll', function () {
  showStickyMenu();

  showTopMenuWhenScrollTop();
});

$(window).resize(function() {
  showStickyMenu();
    });


/* Esta función muestra el sticky menu */
function showStickyMenu () {

console.log($(window).scrollTop());
    if (document.getElementsByClassName('headerTop')[0]) {
        if ($(window).scrollTop() >= positionOne) {
            document.getElementsByClassName('headerTop')[0].setAttribute("style","position: absolute; top:" + (positionOne) + "px;");
            console.log("recoloco siempre arriba al mover (está en positionOne: " + positionOne + ")");

        } else {
            document.getElementsByClassName('headerTop')[0].setAttribute("style","position: fixed; top:0px;");
            console.log("recoloco arriba");
        }
    }

    if ($(window).scrollTop() >= (num - altHeaderBottom)) {
        $('.headerTop').removeClass('show');
        $('.headerBottom').addClass('show');
    } else {
        $('.headerBottom').removeClass('show');
        $('nav a').removeClass('show');
        $('.headerTop').addClass('show');
    }
};




/* Esta función muestra el sticky menu */
function showTopMenuWhenScrollTop () {
   var st = $(this).scrollTop();

   if (!window.scrollingOnAnchor) {
      // if ($(window).width()<1025) { //si es tablet o menos

      if ($('.headerTop').height()<160) { //si el alto del headerTop es menor de 160px, segun las mediaquery la resolución es de 1024 o menor...es tablet o menos
        if (st >= $(window).height()) {
                 if (st > lastScrollTop){ // ¿Baja?
                      var diferencia = st-lastScrollTop;
                      if (diferencia > 5){
                          $('.headerTop').removeClass('onTop');
                      }
                 } else { // ¿Sube?
                      var diferencia = lastScrollTop - st;
                      if (diferencia > 5){
                        document.getElementsByClassName('headerTop')[0].setAttribute("style","position: fixed; top:0px;");
                          $('.headerTop').addClass('onTop');
                      }
                 }
                 lastScrollTop = st;
        } else {
                  $('.headerTop').removeClass('onTop');
        }
      } else { // si es desktop
         if (st >= $(window).height()) {
             if (st > lastScrollTop){
                  var diferencia = st-lastScrollTop;
                  if (diferencia > 20){
                      $('.headerTop').removeClass('onTop');
                  }
             } else {
                  var diferencia = lastScrollTop - st;
                  if (diferencia > 5){
                      document.getElementsByClassName('headerTop')[0].setAttribute("style","position: fixed; top:0px;");
                      $('.headerTop').addClass('onTop');
                  }
             }
             lastScrollTop = st;
          } else {
                  $('.headerTop').removeClass('onTop');
         }
       };
    };
};


  //show headerTop on top
  $('.btnMenu-top').click(function(event) {
        event.preventDefault();
        document.getElementsByClassName('headerTop')[0].setAttribute("style","position: fixed; top:0px;");
        $('.headerTop').addClass('onTop');
  });

  

    //hide headerTop on top
  $('.linkCloseLeft').click(function(event) {
        event.preventDefault();
        $('.headerTop').removeClass('onTop');
        document.getElementsByClassName('headerTop')[0].setAttribute("style","position: absolute; top:" + (positionOne) + "px;");
  });