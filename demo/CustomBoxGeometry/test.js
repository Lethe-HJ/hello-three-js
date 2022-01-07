const createPoints = (
  points,
  option = {
    color: 0xff0000,
    size: 5.0,
  }
) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setFromPoints(points);
  window.points = geometry;
  const material = new THREE.PointsMaterial(option);
  return new THREE.Points(geometry, material);
};

const createCustomBox = (x, y, z) => {
  const O = new THREE.Vector3(x, y, z);
  const geometry = new CustomBoxGeometry(O);
  const material = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide, //两面可见
    // wireframe: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  window.mesh = mesh;
  return mesh;
};


const vector = (x, y, z) => {
  return new THREE.Vector3(x, y, z);
};

const mapPoints = (points) => {
  let i = 0;
  let faces = null;
  let mapping = null;
  let newPoints = null;
  while (i < 10) {
    newPoints = "";
    for (let point of points) {
      mapping = coordMapping.get(point);
      newPoints += mapping[i];
    }
    newPoints = sortString(newPoints);
    faces = lackingBoxMap.get(newPoints);
    if (faces) break;
    i += 1;
  }
  return newPoints
};

const test = (scene) => {
  scene.add(createCustomBox(0, 0, 0));
  scene.add(createCustomBox(3, 0, 0));
  scene.add(createCustomBox(3, 3, 3));
};
