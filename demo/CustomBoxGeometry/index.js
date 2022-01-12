const BOX_POINTS_MAPPING = new Map([
  ["A", new THREE.Vector3(1, 0, 0)],
  ["B", new THREE.Vector3(0, 0, 0)],
  ["C", new THREE.Vector3(0, 0, 1)],
  ["D", new THREE.Vector3(1, 0, 1)],
  ["E", new THREE.Vector3(1, 1, 0)],
  ["F", new THREE.Vector3(0, 1, 0)],
  ["G", new THREE.Vector3(0, 1, 1)],
  ["H", new THREE.Vector3(1, 1, 1)],
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
  if (points.length === 1) return points;
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
 * Generates a sequence-independent unique identifier string for an array of points
 * @param {Array<THREE.Vector3>} points
 * @return { String }
 * @memberof lackingBoxGeometry
 */
const computeKey = (points) => {
  const sortedPoints = sortPoints(points);
  const keyLi = sortedPoints.map((point) => {
    const { x, y, z } = point;
    return `${x},${y},${z}`;
  });
  return keyLi.join(";");
};

class CustomBoxGeometry extends THREE.BufferGeometry {
  constructor(
    oPoint,
    option = {
      renderer: true,
    }
  ) {
    super();
    this.type = "CustomBoxGeometry";
    this.indices = [];
    this.vertices = [];
    this.normals = [];
    this.faces = option.faces || new Map();
    this.pointsMap = option.pointsMap || new Map();
    this.fatherEdgesMap = option.edgesMap || new Map();
    this.edgesMap = new Map();
    this.facesMap = option.facesMap || new Map();
    this.oPoint = oPoint;
    this.center = oPoint.vector.clone().addScalar(0.5);
    this.createAllFaces();
    option.renderer && this.renderGeometry();
  }

  renderGeometry() {
    this.faces.forEach((face) => {
      const [p1, p2, p3] = face.points;
      const i1 = this.vertices.push(p1.x, p1.y, p1.z) / 3 - 1;
      const i2 = this.vertices.push(p2.x, p2.y, p2.z) / 3 - 1;
      const i3 = this.vertices.push(p3.x, p3.y, p3.z) / 3 - 1;
      this.indices.push(i1, i2, i3);
      const { x, y, z } = face.normal;
      this.normals.push(x, y, z, x, y, z, x, y, z);
    });
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

  /**
   * E---------H
   * |\       | \
   * |  F--------G
   * |  |     |  |
   * A--|-----D  |
   *  \ |      \ |
   *    B--------C
   *   (O)
   * FBCG HDAE DCBA HGFE EABF GCDH
   *  -x   +x   -y   +y   -z   +z
   */
  createAllFaces() {
    const { x: x0, y: y0, z: z0 } = this.oPoint.vector;
    const mapping = new Map();

    BOX_POINTS_MAPPING.forEach((item, index) => {
      const { x, y, z } = item;
      mapping.set(index, new THREE.Vector3(x + x0, y + y0, z + z0));
    });
    ["FBCG", "HDAE", "DCBA", "HGFE", "EABF", "GCDH"].forEach((face, index) => {
      const points = Array.from(face).map((name) => mapping.get(name));
      // 这个方向上有距离为1的邻点则无需渲染该面 但是edge还是需要加上
      if (this.oPoint.neighbour[1][index]) {
        const [p1, p2, p3, p4] = points;
        this.addEdge(p1, p2);
        this.addEdge(p2, p3);
        this.addEdge(p3, p4);
        this.addEdge(p4, p1);
        return;
      }
      this.addQuadrangle(...points);
    });
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
  addQuadrangle(p1, p2, p3, p4) {
    this.addBigTriangle(p1, p2, p3);
    this.addBigTriangle(p3, p4, p1);
  }

  /**
   *  p1
   *  ┃\
   *  ┃  \
   *  ┃    \
   *  ┃     \
   *  ┃       \
   *  ┃         \
   * p2▔▔▔▔▔▔p3
   *
   * @param {Array<THREE.Vector3>} points [p1, p2, p3]
   * @memberof lackingBoxGeometry
   */
  addBigTriangle(p1, p2, p3) {
    const index = computeKey([p1, p2, p3]);
    const smallTriangle = new SmallTriangle(p1, p2, p3, this.center);
    // 已经存在的面再次添加会将其值设置为null 换句话说 两次及两次以上添加的面即为重复面,不应该被渲染
    let theFace = this.facesMap.get(index);
    if (theFace === undefined) {
      this.faces.push(smallTriangle);
      this.facesMap.set(index, smallTriangle);
    }
    this.addEdge(p1, p2);
    this.addEdge(p2, p3);
    return;
  }

  addPoint(p) {
    const key = computeKey([p]);
    let thePoint = this.pointsMap.get(key);
    if (thePoint) {
      thePoint.count += 1;
    } else {
      thePoint = new VirtualPoint(p, key);
      this.pointsMap.set(key, thePoint);
    }
    return thePoint;
  }

  /**
   * @param {*} p1
   * @param {*} p2
   * @memberof CustomBoxGeometry
   */
  addEdge(p1, p2) {
    const index = computeKey([p1, p2]);
    const theEdge = this.edgesMap.get(index);
    // if (theEdge === null) return;
    const points = [this.addPoint(p1), this.addPoint(p2)];
    if (!theEdge) {
      const theFatherEdge = this.fatherEdgesMap.get(index);
      if (theFatherEdge) {
        theFatherEdge.count += 1;
        if (theFatherEdge.count === 4) {
          this.fatherEdgesMap.delete(index);
        }
      } else {
        this.fatherEdgesMap.set(index, { points, count: 1 });
      }
      this.edgesMap.set(index, points);
    }
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
    if (!this.isWrongClockwise(center)) {
      this.createTriangle(p3, p2, p1);
    }
  }

  isWrongClockwise(center) {
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

const notEqual = (a, b) => {
  return floatCompare(a, "!=", b, 0.0001);
};

class VirtualPoint {
  constructor(vector, key) {
    this.key = key;
    this.vector = vector;
    this.count = 0;
    this.neighbour = this.getNeighbour();
  }

  countNotEqual(point) {
    let { x: x0, y: y0, z: z0 } = this.vector;
    const { x, y, z } = point;
    let count = 0;
    if (notEqual(x0, x)) count += 1;
    if (notEqual(y0, y)) count += 1;
    if (notEqual(z0, z)) count += 1;
    return count;
  }

  getNeighbour() {
    let { x: x0, y: y0, z: z0 } = this.vector;
    const neighbour = { 0: [], 1: [], 2: [], 3: [], all: [] };
    for (let x = x0 - 1; x <= x0 + 1; x += 1) {
      for (let y = y0 - 1; y <= y0 + 1; y += 1) {
        for (let z = z0 - 1; z <= z0 + 1; z += 1) {
          const point = { x, y, z };
          const key = computeKey([point]);
          const notEqual = this.countNotEqual(point);
          neighbour[notEqual].push(key);
          neighbour.all.push(key);
        }
      }
    }
    return neighbour;
  }
}
