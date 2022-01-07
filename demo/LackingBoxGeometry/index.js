const BOX_POINTS_MAPPING1 = {
  A: new THREE.Vector3(0, -1, -1),
  B: new THREE.Vector3(-1, -1, -1),
  C: new THREE.Vector3(-1, -1, 0),
  D: new THREE.Vector3(0, -1, 0),
  E: new THREE.Vector3(0, 0, -1),
  F: new THREE.Vector3(-1, 0, -1),
  G: new THREE.Vector3(-1, 0, 0),
  H: new THREE.Vector3(0, 0, 0),
};

const BOX_POINTS_MAPPING2 = new Map([
  ["0-1-1", "A"],
  ["-1-1-1", "B"],
  ["-1-10", "C"],
  ["0-10", "D"],
  ["00-1", "E"],
  ["-10-1", "F"],
  ["-100", "G"],
  ["000", "H"],
]);

const BOX_POINTS_MAPPING1_B = {
  A: new THREE.Vector3(0, 1, 1),
  B: new THREE.Vector3(1, 1, 1),
  C: new THREE.Vector3(1, 1, 0),
  D: new THREE.Vector3(0, 1, 0),
  E: new THREE.Vector3(0, 0, 1),
  F: new THREE.Vector3(1, 0, 1),
  G: new THREE.Vector3(1, 0, 0),
  H: new THREE.Vector3(0, 0, 0),
};

const BOX_POINTS_MAPPING2_B = new Map([
  ["011", "A"],
  ["111", "B"],
  ["110", "C"],
  ["010", "D"],
  ["001", "E"],
  ["101", "F"],
  ["100", "G"],
  ["000", "H"],
]);

window.lacks = new Set();

