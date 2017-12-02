let mathLib = {
  RADIANS_TO_DEGREES: Math.PI / 180,
  DEGREES_TO_RADIANS: 180 / Math.PI,

  copyPoint (point) {
    return { x: point.x, y: point.y };
  },

  angleToVector (angle) {
    var r = angle * 0.01745;
    return this.unitVector({ x: Math.sin(r), y: -Math.cos(r) });
  },

  objToLinePoints (obj) {
    return [
      util.rotate({ x: obj.center.x, y: obj.center.y + obj.size.y / 2 },
                  obj.center,
                  obj.angle),
      util.rotate({ x: obj.center.x, y: obj.center.y - obj.size.y / 2 },
                  obj.center,
                  obj.angle)
    ]
  },

  vectorToAngle (v) {
    var unitVec = this.unitVector(v);
    var uncorrectedDeg = Math.atan2(unitVec.x, -unitVec.y) * this.DEGREES_TO_RADIANS;
    var angle = uncorrectedDeg;
    if(uncorrectedDeg < 0) {
      angle = 360 + uncorrectedDeg;
    }

    return angle;
  },

  magnitude (vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  },

  unitVector (vector) {
    return {
      x: vector.x / this.magnitude(vector),
      y: vector.y / this.magnitude(vector)
    };
  },

  dotProduct (vector1, vector2) {
    return vector1.x * vector2.x + vector1.y * vector2.y;
  },

  rotate (point, pivot, angle) {
    angle *= this.RADIANS_TO_DEGREES;
    return {
      x: (point.x - pivot.x) * Math.cos(angle) -
        (point.y - pivot.y) * Math.sin(angle) +
        pivot.x,
      y: (point.x - pivot.x) * Math.sin(angle) +
        (point.y - pivot.y) * Math.cos(angle) +
        pivot.y
    };
  },

  bounceLineNormal (obj, line) {
    var objToClosestPointOnLineVector =
        util.vectorBetween(
          util.pointOnLineClosestToObj(obj, line),
          obj.center);

    return util.unitVector(objToClosestPointOnLineVector);
  },

  pointOnLineClosestToObj (obj, line) {
    var endPoints = util.objToLinePoints(line);
    var lineEndPoint1 = endPoints[0]
    var lineEndPoint2 = endPoints[1];

    var lineUnitVector = util.unitVector(util.angleToVector(line.angle));
    var lineEndToObjVector = util.vectorBetween(lineEndPoint1, obj.center);
    var projection = util.dotProduct(lineEndToObjVector, lineUnitVector);

    if (projection <= 0) {
      return lineEndPoint1;
    } else if (projection >= line.len) {
      return lineEndPoint2;
    } else {
      return {
        x: lineEndPoint1.x + lineUnitVector.x * projection,
        y: lineEndPoint1.y + lineUnitVector.y * projection
      };
    }
  },

  vectorBetween (startPoint, endPoint) {
    return {
      x: endPoint.x - startPoint.x,
      y: endPoint.y - startPoint.y
    };
  },

  add (v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  },

  multiply (v1, v2) {
    return { x: v1.x * v2.x, y: v1.y * v2.y };
  },

  fillRect (ctx, obj, color) {
    ctx.fillStyle = color;
    ctx.fillRect(obj.center.x - obj.size.x / 2,
                 obj.center.y - obj.size.y / 2,
                 obj.size.x,
                 obj.size.y);
  }
};
