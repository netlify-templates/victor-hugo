import paper from "paper";
import RBush from "rbush";
import knn from "rbush-knn";

// settings
// limit at which points are connected
// limit at which things are viewed by the mouse
const mouseConnectionRadius = 0.1;
const pointConnectionDistance = Math.pow(mouseConnectionRadius, 2);
const mousePointConnectionRadius = 0.12;
const tree = new RBush();
const numberOfDots = 1000;
const dotMaxRadius = 2;
const dotVelocity = 0.05;
const lineWidth = 0.5;
const lineOpacityRange = mouseConnectionRadius;
const maxLines = 300;

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// map of lines
const lineMap = new Map();
const usedLines = new Map();
let mousePosition;
let mouseDelta;
let _lastId = 0;

const nextId = () => {
  return _lastId++;
};

class Dot {
  constructor(paper) {
    this.paper = paper;
    this.id = nextId();

    // center is in 0-1 space
    this.center = paper.Point.random();
    this.radius = Math.random() * dotMaxRadius;

    // velocity
    this.vx = Math.random() * dotVelocity * (Math.random() < 0.5 ? 1 : -1);
    this.vy = Math.random() * dotVelocity * (Math.random() < 0.5 ? 1 : -1);

    // the path to draw
    this.path = paper.Path.Circle(this.center, this.radius);

    // style
    this.path.fillColor = "#d4d4d4";
    this.opacity = 0;
    this.opacityOffset = Math.min(Math.random() + 0.25, 0);
    this.path.visible = false;

    this.treeItem = {
      minX: this.center.x,
      minY: this.center.y,
      maxX: this.center.x,
      maxY: this.center.y,
      item: this
    };

    tree.insert(this.treeItem);

    this.move = this.move.bind(this);
    this.onFrame = this.onFrame.bind(this);
    this.style = this.style.bind(this);
    this.updateTreeItem = this.updateTreeItem.bind(this);
  }

  move(delta) {
    // move by velocity
    if (this.center.x < 0 || this.center.x > 1) {
      this.vx *= -1.0;
    }
    if (this.center.y < 0 || this.center.y > 1) {
      this.vy *= -1.0;
    }
    this.center = this.center.add(
      new this.paper.Point(this.vx, this.vy).multiply(delta)
    );
    this.updateTreeItem();
  }

  updateTreeItem() {
    tree.remove(this.treeItem);
    this.treeItem.minX = this.center.x;
    this.treeItem.minY = this.center.y;
    this.treeItem.maxX = this.center.x;
    this.treeItem.maxY = this.center.y;
    tree.insert(this.treeItem);
  }

  style() {
    // set opacity to 1 in mouse radius
    this.opacity = Math.max(
      0.6 - this.center.getDistance(mousePosition) / mousePointConnectionRadius,
      this.opacity
    );
    // decrease opacity over time
    this.opacity = Math.max(0, this.opacity - 0.01 - 0.001 * mouseDelta.length);
    // this.opacity = Math.max(0, this.opacity - 0.01 - 0.0001 * mouseDelta.length);
    this.path.opacity = this.opacity;
    this.path.visible = this.opacity !== 0;
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
  static lineId(dotFrom, dotTo) {
    return dotFrom.id + "-" + dotTo.id;
  }

  static createOrGetLine(paper, dotFrom, dotTo) {
    if (usedLines.size < maxLines) {
      const lineID = Line.lineId(dotFrom, dotTo);
      const existingLine = lineMap.get(lineID);
      if (existingLine !== undefined) {
        return existingLine;
      }
      const newLine = new Line(paper, dotFrom, dotTo, () => {
        lineMap.delete(lineID);
        usedLines.delete(lineID);
      });
      lineMap.set(lineID, newLine);
      usedLines.set(lineID, newLine);
      return newLine;
    }
  }

  constructor(paper, dotFrom, dotTo, handleRemove) {
    this.paper = paper;
    this.dotFrom = dotFrom;
    this.dotTo = dotTo;
    this.id = Line.lineId(dotFrom, dotTo);

    this.path = this.paper.Path.Line(this.dotFrom, this.dotTo);
    this.path.strokeColor = "#f563ff";
    this.path.strokeWidth = lineWidth;
    this.handleRemove = handleRemove;

    this.move = this.move.bind(this);
    this.onFrame = this.onFrame.bind(this);
    this.style = this.style.bind(this);
    this.opacity = 0;
    this.delta = mouseDelta;
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
    const dotFromDistFromMouse = this.dotFrom.center.getDistance(mousePosition);
    const dotToDistFromMouse = this.dotTo.center.getDistance(mousePosition);
    const lineLength = this.dotFrom.center.getDistance(this.dotTo.center);
    const maxDistanceFromMouse = Math.max(
      dotToDistFromMouse,
      dotFromDistFromMouse
    );
    this.opacity = Math.max(
      Math.min((this.delta.length * 3) / 4, 4 / 5) -
        maxDistanceFromMouse / lineOpacityRange,
      this.opacity
    );
    this.opacity -= 0.005 * lineLength + 0.001 * this.delta.length;
    this.opacity = Math.max(0, this.opacity);
    if (this.opacity === 0) {
      this.remove();
    }
    this.path.opacity = this.opacity;
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
export default function() {
  const c = getCanvasId();
  paper.setup(c);
  const tool = new paper.Tool();

  const dots = Array(numberOfDots)
    .fill(0)
    .map(() => new Dot(paper));

  // set the initial mouse position
  mousePosition = defaultMousePosition();
  mouseDelta = defaultMouseDelta();

  // on move update the mouse position
  tool.onMouseMove = function(event) {
    mousePosition = event.point.divide(paper.view.bounds.bottomRight);
    mousePosition = mousePosition.add(
      new paper.Point({x: 0, y: -40 / paper.view.bounds.bottomRight.y})
    );
    mouseDelta = event.delta;
  };

  // on leave set the mouse position back to center
  paper.view.onMouseLeave = function(event) {
    // timeout to avoid onMove overwriting
    setTimeout(() => {
      mousePosition = defaultMousePosition();
      mouseDelta = defaultMouseDelta();
    }, 50);
  };

  paper.view.onFrame = function(event) {
    // paper js kills long running frames this avoids large deltas
    if (event.delta > 0.25) {
      return;
    }

    const nearbyDots = (
      knn(
        tree,
        mousePosition.x,
        mousePosition.y,
        Infinity,
        () => true,
        mouseConnectionRadius
      ).map((d) => d.item)
    ).reverse();

    nearbyDots.forEach((dotFrom) => {
      shuffle(
        knn(
          tree,
          dotFrom.center.x,
          dotFrom.center.y,
          Infinity,
          () => true,
          pointConnectionDistance
        )
          .map((d) => d.item)
          .filter((d) => d.id > dotFrom.id)
      )
        .slice(0, 1)
        .forEach((dotTo) => {
          Line.createOrGetLine(paper, dotFrom, dotTo);
        });
    });

    dots.forEach((d) => d.onFrame(event));
    lineMap.forEach((v) => v.onFrame(event));
  };
}

function defaultMouseDelta() {
  return new paper.Point(1, 0);
}

function defaultMousePosition() {
  return paper.view.bounds.bottomRight
    .subtract(paper.view.bounds.bottomRight.multiply(0.1))
    .divide(paper.view.bounds.bottomRight);
}

/**
 * Returns the id of the canvas
 * @returns {string}
 */
function getCanvasId() {
  return "c";
}
