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
        stack.push(...node.neighbour.all);
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
  const neighbour = {
    0: [],
    1: new Array(6).fill(null),
    2: [],
    3: [],
    all: [],
  };
  const zMin = Math.max(0, z0 - offset),
    max = Math.min(z0 + offset, sideLen - 1);
  for (let z = zMin; z <= max; z += offset) {
    const yMin = Math.max(0, y0 - offset),
      max = Math.min(y0 + offset, sideLen - 1);
    for (let y = yMin; y <= max; y += offset) {
      const xMin = Math.max(0, x0 - offset),
        max = Math.min(x0 + offset, sideLen - 1);
      for (let x = xMin; x <= max; x += offset) {
        const indexObj = {
          key: [x, y, z],
          index: getIndex(x, y, z, sideLen),
        };
        const notEqual = countNotEqual({ x0, y0, z0 }, { x, y, z });
        // 按-x +x -y +y -z +z顺序排列
        if (notEqual === 1) {
          if (x < x0) neighbour[1][0] = indexObj.key;
          if (x > x0) neighbour[1][1] = indexObj.key;
          if (y < y0) neighbour[1][2] = indexObj.key;
          if (y > y0) neighbour[1][3] = indexObj.key;
          if (z < z0) neighbour[1][4] = indexObj.key;
          if (z > z0) neighbour[1][5] = indexObj.key;
        } else neighbour[notEqual].push(indexObj.key);
        neighbour.all.push(indexObj.index);
      }
    }
  }
  return new Point(index, x0, y0, z0, neighbour);
};

const countNotEqual = (p0, p1) => {
  const { x0, y0, z0 } = p0;
  const { x, y, z } = p1;
  let count = 0;
  if (x0 !== x) count += 1;
  if (y0 !== y) count += 1;
  if (z0 !== z) count += 1;
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
