jQuery(document).ready(function($){
	// browser window scroll (in pixels) after which the "back to top" link is shown
	var offset = $(window).height()-96,
		//browser window scroll (in pixels) after which the "back to top" link opacity is reduced
		offset_opacity = $(window).height()*2,
		//duration of the top scrolling animation (in ms)
		scroll_top_duration = 300,
		//grab the "back to top" link
		$back_to_top = $('.btnUp-top');

	//hide or show the "back to top" link
	$(window).scroll(function(){
		( $(this).scrollTop() > offset ) ? $back_to_top.addClass('btnUp-is-visible') : $back_to_top.removeClass('btnUp-is-visible btnUp-fade-out');
		if( $(this).scrollTop() > offset_opacity ) { 
			$back_to_top.addClass('btnUp-fade-out');
		}
	});

	//smooth scroll to top
	$back_to_top.on('click', function(event){
		event.preventDefault();
		$('body,html').animate({
			scrollTop: 0 ,
		 	}, scroll_top_duration
		);
	});

});