const BOX_POINTS = {
  A: new THREE.Vector3(1, 0, 0),
  B: new THREE.Vector3(0, 0, 0),
  C: new THREE.Vector3(0, 0, 1),
  D: new THREE.Vector3(1, 0, 1),
  E: new THREE.Vector3(1, 1, 0),
  F: new THREE.Vector3(0, 1, 0),
  G: new THREE.Vector3(0, 1, 1),
  H: new THREE.Vector3(1, 1, 1),
};

const lackingBoxMap = new Map([
  [0, ["ABFE", "BCGF", "CDHG", "DAEH", "ADCB", "FGHE"]],
  [1, ["ABFE", "FBC", "FCH", "HEF", "HCD", "HDAE", "ADCB"]],
  [20, ["ABE", "CDH", "DAEH", "ADCB", "EBCH"]],
  [21, ["ABE", "DHG", "DAEH", "ADB", "GHE", "GBD", "EBG"]],
]);

/**
 * compare two float with operator ">, <, =, >=, <= ,!="
 * @param {*} operandA
 * @param {*} operator
 * @param {*} operandB
 * @param {*} [accuracy=null]
 * @return {*}
 */
const floatCompare = (operandA, operator, operandB, accuracy = null) => {
  let res = null;
  switch (operator) {
    case ">":
      res = operandA - operandB > 0;
      break;
    case "<":
      res = operandA - operandB < 0;
      break;
    case "=":
      if (accuracy === null)
        throw Error("operator contains '=' must set accuracy argument");
      res = Math.abs(operandA - operandB) < accuracy;
      break;
    case ">=":
      res =
        floatCompare(operandA, ">", operandB) ||
        floatCompare(operandA, "=", operandB, accuracy);
      break;
    case "<=":
      res =
        floatCompare(operandA, "<", operandB) ||
        floatCompare(operandA, "=", operandB, accuracy);
      break;
    case "!=":
      res = !floatCompare(operandA, "=", operandB, accuracy);
      break;
  }
  return res;
};

/**
 * 获取线段中点
 * @param { THREE.Vector3 } p1
 * @param { THREE.Vector3 } p2
 * @return { THREE.Vector3 }
 */
const getSegmentMidPoints = (p1, p2) => {
  const p0 = new THREE.Vector3();
  p0.x = (p1.x + p2.x) / 2;
  p0.y = (p1.y + p2.y) / 2;
  p0.z = (p1.z + p2.z) / 2;
  return p0;
};

/**
 * 获取三角形最长边的中点
 * @param {Array<THREE.Vector3>} points
 * @return { THREE.Vector3 }
 */
const getTriangleLongMidpoint = (points) => {
  let maxObj = { length: 0 };
  for (let i = 0; i < 3; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % 3];
    const p3 = points[(i + 2) % 3]; // p3 和中点不相邻

    const length = p1.distanceTo(p2);
    // √3肯定是最长边
    if (floatCompare(length, "=", Math.sqrt(3), 0.001)) {
      maxObj = { length, p1, p2, p3 };
      break;
    } else {
      if (floatCompare(length, ">", maxObj.length)) {
        maxObj = { length, p1, p2, p3 };
      }
    }
  }
  const { p1, p2, p3 } = maxObj;
  const p0 = getSegmentMidPoints(p1, p2);
  return [p0, p1, p2, p3];
};

/**
 * 判断三点共线
 * @param {*} p1
 * @param {*} p2
 * @param {*} p3
 */
const isCollinear = (p1, p2, p3) => {
  const {
    x: x1,
    y: y1,
    z: z1,
  } = new THREE.Vector3().subVectors(p1, p2).normalize();
  const {
    x: x2,
    y: y2,
    z: z2,
  } = new THREE.Vector3().subVectors(p1, p3).normalize();
  return (
    floatCompare(x1 - x2, "=", 0, 0.001) &&
    floatCompare(y1 - y2, "=", 0, 0.001) &&
    floatCompare(z1 - z2, "=", 0, 0.001)
  );
};

