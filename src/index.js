// JS Goes here - ES6 supported

import "./css/main.css";
import paper from "paper";


// create ids for the objects
let _lastId = 0;
const nextId = () => {
  return _lastId++;
};

// map of lines
const lineMap = new Map();
// limit at which points are connected
const pointLimit = 0.1;
// limit at which things are viewed by the mouse
const mouseLimit = 0.1;
let mousePosition;


class Dot {
  constructor(paper) {
    this.paper = paper;
    this.id = nextId();

    this.center = paper.Point.random();

    this.radius = Math.random() * 2;
    this.vx = Math.random() * 0.02 * (Math.random() < 0.5 ? 1 : -1);
    this.vy = Math.random() * 0.02 * (Math.random() < 0.5 ? 1 : -1);

    this.path = paper.Path.Circle(this.center, this.radius);
    this.path.fillColor = "#d4d4d4";

    this.move = this.move.bind(this);
    this.onFrame = this.onFrame.bind(this);
    this.style = this.style.bind(this);
    this.opacity = 0;
  }

  move(delta) {
    if (this.center.x < 0 || this.center.x > 1) {
      this.vx *= -1.0;
    }
    if (this.center.y < 0 || this.center.y > 1) {
      this.vy *= -1.0;
    }
    this.center = this.center.add(
      new this.paper.Point(this.vx, this.vy).multiply(delta)
    );
    const epsilon = 0.001;
    this.center.x = Math.min(Math.max(this.center.x, 0 - epsilon), 1 + epsilon);
    this.center.y = Math.min(Math.max(this.center.y, 0 - epsilon), 1 + epsilon);
  }

  style() {
    if (this.center.getDistance(mousePosition) < mouseLimit) {
      this.opacity = 1;
    }
    this.opacity -= 0.01;
    this.opacity = Math.max(0, this.opacity);
    this.path.opacity = this.opacity;
  }

  onFrame(event) {
    this.move(event.delta);
    this.path.position = this.center.multiply(
      this.paper.view.bounds.bottomRight
    );
    this.style();
  }
}

class Line {
  static shouldDraw(fromDot, toDot) {
    return (
      fromDot.center.getDistance(toDot.center) < pointLimit &&
      (fromDot.center.getDistance(mousePosition) < mouseLimit ||
        toDot.center.getDistance(mousePosition) < mouseLimit)
    );
  }

  static createOrGetLine(paper, dotFrom, dotTo) {
    const lineID = dotFrom.id + "-" + dotTo.id;
    const existingLine = lineMap.get(lineID);
    if (existingLine !== undefined) {
      return existingLine;
    }
    const newLine = new Line(paper, dotFrom, dotTo, () => {
      lineMap.delete(lineID);
    });
    lineMap.set(lineID, newLine);
    return newLine;
  }

  constructor(paper, dotFrom, dotTo, handleRemove) {
    this.paper = paper;
    this.dotFrom = dotFrom;
    this.dotTo = dotTo;

    this.path = this.paper.Path.Line(this.dotFrom, this.dotTo);
    this.path.strokeColor = "#f563ff";
    this.path.strokeWidth = 1;
    this.handleRemove = handleRemove;

    this.move = this.move.bind(this);
    this.onFrame = this.onFrame.bind(this);
    this.style = this.style.bind(this);
    this.opacity = 0;
  }

  move(delta) {
    this.path.segments[0].point = this.dotFrom.center.multiply(
      this.paper.view.bounds.bottomRight
    );
    this.path.segments[1].point = this.dotTo.center.multiply(
      this.paper.view.bounds.bottomRight
    );
  }

  style() {
    const maxDistance = Math.max(
      this.dotFrom.center.getDistance(mousePosition),
      this.dotTo.center.getDistance(mousePosition)
    );
    this.path.opacity = 1 - maxDistance / mouseLimit;

    if (maxDistance < mouseLimit) {
      this.opacity = 1 - maxDistance / mouseLimit;
    }
    this.opacity -= 0.01;
    this.opacity = Math.max(0, this.opacity);
    this.path.opacity = this.opacity;
    if (this.opacity === 0) {
      this.remove();
    }
  }

  onFrame(event) {
    this.move(event.delta);
    this.style();
  }

  remove() {
    this.handleRemove();
    this.path.remove();
  }
}

// Only executed our code once the DOM is ready.
window.onload = function() {
  const c = getCanvasId();
  paper.setup(c);
  const tool = new paper.Tool();

  const dots = Array(250)
    .fill(0)
    .map(() => new Dot(paper));

  mousePosition = paper.view.center.divide(paper.view.bounds.bottomRight);
  tool.onMouseMove = function(event) {
    mousePosition = event.point.divide(paper.view.bounds.bottomRight);
  };

  paper.view.onMouseLeave = function(event) {
    setTimeout(() => {
      mousePosition = paper.view.center.divide(paper.view.bounds.bottomRight);
    }, 50);
  };

  paper.view.onFrame = function(event) {

    for (let i = 0; i < dots.length - 1; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const fromDot = dots[i];
        const toDot = dots[j];
        if (Line.shouldDraw(fromDot, toDot)) {
          Line.createOrGetLine(paper, fromDot, toDot);
        }
      }
    }

    dots.forEach((d) => d.onFrame(event));
    lineMap.forEach((v) => v.onFrame(event));
  };
};

/**
 * Returns the id of the canvas
 * @returns {string}
 */
function getCanvasId() {
  return "c";
}
