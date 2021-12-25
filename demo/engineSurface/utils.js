/**
 * a set of points to describe a geometry
 * @typedef { Array<THREE.Vector3> } Points
 */

/**
 * @description 根据原始数据筛选符合条件的点 生成vector3点并根据连续性分组
 * @param { Array<Number> } data origin data
 * @param { Function } checkSuitable filter condition
 * @returns { Array<Points> } a set of Points to describe multiple geometry
 */
const generateSplitPoints = (data, checkSuitable) => {
  let pointsMap = new Map(data.map((v, idx) => [idx, v]));
  const gap = 1;
  let index = 0;
  const pointsLi = [];
  const stack = [];
  while (pointsMap.size) {
    const points = [];
    if (!pointsMap.has(index)) {
      index += 1;
      continue;
    }
    stack.push(index);
    while (stack.length) {
      const index = stack.pop();
      const value = pointsMap.get(index);
      const node = createNode(index);
      if (checkSuitable(value)) {
        const { x, y, z } = node;
        node.vector = new THREE.Vector3(x * gap, y * gap, z * gap);
        points.push(node.vector);
        stack.push(...node.neighbour);
      }
      pointsMap.delete(index);
    }
    pointsLi.push(points);
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
 * @param { XYZSize } size
 * @returns
 */
const getIndex = (x, y, z, size) => {
  return x + 48 * y + 2304 * z;
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
const createNode = (index) => {
  const x0 = Math.floor(index % 48);
  const y0 = Math.floor((index % 2304) / 48);
  const z0 = Math.floor(index / 2304);
  const neighbour = [];
  const min = Math.max(0, x0 - 1),
    max = Math.min(x0 + 1, 47);
  for (let x = min; x <= max; x += 1) {
    const min = Math.max(0, y0 - 1),
      max = Math.min(y0 + 1, 47);
    for (let y = min; y <= max; y += 1) {
      const min = Math.max(0, z0 - 1),
        max = Math.min(z0 + 1, 47);
      for (let z = min; z <= max; z += 1) {
        neighbour.push(getIndex(x, y, z));
      }
    }
  }
  return {
    index,
    x: x0,
    y: y0,
    z: z0,
    neighbour,
  };
};
