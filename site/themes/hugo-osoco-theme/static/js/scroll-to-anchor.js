window.scrollingOnAnchor=false;

$(document).ready(function(){
    
    $('.scrollLauncher').click(function(event) {
        event.preventDefault();
 
        var full_url = this.href;
        
        var parts = full_url.split('#');
        var trgt = parts[1];

        var target_offset = $('#'+trgt).offset();
        var target_top = target_offset.top - 90; // aquí hace un offset para que el top no coincida con el margen del viewport
		
		lastScrollTop = $(this).scrollTop();
        window.scrollingOnAnchor = true;
        $('html,body').animate({scrollTop:target_top}, 300, function(){window.scrollingOnAnchor = false});


    });
});
