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
  constructor(points) {
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
       *     ————7
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
       * 区分方法: 情况2的46 edge12的边不存在或者12两点不同时存在
       */
      const [p4, p6] = edge.points;
      // 寻找为flat的证据
      // 遍历距离为1的邻居
      let isFlat = false;
      for (let i = 0; i < p6.neighbour[1].length; i += 1) {
        const i2 = p6.neighbour[1][i];
        const p2 = this.pointsMap.get(i2);
        const i1 = p4.neighbour[1][i];
        const p1 = this.pointsMap.get(i1);
        if (i1 === p6.key || i2 === p4.key) continue;
        if (!p1 || !p2) {
          isFlat = true;
          break;
        }
        const i12 = computeKey([p1, p2]);
        if (!this.edgesMap.get(i12)) {
          isFlat = true;
        }
      }
      if (isFlat) {
        edgePoint.flat.push(edge);
      } else {
        edgePoint.concave.push(edge);
      }
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
    });
    this.edgePointsMap.forEach((point6, i6) => {
      const p6 = this.pointsMap.get(i6);
      const center = p6.vector.clone();
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
       * 生成265三角面
       *   条件: 对于concave edge上的当前点 有 convex=2 && concave=1 && flat=2
       *
       * 生成长方形1352
       *   条件: 对于concave edge上的两点同时不满足 convex=0 && concave=3 && flat=0
       **/
      if (point6.concave.length > 0) {
        const p6 = this.pointsMap.get(i6);
        const e46 = point6.concave.find((item) => !item.visited);
        const canAdd265 =
          point6.convex.length === 2 &&
          point6.concave.length === 1 &&
          point6.flat.length === 2;
        // 先生成265三角面
        if (canAdd265) {
          this.addFace265(e46, p6, i6, point6);
        }
        if (e46) {
          const p4 = e46.points.find((item) => item.key !== i6);
          e46.visited = true;
          const point4 = this.edgePointsMap.get(p4.key);
          // concave edge 两点中只要有一点满足 convex=0 && concave=3 && flat=0 则不能生成1352长方形面
          const canAdd1352 = ![point4, point6].some(
            ({ convex, concave, flat }) =>
              convex.length === 0 && concave.length === 3 && flat.length === 0
          );
          const center = computerMidpoint(p4.vector, p6.vector);
          if (canAdd1352) {
            // this.addFaces1352(p4, p6, center);
          }
        }
      }
      // 还有一种情况是point6.concave.length === 2 && point6.concave.length === 2
      if (point6.concave.length === 2 && point6.concave.length === 1) {
        /**
         * 两条concave edge交于一点 且垂直
         *  4
         *   \
         *    \
         *     6————9
         * 此时存在以下两种情况
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
        const [e46, e69] = point6.concave;
        const p4 = e46.points.find((item) => item.key !== i6);
        const p9 = e69.points.find((item) => item.key !== i6);
        const v46 = p6.vector.clone().sub(p4.vector);
        const v96 = p6.vector.clone().sub(p9.vector);
        if (isVertical(v46, v96)) {
          const p2 = point6.convex[0].points.find((item) => item.key !== i6);
          this.addFace25jeOr25e(p2, p4, p6, p9, center);
        }
      }
      if (point6.concave.length === 3) {
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
        const [e46, e69, e67] = point6.concave;
        const p4 = e46.points.find((item) => item.key !== i6);
        const p9 = e69.points.find((item) => item.key !== i6);
        const p7 = e67.points.find((item) => item.key !== i6);
        if (point6.concave.length === 3) {
          // 这两种情况是互斥的
          this.addConvexFace25e(p4, p6, p7, p9, center) &&
            this.addConcaveFace25e(p4, p6, p7, p9, center);
        }
      }
    });

    console.log("smooth花费", new Date().getTime() - start);
  }

  /**
   * 生成面265
   *
   * @param {*} e46
   * @param {*} p6
   * @param {*} i6
   * @param {*} point6
   * @memberof ConcaveGeometry
   */
  addFace265(e46, p6, i6, point6) {
    /**
     *      2————a
     *      |\    \
     *      | \    \
     * 5————6  1————c
     * |\    \ |    |
     * | \    \|    |
     * b' 3————4————9'
     *  \ |    |    |
     *   \|    |    |
     *     ————7'————
     * 假如当前点为起点 即存在为访问过的e46 那么中点可设为e46中的p4
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
     * 假如当前点为终点 即只存在为已访问过的ce46 那么中点可设为ce46中的p4
     **/
    let p4;
    if (e46) {
      p4 = e46.points.find((item) => item.key !== i6);
    } else {
      const ce46 = point6.concave.find((item) => item.visited);
      p4 = ce46.points.find((item) => item.key !== i6);
    }
    const center = p4.vector;
    const [point2, point5] = point6.convex;
    const p2 = point2.points.find((item) => item.key !== i6);
    const p5 = point5.points.find((item) => item.key !== i6);
    this.addBigTriangle(p2.vector, p6.vector, p5.vector, center);
    return p4;
  }

  /**
   * 生成长方形面1352
   *
   * @param {*} p4
   * @param {*} p6
   * @param {*} center
   * @memberof ConcaveGeometry
   */
  addFaces1352(p4, p6, center) {
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
     * 找1352的方法:
     *  46都缺少同一方向上的√2距离的邻点
     *  假设该不存在这个两个邻点组成的edge为4'6' 得到向量66' 将向量66'的三个分量中不为0的两个分量(假设
     *  为Δy Δz)分别加到点6上就得到了点2和点5 对4作类似的操作可得到点1和点3 其中1对
     *  应 2 3对应5 则1352和1253的顺序都遵循时针顺序
     *
     * 6'    2-----a
     *       |     |
     *       |     |
     * 5-----6-----9
     * |     |     |
     * |     |     |
     * ------7------
     */
    p6.neighbour[2].forEach((pIndexC6, index) => {
      let c6 = this.pointsMap.get(pIndexC6);
      const pIndexC4 = p6.neighbour[2][index];
      const c4 = this.pointsMap.get(pIndexC4);
      if (!c6 && !c4) {
        const [c6x, c6y, c6z] = pIndexC6.split(",");
        const [c4x, c4y, c4z] = pIndexC4.split(",");
        const c6 = new THREE.Vector3(c6x, c6y, c6z);
        const c4 = new THREE.Vector3(c4x, c4y, c4z);
        const v6c6 = c6.sub(p6.vector);
        const v4c4 = c4.sub(p4.vector);
        // 找出向量中分量不为0的两个分量
        const componentP6s = [p6.vector.x, p6.vector.y, p6.vector.z];
        const p25s = [];
        [v6c6.x, v6c6.y, v6c6.z].forEach((component, index) => {
          if (component !== 0) {
            const newComponents = [...componentP6s];
            newComponents[index] += component;
            p25s.push(newComponents);
          }
        });
        const p13s = [];
        [v4c4.x, v4c4.y, v4c4.z].forEach((component, index) => {
          if (component !== 0) {
            const newComponents = [...componentP6s];
            newComponents[index] += component;
            p13s.push(newComponents);
          }
        });
        let [p2, p5] = p25s;
        let [p1, p3] = p13s;
        p1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
        p2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
        p3 = new THREE.Vector3(p3[0], p3[1], p3[2]);
        p5 = new THREE.Vector3(p5[0], p5[1], p5[2]);
        this.addBigTriangle(p1, p3, p5, center);
        this.addBigTriangle(p5, p2, p1, center);
      }
    });
  }

  /**
   * 生成的三条凹形相交concave edge的面25e
   *
   * @param {*} p4
   * @param {*} p6
   * @param {*} p7
   * @param {*} p9
   * @param {*} center
   * @return {*}
   * @memberof ConcaveGeometry
   */
  addConvexFace25e(p4, p6, p7, p9, center) {
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
   * 生成的三条凸形相交concave edge的面25e
   *
   * @param {*} p4
   * @param {*} p6
   * @param {*} p7
   * @param {*} p9
   * @param {*} center
   * @return {*}
   * @memberof ConcaveGeometry
   */
  addConcaveFace25e(p4, p6, p7, p9, center) {
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
   * 生成两条concave edge垂直相交时的三角面25e 或两个三角面25j和2je
   * 生成前者还是后者取决于j点是否凸出 (j有三条convex edge就是凸出)
   * @param {*} p2
   * @param {*} p4
   * @param {*} p6
   * @param {*} p9
   * @param {*} center
   * @memberof ConcaveGeometry
   */
  addFace25jeOr25e(p2, p4, p6, p9, center) {
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
