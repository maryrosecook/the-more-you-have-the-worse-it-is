class Game {
  constructor (canvasId) {
    let windowSize = this._windowSize();
    this.c = new Coquette(this,
                          canvasId,
                          windowSize.x,
                          windowSize.y,
                          "#fff");
    this.zindex = 2;
    this.isOver = false;
    this._addBoard({ x: windowSize.x - 2, y: windowSize.y - 2 });
  };

  update () {
    if (!this.isOver) {
      this._updateBodies();
    }
  }

  draw (screen) {
    if (!this.isOver) {
      this._drawInstructions(screen);
    } else {
      this._drawGameOver(screen);
    }
  }

  _updateBodies () {
    this.c.entities.all().forEach((body) => {
      if (body.update !== undefined) {
        body.update();
      }
    });
  }

  _drawGameOver (screen) {
    var windowSize = this._windowSize();
    screen.font = "30px Courier";
    screen.fillStyle = "#f33";
    screen.textAlign = "center";
    screen.fillText("GAME OVER",
                    windowSize.x / 2,
                    windowSize.y / 2 + 9);
  }

  _drawInstructions (screen) {
    var viewSize = this.c.renderer.getViewSize();
    screen.font = "14px Courier";
    screen.fillStyle = "#000";
    screen.textAlign = "left";
    screen.fillText("Click to direct black dot", 8, 20);
    screen.fillText("Collect yellow dots to speed up point scoring", 8, 35);
    screen.fillText("Avoid red dots", 8, 50);

  }

  _addBoard(size) {
    let board = this.c.entities.create(Board, {
      size: size,
      center: { x: size.x / 2 + 1, y: size.y / 2 + 1 }
    });
  }

  _windowSize () {
    return { x: window.innerWidth, y: window.innerHeight };
  }

  over () {
    this.isOver = true;
  }
};

class Base {};

var DrawableAsCircle = (Base) => class extends Base {
  draw (screen) {
    screen.beginPath();
    screen.arc(this.center.x,
               this.center.y,
               this.size.x / 2,
               0,
               2 * Math.PI,
               false);
    screen.fillStyle = this.color;
    screen.fill();
    screen.closePath();
  }
};

class Collector extends DrawableAsCircle(Base) {
  constructor (game, options) {
    super();
    this.game = game;
    this.board = options.board;
    this.boundingBox = this.game.c.collider.CIRCLE;
    this.center = options.center ||
      mathLib.copyPoint(options.board.center);
    this.size = { x: 7, y: 7 };
    this.vector = options.vector || mathLib.unitVector({
      x: Math.random() - 0.5,
      y: Math.random() - 0.5
    });
    this.color = "#000";
    this.zindex = 1;
  }

  update () {
    this._maybeUpdateVector();
    this._move();
    this._maybeBounceOffWalls();
  }

  _move() {
    this.center.x += this.vector.x;
    this.center.y += this.vector.y;
  }

  _maybeBounceOffWalls() {
    var collider = this.game.c.collider;
    if (collider.isIntersecting(this, this.board.top()) ||
        collider.isIntersecting(this, this.board.bottom())) {
      this.vector.y = -this.vector.y;
    }

    if (collider.isIntersecting(this, this.board.left()) ||
        collider.isIntersecting(this, this.board.right())) {
      this.vector.x = -this.vector.x;
    }
  }

  _maybeUpdateVector () {
    if (!this.board.focused) { return; }

    let inputter = this.game.c.inputter;
    if (inputter.isDown(inputter.LEFT_MOUSE)) {
      this.vector = this._newVector(
        inputter.getMousePosition());
    }
  }

  _newVector (target) {
    return mathLib.unitVector(
      mathLib.vectorBetween(this.center, target));
  }
};


class Token extends DrawableAsCircle(Base) {
  constructor (game, options) {
    super();
    this.size = { x: Token.radius(), y: Token.radius() };
    this.center = options.center;
    this.color = "#fc0";
  }

  static radius () { return 7; }
};

class Spike extends DrawableAsCircle(Base) {
  constructor (game, options) {
    super();
    this.size = { x: Spike.radius(), y: Spike.radius() };
    this.center = options.center;
    this.color = "#f66";
  }

  static radius () { return 7; }
};

class Board {
  constructor (game, options) {
    this.game = game;
    this.size = options.size;
    this.center = options.center;
    this.focused = false;
    this.zindex = -1;

    this._spawnCollector(options.collectorCenter,
                         options.collectorVector);
    this._spawnToken();
    this._spawnSpike(options.spikeCenter);
  }

  update () {
    this._maybeUpdateFocused();
    this._maybeCollectToken();
    this._maybeCollectorHitsSpike();
  }

  _spawnCollector (center, vector) {
    this.collector = this.game.c.entities.create(Collector, {
      board: this,
      center: center,
      vector: vector
    });
  }

  _maybeCollectToken () {
    var collider = this.game.c.collider;
    if (collider.isIntersecting(this.token, this.collector)) {
      this.split();
    }
  }

  split () {
    new SplitBoards(this.game, this);
    this.destroy();
  }

  destroy () {
    this.game.c.entities.destroy(this.collector);
    this.game.c.entities.destroy(this.token);
    this.game.c.entities.destroy(this.spike);
    this.game.c.entities.destroy(this);
  }

  _maybeCollectorHitsSpike () {
    var collider = this.game.c.collider;
    if (collider.isIntersecting(this.spike, this.collector)) {
      this.game.over(this);
    }
  }

  _spawnToken () {
    this.token = this.game.c.entities.create(Token, {
      center: this._randomPosition(),
    });
  }

  _spawnSpike (center) {
    this.spike = this.game.c.entities.create(Spike, {
      center: center || this._randomPosition(),
    });
  }

