jQuery(document).ready(function ($) {


    $('a.sliderLauncher').click(function(event) {
        event.preventDefault();
        
            var full_url = this.href;
            
            var parts = full_url.split('#');
            var trgt = parts[1];
            

            $('.divTeamsSlide').removeClass('showup');
            
            var target_offset = $('#scrollThere-4').offset(); // que se desplace hacia arriba del section donde está el slider
            var target_top = target_offset.top -90; // aquí hace un offset para que el top no coincida con el margen del viewport
            window.scrollingOnAnchor = true;
            $('html,body').animate({scrollTop:target_top}, 300, function(){window.scrollingOnAnchor = false});
            
            $('#'+trgt).addClass('showup');

    });

    $('div.divSliderLauncher').click(function(event) {
        event.preventDefault();
        
        if ($(window).width()<=767) {
            var id_trigger= $(this).attr('data-id-slider');
            

            $('.divTeamsSlide').removeClass('showup');

            var target_offset = $('#scrollThere-4').offset(); // que se desplace hacia arriba del section donde está el slider
            var target_top = target_offset.top -90; // aquí hace un offset para que el top no coincida con el margen del viewport
            window.scrollingOnAnchor = true;
            $('html,body').animate({scrollTop:target_top}, 300, function(){window.scrollingOnAnchor = false});

            $('#'+id_trigger).addClass('showup');
            
        };
    });
});    
