import Drop from 'tether-drop';
import $ from 'cash-dom';

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

// Toggle YouTube video embed modal

$(document).ready(function() {
  $('#hero-button')[0].onclick = showModal;

  function showModal() {
    $('body').append($('#modal-template').html());
    $('#close-modal')[0].onclick = hideModal;
  };

  function hideModal() {
    $('#open-modal').remove();
  };
});
