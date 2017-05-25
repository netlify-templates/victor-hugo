$(function(){
    $('body').on('click', function(event){
        autoClose($(this));
    });

    $("body").on("click", ".collapsible .collapsible-header", function(event) {
        var elem = getClickedElement(event, "collapsible-header");
        var preventSelfClose = $(elem).data("prevent-self-close");
        if(preventSelfClose) {
            if(!$(elem).hasClass("open")) {
                toggleOpenState(elem, "collapsible-content");
            }
        } else {
            var openSibling = closeOpenSibblings(elem)
            
            toggleOpenState(openSibling, "collapsible-content");
            toggleOpenState(elem, "collapsible-content");
        }
        autoClose($(this));
        event.stopPropagation();
    });


    $("body").on("click", ".collapsible-menu .collapsible-header", function(event){
        var elem = getClickedElement(event, "collapsible-header");
        toggleOpenState(elem, "collapsible-content");
        event.stopPropagation();
    });

    $("body").on("click", ".collapsible-menu .collapsible-content", function(event){
        var elem = getClickedElement(event, "collapsible-content");

        $(elem).prev(".collapsible-header").removeClass("open");
        $(elem).removeClass("open", 500);
        event.stopPropagation();
    });

    function getClickedElement(event, withClass) {
        var elem;
        if($(event.target).hasClass(withClass)) {
            elem = $(event.target);
        } else {
            elem = $(event.target).parents("." + withClass);
        }
        return elem;
    }

    function closeOpenSibblings(elem) {
        var openSibblings = $(elem).parents('.collapsible').first().find(".collapsible-header.open")
        $.each(openSibblings, function(index, element) {
            if(!$(element).is($(elem))) {
                toggleOpenState(element, 'collapsible-content')
            } 
        })
    }
    
    function toggleOpenState(elem, withClass) {
        if($(elem).hasClass("open")) {
            $(elem).removeClass("open");
            $(elem).next("." + withClass).removeClass("open", 500);
        } else {
            $(elem).addClass("open");
            $(elem).next("." + withClass).addClass("open", 500);
        }
    }

    function autoClose(collapsibleClicked) {
        $(".collapsible-header.autoClose").each(function(index, element){
            if($(this).hasClass('open') && $(this).get(0) != collapsibleClicked.get(0)) {
                toggleOpenState($(this), "collapsible-content");
            }
        });
    };
});