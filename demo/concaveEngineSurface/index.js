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
    this.pointsMap = new Map();
    cPoints.forEach((point, index) => {
      if (point) {
        this.pointsMap.set(index, point);
      }
    });
    this.cPointsMap = new Map();
    cPoints.forEach((point) => {
      const { x, y, z } = point.vector;
      this.cPointsMap.set(`${x},${y},${z}`, point);
    });
    cPoints.forEach((point) => {
      // 只有全部相邻位置存在点 才不是表面的点
      point.isSurface = !point.neighbour.all.every((nItem) => {
        return this.pointsMap.get(nItem);
      });
    });
  }

  /**
   * E---------H
   * |\      |  \
   * |  F--------G
   * |  |     |  |
   * A--|-----D  |
   *  \ |      \ |
   *    B--------C
   *
   */
  createCustomBoxes() {
    const boxes = [];
    const cPoints = this.cPoints;
    for (let i = 0; i < cPoints.length; i += 1) {
      const point = cPoints[i];
      if (point && point.isSurface) {
        point.vector.addScalar(-0.5);
        point.neighbour[1] = point.neighbour[1].map((item) => {});
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
    return boxes;
  }

  edgeToPoints(key) {
    const points = key.split(";");
    const [key1, key2] = points;
    return [this.pointsMap.get(key1), this.pointsMap.get(key2)];
  }

  smoothing() {
    this.edgesMap.forEach((edge, index) => {
      const [p1, p2] = this.edgeToPoints(index);
      const v12 = p1.vector.clone().sub(p2.vector);
      const hypotenuseEdge = [];
      p1.neighbour[1].forEach((key) => {
        if (key !== p1.key) {
          const p3 = this.pointsMap.get(key);
          if (!p3) return;
          const v13 = p1.vector.clone().sub(p3.vector);
          const radian = v12.angleTo(v13);
          const angle = THREE.Math.radToDeg(radian);
          if (floatCompare(angle, "=", 90, 0.001)) {
            hypotenuseEdge.push(p3);
          }
        }
      });
      const edge13 = this.find13Edge(hypotenuseEdge);
    });
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
    if (theFace !== null) {
      if (theFace === undefined) {
        this.faces.push(smallTriangle);
        this.addEdge(p1, p2);
        this.addEdge(p2, p3);
        this.facesMap.set(index, true);
      } else {
        this.facesMap.set(index, null);
        this.deleteEdge(p2, p3);
      }
    }
    return;
  }

  /**
   * 找13或者57
   *       1-----2
   *       |     |
   *       |     |
   * 3-----4-----5
   * |     |
   * |     |
   * 6-----7
   */
  find13Edge(edges) {
    const edges13 = [];
    for (let i = 0; i < edges.length; i += 1) {
      for (let j = i; j < edges.length; j += 1) {
        const vi = edges[i];
        const vj = edges[j];
        const distance = vi.vector.distanceTo(vj.vector);
        if (floatCompare(distance, "=", Math.sqrt(2), 0.0001)) {
          const nI1 = vi.neighbour[1].filter((item) =>
            this.pointsMap.get(item)
          );
          const nJ1 = vj.neighbour[1].filter((item) =>
            this.pointsMap.get(item)
          );
          const res = countDisplayTimes([...nI1, ...nJ1], 2);
          if (res.length === 1) {
            edges13.push([vi, vj]);
          }
          if (edges13.length === 4) return edges13;
        }
      }
    }
    return edges13;
  }

  renderGeometry() {
    this.faces.forEach((face) => {
      const [p1, p2, p3] = face.points;
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
  }
}
