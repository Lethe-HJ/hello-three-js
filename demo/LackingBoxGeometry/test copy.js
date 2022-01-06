const boxPoints = LackingBoxGeometry.getPoints();

const createPoints = (
  option = {
    color: 0xff0000,
    size: 5.0,
  }
) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setFromPoints(Object.values(boxPoints));
  const material = new THREE.PointsMaterial(option);
  return new THREE.Points(geometry, material);
};

const createLackingBox = (x, y, z, pointNames) => {
  const O = new THREE.Vector3(x, y, z);
  const points = [];
  for (let name of pointNames) {
    points.push(boxPoints[name]);
  }
  const geometry = new LackingBoxGeometry(O, pointNames);

  window.geometry = geometry;

  const material = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    // side: THREE.DoubleSide, //两面可见
    // wireframe: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  window.mesh = mesh;
  return mesh;
};

const test = (scene) => {
  scene.add(createPoints());
  scene.add(createLackingBox(0, 0, 0, ""));
  scene.add(createLackingBox(0, 0, 3, "G"));
  scene.add(createLackingBox(3, 0, 0, "FG"));
  scene.add(createLackingBox(3, 0, 3, "CF"));
  scene.add(createLackingBox(3, 0, 6, "DF"));
  scene.add(createLackingBox(6, 0, 0, "CFG"));
  scene.add(createLackingBox(6, 0, 3, "BEG"));
  scene.add(createLackingBox(6, 0, 6, "BCE"));
  scene.add(createLackingBox(9, 0, 0, "ACFG"));
  scene.add(createLackingBox(12, 0, 0, "CDFG"));
  scene.add(createLackingBox(9, 0, 3, "BEFG"));
  scene.add(createLackingBox(12, 0, 3, "BDEG"));
};
