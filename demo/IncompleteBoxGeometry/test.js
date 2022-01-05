const points = {
  A: new THREE.Vector3(1, 0, 0),
  B: new THREE.Vector3(0, 0, 0),
  C: new THREE.Vector3(0, 0, 1),
  D: new THREE.Vector3(1, 0, 1),
  E: new THREE.Vector3(1, 1, 0),
  F: new THREE.Vector3(0, 1, 0),
  G: new THREE.Vector3(0, 1, 1),
  H: new THREE.Vector3(1, 1, 1),
};
  
const drawPoints = (
  points,
  scene,
  option = {
    color: 0xff0000,
    size: 5.0,
  }
) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setFromPoints(Object.values(points));
  const material = new THREE.PointsMaterial(option);
  scene.add(new THREE.Points(geometry, material));
};



const test = (scene) => {
    drawPoints(points, scene);
  };