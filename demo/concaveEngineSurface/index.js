/**
 * 记录数组arr中出现次数为times的item
 * @param {Array} arr
 * @param {Number} times
 * @returns {Array}
 */
const countDisplayTimes = (arr, times) => {
  const map = new Map();
  arr.forEach((item) => {
    const count = map.get(item);
    if (count) map.set(item, count + 1);
    else map.set(item, 1);
  });
  const res = [];
  map.forEach((count, index) => {
    if (count === times) res.push(index);
  });
  return res;
};

/**
 * 计算两点的中点
 */
const computerMidpoint = (a, b) => {
  a = a.clone();
  b = b.clone();
  return new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
};

/**
 * 求p1关于p的对称点p2的坐标
 * p1————-p————-p2
 */
const computerSymmetryPoint = (p1, p) => {
  const { x: x1, y: y1, z: z1 } = p1.clone();
  const { x, y, z } = p.clone();
  return new THREE.Vector3(2 * x - x1, 2 * y - y1, 2 * z - z1);
};

/**
 * 判断两个向量是否垂直
 * @param {*} v1
 * @param {*} v2
 * @return {*}
 */
const isVertical = (v1, v2) => {
  const radian = v1.angleTo(v2);
  const angle = THREE.Math.radToDeg(radian);
  return floatCompare(angle, "=", 90, 0.001);
};

class ConcaveGeometry extends THREE.BufferGeometry {
  constructor(points, sideLen) {
    super();
    this.type = "ConcaveGeometry";
    this.indices = [];
    this.vertices = [];
    this.normals = [];

    // 记录子box的面是否已经注册过
    this.facesMap = new Map();
    this.edgesMap = new Map();
    this.pointsMap = new Map();
    this.debuggerData = { point: [], edge: [] };
    this.faces = [];
    this.sideLen = sideLen;
    this.cPoints = points;
    this.markSurfacePoints(points);
    this.boxes = this.createCustomBoxes();
    this.smoothing();
    this.renderGeometry();
  }

  get surfacePoints() {
    return this.cPoints.filter((point) => point && point.isSurface);
  }

  markSurfacePoints(cPoints) {
    this.cPointsMap = new Map();
    this.cPointsKeyMap = new Map();
    cPoints.forEach((point, index) => {
      if (point) {
        this.cPointsMap.set(index, point);
        const { x, y, z } = point.vector;
        this.cPointsKeyMap.set(`${x},${y},${z}`, point);
      }
    });
    cPoints.forEach((point) => {
      // 只有全部相邻位置存在点 才不是表面的点
      point.isSurface = !point.neighbour.all.every((nItem) => {
        return this.cPointsMap.get(nItem);
      });
    });
  }

  /**
   * E————————-H
   * |\      |  \
   * |  F————————G
   * |  |     |  |
   * A——|————-D  |
   *  \ |      \ |
   *    B————————C
   *
   */
  createCustomBoxes() {
    const start = new Date().getTime();
    const boxes = [];
    const cPoints = this.cPoints;
    for (let i = 0; i < cPoints.length; i += 1) {
      const point = cPoints[i];
      if (point) {
        point.vector.addScalar(-0.5);
        point.neighbour[1] = point.neighbour[1].map((item) => {
          if (!item) return undefined;
          const [x, y, z] = item;
          return this.cPointsKeyMap.get(`${x},${y},${z}`);
        });
        // O点即是H点
        new CustomBoxGeometry(point, {
          renderer: false,
          pointsMap: this.pointsMap,
          facesMap: this.facesMap,
          edgesMap: this.edgesMap,
          faces: this.faces,
        });
      }
    }
    console.log("createCustomBoxes花费", new Date().getTime() - start);
    return boxes;
  }

  getPointsMap(p) {
    const { x, y, z } = p;
    return this.pointsMap.get(`${x},${y},${z}`);
  }

  addDebuggerPoint(p1) {
    p1 = p1.vector || p1;
    const p11 = p1.clone().addScalar(0.01);
    this.debuggerData.point.push(p11);
  }

  addDebuggerEdge(p1, p2) {
    p1 = p1.vector || p1;
    p2 = p2.vector || p2;
    const p11 = p1.clone().addScalar(0.01);
    const p21 = p2.clone().addScalar(0.01);
    this.debuggerData.edge.push([p11, p21]);
  }

