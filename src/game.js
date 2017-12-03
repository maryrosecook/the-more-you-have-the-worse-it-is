class Game {
  constructor (canvasId) {
    let windowSize = this._windowSize();
    this.c = new Coquette(this,
                          canvasId,
                          windowSize.x,
                          windowSize.y,
                          "#fff");
    this.zindex = 2;
    this.start();
  };

  start () {
    let windowSize = this._windowSize();
    this.c.entities.all()
      .forEach(entity => this.c.entities.destroy(entity));
    this.isOver = false;
    this.isShowingInstructions = true;
    this.c.entities.create(Score);
    this._addBoard({ x: windowSize.x - 2, y: windowSize.y - 2 });
    this._gameOverButton = this.c.entities.create(GameOverButton);
  }

  update () {
    if (!this.isOver) {
      this._updateBodies();
    } else if (this._restartButtonClicked()) {
      this.start();
    }
  }

  _restartButtonClicked () {
    let mouse = {
      size:  { x: 1, y: 1 },
      center: this.c.inputter.getMousePosition(),
      boundingBox: this.c.collider.RECTANGLE,
    };

    return this.isOver &&
      this.c.inputter.isDown(this.c.inputter.LEFT_MOUSE) &&
      this.c.collider.isIntersecting(mouse, this._gameOverButton);
  }

  draw (screen) {
    if (this.isShowingInstructions) {
      this._drawInstructions(screen);
    }
  }

  _updateBodies () {
    this.c.entities.all().forEach((body) => {
      if (body.update !== undefined) {
        body.update();
      }
    });
  }

  _drawInstructions (screen) {
    let viewSize = this.c.renderer.getViewSize();
    screen.font = "14px Courier";
    screen.fillStyle = "#000";
    screen.textAlign = "left";
    screen.fillText("CLICK TO DIRECT BLACK DOT", 8, 35);
    screen.fillText("COLLECT YELLOW DOTS TO SCORE POINTS FASTER",
                    8, 50);
    screen.fillText("AVOID RED DOTS", 8, 65);

  }

  _hideInstructions () {
    this.isShowingInstructions = false;
  }

  _addBoard(size) {
    let board = this.c.entities.create(Board, {
      size: size,
      center: { x: size.x / 2 + 1, y: size.y / 2 + 1 },
      onSplit: this._hideInstructions.bind(this)
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

let DrawableAsCircle = (Base) => class extends Base {
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
    this.size = { x: 10, y: 10 };
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
    let collider = this.game.c.collider;
    if (collider.isIntersecting(this, this.board.top())) {
      this.center.y = this.board.top().center.y + this.size.x / 2;
      this.vector.y = -this.vector.y;
    }

    if (collider.isIntersecting(this, this.board.bottom())) {
      this.center.y = this.board.bottom().center.y - this.size.x / 2;
      this.vector.y = -this.vector.y;
    }

    if (collider.isIntersecting(this, this.board.left())) {
      this.center.x = this.board.left().center.x + this.size.x / 2;
      this.vector.x = -this.vector.x;
    }

    if (collider.isIntersecting(this, this.board.right())) {
      this.center.x = this.board.right().center.x - this.size.x / 2;
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
    this.color = "#fa0";
  }

  static radius () { return 10; }
};

class Spike extends DrawableAsCircle(Base) {
  constructor (game, options) {
    super();
    this.size = { x: Spike.radius(), y: Spike.radius() };
    this.center = options.center;
    this.color = "#f66";
  }

  static radius () { return 10; }
};

class Board {
  constructor (game, options) {
    this.game = game;
    this.size = options.size;
    this.center = options.center;
    this.onSplit = options.onSplit;
    this.focused = false;
    this.zindex = -1;

    this._spawnCollector(options.collectorCenter,
                         options.collectorVector);
    this._spawnSpike(options.spikeCenter);

    if (options.shouldSpawnToken !== false) {
      this._spawnToken();
    }
  }

  update () {
    this._maybeUpdateFocused();
    this._maybeCollectToken();
    this._maybeCollectorHitsSpike();
  }

  area () {
    return this.size.x * this.size.y;
  }

  _spawnCollector (center, vector) {
    this.collector = this.game.c.entities.create(Collector, {
      board: this,
      center: center,
      vector: vector
    });
  }

  _maybeCollectToken () {
    let collider = this.game.c.collider;
    if (this.token &&
        collider.isIntersecting(this.token, this.collector)) {
      this.split();
    }
  }

  split () {
    new SplitBoards(this.game, this);
    this._reportSplit();
    this.destroy();
  }

  _reportSplit () {
    if (this.onSplit !== undefined) {
      this.onSplit();
    }
  }

  destroy () {
    this.game.c.entities.destroy(this.collector);
    this.game.c.entities.destroy(this.token);
    this.game.c.entities.destroy(this.spike);
    this.game.c.entities.destroy(this);
  }

  _maybeCollectorHitsSpike () {
    let collider = this.game.c.collider;
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
    let inset = Token.radius() * 2;
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
      screen.fillStyle = "#fff";
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
    let space = 0.5;
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
    this._createBoards();
  }

  _createBoards () {
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
      shouldSpawnToken: this._isPossibleToSplitNewBoards(),
      spikeCenter: this._bodyCenter(
        dimensions, this._oldBoard.spike),
      collectorCenter: this._bodyCenter(
        dimensions, this._oldBoard.collector),
      collectorVector: mathLib.copyPoint(
        this._oldBoard.collector.vector)
    });
  }

  _isPossibleToSplitNewBoards () {
    return this._oldBoard.area() > 50000;
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

class Score {
  constructor (game) {
    this.game = game;
    this._score = 0;
  }

  update () {
    this._score += Math.pow(
      2, this.game.c.entities.all(Board).length);
  }

  draw (screen) {
    screen.font = "14px Courier";
    screen.fillStyle = "#fa0";
    screen.textAlign = "left";
    screen.fillText(`SCORE: ${this._score}`, 8, 20);
  }
}

class GameOverButton {
  constructor(game) {
    this.game = game;
    let windowSize = this.game.c.renderer.getViewSize();
    this.size = { x: 310, y: 20 };
    this.center = {
      x: windowSize.x - this.size.x / 2,
      y: this.size.y
    };
    this.zindex = 2;
    this.boundingBox = this.game.c.collider.RECTANGLE;
  }

  draw (screen) {
    if (this.game.isOver) {
      screen.strokeRect(this.center.x - this.size.x / 2,
                        this.center.y - this.size.y / 2,
                        this.size.x,
                       this.size.y)
      screen.font = "14px Courier";
      screen.fillStyle = "#f33";
      screen.textAlign = "center";
      screen.fillText("GAME OVER, CLICK HERE TO PLAY AGAIN",
                      this.center.x,
                      this.center.y);
    }
  }
}

const range = n => Array.from({length: n}, (value, key) => key);