class LackingBoxGeometry extends THREE.BufferGeometry {
  constructor(O, points) {
    super();
    this.type = "LackingBoxGeometry";
    this.indices = [];
    this.vertices = [];
    this.normals = [];

    this.faces = [];
    this.facesMap = new Map();
    this.pointsMap = new Map();
    const faces = this.getDrawFaces(points);
    this.center = this.computeCenter(faces); // 几何重心
    this.createAllFaces(faces);
    this.addFaces(O);

    this.setIndex(this.indices);
    this.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.vertices, 3)
    );
    this.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(this.normals, 3)
    );
  }

  static getPoints() {
    return BOX_POINTS;
  }

  computeCenter(faces) {
    let points = Array.from(new Set(faces.join("").split("")));
    points = points.map((point) => BOX_POINTS[point]);
    let x = 0,
      y = 0,
      z = 0;
    const len = points.length;
    points.forEach((point) => {
      x += point.x;
      y += point.y;
      z += point.z;
    });
    return new THREE.Vector3(x / len, y / len, z / len);
  }

  getDrawFaces(points) {
    if ((points === "ABCDEFGH")) return lackingBoxMap.get(0);
    if ((points === "ABCDEFH")) return lackingBoxMap.get(1);
    if ((points === "ABCDEH")) return lackingBoxMap.get(20);
    if ((points === "ABDEGH")) return lackingBoxMap.get(21);
    
  }

  createAllFaces(faces) {
    faces.forEach((face) => {
      const points = Array.from(face).map(
        (name) => LackingBoxGeometry.getPoints()[name]
      );
      if (face.length === 4) {
        this.addQuadrangle(points);
      }
      if (face.length === 3) {
        this.addBigTriangle(points);
      }
    });
  }
  addFaces(O) {
    this.facesMap.forEach((face) => {
      if (!face) return;
      const [p1, p2, p3] = face.points;
      const i1 = this.vertices.push(p1.x + O.x, p1.y + O.y, p1.z + O.z) / 3 - 1;
      const i2 = this.vertices.push(p2.x + O.x, p2.y + O.y, p2.z + O.z) / 3 - 1;
      const i3 = this.vertices.push(p3.x + O.x, p3.y + O.y, p3.z + O.z) / 3 - 1;
      this.indices.push(i1, i2, i3);
      const { x, y, z } = face.normal;
      this.normals.push(x, y, z, x, y, z, x, y, z);
      this.faces.push(face);
    });
  }

  addPoints(points) {
    const indices = points.map((p) => {
      const id = `${p.x}_${p.y}_${p.z}`;
      let point = this.pointsMap.get(id);
      if (!point) {
        p.vIndex = this.vertices.push(p.x, p.y, p.z) / 3 - 1;
        this.pointsMap.set(id, p);
        point = p;
      }
      return point.vIndex;
    });
    return indices;
  }

  // addFaces() {
  //   this.facesMap.forEach((face) => {
  //     if (!face) return;
  //     const indices = this.addPoints(face.points);
  //     this.indices.push(...indices);
  //     const { x, y, z } = face.normal;
  //     this.normals.push(x, y, z);
  //     this.faces.push(face);
  //   });
  // }

  // addPoints(points) {
  //   const indices = points.map((p) => {
  //     const id = `${p.x}_${p.y}_${p.z}`;
  //     let point = this.pointsMap.get(id);
  //     if (!point) {
  //       p.vIndex = this.vertices.push(p.x, p.y, p.z) / 3 - 1;
  //       this.pointsMap.set(id, p);
  //       point = p;
  //     }
  //     return point.vIndex;
  //   });
  //   return indices;
  // }

  /**
   * p1▁▁▁▁▁p4
   *  ┃         ┃
   *  ┃         ┃
   *  ┃         ┃
   *  ┃         ┃
   * p2▔▔▔▔▔p3
   * @param {Array<THREE.Vector3>} points [p1, p2, p3, p4]
   * @memberof lackingBoxGeometry
   */
  addQuadrangle(points) {
    const [p1, p2, p3, p4] = points;
    this.addBigTriangle([p1, p2, p3]);
    this.addBigTriangle([p3, p4, p1]);
  }

  /**
   *  p1
   *  ┃\
   *  ┃  \
   *  ┃    \
   *  ┃    p0
   *  ┃  /    \
   *  ┃/        \
   * p3▔▔▔▔▔▔p2
   *
   * @param {Array<THREE.Vector3>} points [p1, p2, p3]
   * @memberof lackingBoxGeometry
   */
  addBigTriangle(points) {
    const [p0, p1, p2, p3] = getTriangleLongMidpoint(points);
    this.addSmallTriangle(p0, p1, p3);
    this.addSmallTriangle(p0, p3, p2);
  }

  /**
   *  p1
   *   |\
   *   |  \
   *   |    \
   *   |    /p0
   *   |  /
   *   |/
   *  p2
   * @param {Array<THREE.Vector3>} p1
   * @param {Array<THREE.Vector3>} p2
   * @param {Array<THREE.Vector3>} p3
   * @return {*}
   * @memberof lackingBoxGeometry
   */
  addSmallTriangle(p1, p2, p3) {
    const smallTriangle = new SmallTriangle(p1, p2, p3, this.center);
    smallTriangle.index = this.computeKey(smallTriangle.points);
    // 已经存在的面再次添加会将其值设置为null 换句话说 两次及两次以上添加的面即为重复面,不应该被渲染
    let theFace = this.facesMap.get(smallTriangle.index);
    if (theFace !== null) {
      theFace = theFace === undefined ? smallTriangle : null;
      this.facesMap.set(smallTriangle.index, theFace);
    }
    return;
  }

  /**
   * Generates a sequence-independent unique identifier string for an array of points
   * @param {Array<THREE.Vector3>} points
   * @return { String }
   * @memberof lackingBoxGeometry
   */
  computeKey(points) {
    // 从小到大排列 xyz依次优先
    const sortedPoints = [...points].sort((a, b) => {
      const xab = a.x - b.x;
      if (xab === 0) {
        const yab = a.y - b.y;
        if (yab === 0) {
          return a.z - b.z;
        }
        return yab;
      }
      return xab;
    });
    let key = "";
    sortedPoints.forEach((point) => {
      const { x, y, z } = point;
      key += `-${x}_${y}_${z}`;
    });
    return key;
  }
}

