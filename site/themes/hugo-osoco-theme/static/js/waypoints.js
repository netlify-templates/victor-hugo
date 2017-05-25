

$(window).on('scroll', function() {
              
    $('.waypoint').each(function() {
        if($(window).scrollTop() >= $(this).offset().top - 96) { // aquí hace un offset para activar el waypoint antes de llegar a él
            var id = $(this).attr('id');

            var id_trigger= $(this).attr('data-id-trigger');
            if (document.getElementById(id_trigger)) {
                var trigger_position = document.getElementById(id_trigger).offsetLeft  + (document.getElementById(id_trigger).offsetWidth/2) - ($(window).width()/2);

                
                $('nav a').removeClass('show');
                $('nav a[href=#'+ id +']').addClass('show');
        		
                $('#contentMenuSecondary').scrollLeft(trigger_position);

                // document.getElementById(id_trigger).focus();
        		// document.getElementById(id_trigger).blur();
            } else {
                $('nav a').removeClass('show');
            };
        }
    });
});