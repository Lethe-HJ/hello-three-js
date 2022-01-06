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

const createConcave = (points, sideLen, scene) => {
  const geometry = new ConcaveGeometry(points, sideLen);
  createLackBox(geometry, scene);

  const material = new THREE.MeshLambertMaterial({
    color: 0xffc0cb,
    // side: THREE.DoubleSide, //两面可见
    // wireframe: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  window.mesh = mesh;
  // scene.add(mesh);
  return geometry
};

const createLackBox = (concave, scene) => {
  return concave.boxes.map((box) => {
    const material = new THREE.MeshLambertMaterial({
      color: 0xffc0cb,
      side: THREE.DoubleSide, //两面可见
      // wireframe: true,
    });

    mesh = new THREE.Mesh(box, material);
    scene.add(mesh);
  });
};

const createAllPoints = (geometry, scene) => {
  const redPoints = geometry.surfacePoints;
  if (redPoints.length < 4) return;
  var geometry2 = new THREE.BufferGeometry();
  geometry2.setFromPoints(redPoints);
  var material2 = new THREE.PointsMaterial({
    // color: 0xffffff * Math.random() * 255,
    color: 0xff0000,
    size: 1.0,
  });
  var pointsObj = new THREE.Points(geometry2, material2);
  scene.add(pointsObj);
};

const test = (scene) => {
  const IsoSurfaceLevel = 1;
  const precision = 1;
  let sideLen = 48;
  const pointsLi = generateSplitPoints(
    data,
    sideLen,
    (value) => Math.abs(value - IsoSurfaceLevel) < precision
  );

  pointsLi.forEach((points) => {
    geometry = createConcave(points, sideLen, scene);
    createAllPoints(geometry, scene)
  });
};
