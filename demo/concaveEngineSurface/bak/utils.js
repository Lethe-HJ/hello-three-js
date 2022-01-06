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
  if (x >= sideLen || y >= sideLen || z >= sideLen) return null;
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
        const index = getIndex(x, y, z, sideLen);
        neighbour.push(index);
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

class ConcaveSurfaceGeometry extends THREE.BufferGeometry {
  constructor(
    cPoints,
    sideLen,
    options = {
      smoothness: 0,
      coefficient: 0.4,
      maxOffset: 0.1,
    }
  ) {
    super();
    this.options = options;
    this.indices = [];
    this.vertices = [];
    this.normals = [];
    this.center = this.computeCenter(cPoints); // 几何重心
    this.type = "ConcaveSurfaceGeometry";
    this.edgesMap = new Map();
    this.faces = [];
    this.sideLen = sideLen;
    this.uvs = [];
    this.cPoints = this.markSurfacePoints(cPoints);

    this.makeFaces();
    this.setIndex(this.indices);
    this.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.vertices, 3)
    );
    this.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(this.normals, 3)
    );
    // this.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
  }

  computeCenter(cPoints) {
    let x = 0,
      y = 0,
      z = 0;
    const len = cPoints.length;
    cPoints.forEach((point) => {
      x += point.x;
      y += point.y;
      z += point.z;
    });
    return new THREE.Vector3(x / len, y / len, z / len);
  }

  markSurfacePoints(cPoints) {
    cPoints.forEach((point) => {
      let neighbourCount = 0;
      point.neighbour.forEach((nItem) => {
        if (cPoints[nItem]) neighbourCount += 1;
      });
      point.isSurface = neighbourCount < 27;
    });
    return cPoints;
  }

  get surfacePoints() {
    return this.cPoints.filter((point) => point && point.isSurface);
  }

  /**
   * @return {*}
   * @memberof ConcaveSurfaceGeometry
   */
  makeFaces() {
    const visitedMap = new Map();
    const len = this.cPoints.length;
    for (let i = 0; i < this.cPoints.length; i++) {
      const A = this.cPoints[i];
      // 该点不存在(不符合要求) 或者 该点不在面上
      if (!A || !A.isSurface) continue;
      // 这个点已经被访问过了
      if (visitedMap.get(i)) continue;
      A.edges = [];
      visitedMap.set(i, A);
      const faces = this.getFacesOf(A);
      faces.forEach((face) => {
        const moreFaces = this.smoothing(face);
        moreFaces.forEach((face1) => {
          this.addFace(face1);
        });
      });
    }
  }

  smoothing(face) {
    let { smoothness, coefficient, maxOffset } = this.options;
    let faces = [face];
    for (let s = 0; s < smoothness; s += 1) {
      const coef = coefficient * Math.pow(s + 1, -1);
      const mOffset = maxOffset * Math.pow(s + 1, -1);
      const newFaces = [];
      for (let i = 0; i < faces.length; i += 1) {
        const newFace = faces[i];
        const { p1, p2, p3 } = newFace;
        const r = p1.distanceTo(newFace.midpoint);
        if (r < 0.1) break;
        const modulus = Math.min(coef * r, mOffset);
        const normal = newFace.normal;
        const { x: nx0, y: ny0, z: nz0 } = normal;
        const newNormal = new THREE.Vector3(
          nx0 * modulus,
          ny0 * modulus,
          nz0 * modulus
        );
        const { x: nx, y: ny, z: nz } = newNormal;
        const { x: x0, y: y0, z: z0 } = newFace.midpoint;
        const p0 = new THREE.Vector3(nx + x0, ny + y0, nz + z0);
        newFaces.push(
          this.getFace(p1, p2, p0),
          this.getFace(p0, p2, p3),
          this.getFace(p1, p0, p3)
        );
      }
      faces = newFaces;
    }
    return faces;
  }

  /**
   * B1-------C1
   * | \      | \
   * |  A1-------D1
   * |  |     |  |
   * B--|-----C  |
   *  \ |      \ |
   *    A--------D
   * @param {*} A
   * @returns
   */
  getFacesOf(A) {
    const { x, y, z } = A;
    const facesLi = [];
    const points = {
      A: [x, y, z],
      B: [x + 1, y, z],
      C: [x + 1, y, z + 1],
      D: [x, y, z + 1],
      A1: [x, y + 1, z],
      B1: [x + 1, y + 1, z],
      C1: [x + 1, y + 1, z + 1],
      D1: [x, y + 1, z + 1],
    };
    for (let key in points) {
      const newPoint = this.cPoints[getIndex(...points[key], this.sideLen)];
      if (newPoint && newPoint.isSurface) {
        points[key] = newPoint;
      } else {
        points[key] = null;
      }
    }
    const pointsLi = Object.values(points)
      .filter((item) => item)
      .map((item) => item.vector);
    if (pointsLi.length >= 4) {
      if (THREE.ConvexHull === undefined) {
        console.error(
          "THREE.ConcaveSurfaceGeometry: ConvexBufferGeometry relies on THREE.ConvexHull"
        );
      }

      const convexHull = new THREE.ConvexHull().setFromPoints(pointsLi);
      const faces = convexHull.faces;
      faces.forEach((face, index) => {
        let edge = face.edge;
        const p1 = edge.vertex.point;
        edge = edge.next;
        const p2 = edge.vertex.point;
        edge = edge.next;
        const p3 = edge.vertex.point;
        // if (p1.x === p2.x && p2.x === p3.x && p3.x === x + 1) return;
        // if (p1.y === p2.y && p2.y === p3.y && p3.y === y + 1) return;
        // if (p1.z === p2.z && p2.z === p3.z && p3.z === z + 1) return;

        facesLi.push(this.getFace(p1, p2, p3));
      });
    }

    return facesLi;
  }

  getFace(p1, p2, p3) {
    this.getEdge(p1, p2);
    this.getEdge(p2, p3);
    this.getEdge(p3, p1);
    const face = new Face(p1, p2, p3, this.center);

    return face;
  }

  getEdge(begin, end) {
    const edgeKey = `${begin.index}_${end.index}`;
    let edge = this.edgesMap.get(edgeKey);
    if (!edge) {
      edge = new Edge(begin, end);
      this.edgesMap.set(edgeKey, edge);
    }
    return edge;
  }

  addFace(face) {
    const { p1, p2, p3 } = face;
    p1.vIndex = this.vertices.push(p1.x, p1.y, p1.z) / 3 - 1;
    p2.vIndex = this.vertices.push(p2.x, p2.y, p2.z) / 3 - 1;
    p3.vIndex = this.vertices.push(p3.x, p3.y, p3.z) / 3 - 1;
    this.indices.push(face.p1.vIndex, face.p2.vIndex, face.p3.vIndex);
    const { x, y, z } = face.normal;
    this.normals.push(x, y, z, x, y, z, x, y, z);
    this.faces.push(face);
  }
}

class Edge {
  constructor(e1, e2) {
    this.begin = e1;
    this.end = e2;
  }
}

class Face {
  constructor(p1, p2, p3, center) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.normal = new THREE.Vector3();
    this.midpoint = new THREE.Vector3();
    this.newTriangle(p1, p2, p3);
    const centerToMid = new THREE.Vector3(
      this.midpoint.x - center.x,
      this.midpoint.y - center.y,
      this.midpoint.z - center.z
    );
    const radian = this.midpoint.angleTo(centerToMid);
    const angle = THREE.Math.radToDeg(radian);
    if (angle > Math.PI) {
      this.newTriangle(p3, p2, p1);
    }
  }
  newTriangle(p1, p2, p3) {
    const triangle = new THREE.Triangle();
    triangle.set(p1, p2, p3);
    triangle.getNormal(this.normal);
    triangle.getMidpoint(this.midpoint);
  }
}