  /**
   * 分类point关联的edge 依据count分为1=>convex, 2=>flat, 3=>concave
   *
   * @param {*} index
   * @param {*} edge
   * @memberof ConcaveGeometry
   */
  classifyEdgesOfPoint(index, edge) {
    let edgePoint = this.edgePointsMap.get(index);
    if (!edgePoint) {
      edgePoint = { convex: [], flat: [], concave: [], others: [] };
      this.edgePointsMap.set(index, edgePoint);
    }
    if (edge.count === 1) {
      // convex edge
      edgePoint.convex.push(edge);
    } else if (edge.count === 2) {
      // concave edge or flat edge
      /**
       * edge.count === 2 可能是下列两种情况
       * 情况1
       *      1————c
       *      |\    \
       *      | \    \
       * 3————4  2————a
       * |\    \ |    |
       * | \    \|    |
       * b  5————6————9
       *  \ |    |
       *   \|    |
       *    ————-7
       *
       * 情况2
       * 3————4————a
       * |\    \    \
       * | \    \    \
       * b  5————6————9
       *  \ |    |    |
       *   \|    |    |
       *    ————-7————-
       * 情况1应该归类于concave 情况2应该归类于flat
       * 区分方法: 情况2的46 不存在edge12 向量14,26相等,长度为1,且14,26与46垂直
       */
      const [p4, p6] = edge.points;
      const v46 = p6.vector.clone().sub(p4.vector);
      // 遍历距离为1的邻居
      for (let i = 0; i < p6.neighbour[1].length; i += 1) {
        const i2 = p6.neighbour[1][i];
        const p2 = this.pointsMap.get(i2);
        if (!p2) continue;
        const v26 = p6.vector.clone().sub(p2.vector);
        if (isVertical(v26, v46)) {
          const i1 = p4.neighbour[1][i];
          const p1 = this.pointsMap.get(i1);
          if (!p1) continue;
          const v14 = p4.vector.clone().sub(p1.vector);
          if (v14.equals(v26)) {
            const i12 = computeKey([p1, p2]);
            if (this.edgesMap.get(i12)) {
              debugger;
              edgePoint.concave.push(edge);
              return;
            }
          }
        }
      }
      edgePoint.flat.push(edge);
    } else if (edge.count === 3) {
      // concave edge
      edgePoint.concave.push(edge);
    } else {
      edgePoint.others.push(edge);
    }
  }

