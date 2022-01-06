class ConcaveGeometry extends THREE.BufferGeometry {
  constructor(points, sideLen) {
    super();
    this.type = "ConcaveGeometry";
    this.indices = [];
    this.vertices = [];
    this.normals = [];

    // 记录子box的面是否已经注册过
    this.facesMap = new Map();
    this.sideLen = sideLen;
    this.cPoints = this.markSurfacePoints(points);
    this.boxes = this.createLackingBoxes();
    //   this.getBoxesData();
    //   this.renderGeometry();
  }

  get surfacePoints() {
    return this.cPoints.filter((point) => point && point.isSurface);
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
  createLackingBoxes() {
    const boxes = [];
    const cPoints = this.cPoints.filter((item) => item);
    // const cPoints = this.surfacePoints;
    for (let i = 0; i < cPoints.length; i += 1) {
      const O = cPoints[i];
      // 该点不存在(不符合要求) 或者 该点不在面上
      //   if (!O || !O.isSurface) continue;
      // O点即是H点
      const { x, y, z } = O;
      const oPoints = {
        A: [x - 1, y, z],
        B: [x, y, z],
        C: [x, y, z - 1],
        D: [x - 1, y, z - 1],
        E: [x - 1, y - 1, z],
        F: [x, y - 1, z],
        G: [x, y - 1, z - 1],
        H: [x - 1, y - 1, z - 1],
      };
      for (let key in oPoints) {
        const newPoint = this.cPoints[getIndex(...oPoints[key], this.sideLen)];
        if (newPoint && newPoint.isSurface) {
          oPoints[key] = newPoint;
        } else {
          delete oPoints[key];
        }
      }
      const points = Object.values(oPoints).map((item) => item.vector);
      const box = new LackingBoxGeometry(O.vector, points, {
        renderer: true,
      });
      //   const box = new LackingBoxGeometry(O.vector, points);
      boxes.push(box);
    }
    return boxes;
  }

  getBoxesData() {
    this.boxes.forEach((box) => {
      this.vertices = this.vertices.concat(box.vertices);
      this.indices = this.indices.concat(box.indices);
      this.normals = this.normals.concat(box.normals);
    });
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
}
