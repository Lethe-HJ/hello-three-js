/**
 * @description 根据原始数据筛选符合条件的点 生成vector3点并根据连续性分组
 * @param { Array<Number> } data origin data
 * @param { Number } sideLen origin data
 * @param { Function } checkSuitable filter condition
 * @returns { Array<Points> } a set of Points to describe multiple geometry
 */
const generateSplitPoints = (data, sideLen, checkSuitable) => {
  let pointsMap = new Map(data.map((v, idx) => [idx, v]));
  const gap = 1;
  let i = 0;
  const pointsLi = [];
  const stack = [];
  while (pointsMap.size) {
    const points = [];
    if (!pointsMap.has(i)) {
      i += 1;
      continue;
    }
    stack.push(i);
    while (stack.length) {
      const j = stack.pop();
      const value = pointsMap.get(j);
      const node = createNode(j, sideLen, 1);
      if (checkSuitable(value)) {
        const { x, y, z } = node;
        node.vector = new THREE.Vector3(x * gap, y * gap, z * gap);
        points[j] = node;
        stack.push(...node.neighbour);
      }
      pointsMap.delete(j);
    }
    points.length && pointsLi.push(points);
  }
  return pointsLi;
};

/**
 * compare two float with operator ">, <, =, >=, <= ,!="
 *
 * @param {*} operandA
 * @param {*} operator
 * @param {*} operandB
 * @param {*} [accuracy=null]
 * @return {*}
 */