  _maybeUpdateFocused () {
    let collider = this.game.c.collider;
    let mouse = {
      center: this.game.c.inputter.getMousePosition() || { x: -1, y: -1 },
      size: { x: 1, y: 1 },
      boundingBox: collider.RECTANGLE
    };

    this.focused = collider.isIntersecting(this, mouse);
  }

  _randomPosition () {
    let inset = Token.radius();
    return {
      x: this.left().center.x + inset +
        (this.right().center.x - this.left().center.x - inset * 2) *
        Math.random(),
      y: this.top().center.y + inset +
        (this.bottom().center.y - this.top().center.y - inset * 2) *
        Math.random()
    };
  }

  draw (screen) {
    if (this.focused) {
      screen.fillStyle = "#eee";
    } else {
      screen.fillStyle = "#fff";
    }

    screen.fillRect(this.center.x - this.size.x / 2,
                    this.center.y - this.size.y / 2,
                    this.size.x,
                    this.size.y);

    screen.strokeStyle = "#000";
    screen.strokeRect(this.center.x - this.size.x / 2,
                      this.center.y - this.size.y / 2,
                      this.size.x,
                      this.size.y);
  }

  top() {
    return BoardSide.top(this,
                         this.game.c.collider.RECTANGLE);
  }

  bottom () {
    return BoardSide.bottom(this,
                            this.game.c.collider.RECTANGLE);
  }

  left () {
    return BoardSide.left(this,
                          this.game.c.collider.RECTANGLE);
  }

  right () {
    return BoardSide.right(this,
                           this.game.c.collider.RECTANGLE);
  }

  _generateCenter(index, boardCount) {
    var space = 0.5;
    let x = 1 +
        index % boardCount.x *
        (this.size.x + space) +
        this.size.x / 2;
    let y = 1 +
        Math.floor(index / boardCount.y) *
        (this.size.y + space) +
        this.size.y / 2;
    return { x, y };
  }
};

class SplitBoards {
  constructor (game, oldBoard) {
    this.game = game;
    this._oldBoard = oldBoard;
    this._generateDimensions();
  }

  _generateDimensions () {
    let dimensions = new Map([
      [Symbol.for("vertical"), this._verticalDimensions.bind(this)],
      [Symbol.for("horizontal"), this._horizontalDimensions.bind(this)]
    ]).get(this._splitDirection())();

    this._createBoard(dimensions[0]);
    this._createBoard(dimensions[1]);
  }

  _splitDirection () {
    return this._oldBoard.size.x > this._oldBoard.size.y ?
      Symbol.for("vertical") :
      Symbol.for("horizontal");
  }

  _bodyCenter (dimensions, body) {
    let collider = this.game.c.collider;
    dimensions.boundingBox = collider.RECTANGLE;
    if (collider.isIntersecting(dimensions, body)) {
      return mathLib.copyPoint(body.center);
    } else {
      return this._mirrorPoint(body.center,
                               this._oldBoard.center,
                               this._splitDirection());
    }
  }

  _mirrorPoint (point, mirrorPoint, direction) {
    if (direction === Symbol.for("horizontal")) {
      return { x: point.x, y: point.y + (mirrorPoint.y - point.y) * 2 };
    } else {
      return { x: point.x + (mirrorPoint.x - point.x) * 2, y: point.y };
    };
  }

  _horizontalDimensions () {
    let b = this._oldBoard;
    let height = b.size.y / 2;
    let size = { x: b.size.x, y: height };
    return [{
      size: mathLib.copyPoint(size),
      center: { x: b.center.x, y: b.center.y - height / 2 }
    }, {
      size: mathLib.copyPoint(size),
      center: { x: b.center.x, y: b.center.y + height / 2 }
    }];
  }

  _createBoard (dimensions) {
    return this.game.c.entities.create(Board, {
      size: dimensions.size,
      center: dimensions.center,
      spikeCenter: this._bodyCenter(
        dimensions, this._oldBoard.spike),
      collectorCenter: this._bodyCenter(
        dimensions, this._oldBoard.collector),
      collectorVector: mathLib.copyPoint(
        this._oldBoard.collector.vector)
    });
  }

  _verticalDimensions() {
    let b = this._oldBoard;
    let width = b.size.x / 2;
    let size = { x: width, y: b.size.y };
    return [{
      size: mathLib.copyPoint(size),
      center: { x: b.center.x - width / 2, y: b.center.y }
    }, {
      size: mathLib.copyPoint(size),
      center: { x: b.center.x + width / 2, y: b.center.y }
    }];
  }
};

class BoardSide {
  constructor (center, size, boundingBox) {
    this.center = center;
    this.size = size;
    this.boundingBox = boundingBox;
  }

  static top (board, boundingBox) {
    let center = {
      x: board.center.x,
      y: board.center.y - board.size.y / 2
    };

    let size = { x: board.size.x, y: 1 };
    return new BoardSide(center, size, boundingBox);
  }

  static bottom (board, boundingBox) {
    let center = {
      x: board.center.x,
      y: board.center.y + board.size.y / 2
    };

    let size = { x: board.size.x, y: 1 };
    return new BoardSide(center, size, boundingBox);
  }

  static left (board, boundingBox) {
    let center = {
      x: board.center.x - board.size.x / 2,
      y: board.center.y
    };

    let size = { x: 1, y: board.size.y };
    return new BoardSide(center, size, boundingBox);
  }

  static right (board, boundingBox) {
    let center = {
      x: board.center.x + board.size.x / 2,
      y: board.center.y
    };

    let size = { x: 1, y: board.size.y };
    return new BoardSide(center, size, boundingBox);
  }
}

const range = n => Array.from({length: n}, (value, key) => key);