  smoothing() {
    const start = new Date().getTime();
    this.edgePointsMap = new Map();
    this.edgesMap.forEach((edge, index) => {
      const [i4, i6] = index.split(";");
      this.classifyEdgesOfPoint(i4, edge);
      this.classifyEdgesOfPoint(i6, edge);
      // return if not concave edge
      if (edge.count !== 3) return;
      const p4 = this.pointsMap.get(i4);
      const p6 = this.pointsMap.get(i6);
      /**
       *      1————c
       *      |\    \
       *      | \    \
       * 3————4  2————a
       * |\    \ |    |
       * | \    \|    |
       * b  5————6————9
       *  \ |    |    |
       *   \|    |    |
       *    ————-7————-
       *
       *      1————c
       *      |\    \
       *      | \    \
       * 3————4  2————a
       * |\    \ |    |
       * | \    \|    |
       * b  5————6————9
       *  \ |    |
       *   \|    |
       *    ————-7
       * 找到25
       * 1. 先找46
       *    46是concaveEdge
       *
       * 2. 再找25
       *    向量26与向量46垂直
       *    2与5只有一个公共距离为1的邻点
       * 3. 生成三角面265
       * 4. 生成三角面143
       * 5. 配对13和25
       *    min(distance12, distance15) === 1
       * 6. 生成三角面135 521
       *
       */

      const center = computerMidpoint(p4.vector, p6.vector);
      const v46 = p6.vector.clone().sub(p4.vector);

      /**
       *       2————-a
       *       |     |
       *       |     |
       * 5————-6————-9
       * |     |
       * |     |
       * ——————7
       */
      let points2579 = [];
      p6.neighbour[1].forEach((key) => {
        if (key === p6.key) return;
        const p2 = this.pointsMap.get(key);
        if (!p2) return;
        const v26 = p6.vector.clone().sub(p2.vector);
        if (isVertical(v26, v46)) {
          points2579.push(p2);
        }
      });
      // points2579为2579四个点
      const edge25 = this.find25Edge(points2579);
      if (edge25.length > 0) {
        edge25.forEach((edge) => {
          const [p2, p5] = edge;
          this.addBigTriangle(p2.vector, p6.vector, p5.vector, center);
        });
      }

      /**
       *       1————-a
       *       |     |
       *       |     |
       * 3————-4————-d
       * |     |
       * |     |
       * b————-c
       */
      let points13bc = [];
      p4.neighbour[1].forEach((key) => {
        if (key === p4.key) return;
        const p1 = this.pointsMap.get(key);
        if (!p1) return;
        const v14 = p4.vector.clone().sub(p1.vector);
        if (isVertical(v14, v46)) {
          points13bc.push(p1);
        }
      });
      // points13bc为13bc四个点
      this.find13Edge = this.find25Edge;
      const edge13 = this.find13Edge(points13bc);
      if (edge13.length > 0) {
        edge13.forEach((edge) => {
          const [p1, p3] = edge;
          this.addBigTriangle(p1.vector, p4.vector, p3.vector, center);
        });
      }
      if (edge13.length > 0 && edge25.length > 0) {
        this.match1357(edge13, edge25, center);
      }
    });
    this.edgePointsMap.forEach((point, index) => {
      const p6 = this.pointsMap.get(index);
      const center = p6.vector.clone();
      if (point.concave.length === 2) {
        /**
         * 两条concave edge交于一点 且垂直
         *  4
         *   \
         *    \
         *     6————9
         **/
        const [e46, e69] = point.concave;
        const p4 = e46.points.find((item) => item.key !== index);
        const p9 = e69.points.find((item) => item.key !== index);
        const v46 = p6.vector.clone().sub(p4.vector);
        const v96 = p6.vector.clone().sub(p9.vector);
        if (isVertical(v46, v96)) {
          const p2 = point.convex[0].points.find((item) => item.key !== index);
          this.addFace25jeOr25e(p2, p4, p6, p9, center);
        }
      }
      /**
       *      1————c
       *      |\    \
       *      | \    \
       * 3————4  2————a
       * |\    \ |    |
       * | \    \|    |
       * b  5————6————9
       *  \ |    |    |
       *   \|    |    |
       *     ————7————
       * 生成256三角面
       *   对于点6 有concave.length === 1
       *
       * 生成长方形1352
       * 下面的78和os两条concave edge都需要生成对应的长方形面
       * 78os四个点的共同特点是 concave.length > 0 && convex.length > 0
       * f————h————i
       * |\    \    \
       * | \    \    \
       * d  e————9————c
       * |\ |    |\    \
       * | \|    | \    \
       * g  4————6  2————a
       *  \ |\    \ |\    \
       *   \| \    \| \    \
       *    b  5————7  0————j————w
       *     \ |\    \ |    |\    \
       *      \| \    \|    | \    \
       *       1  3————8————k  x————r
       *        \ |    |\    \ |    |
       *         \|    | \    \|    |
       *          l————m  n————o————s
       *                \ |\    \    \
       *                 \| \    \    \
       *                  p  q————t————v
       *                   \ |    |    |
       *                    \|    |    |
       *                     z————u————y
       **/
      if (point.concave.length > 0 && point.convex.length > 0) {
        //生成256三角面
        if (point.concave.length === 1) {
          /**
           *       2————-a
           *       |     |
           *       |     |
           * 5————-6————-9
           * |     |
           * |     |
           * ——————7
           */
          const p6 = this.pointsMap.get(index);
          const center = p6.vector.clone();
          const [e46] = point.concave;
          const p4 = e46.points.find((item) => item.key !== index);
          const center = computerMidpoint(p4.vector, p6.vector);
          const v46 = p6.vector.clone().sub(p4.vector);
          let points2579 = [];
          p6.neighbour[1].forEach((key) => {
            if (key === p6.key) return;
            const p2 = this.pointsMap.get(key);
            if (!p2) return;
            const v26 = p6.vector.clone().sub(p2.vector);
            if (isVertical(v26, v46)) {
              points2579.push(p2);
            }
          });
          // points2579为2579四个点
          const edge25 = this.find25Edge(points2579);
          if (edge25.length > 0) {
            edge25.forEach((edge) => {
              const [p2, p5] = edge;
              this.addBigTriangle(p2.vector, p6.vector, p5.vector, center);
            });
          }
        }
      }
      if (point.concave.length === 3) {
        /**
         * 三条concave edge交于一点
         *  4
         *   \
         *    \
         *     6————9
         *     |
         *     |
         *     7
         **/
        const [e46, e69, e67] = point.concave;
        const p4 = e46.points.find((item) => item.key !== index);
        const p9 = e69.points.find((item) => item.key !== index);
        const p7 = e67.points.find((item) => item.key !== index);
        if (point.concave.length === 3) {
          // 这两种情况是互斥的
          this.addConvexFace25e(p4, p6, p7, p9, center) &&
            this.addConcaveFace25e(p4, p6, p7, p9, center);
        }
      }
    });

    console.log("smooth花费", new Date().getTime() - start);
  }

