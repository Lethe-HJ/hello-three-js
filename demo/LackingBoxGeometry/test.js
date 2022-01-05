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

const createLackingBox = (pointNames) => {
  const points = [];
  for (let name of pointNames) {
    points.push(boxPoints[name]);
  }
  const geometry = new LackingBoxGeometry(points);

  window.geometry = geometry;

  const material = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    // side: THREE.DoubleSide, //两面可见
    // wireframe: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  window.mesh = mesh
  return mesh
};

const test = (scene) => {
  scene.add(createPoints());
  scene.add(createLackingBox("ABCDEFGH"));
};
