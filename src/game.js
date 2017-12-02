class Game {
  constructor (canvasId, width, height) {
    this.c = new Coquette(this, canvasId, width, height, "#fff");

    range(9).forEach((i) => {
      this._addBoard(i);
    });
  };

  _addBoard(index) {
    const BOARD_COUNT = { x: 3, y: 3 };
    let board = this.c.entities.create(Board, {
      index: index,
      boardCount: BOARD_COUNT
    });
  }
};

class Base {};

var DrawableAsCircle = Base => class extends Base {
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

class Player extends DrawableAsCircle(Base) {
  constructor (game, options) {
    super();
    this.game = game;
    this.board = options.board;
    this.boundingBox = this.game.c.collider.CIRCLE;
    this.center = mathLib.copyPoint(options.board.center);
    this.size = { x: 7, y: 7 };
    this.direction = { x: 1, y: 0 };
    this.color = "#000";
    this.zindex = 1;
  }

  update () {
    this._maybeUpdateDirection();
    this._move();
    this._maybeBounceOffWalls();
  }

  _move() {
    this.center.x += this.direction.x;
    this.center.y += this.direction.y;
  }

  _maybeBounceOffWalls() {
    var collider = this.game.c.collider;
    if (collider.isIntersecting(this, this.board.top()) ||
        collider.isIntersecting(this, this.board.bottom())) {
      this.direction.y = -this.direction.y;
    }

    if (collider.isIntersecting(this, this.board.left()) ||
        collider.isIntersecting(this, this.board.right())) {
      this.direction.x = -this.direction.x;
    }
  }

  _maybeUpdateDirection () {
    if (!this.board.focused) { return; }

    let inputter = this.game.c.inputter;
    if (inputter.isDown(inputter.LEFT_MOUSE)) {
      this.direction = this._newDirection(
        inputter.getMousePosition());
    }
  }

  _newDirection (target) {
    return mathLib.unitVector(
      mathLib.vectorBetween(this.center, target));
  }
};


class Star extends DrawableAsCircle(Base) {
  constructor (game, options) {
    super();
    this.size = { x: 5, y: 5 };
    this.center = options.center;
    this.color = "#fc0";
  }
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

    this.game.c.entities.create(Player, {
      board: this
    });
  }

  update () {
    this._maybeUpdateFocused();
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

  draw (screen) {
    if (this.focused) {
      screen.fillStyle = "#ddd";
    } else {
      screen.fillStyle = "#fff";
    }

    screen.fillRect(this.center.x - this.size.x / 2,
                    this.center.y - this.size.y / 2,
                    this.size.x,
                    this.size.y);

    screen.strokeStyle = "#eee";
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
    var space = 1;
    let x = index % boardCount.x *
        (this.size.x + space) +
        this.size.x / 2;
    let y = Math.floor(index / boardCount.y) *
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