  /**
   * 从2579中找25
   *       2————-10
   *       |     |
   *       |     |
   * 5————-6————-9
   * |     |     |
   * |     |     |
   * ——————7——————
   */
  find25Edge(edges) {
    const edges25 = [];
    for (let i = 0; i < edges.length; i += 1) {
      for (let j = i; j < edges.length; j += 1) {
        const v2 = edges[i];
        const v5 = edges[j];
        const distance = v2.vector.distanceTo(v5.vector);
        if (floatCompare(distance, "=", Math.sqrt(2), 0.0001)) {
          const nI2 = v2.neighbour[1].filter((item) =>
            this.pointsMap.get(item)
          );
          const nJ5 = v5.neighbour[1].filter((item) =>
            this.pointsMap.get(item)
          );
          const res = countDisplayTimes([...nI2, ...nJ5], 2);
          if (res.length === 1) {
            edges25.push([v2, v5]);
          }
          if (edges25.length === 4) return edges25;
        }
      }
    }
    return edges25;
  }

  /**
   *      1————c
   *      |\    \
   *      | \    \
   * 3————4  2————a
   * |\    \ |    |
   * | \    \|    |
   * b  5————6————9
   *  \ |    |
   *   \|    |
   *    ————-7
   * 配对13和25 生成三角面135 521
   * */
  match1357(edge13, edge25, center) {
    for (let i = 0; i < edge13.length; i += 1) {
      for (let j = 0; j < edge25.length; j += 1) {
        const [p1, p3] = edge13[i];
        const [p2, p5] = edge25[j];
        const d12 = p1.vector.distanceTo(p2.vector);
        const d15 = p1.vector.distanceTo(p5.vector);
        if (Math.min(d12, d15) === 1) {
          this.addBigTriangle(p1.vector, p3.vector, p5.vector, center);
          this.addBigTriangle(p5.vector, p2.vector, p1.vector, center);
        }
      }
    }
  }

  /**
   * 三条concave edge 相交的形状是向外凸的
   *      1————c
   *      |\    \
   *      | \    \
   * 3————4  2————a
   * |\    \ |    |
   * | \    \|    |
   * b  5————6————9
   *  \ |    |\    \
   *   \|    | \    \
   *    ————-7  e————f
   *          \ |    |
   *           \|    |
   *            g————h
   *
   * 生成三角面25e
   **/
  addConvexFace25e(p4, p6, p7, p9, center) {
    const pe = computerSymmetryPoint(p4.vector, p6.vector);
    const p5 = computerSymmetryPoint(p9.vector, p6.vector);
    const p2 = computerSymmetryPoint(p7.vector, p6.vector);
    if (
      this.getPointsMap(pe) &&
      this.getPointsMap(p5) &&
      this.getPointsMap(p2)
    ) {
      // this.debuggerData.edge.push([pe, p5], [p5, p2], [p2, pe])
      this.addBigTriangle(p2, p5, pe, center);
      return true;
    }
    return false;
  }

  /**
   * 三条concave edge 相交的形状是向内凹的
   * f————h————i
   * |\    \    \
   * | \    \    \
   * d  e————9————c
   * |\ |    |\    \
   * | \|    | \    \
   * g  4————6  2————a
   *  \ |\    \ |    |
   *   \| \    \|    |
   *    b  5————7————1
   *     \ |    |    |
   *      \|    |    |
   *       ————-7————-
   * 生成三角面25e
   **/
  addConcaveFace25e(p4, p6, p7, p9, center) {
    const pm49 = computerMidpoint(p4.vector, p9.vector);
    const pm97 = computerMidpoint(p9.vector, p7.vector);
    const pm74 = computerMidpoint(p7.vector, p4.vector);
    const pe = computerSymmetryPoint(p6.vector, pm49);
    const p2 = computerSymmetryPoint(p6.vector, pm97);
    const p5 = computerSymmetryPoint(p6.vector, pm74);
    if (
      this.getPointsMap(pe) &&
      this.getPointsMap(p5) &&
      this.getPointsMap(p2)
    ) {
      // this.debuggerData.edge.push([pe, p5], [p5, p2], [p2, pe]);
      this.addBigTriangle(p2, p5, pe, center);
      return true;
    }
    return false;
  }

