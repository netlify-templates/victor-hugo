import "./css/main.css";

window.onload = () => {
  import(/* webpackChunkName: "animation" */ "./animation").then((module) => {
    const doAnimation = module.default;
    doAnimation();
  });
};
