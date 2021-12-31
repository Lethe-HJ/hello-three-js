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
  constructor(cPoints, sideLen) {
    super();
    this.indices = [];
    this.vertices = [];
    this.normals = [];
    this.type = "ConcaveSurfaceGeometry";
    this.faces = [];
    this.sideLen = sideLen;
    this.cPoints = this.markSurfacePoints(cPoints);
    this.edgesMap = this.bfsTraverseConnect();
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
   * X
   * ^
   * |  B___C
   * |  |  /
   * |  | /
   * |  |/
   * |  A
   * |
   * |  C___B
   * |   \  |
   * |    \ |
   * |     \|
   * |      A
   * |  Y
   * | /
   * |/
   * 0-------------> Z
   * @return {*}
   * @memberof ConcaveSurfaceGeometry
   */
  // bfsTraverseConnect() {
  //   const visitedMap = new Map();
  //   const stack = [];
  //   const edgesMap = new Map();
  //   for (let i = 0; i < this.cPoints.length; i++) {
  //     const cPoint = this.cPoints[i];
  //     // 该点不存在(不符合要求) 或者 该点不在面上
  //     if (!cPoint || !cPoint.isSurface) continue;
  //     // 这个点已经被访问过了
  //     if (visitedMap.get(i)) continue;
  //     stack.push(i);
  //     while (stack.length) {
  //       const i = stack.pop();
  //       const A = this.cPoints[i];
  //       A.edges = [];
  //       if (visitedMap.get(i)) continue;
  //       // vIndex is the index of vector in this.vertices
  //       const { x, y, z } = A.vector;
  //       if (!A.vIndex) {
  //         A.vIndex = this.vertices.push(x, y, z) / 3 - 1;
  //       }
  //       visitedMap.set(i, A);
  //       const cNeighbour = A.neighbour;
  //       for (let j = 0; j < cNeighbour.length; j += 1) {
  //         const nIndex = cNeighbour[j];
  //         if (visitedMap.get(nIndex)) continue;
  //         const point = this.cPoints[nIndex];
  //         if (point && point.isSurface) {
  //           stack.push(nIndex);
  //           const BCs = this.findBCPair(A);
  //           BCs.forEach((BC) => {
  //             // console.log(BC.B.vector, BC.C.vector);
  //             const { B, C } = BC;
  //             const ab = new Edge(A, B);
  //             const bc = new Edge(B, C);
  //             const ca = new Edge(C, A);
  //             // if (edgesMap.has(ab.id)) return;
  //             // if (edgesMap.has(bc.id)) return;
  //             // if (edgesMap.has(ca.id)) return;
  //             if (!B.vIndex) {
  //               const { x, y, z } = B.vector;
  //               B.vIndex = this.vertices.push(x, y, z) / 3 - 1;
  //             }
  //             if (!C.vIndex) {
  //               const { x, y, z } = C.vector;
  //               C.vIndex = this.vertices.push(x, y, z) / 3 - 1;
  //             }
  //             edgesMap.set(ab.id, ab);
  //             edgesMap.set(bc.id, bc);
  //             edgesMap.set(ca.id, ca);
  //             // if (this.faces.length > 10) return;
  //             const face = new Face(ab, bc, ca);
  //             this.faces.push(face);
  //             this.addFace(face);
  //           });
  //           // const edge = new Edge(A, point);
  //           // if (edge && !edgesMap.has(edge.id)) {
  //           //   edgesMap.set(edge.id, edge);
  //           //   A.edges.push(edge);
  //           // }
  //         }
  //       }
  //     }
  //   }
  //   return edgesMap;
  // }

  bfsTraverseConnect() {
    const visitedMap = new Map();
    const edgesMap = new Map();
    for (let i = 0; i < this.cPoints.length; i++) {
      const A = this.cPoints[i];
      // 该点不存在(不符合要求) 或者 该点不在面上
      if (!A || !A.isSurface) continue;
      // 这个点已经被访问过了
      if (visitedMap.get(i)) continue;
      A.edges = [];
      // vIndex is the index of vector in this.vertices
      const { x, y, z } = A.vector;
      if (!A.vIndex) {
        A.vIndex = this.vertices.push(x, y, z) / 3 - 1;
      }
      visitedMap.set(i, A);
      const BCs = this.findBCPair(A);
      BCs.forEach((BC) => {
        // console.log(BC.B.vector, BC.C.vector);
        const { B, C } = BC;
        const ab = new Edge(A, B);
        const bc = new Edge(B, C);
        const ca = new Edge(C, A);
        // if (edgesMap.has(ab.id)) return;
        // if (edgesMap.has(bc.id)) return;
        // if (edgesMap.has(ca.id)) return;
        if (!B.vIndex) {
          const { x, y, z } = B.vector;
          B.vIndex = this.vertices.push(x, y, z) / 3 - 1;
        }
        if (!C.vIndex) {
          const { x, y, z } = C.vector;
          C.vIndex = this.vertices.push(x, y, z) / 3 - 1;
        }
        edgesMap.set(ab.id, ab);
        edgesMap.set(bc.id, bc);
        edgesMap.set(ca.id, ca);
        // if (this.faces.length > 10) return;
        const face = new Face(ab, bc, ca);
        this.faces.push(face);
        this.addFace(face);
      });
    }
    return edgesMap;
  }

  findBCPair(A) {
    const Bs = [];
    const Cs = [];
    const B1 = this.cPoints[getIndex(A.x + 1, A.y, A.z, this.sideLen)];
    B1 && B1.isSurface && Bs.push(B1);
    const B2 = this.cPoints[getIndex(A.x + 1, A.y + 1, A.z, this.sideLen)];
    B2 && B2.isSurface && Bs.push(B2);

    const C1 = this.cPoints[getIndex(A.x + 1, A.y, A.z + 1, this.sideLen)];
    C1 && C1.isSurface && Cs.push(C1);
    const C2 = this.cPoints[getIndex(A.x + 1, A.y + 1, A.z + 1, this.sideLen)];
    C2 && C2.isSurface && Cs.push(C2);
    const BCs = [];
    Bs.forEach((B) => {
      Cs.forEach((C) => {
        BCs.push({ B, C });
      });
    });
    return BCs;
  }

  // computerFace() {
  //   const faces = [];
  //   // if(this.cPoints.length > 1000) {
  //   //   debugger
  //   // }
  //   for (let [_, edge_a] of this.edgesMap) {
  //     let faceCount = 0;
  //     const { begin: pointA, end: pointB } = edge_a;
  //     for (let i = 0; i < pointB.edges.length; i += 1) {
  //       const edge_b = pointB.edges[i];
  //       if (faceCount === 2) break;
  //       const pointC = edge_b.end;
  //       if (pointC.index === pointA.index) continue; // edge_b is edge_a
  //       const edge_c = this.edgesMap.get(`${pointC.index}_${pointA.index}`);
  //       if (edge_c) {
  //         const face = new Face(edge_a, edge_b, edge_c);
  //         faces.push(face);
  //         this.addFace(face);
  //         faceCount += 1;
  //       }
  //     }
  //   }
  //   return faces;
  // }

  addFace(face) {
    const indices = face.points.map((point) => point.vIndex);
    this.indices.push(...indices);
    this.normals.push(face.normal);
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
