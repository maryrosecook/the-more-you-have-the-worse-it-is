class Game {
  constructor (canvasId, width, height) {
    this.c = new Coquette(this, canvasId, width, height, "#fff");

    this.isOver = false;
    this.boardCount = 0;
    this._addBoard();
  };

  update () {
    if (!this.isOver) {
      this._updateBodies();
    }
  }

  draw (screen) {
    if (this.isOver) {
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
    var viewSize = this.c.renderer.getViewSize();
    screen.font = "30px Courier";
    screen.fillStyle = "#f33";
    screen.textAlign = "center";
    screen.fillText("GAME OVER",
                    viewSize.x / 2,
                    viewSize.y / 2);
  }

  _addBoard() {
    const BOARD_COUNT = { x: 3, y: 3 };
    let board = this.c.entities.create(Board, {
      index: this.boardCount,
      boardCount: BOARD_COUNT
    });

    this.boardCount++;
  }

  tokenCollected (board) {
    this._addBoard();
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
    this.center = mathLib.copyPoint(options.board.center);
    this.size = { x: 7, y: 7 };
    this.vector = mathLib.unitVector({
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
    this.size = { x: 200, y: 200 };
    this.center = this._generateCenter(
      options.index,
      options.boardCount);
    this.focused = false;
    this.zindex = -1;

    this._spawnCollector();
    this._spawnToken();
    this._spawnSpikes();
  }

  update () {
    this._maybeUpdateFocused();
    this._maybeCollectToken();
    this._maybeCollectorHitsSpike();
  }

  _spawnCollector () {
    this.collector = this.game.c.entities.create(Collector, {
      board: this
    });
  }

  _maybeCollectToken () {
    var collider = this.game.c.collider;
    if (collider.isIntersecting(this.token, this.collector)) {
      this.game.tokenCollected(this);
      this.game.c.entities.destroy(this.token);
      this._spawnToken();
    }
  }

  _maybeCollectorHitsSpike () {
    var collider = this.game.c.collider;
    this.spikes.forEach((spike) => {
      if (collider.isIntersecting(spike, this.collector)) {
        this.game.over(this);
      }
    })
  }

  _spawnToken () {
    this.token = this.game.c.entities.create(Token, {
      center: this._randomPosition(),
    });
  }

  _spawnSpikes () {
    this.spikes = range(2).map(() => {
      return this._createSpike();
    });
  }

  _createSpike () {
    return this.game.c.entities.create(Spike, {
      center: this._randomPosition(),
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
