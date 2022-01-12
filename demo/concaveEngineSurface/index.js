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

const keyToVector = (key) => {
  const [x, y, z] = key.split(",");
  return new THREE.Vector3(Number(x), Number(y), Number(z));
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
      edgePoint = { convex: [], flat: [], concave: [] };
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
        const i12 = computeKey([p1.vector, p2.vector]);
        if (!this.edgesMap.get(i12)) {
          isFlat = true;
          break;
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
       * 生成265三角面
       *   条件: 对于concave edge上的当前点 有 convex=2 && concave=1 && flat=2 或convex=4 && concave=1 && flat=0
       *
       * 生成长方形1352
       *   条件: 对于concave edge上的两点同时不满足 convex=0 && concave=3 && flat=0
       **/
      if (point6.concave.length > 0) {
        const canAdd265 =
          (point6.convex.length === 2 &&
            point6.concave.length === 1 &&
            point6.flat.length === 2) ||
          (point6.convex.length === 4 &&
            point6.concave.length === 1 &&
            point6.flat.length === 0);
        let e46s = point6.concave.filter((item) => !item.visited);
        if (canAdd265) {
          this.addFace265(e46s[0], p6, i6, point6);
        }
        // 先生成265三角面
        e46s.forEach((e46) => {
          e46.visited = true;
          const p4 = e46.points.find((item) => item.key !== i6);
          const point4 = this.edgePointsMap.get(p4.key);
          // concave edge 两点中只要有一点满足 convex=0 && concave=3 && flat=0 则不能生成1352长方形面
          const canAdd1352 = ![point4, point6].some(
            ({ convex, flat, concave }) => {
              convex.length === 0 && flat.length === 0 && concave.length === 3;
            }
          );
          if (canAdd1352) {
            this.addFaces1352(p4, p6, center);
          }
        });
      }

      if (point6.concave.length === 2) {
        if (point6.convex.length === 1) {
          /**
           * 两条concave edge交于一点 且垂直
           *  4
           *   \
           *    \
           *     6————9
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
           *     \ |    |    |
           *      \|    |    |
           *       i————g————h
           *
           *
           *
           * 还存在一种特殊的情况
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
          const p2 = point6.convex[0].points.find((item) => item.key !== i6);
          this.addFace25jeOr25e(p2, p4, p6, p9, center);
        }
        if (point6.convex.length === 2 && point6.flat.length === 2) {
          /**
           *      1————c
           *      |\    \
           *      | \    \
           *      4  2————a
           *      |\ |    |
           *      | \|    |
           *    5————6————9
           *    |\    \    \
           *    | \    \    \
           *    k  j————e————f
           *     \ |    |    |
           *      \|    |    |
           *       i————g————h
           * c——————a
           * |\      \
           * | \      \
           * b  1——————2 ——f
           * |\ |      |    \
           * | \|      |     \
           * d  4——————6——————e
           *  \ |      |\      \
           *   \|      | \      \
           *    3——————7  5——————j
           *            \ |      |
           *             \|      |
           *              l——————m
           * 生成三角面25j和2je
           */
          const [e76, e69] = point6.concave;
          const p7 = e76.points.find((item) => item.key !== i6);
          const p9 = e69.points.find((item) => item.key !== i6);
          const [e26, e65] = point6.convex;
          const p2 = e26.points.find((item) => item.key !== i6);
          const [e46, ee6] = point6.flat;
          let p4 = e46.points.find((item) => item.key !== i6);
          let pe = ee6.points.find((item) => item.key !== i6);
          const v62 = p2.vector.clone().sub(p6.vector);
          const v64 = p4.vector.clone().sub(p6.vector);
          const v61 = v62.clone().add(v64);
          const p1 = v61.clone().add(p6.vector);
          const i1 = computeKey([p1]);
          if (!this.pointsMap.has(i1)) {
            p4 = [pe, (pe = p4)][0]; // 交换p4, pe
          }
          this.addFace25jeOr25e(p2, p4, p6, p9, center);
          const p5 = e65.points.find((item) => item.key !== i6);
          this.addFace25jeOr25e(p5, pe, p6, p7, center);
        }
      }
      // point6.concave.length ===5 && this.debuggerData.point.push(p6.vector)
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
         *
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
         **/
        const [e46, e69, e67] = point6.concave;
        const p4 = e46.points.find((item) => item.key !== i6);
        const p9 = e69.points.find((item) => item.key !== i6);
        const p7 = e67.points.find((item) => item.key !== i6);

        // 这两种情况是互斥的
        this.addConvexFace25e(p4, p6, p7, p9, center) &&
          this.addConcaveFace25e(p4, p6, p7, p9, center);
      }

      if (point6.concave.length === 5) {
        /**
         * f————h
         * |\    \
         * | \    \
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
         *
         * f—————h____i
         * |     |    |
         * |     |    |
         * e—————9—————c
         *  |    |     |
         *  |    |     |
         *  5￣￣2—————a
         * 这个五条边是96 49 76 h6 c6 顺序未知
         */
        const coordDict = {
          x: new Map(),
          y: new Map(),
          z: new Map(),
        };
        // 先找到点9
        let p9;
        point6.concave.forEach((edge, index) => {
          const p = edge.points.find((item) => item.key !== i6);
          const vp6 = p6.vector.clone().sub(p.vector);
          const xObj = coordDict.x.get(vp6.x);
          if (!xObj) coordDict.x.set(vp6.x, { count: 1, index });
          else xObj.count += 1;
          const yObj = coordDict.y.get(vp6.y);
          if (!yObj) coordDict.y.set(vp6.y, { count: 1, index });
          else yObj.count += 1;
          const zObj = coordDict.z.get(vp6.z);
          if (!zObj) coordDict.z.set(vp6.z, { count: 1, index });
          else zObj.count += 1;
        });
        const { x: xMap, y: yMap, z: zMap } = coordDict;
        const uniqueMap = [xMap, yMap, zMap].find(
          (coordMap) => coordMap.size === 2
        );
        for (let value of uniqueMap.values()) {
          if (value === 1) {
            p9 = point6.concave[value.index];
            break;
          }
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
     *     ————7
     **/
    let p4;
    if (e46) {
      p4 = e46.points.find((item) => item.key !== i6);
    } else {
      const ce46 = point6.concave.find((item) => item.visited);
      p4 = ce46.points.find((item) => item.key !== i6);
    }
    const center = p4.vector;
    const [point2, point5, point7, point9] = point6.convex;
    let p2 = point2.points.find((item) => item.key !== i6);
    let p5 = point5.points.find((item) => item.key !== i6);
    if (point6.convex.length === 4) {
      let p7 = point7.points.find((item) => item.key !== i6);
      let p9 = point9.points.find((item) => item.key !== i6);
      // 判断267是否一条直线
      const v62 = p2.vector.clone().sub(p6.vector);
      const v76 = p6.vector.clone().sub(p7.vector);
      if (!v62.equals(v76)) {
        p9 = [p7, (p7 = p9)][0]; // 交换p9,p7
      }
      const v69 = p9.vector.clone().sub(p6.vector);
      const v6a = v69.clone().add(v62);
      const pa = p6.vector.clone().add(v6a);
      const ia = computeKey([pa]);
      if (!this.pointsMap.has(ia)) {
        p9 = [p5, (p5 = p9)][0]; // 交换p9,p5
      }
      this.addBigTriangle(p7.vector, p6.vector, p9.vector, center);
    }
    this.addBigTriangle(p2.vector, p6.vector, p5.vector, center);
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
      const pIndexC4 = p4.neighbour[2][index];
      const c4 = this.pointsMap.get(pIndexC4);
      if (!c6 && !c4) {
        const c6 = keyToVector(pIndexC6);
        const c4 = keyToVector(pIndexC4);
        const v6c6 = c6.clone().sub(p6.vector);
        const v4c4 = c4.clone().sub(p4.vector);
        // 找出向量中分量不为0的两个分量
        const p25s = [];
        const componentP6s = [p6.vector.x, p6.vector.y, p6.vector.z];
        [v6c6.x, v6c6.y, v6c6.z].forEach((component, index) => {
          if (component !== 0) {
            const newComponents = [...componentP6s];
            newComponents[index] += component;
            p25s.push(newComponents);
          }
        });
        const p13s = [];
        const componentP4s = [p4.vector.x, p4.vector.y, p4.vector.z];
        [v4c4.x, v4c4.y, v4c4.z].forEach((component, index) => {
          if (component !== 0) {
            const newComponents = [...componentP4s];
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
        this.deleteFace([p1, p2, p6.vector, p4.vector]);
        this.deleteFace([p5, p6.vector, p4.vector, p3]);
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

  deleteFace(points) {
    if (points.length === 4) {
      const [p1, p2, p3, p4] = points;
      const key123 = computeKey([p1, p2, p3]);
      if (this.facesMap.has(key123)) {
        this.facesMap.delete(key123);
        const key341 = computeKey([p3, p4, p1]);
        this.facesMap.delete(key341);
      } else {
        const key412 = computeKey([p4, p1, p2]);
        this.facesMap.delete(key412);
        const key234 = computeKey([p2, p3, p4]);
        this.facesMap.delete(key234);
      }
    } else {
      const key = computeKey(points);
      this.facesMap.delete(key);
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
        this.debuggerData.edge.push([p1, p2]);
        this.debuggerData.edge.push([p2, p3]);
        this.debuggerData.edge.push([p1, p3]);
        this.debuggerData.point.push(smallTriangle.midpoint);
        // this.facesMap.set(index, smallTriangle);
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
