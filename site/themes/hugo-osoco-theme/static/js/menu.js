// VARIABLES y PARAMETROS GLOBALES
varLastKnownPos = 0; //last known position before scroll

varHeaderTopExist = false; // por defecto 0 = NO
varHeaderBottomExist = false; // por defecto 0 = NO
// -------------fin variables globales--------------



$(window).bind('scroll', function () {
  showMenus();

});

$(window).resize(function() {
  showMenus();
    });


function showMenus () {
// -----start funcion-----

// VARIABLES y PARAMETROS 

varWindowHeight = $(window).height(); //number of pixels before modifying styles

varActualPos = $(window).scrollTop(); //actual position

varHeaderTopHeight=0; // por defecto 0
varHeaderBottomHeight=200; // por defecto 0
varVideoBannerHeight=0; // por defecto 0


varOffsetGoingUpTouch = 5;
varOffsetGoingDownTouch = 5;
varOffsetGoingUpDesktop = 100;
varOffsetGoingDownDesktop = 25;

varOffsetGoingUp=0; // por defecto 0
varOffsetGoingDown=0; // por defecto 0
// -------------fin variables--------------


if (document.getElementsByClassName('headerTop')[0]) { // ¿EXISTE HEADERTOP? En la home no existe.
  varHeaderTopExist = true; // SI, existe
  varHeaderTopHeight = $('.headerTop').height(); // altura del logo y menu primary...según la resolución de pantalla, podría ser 96px o 64px + 64px o 42px  
  if (varHeaderTopHeight < 160) { //si el alto del headerTop es menor de 160px, segun las mediaquery la resolución es de 1024 o menor...es tablet o menos
    varOffsetGoingUp = varOffsetGoingUpTouch;
    varOffsetGoingDown = varOffsetGoingDownTouch;
  } else { // si es desktop
    varOffsetGoingUp = varOffsetGoingUpDesktop;
    varOffsetGoingDown = varOffsetGoingDownDesktop;
  };
} else {
  varHeaderTopExist = false; // NO, no existe
}

if (document.getElementsByClassName('headerBottom')[0]) { // ¿EXISTE HEADERBOTTOM? En la home no existe.
  varHeaderBottomExist = true; // SI, existe
  varHeaderBottomHeight  = $('.headerBottom').height(); // altura del headerBottom, que podría ser de 64px o 42px
} else {
  varHeaderBottomExist = false; // NO, no existe
}

varVideoBannerHeight = varWindowHeight - (varHeaderTopHeight + varHeaderBottomHeight); // calcular el tamaño del video banner con los datos que se hayan obtenido de los tamaños del headertop y headerbottom





if (varActualPos < (varWindowHeight - varHeaderBottomHeight)) { // ESTOY SOBRE EL VIDEO BANNER 
    if (varHeaderBottomExist == true) { // ¿EXISTE HEADERBOTTOM? En la home no existe.
      hideHeaderBottom() // oculto el headerbottom
      $('nav a').removeClass('show');
    }
    if (varHeaderTopExist == true) { // ¿EXISTE HEADERTOP? En la home no existe.

      if (varActualPos < varVideoBannerHeight) { // ESTOY SOBRE VIDEO BANNER (menos el area del headerbottom+headertop)
            hideLeftCloseInHeaderTop(); // Oculto el boton cerrar izquierdo del headertop
            showHeaderTop(); // muestro el headertop // pongo headertop como sticky arriba al 0,0 haciendo que se mueva al desplazarse sobre video banner.
      } else { // ESTOY SOBRE VIDEO BANNER (menos el area del headerbottom+headertop)
            if (varActualPos < varLastKnownPos){ // SI ESTÁ SUBIENDO
                // no hacer nada aqui, ya está está mostrando el headerTop 
            } else {
              document.getElementsByClassName('headerTop')[0].setAttribute("style","position: absolute; top:" + (varVideoBannerHeight) + "px;"); // pongo headertop pegado abajo sobre el headerbottom (es el final del efecto del headertop moviendose al bajar sobre video banner)
            }
      };
    }
} else {
    if (window.scrollingOnAnchor == false) { // SI EL DESPLAZAMIENTO NO ES POR UN SALTO A ANCLA
      showHeaderBottom() // muestro el headerbottom
      if (varActualPos > varLastKnownPos){ // SI ESTÁ BAJANDO
          if ((varActualPos - varLastKnownPos) > varOffsetGoingDown){ // SI LA DISTANCIA DEL DESPLAZAMIENTO BAJANDO ES MAYOR A LA DEFINIDA COMO PARAMETRO, PROCEDO A OCULTAR EL HEADERTOP, SINO NO HAGO NADA
              hideHeaderTop(); // oculto el headertop
          }
      } else { // SI ESTÁ SUBIENDO
        if ((varLastKnownPos - varActualPos) > varOffsetGoingUp){ // SI LA DISTANCIA DEL DESPLAZAMIENTO SUBIENDO ES MAYOR A LA DEFINIDA COMO PARAMETRO, PROCEDO A MOSTRAR EL HEADERTOP, SINO NO HAGO NADA
          hideLeftCloseInHeaderTop(); // Oculto el boton cerrar izquierdo del headertop
          showHeaderTop(); // muestro el headertop
        }
      }
      
    } else { // SI EL DESPLAZAMIENTO ES POR UN SALTO A ANCLA
      hideHeaderTop(); // oculto el headertop
      showHeaderBottom() // muestro el headerbottom
    };
}


varLastKnownPos = varActualPos;
// -----fin funcion-----
};






function showHeaderTop() {
  if (varHeaderTopExist == true) { // ¿EXISTE HEADERTOP? En la home no existe.
    document.getElementsByClassName('headerTop')[0].removeAttribute("style","position: absolute; top:" + (varVideoBannerHeight) + "px;"); // pongo headertop como sticky arriba al 0,0 haciendo que se mueva al desplazarse sobre video banner.

    $('.headerTop').addClass('onTop');
  }
};

function hideHeaderTop() {
  if (varHeaderTopExist == true) { // ¿EXISTE HEADERTOP? En la home no existe.
    $('.headerTop').removeClass('onTop');
  }
};

function showLeftCloseInHeaderTop() {
  if (varHeaderTopExist == true) { // ¿EXISTE HEADERTOP? En la home no existe.
    $('.headerTop').removeClass('noCloseLeft');
  }
};

function hideLeftCloseInHeaderTop() {
  if (varHeaderTopExist == true) { // ¿EXISTE HEADERTOP? En la home no existe.
    $('.headerTop').addClass('noCloseLeft');
  }
};
function showHeaderBottom() {
  if (varHeaderBottomExist == true) { // ¿EXISTE HEADERBOTTOM? En algunas páginas no existe
    $('.headerBottom').addClass('show');
  }
};

function hideHeaderBottom() {
  if (varHeaderBottomExist == true) { // ¿EXISTE HEADERTOP? En algunas páginas no existe
    $('.headerBottom').removeClass('show');
  }
};



  //show headerTop on top
  $('.btnMenu-top').click(function(event) {
        event.preventDefault();
        showLeftCloseInHeaderTop();
        showHeaderTop();
  });

  

    //hide headerTop on top
  $('.linkCloseLeft').click(function(event) {
        event.preventDefault();
        hideLeftCloseInHeaderTop();
        hideHeaderTop();
  });