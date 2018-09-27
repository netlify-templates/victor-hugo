import Drop from 'tether-drop';

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