const floatCompare = (operandA, operator, operandB, accuracy = null) => {
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
 * object to set size of xyz
 * @typedef { { x: Number, y: Number, z: Number} } XYZSize
 */

/**
 *
 * @param { Number } x
 * @param { Number } y
 * @param { Number } z
 * @param { side length } sideLen
 * @returns
 */
const getIndex = (x, y, z, sideLen) => {
  return x + sideLen * y + sideLen * sideLen * z;
};

/**
 * @typedef { Array<Number> } Neighbour
 */

/**
 * a set of Node to describe a point of geometry
 * @typedef { {index: Number, x: Number, y: Number,z: Number, neighbour: Neighbour } } NodeObj
 */

/**
 * create Node by index
 * @param { Number } index index of data item
 * @returns { NodeObj }
 */
const createNode = (index, sideLen, offset = 1) => {
  const x0 = Math.floor(index % sideLen);
  const y0 = Math.floor((index % (sideLen * sideLen)) / sideLen);
  const z0 = Math.floor(index / (sideLen * sideLen));
  const neighbour = [];
  const xMin = Math.max(0, x0 - offset),
    max = Math.min(x0 + offset, sideLen - 1);
  for (let x = xMin; x <= max; x += offset) {
    const yMin = Math.max(0, y0 - offset),
      max = Math.min(y0 + offset, sideLen - 1);
    for (let y = yMin; y <= max; y += offset) {
      const zMin = Math.max(0, z0 - offset),
        max = Math.min(z0 + offset, sideLen - 1);
      for (let z = zMin; z <= max; z += offset) {
        const count1 = countNum(x - x0, y - y0, z - z0);
        const index = getIndex(x, y, z, sideLen);
        // neighbour数组前面添加距离较近的邻点(距离为1) 后面添加距离稍远的邻点(距离为√2 即对角线)
        if (count1 === 3) continue;
        // hisself
        else if (count1 === 2) neighbour.unshift(index);
        // distance equals one
        else neighbour.push(index); // distance equals square root of 1
      }
    }
  }
  return new Point(index, x0, y0, z0, neighbour);
};

const countNum = (a, b, c) => {
  let count = 0;
  [a, b, c].forEach((item) => {
    if (item === 0) count += 1;
  });
  return count;
};

class ConcaveSurfaceGeometry extends THREE.BufferGeometry {
  constructor(cPoints) {
    super();
    this.indices = [];
    this.vertices = [];
    this.normals = [];
    this.type = "ConcaveSurfaceGeometry";
    this.cPoints = this.markSurfacePoints(cPoints);
    this.center = this.computeCenter(this.cPoints);
    this.edgesMap = this.bfsTraverseConnect();
    this.faces = this.computerFace();

    this.setIndex(this.indices);
    this.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.vertices, 3)
    );
    this.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(this.normals, 3)
    );
    // this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  }

  computeCenter(cPoints) {
    const count = {
      x: 0,
      y: 0,
      z: 0,
    };
    const len = cPoints.length;
    cPoints.forEach((point) => {
      count.x += point.x;
      count.y += point.y;
      count.z += point.z;
    });
    return new THREE.Vector3(count.x / len, count.y / len, count.z / len);
  }

  markSurfacePoints(cPoints) {
    cPoints.forEach((point) => {
      let neighbourCount = 0;
      point.neighbour.forEach((nItem) => {
        if (cPoints[nItem]) neighbourCount += 1;
      });
      point.isSurface = neighbourCount < 26;
    });
    return cPoints;
  }

  get surfacePoints() {
    return this.cPoints.filter((point) => point && point.isSurface);
  }

  /**
   *  B___C
   *  |  /
   *  | /
   *  |/
   *  A
   * @return {*}
   * @memberof ConcaveSurfaceGeometry
   */
  bfsTraverseConnect() {
    const visitedMap = new Map();
    const stack = [];
    const edgesMap = new Map();
    for (let i = 0; i < this.cPoints.length; i++) {
      if (!this.cPoints[i] || !this.cPoints[i].isSurface) continue;
      stack.push(i);
      while (stack.length) {
        const cIndex = stack.pop();
        const cPoint = this.cPoints[cIndex];
        cPoint.edges = [];
        if (visitedMap.get(cIndex)) continue;
        // vIndex is the index of vector in this.vertices
        const { x, y, z } = cPoint.vector;
        cPoint.vIndex = this.vertices.push(x, y, z) / 3 - 1;
        visitedMap.set(cIndex, cPoint);
        const cNeighbour = cPoint.neighbour;
        for (let j = 0; j < cNeighbour.length; j += 1) {
          const nIndex = cNeighbour[j];
          const point = this.cPoints[nIndex];
          if (point && point.isSurface) {
            stack.push(nIndex);
            let edge = null;
            if (this.isSameDirection(point, cPoint, this.center)) {
              let begin = cPoint;
              let end = point;
              if (j >= cNeighbour.length / 2) {
                let temp = begin;
                begin = end;
                end = temp;
              }
              edge = new Edge(begin, end);
            }
            // edge not equal null and edge not register
            if (edge && !edgesMap.has(edge.id)) {
              edgesMap.set(edge.id, edge);
              cPoint.edges.push(edge);
            }
          }
        }
      }
    }
    return edgesMap;
  }

  /**
   * A------->B------->C
   *
   * @param {*} pointA
   * @param {*} pointB
   * @param {*} pointC
   * @return {*}
   * @memberof ConcaveSurfaceGeometry
   */

  isSameDirection(pointA, pointB, pointC) {
    const { x: xA, y: yA, z: zA } = pointA;
    const { x: xB, y: yB, z: zB } = pointB;
    const { x: xC, y: yC, z: zC } = pointC;
    if (xC !== xA && xB !== xA) {
      // 向量AB和向量AC方向相同 则xNot为0
      const xNot = (xB - xA > 0) ^ (xC - xA > 0);
      if (xNot) return false;
    }
    if (yC !== yA && yB !== yA) {
      const yNot = (yB - yA > 0) ^ (yC - yA > 0);
      if (yNot) return false;
    }
    if (zC !== zA && zB !== zA) {
      const zNot = (zB - zA > 0) ^ (zC - zA > 0);
      if (zNot) return false;
    }
    return true;
  }

  computerFace() {
    const faces = [];
    // if(this.cPoints.length > 1000) {
    //   debugger
    // }
    for (let [_, edge_a] of this.edgesMap) {
      let faceCount = 0;
      const { begin: pointA, end: pointB } = edge_a;
      for (let i = 0; i < pointB.edges.length; i += 1) {
        const edge_b = pointB.edges[i];
        if (faceCount === 2) break;
        const pointC = edge_b.end;
        if (pointC.index === pointA.index) continue; // edge_b is edge_a
        const edge_c = this.edgesMap.get(`${pointC.index}_${pointA.index}`);
        if (edge_c) {
          const face = new Face(edge_a, edge_b, edge_c);
          faces.push(face);
          this.addFace(face);
          faceCount += 1;
        }
      }
    }
    return faces;
  }

  addFace(face) {
    const indices = face.points.map((point) => point.vIndex);
    this.indices.push(...indices);
    this.normals.push(face.normal);
  }
}

/**
 * a set of points to describe a geometry
 * @typedef { Array<THREE.Vector3> } Points
 */

class Point {
  constructor(index, x, y, z, neighbour) {
    this.index = index;
    this.x = x;
    this.y = y;
    this.z = z;
    this.neighbour = neighbour;
    this.edges = [];
  }
}

class Edge {
  constructor(pointA, pointB) {
    this.id = `${pointA.index}_${pointB.index}`;
    this.begin = pointA;
    this.end = pointB;
  }
}

class Face {
  constructor(edgeA, edgeB, edgeC) {
    this.edges = [edgeA, edgeB, edgeC];
    this._points = null;
    this.normal = new THREE.Vector3();
    this.midpoint = new THREE.Vector3();
    this.compute();
  }

  get points() {
    if (!this._points) {
      this._points = [
        this.edges[0].begin,
        this.edges[1].begin,
        this.edges[2].begin,
      ];
    }
    return this._points;
  }

  compute() {
    const triangle = new THREE.Triangle();
    const points = this.points.map((point) => point.vector);
    triangle.set(...points);
    triangle.getNormal(this.normal);
    triangle.getMidpoint(this.midpoint);
  }
}
