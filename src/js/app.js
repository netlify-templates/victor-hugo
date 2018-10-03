import Drop from 'tether-drop';
import $ from 'cash-dom';
import noUiSlider from 'nouislider';

// Create flyout menus in top navigation

const options = {
  classes: 'drop-theme-arrows-bounce',
  position: 'bottom left',
  openOn: 'hover'
};

['about', 'login'].forEach(function(section) {
  new Drop(
    Object.assign({
      target: document.querySelector(`#${section}`),
      content: document.querySelector(`#${section}-dropdown`)
    }, options)
  );
});

// Toggle mobile navigation

function mobileNav() {
  if(!$('#show-mobile-nav').length) {
    return;
  }

  $('#show-mobile-nav').on('click', function() {
    $('#mobile-nav').css('left', 0);
    return false;
  });

  $('#hide-mobile-nav').on('click', function() {
    $('#mobile-nav').css('left', '-100%');
    return false;
  });
}

// Toggle YouTube video embed modal

function videoModal() {
  if (!$('#hero-button').length) {
    return;
  }

  $('#hero-button')[0].onclick = showModal;

  function showModal() {
    $('body').append($('#modal-template').html());
    $('#close-modal')[0].onclick = hideModal;
  };

  function hideModal() {
    $('#open-modal').remove();
  };
}

// Create pricing slider

function pricingSlider() {
  if (!$('#pricing-slider').length) {
    return;
  }

  noUiSlider.create($('#pricing-slider')[0], {
    range: {
      min: 1,
      max: 100
    },
    start: 20,
    step: 1,
    connect: 'lower'
  }).on('update', function(values) {
    const val = parseInt(values[0]);
    $('#num-students').html(val);

    const numStudents = Math.max(20, val);
    $('#total-price').html(2 * numStudents);
  });
}

$(document).ready(function() {
  mobileNav();
  videoModal();
  pricingSlider();
});
