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
    this.faces = [];
    this.sideLen = sideLen;
    this.cPoints = this.markSurfacePoints(points);
    this.boxes = this.createCustomBoxes();
    this.smoothing();
    this.renderGeometry();
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
  createCustomBoxes() {
    const boxes = [];
    const cPoints = this.surfacePoints;
    for (let i = 0; i < cPoints.length; i += 1) {
      const O = cPoints[i].vector.clone().addScalar(-0.5);
      // O点即是H点
      new CustomBoxGeometry(O, {
        renderer: false,
        facesMap: this.facesMap,
        edgesMap: this.edgesMap,
        faces: this.faces,
      });
    }
    return boxes;
  }

  smoothing(){
      this.edgesMap.forEach(edge => {
          
      })
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
