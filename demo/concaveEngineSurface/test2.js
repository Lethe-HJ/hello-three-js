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

const createConcave = (points, scene) => {
  const geometry = new ConcaveGeometry(points);
  createCustomBox(geometry, scene);

  const material = new THREE.MeshLambertMaterial({
    color: 0xffc0cb,
    side: THREE.DoubleSide, //两面可见
    // wireframe: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  window.mesh = mesh;
  scene.add(mesh);
  return geometry;
};

const createCustomBox = (concave, scene) => {
  return concave.boxes.map((box) => {
    const material = new THREE.MeshPhongMaterial({
      color: 0xffc0cb,
      side: THREE.DoubleSide, //两面可见
    });

    mesh = new THREE.Mesh(box, material);
    // scene.add(mesh);
  });
};

const createDebugger = (geometry, scene) => {
  const data = geometry.debuggerData;
  var geometry1 = new THREE.BufferGeometry();
  geometry1.setFromPoints(data.point);
  var material1 = new THREE.PointsMaterial({
    color: 0x90f000,
    size: 10.0,
  });
  var pointsObj = new THREE.Points(geometry1, material1);
  scene.add(pointsObj);

  data.edge.forEach((edge) => {
    var material = new THREE.LineBasicMaterial({
      color: 0x0000ff,
    });
    const points = edge;
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    var line = new THREE.Line(geometry, material);
    scene.add(line);
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
    size: 5.0,
  });
  var pointsObj = new THREE.Points(geometry2, material2);
  // scene.add(pointsObj);
};

const addPoints = (data, x0, y0, z0, points) => {
  points.forEach((point) => {
    const [x, y, z] = point;
    const index = x + x0 + (y + y0) * 48 + 48 * 48 * (z + z0);
    data[index] = 2;
  });
};

const test = (scene) => {
  const start = new Date().getTime();
  const IsoSurfaceLevel = 2;
  const precision = 0.5;
  let sideLen = 48;
  data = new Array(48 * 48 * 48).fill(0);
  // // 1-1
  addPoints(data, 2, 0, 0, [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 1],
  ]);

  // 1-2
  addPoints(data, 6, 0, 0, [
    [0, 0, 0],
    [0, 1, 1],
  ]);

  // 1-3
  addPoints(data, 10, 0, 0, [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 1],
    [2, 0, 0],
    [2, 0, 1],
    [2, 1, 1],
  ]);

  // 2-1
  addPoints(data, 2, 0, 4, [
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
  ]);

  // 2-2
  addPoints(data, 6, 0, 4, [
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 0],
  ]);

  // 2-3
  addPoints(data, 10, 0, 4, [
    [2, 0, 0],
    [2, 0, 1],
    [2, 1, 1],
    [1, 0, 1],
    [1, 0, 0],
    [0, 0, 0],
  ]);

  // 3-1
  addPoints(data, 2, 0, 8, [
    [0, 0, 0],
    [0, 0, 1],
    [1, 0, 0],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 0],
    [1, 1, 1],
  ]);

  // 3-2
  addPoints(data, 6, 0, 8, [
    [1, 0, 0],
    [1, 0, 1],
    [2, 0, 0],
    [2, 0, 1],
    [1, 1, 1],
    [2, 1, 0],
    [2, 1, 1],
    [0, 0, 1],
  ]);

  // 4-1
  addPoints(data, 2, 0, 12, [
    [1, 0, 0],
    [1, 0, 1],
    [0, 0, 1],
    [1, 1, 0],
  ]);

  // 4-2
  addPoints(data, 6, 0, 12, [
    [2, 0, 0],
    [2, 0, 1],
    [1, 0, 1],
    [2, 1, 0],
    [0, 0, 1],
  ]);

  // 4-3
  addPoints(data, 10, 0, 12, [
    [2, 0, 0],
    [2, 0, 1],
    [1, 0, 1],
    [2, 1, 0],
    [1, 0, 2],
  ]);

  // 5-1
  addPoints(data, 2, 0, 16, [
    [4, 0, 0],
    [4, 0, 1],
    [5, 0, 0],
    [5, 0, 1],
    [4, 1, 1],
    [5, 1, 0],
    [5, 1, 1],

    [3, 0, 0],
    [3, 0, 1],
    [3, 1, 1],

    [2, 0, 0],
    [2, 0, 1],
    [2, 1, 1],

    [1, 0, 1],
    [1, 0, 2],
    [1, 1, 2],
    [0, 0, 2],
    [0, 0, 1],
  ]);

  addPoints(data, 10, 0, 16, [
    [0,0,0],
    [0,0,1],
    [0,0,2],
    [0,0,3],
    [0,0,4],
    [0,0,5],

    [1,0,0],
    [1,0,1],
    [1,0,2],
    [1,0,3],
    [1,0,4],
    [1,0,5],

    [2,0,0],
    [2,0,1],
    [2,0,2],
    [2,0,3],
    [2,0,4],
    [2,0,5],

    [3,0,0],
    [3,0,1],
    [3,0,2],
    [3,0,3],
    [3,0,4],
    [3,0,5],

    [1, 1, 1],
    [1, 1, 2],
    [1, 1, 3],
    [2, 1, 4],
  ]);
  const pointsLi = generateSplitPoints(
    data,
    sideLen,
    (value) => Math.abs(value - IsoSurfaceLevel) < precision
  );
  console.log("generateSplitPoints函数花费", new Date().getTime() - start);
  pointsLi.forEach((points) => {
    geometry = createConcave(points, scene);
    createAllPoints(geometry, scene);
    createDebugger(geometry, scene);
  });
  const end = new Date().getTime();
  console.log("共花费", end - start);
};