class SmallTriangle {
  /**
   * p1
   *   |\
   *   |  \
   *   |    \
   *   |    /p0
   *   |  /
   *   |/
   * p2
   * @memberof lackingBoxGeometry
   * @param {THREE.Vector3} p1
   * @param {THREE.Vector3} p2
   * @param {THREE.Vector3} p3
   */
  constructor(p1, p2, p3, center) {
    this.type = "SmallTriangle";
    this.normal = new THREE.Vector3();
    this.midpoint = new THREE.Vector3();
    this.createTriangle(p1, p2, p3);
    if (this.isCounterclockwise(center)) {
      this.createTriangle(p3, p2, p1);
    }
  }

  isCounterclockwise(center) {
    const centerToMid = new THREE.Vector3(
      this.midpoint.x - center.x,
      this.midpoint.y - center.y,
      this.midpoint.z - center.z
    );
    const radian = centerToMid.angleTo(this.normal);
    const angle = THREE.Math.radToDeg(radian);
    return floatCompare(angle, ">=", 90, 0.001);
  }

  createTriangle(p1, p2, p3) {
    this.points = [p1, p2, p3];
    this.triangle = new THREE.Triangle();
    this.triangle.set(p1, p2, p3);
    this.triangle.getNormal(this.normal);
    this.triangle.getMidpoint(this.midpoint);
  }
}