const ALL_POINTS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const lackingBoxMap = new Map([
  ["", ["ABFE", "BCGF", "CDHG", "DAEH", "ADCB", "FGHE"]], // ""
  ["G", ["ABFE", "FBC", "FCH", "HEF", "HCD", "HDAE", "ADCB"]], // "G"
  ["FG", ["ABE", "CDH", "DAEH", "ADCB", "EBCH"]], // FG
  ["CF", ["ABE", "DHG", "DAEH", "ADB", "GHE", "GBD", "EBG"]], // CF
  ["DF", ["BCG", "CHG", "AEH", "ACB", "GHE", "EBG", "HCA", "EAB"]], // DF
  ["CFG", ["ABE", "DAEH", "ADB", "HBD", "EBH"]], // CFG
  ["BEG", ["CDH", "DAH", "ADC", "ACF", "FCH", "HAF"]], // BEG
  ["BCE", ["DHG", "DAH", "FGH", "FADG", "HAF"]], // BCE
  ["ACFG", ["DEH", "HBD", "EBH", "EDB"]], // ACFG
  ["CDFG", ["ABE", "AEH", "EBH", "HBA"]], // CDFG
  ["BEFG", ["HAC", "CDH", "DAH", "ADC"]], // BEFG
  ["BDEG", ["ACF", "FCH", "HAF", "HCA"]], // BDEG
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
 * 获取平面四边形的任意一根对角线
 *
 * @param {*} p1
 * @param {*} p2
 * @param {*} p3
 * @param {*} p4
 * @return {*} 数组前两个是对角线两侧的点
 */
const getDiagonal = (p1, p2, p3, p4) => {
  const p12 = p1.distanceTo(p2);
  const p13 = p1.distanceTo(p3);
  const p14 = p1.distanceTo(p4);
  const max = Math.max(p12, p13, p14);
  if (floatCompare(p12, "=", max, 0.0001)) {
    return [p1, p2, p3, p4];
  }
  if (floatCompare(p13, "=", max, 0.0001)) {
    return [p1, p3, p2, p4];
  }
  if (floatCompare(p14, "=", max, 0.0001)) {
    return [p1, p4, p2, p3];
  }
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

const is4PointsCoplanar = (p1, p2, p3, p4) => {
  let normal = new THREE.Vector3();
  const triangle = new THREE.Triangle();
  triangle.set(p1, p2, p3);
  triangle.getNormal(normal);
  const p14 = new THREE.Vector3();
  p14.subVectors(p1, p4);
  const radian = p14.angleTo(normal);
  const angle = THREE.Math.radToDeg(radian);
  return floatCompare(angle, "=", 90, 0.001);
};

const sortString = (str) => {
  let strLi = str.split("");
  strLi = strLi.sort((a, b) => {
    return a.charCodeAt() - b.charCodeAt();
  });
  return strLi.join("");
};

/**
 * 对点进行排序 x,y,z正方形依次优先
 *
 * @return {*}
 */
const sortPoints = (points) => {
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
  return sortedPoints;
};

/**
 * E---------H(O)
 * |\      |  \
 * |  F--------G
 * |  |     |  |
 * A--|-----D  |
 *  \ |      \ |
 *    B--------C
 *
 */
class LackingBoxGeometry extends THREE.BufferGeometry {
  constructor(
    O,
    points,
    option = {
      renderer: true,
    }
  ) {
    super();
    this.type = "LackingBoxGeometry";
    this.indices = [];
    this.vertices = [];
    this.normals = [];

    this.O = O;
    points = points.filter((item) => item);
    this.center = this.computeCenter(points); // 几何重心
    if (
      this.O.x > this.center.x &&
      this.O.y > this.center.y &&
      this.O.z > this.center.z
    ) {
      this.BOX_POINTS_MAPPING1 = BOX_POINTS_MAPPING1;
      this.BOX_POINTS_MAPPING2 = BOX_POINTS_MAPPING2;
    } else {
      this.BOX_POINTS_MAPPING1 = BOX_POINTS_MAPPING1_B;
      this.BOX_POINTS_MAPPING2 = BOX_POINTS_MAPPING2_B;
    }
    this.faces = [];
    this.facesMap = new Map();
    // 部分面需要双面渲染
    this.doubleFacesMap = new Map();
    this.fatherFacesMap = option.fatherFacesMap || new Map();
    this.pointsMap = new Map();
    if (typeof points !== "string") {
      points = this.computeLackPoints(points);
    }
    const data = this.getDrawFaces(points);
    if (data.faces.length) {
      this.createAllFaces(data.faces);
      this.addFaces(O);
      option.renderer && this.renderGeometry();
    }
  }

  renderGeometry() {
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
    return this.BOX_POINTS_MAPPING1;
  }

  computeLackPoints(points) {
    const exist = new Map();
    points.forEach((point) => {
      const { x, y, z } = point;
      const { x: x0, y: y0, z: z0 } = this.O;
      const id = `${x - x0}${y - y0}${z - z0}`;
      const ch = this.BOX_POINTS_MAPPING2.get(id);
      if (ch) exist.set(ch, true);
    });
    const lack = ALL_POINTS.filter((item) => !exist.has(item)); // 求差集
    return lack.join("");
  }

  // computeCenter(points) {
  //   let x = 0,
  //     y = 0,
  //     z = 0;
  //   const len = points.length;
  //   points.split("").forEach((item) => {
  //     const point = BOX_POINTS_MAPPING1[item];
  //     x += point.x;
  //     y += point.y;
  //     z += point.z;
  //   });
  //   return new THREE.Vector3(x / len, y / len, z / len);
  // }
  computeCenter(points) {
    let x = 0,
      y = 0,
      z = 0;
    points = points.filter((item) => item);
    const len = points.length;
    points.forEach((item) => {
      x += item.x;
      y += item.y;
      z += item.z;
    });
    return new THREE.Vector3(x / len, y / len, z / len);
  }

  getDrawFaces(points) {
    const faces = lackingBoxMap.get(points);
    if (faces) return { faces, points };
    else {
      return this.mappingPoints(points);
    }
  }

  mappingPoints(points) {
    // 最多只能缺5个点
    if (points.length > 5) return { faces: [], points };
    if (points.length >= 4) {
      const newPoints = points.split("").map((item) => {
        const point = this.BOX_POINTS_MAPPING1[item];
        point.key = item;
        return point;
      });
      // if (points.length === 4) {
      //   if (is4PointsCoplanar(...newPoints)) {
      //     const [{ key: i1 }, { key: i2 }, { key: i3 }, { key: i4 }] =
      //       getDiagonal(...newPoints);
      //     // p1 p2 是对角 p3 p4也是对角度
      //     const i132 = `${i1}${i3}${i2}`;
      //     const i123 = `${i1}${i2}${i3}`;
      //     const i124 = `${i1}${i2}${i4}`;
      //     const i142 = `${i1}${i4}${i2}`;
      //     if (this.doubleFacesMap.has(i132)) return { faces: [], points };
      //     // "+i132"值用于避免i132对应的三角面在facesMap中被i123覆盖的情形
      //     this.doubleFacesMap.set(i132, "+i132");
      //     this.doubleFacesMap.set(i123, "+i123");
      //     this.doubleFacesMap.set(i124, "+i124");
      //     this.doubleFacesMap.set(i142, "+i142");
      //     return { faces: [i132, i123, i124, i142], points };
      //   }
      // }
      // if (points.length === 5) {
      //   const newPoints = ALL_POINTS.filter(
      //     (item) => points.indexOf(item) !== -1
      //   );
      //   const [p1, p2, p3] = newPoints;
      //   const p132 = `${p1}${p3}${p2}`;
      //   const p123 = `${p1}${p2}${p3}`;
      //   if (this.doubleFacesMap.has(p132)) return { faces: [], points };
      //   // "+i132"值用于避免i132对应的三角面在facesMap中被i123覆盖的情形
      //   this.doubleFacesMap.set(p132, "+p132");
      //   this.doubleFacesMap.set(p123, "+p123");
      //   return { faces: [p132, p123], points };
      // }
    }
    let i = 0;
    let faces = null;
    let mapping = null;
    let newPoints = null;
    while (i < 24) {
      newPoints = "";
      for (let point of points) {
        mapping = coordMapping.get(point);
        newPoints += mapping[i];
      }
      newPoints = sortString(newPoints);
      faces = lackingBoxMap.get(newPoints);
      if (faces) break;
      i += 1;
    }
    if (!faces) faces = [];
    else {
      faces = faces.map((face) => {
        let newFace = "";
        for (let ch of face) {
          newFace += coordMapping.get(ch)[i];
        }
        return newFace;
      });
    }
    return { faces, points: newPoints };
  }

  createAllFaces(faces) {
    faces.forEach((face) => {
      const points = Array.from(face).map(
        (name) => this.BOX_POINTS_MAPPING1[name]
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
    const index = this.computeKey([p1, p2, p3]);
    const indexFix = this.doubleFacesMap.get(index);
    const needDouble = Boolean(indexFix);
    const smallTriangle = new SmallTriangle(
      p1,
      p2,
      p3,
      this.center,
      needDouble
    );
    // 部分面需要双面渲染
    if (needDouble) {
      const fixedIndex = index + indexFix;
      if (this.facesMap.has(fixedIndex)) {
        return;
      } else {
        this.facesMap.set(fixedIndex, smallTriangle);
      }
    }
    // 已经存在的面再次添加会将其值设置为null 换句话说 两次及两次以上添加的面即为重复面,不应该被渲染
    let theFace = this.fatherFacesMap.get(index);
    if (theFace !== null) {
      if (theFace === undefined) {
        this.facesMap.set(index, smallTriangle);
        this.fatherFacesMap.set(index, true);
      } else {
        this.fatherFacesMap.set(index, null);
      }
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
    const sortedPoints = sortPoints(points);
    let key = "";
    sortedPoints.forEach((point) => {
      let { x, y, z } = point;
      x += this.O.x;
      y += this.O.y;
      z += this.O.z;
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
  constructor(p1, p2, p3, center, needDouble = false) {
    this.type = "SmallTriangle";
    this.normal = new THREE.Vector3();
    this.midpoint = new THREE.Vector3();
    this.createTriangle(p1, p2, p3);
    // 需要双面的情况就不需要纠正顺序
    if (!needDouble && this.isCounterclockwise(center)) {
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