  /**
   *      1————c
   *      |\    \
   *      | \    \
   * 3————4  2————a
   * |\    \ |    |
   * | \    \|    |
   * b  5————6————9
   *  \ |\    \    \
   *   \| \    \    \
   *    k  j————e————f
   *     \ |    |    |
   *      \|    |    |
   *       i————g————h
   * 生成三角面25j和2je
   *
   *
   *      1————c
   *      |\    \
   *      | \    \
   * 3————4  2————a
   * |\    \ |    |
   * | \    \|    |
   * b  5————6————9
   *  \ |\    \    \
   *   \| \    \    \
   *    k  j————e————f
   *     \ |\    \   |
   *      \| \    \  |
   *       i  l————n-h
   *        \ |    |
   *         \|    |
   *          m————o
   * 当j不是尖角 即j的convex edge !== 3 时 需生成25e
   **/
  addFace25jeOr25e(p2, p4, p6, p9, center) {
    let pe = computerSymmetryPoint(p4.vector, p6.vector);
    let p5 = computerSymmetryPoint(p9.vector, p6.vector);
    const pm5e = computerMidpoint(p5, pe);
    let pj = computerSymmetryPoint(p6.vector, pm5e);
    const ij = computeKey([pj]);
    const ej = this.edgePointsMap.get(ij);
    p2 = p2.vector;
    if (ej.convex.length === 3) {
      if (this.getPointsMap(pj)) {
        this.addBigTriangle(p2, p5, pj, center);
        this.addBigTriangle(p2, pe, pj, center);
      }
    } else {
      if (
        this.getPointsMap(pe) &&
        this.getPointsMap(p5) &&
        this.getPointsMap(p2)
      ) {
        this.addBigTriangle(p2, p5, pe, center);
      }
    }
  }

  /**
   *  p1
   *  ┃\
   *  ┃  \
   *  ┃    \
   *  ┃      \
   *  ┃        \
   *  ┃          \
   * p2▔▔▔▔▔▔p3
   *
   * @param {Array<THREE.Vector3>} points [p1, p2, p3]
   * @memberof lackingBoxGeometry
   */
  addBigTriangle(p1, p2, p3, center) {
    p1 = p1.clone();
    p2 = p2.clone();
    p3 = p3.clone();
    const index = computeKey([p1, p2, p3]);
    const smallTriangle = new SmallTriangle(p1, p2, p3, center);
    // 已经存在的面再次添加会将其值设置为null 换句话说 两次及两次以上添加的面即为重复面,不应该被渲染
    let theFace = this.facesMap.get(index);
    if (theFace !== null) {
      if (theFace === undefined) {
        this.faces.push(smallTriangle);
        // this.debuggerData.edge.push([p1, p2]);
        // this.debuggerData.edge.push([p2, p3]);
        // this.debuggerData.edge.push([p1, p3]);
        this.facesMap.set(index, smallTriangle);
      } else {
        this.facesMap.set(index, null);
      }
    }
    return;
  }

  /**
   * 记录正方体的棱 用于作整体的concave的smoothing
   * 在当前正方体中该棱只会被记录一次
   * @param {*} p1
   * @param {*} p2
   * @memberof CustomBoxGeometry
   */
  addEdge(p1, p2) {
    const index = computeKey([p1, p2]);
    const theEdge = this.edgesMap.get(index);
    if (theEdge === null) return;
    const points = [this.addPoint(p1), this.addPoint(p2)];
    if (theEdge) {
      theEdge.count += 1;
      if (theEdge.count >= 4) {
        this.edgesMap.delete(index);
      }
    } else {
      this.edgesMap.set(index, { points, count: 1 });
    }
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

  renderGeometry() {
    const start = new Date().getTime();
    this.facesMap.forEach((face) => {
      if (!face) return;
      const [p1, p2, p3] = face.points;
      // this.debuggerData.edge.push([p1, p2]);
      // this.debuggerData.edge.push([p2, p3]);
      // this.debuggerData.edge.push([p1, p3]);
      const i1 = this.vertices.push(p1.x, p1.y, p1.z) / 3 - 1;
      const i2 = this.vertices.push(p2.x, p2.y, p2.z) / 3 - 1;
      const i3 = this.vertices.push(p3.x, p3.y, p3.z) / 3 - 1;
      this.indices.push(i1, i2, i3);
      const { x, y, z } = face.normal;
      1;
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
    console.log("renderGeometry花费", new Date().getTime() - start);
  }
}
