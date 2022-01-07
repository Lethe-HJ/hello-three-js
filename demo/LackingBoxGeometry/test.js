const boxPoints = LackingBoxGeometry.getPoints();

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
    side: THREE.DoubleSide, //两面可见
    // wireframe: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  window.mesh = mesh;
  return mesh;
};

const createLackingBox2 = (O, points) => {
  const geometry = new LackingBoxGeometry(O, points);

  window.geometry = geometry;

  const material = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    // side: THREE.DoubleSide, //两面可见
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
  const points = [
    vector(45, 4, 47),
    vector(45, 4, 46),
    vector(44, 3, 47),
    vector(45, 3, 46),
  ];
  // const common = [
  //   // "",
  //   // "A",
  //   // "G",
  //   // "FG",
  //   // "BC"
  //   "CF",
  //   "CH",
  //   // "DF",
  //   // "CFG",
  //   // "BEG",
  //   // "BCE",
  //   // "ACFG",
  //   // "CDFG",
  //   // "BEFG",
  //   // "BDEG",
  // ];
  const common = ['BCFG', 'ADE', 'A', 'ABD', 'AD', 'AE', 'ABE', 'ABEF', 'ABCD', 'ABC', 'B', 'H', 'GH', 'G', 'BC', 'DGH', 'CDGH', 'CGH', 'D', 'ABCF', 'CG', 'CDG', 'C', '', 'BCF', 'DH', 'CD', 'CDH', 'FG', 'EGH', 'EFG', 'F', 'EH', 'EFGH', 'BF', 'DEGH', 'DEH', 'ADEH', 'AB', 'ACD', 'BFG', 'ADH', 'FGH', 'CFG', 'ABDE', 'CFGH', 'BEFG', 'ACDH', 'ABF', 'BEF', 'E', 'EF', 'BCG', 'BCD', 'BCDG', 'AEF', 'AEH', 'AEFH', 'EFH', 'DF', 'BCE', 'ABG', 'AG', 'CE', 'BDF']
  
  common.forEach((item, index) => {
    scene.add(
      createLackingBox(
        (index % 4) * 4,
        (Math.floor(index / 4) % 4) * 4,
        Math.floor(index / 16) * 4,
        // mapPoints(item)
        item
      )
    );
  });
  
  // scene.add(createLackingBox(0, 0, 3, "G"));
  // scene.add(createLackingBox(3, 0, 0, "FG"));
  // scene.add(createLackingBox(3, 0, 3, "CF"));
  // scene.add(createLackingBox(3, 0, 6, "DF"));
  // scene.add(createLackingBox(6, 0, 0, "CFG"));
  // scene.add(createLackingBox(6, 0, 3, "BEG"));
  // scene.add(createLackingBox(6, 0, 6, "BCE"));
  // scene.add(createLackingBox(9, 0, 0, "ACFG"));
  // scene.add(createLackingBox(12, 0, 0, "CDFG"));
  // scene.add(createLackingBox(9, 0, 3, "BEFG"));
  // scene.add(createLackingBox(12, 0, 3, "BDEG"));
  // scene.add(createLackingBox(0, 0, 0, "ADFH"));
  // scene.add(createLackingBox2(vector(45, 4, 47), points));
};
