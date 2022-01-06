/**
 * @description 根据原始数据筛选符合条件的点 生成vector3点并根据连续性分组
 * @param { Array<Number> } data origin data
 * @param { Number } sideLen origin data
 * @param { Function } checkSuitable filter condition
 * @returns { Array<Points> } a set of Points to describe multiple geometry
 */
const generateSplitPoints = (data, sideLen, checkSuitable) => {
  let pointsMap = new Map(data.map((v, idx) => [idx, v]));
  const gap = 1;
  let i = 0;
  const pointsLi = [];
  const stack = [];
  while (pointsMap.size) {
    const points = [];
    if (!pointsMap.has(i)) {
      i += 1;
      continue;
    }
    stack.push(i);
    while (stack.length) {
      const j = stack.pop();
      const value = pointsMap.get(j);
      const node = createNode(j, sideLen, 1);
      if (checkSuitable(value)) {
        const { x, y, z } = node;
        node.vector = new THREE.Vector3(x * gap, y * gap, z * gap);
        points[j] = node;
        stack.push(...node.neighbour);
      }
      pointsMap.delete(j);
    }
    points.length && pointsLi.push(points);
  }
  return pointsLi;
};

/**
 * object to set size of xyz
 * @typedef { { x: Number, y: Number, z: Number} } XYZSize
 */

/**
 *
 * @param { Number } x
 * @param { Number } y
 * @param { Number } z
 * @param { side length } sideLen
 * @returns
 */
const getIndex = (x, y, z, sideLen) => {
  if (x >= sideLen || y >= sideLen || z >= sideLen) return null;
  return x + sideLen * y + sideLen * sideLen * z;
};

/**
 * @typedef { Array<Number> } Neighbour
 */

/**
 * a set of Node to describe a point of geometry
 * @typedef { {index: Number, x: Number, y: Number,z: Number, neighbour: Neighbour } } NodeObj
 */

/**
 * create Node by index
 * @param { Number } index index of data item
 * @returns { NodeObj }
 */
const createNode = (index, sideLen, offset = 1) => {
  const x0 = Math.floor(index % sideLen);
  const y0 = Math.floor((index % (sideLen * sideLen)) / sideLen);
  const z0 = Math.floor(index / (sideLen * sideLen));
  const neighbour = [];
  const xMin = Math.max(0, x0 - offset),
    max = Math.min(x0 + offset, sideLen - 1);
  for (let x = xMin; x <= max; x += offset) {
    const yMin = Math.max(0, y0 - offset),
      max = Math.min(y0 + offset, sideLen - 1);
    for (let y = yMin; y <= max; y += offset) {
      const zMin = Math.max(0, z0 - offset),
        max = Math.min(z0 + offset, sideLen - 1);
      for (let z = zMin; z <= max; z += offset) {
        const index = getIndex(x, y, z, sideLen);
        neighbour.push(index);
      }
    }
  }
  return new Point(index, x0, y0, z0, neighbour);
};

const countNum = (a, b, c) => {
  let count = 0;
  [a, b, c].forEach((item) => {
    if (item === 0) count += 1;
  });
  return count;
};

/**
 * a set of points to describe a geometry
 * @typedef { Array<THREE.Vector3> } Points
 */

class Point {
  constructor(index, x, y, z, neighbour) {
    this.index = index;
    this.x = x;
    this.y = y;
    this.z = z;
    this.neighbour = neighbour;
    this.edges = [];
  }
}
