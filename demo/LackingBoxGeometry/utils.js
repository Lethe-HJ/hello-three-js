const generateCoordMapping = () => {
  const xSpinMapping = new Map([
    ["A", ["A", "D", "H", "E"]],
    ["B", ["B", "C", "G", "F"]],
    ["C", ["C", "G", "F", "B"]],
    ["D", ["D", "H", "E", "A"]],
    ["E", ["E", "A", "D", "H"]],
    ["F", ["F", "B", "C", "G"]],
    ["G", ["G", "F", "B", "C"]],
    ["H", ["H", "E", "A", "D"]],
  ]);

  const ySpinMapping = new Map([
    ["A", ["A", "B", "C", "D"]],
    ["B", ["B", "C", "D", "A"]],
    ["C", ["C", "D", "A", "B"]],
    ["D", ["D", "A", "B", "C"]],
    ["E", ["E", "F", "G", "H"]],
    ["F", ["F", "G", "H", "E"]],
    ["G", ["G", "H", "E", "F"]],
    ["H", ["H", "E", "F", "G"]],
  ]);

  const zSpinMapping = new Map([
    ["A", ["A", "B", "F", "E"]],
    ["B", ["B", "F", "E", "A"]],
    ["C", ["C", "G", "H", "D"]],
    ["D", ["D", "C", "G", "H"]],
    ["E", ["E", "A", "B", "F"]],
    ["F", ["F", "E", "A", "B"]],
    ["G", ["G", "H", "D", "C"]],
    ["H", ["H", "D", "C", "G"]],
  ]);
  const resLi = [];
  for (let x = 0; x < 4; x += 1) {
    for (let y = 0; y < 4; y += 1) {
      for (let z = 0; z < 4; z += 1) {
        let res = [];
        ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((point) => {
          const xSpin = xSpinMapping.get(point)[x];
          const ySpin = ySpinMapping.get(xSpin)[y];
          const zSpin = zSpinMapping.get(ySpin)[z];
          res.push(zSpin);
        });
        res = res.join("");
        resLi.push(res);
      }
    }
  }
  const resSet = new Set(resLi);
  const coordMapping = new Map();
  resSet.forEach((item) => {
    ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((key, index) => {
      const value = coordMapping.get(key);
      if (!value) {
        coordMapping.set(key, []);
      }
      coordMapping.get(key).push(item[index]);
    });
  });
  return coordMapping;
};

/** 
 * 这个map中的数据由generateCoordMapping生成
 * 为了提高性能因此将计算结果直接初始化到map里 避免每次都需计算
 * @type {*} 
 * 
 * 
*/
const coordMapping = new Map([
  [
    "A",
    [
      "A",
      "B",
      "F",
      "E",
      "B",
      "F",
      "E",
      "A",
      "C",
      "G",
      "H",
      "D",
      "D",
      "C",
      "G",
      "H",
      "D",
      "C",
      "G",
      "H",
      "B",
      "F",
      "E",
      "A",
    ],
  ],
  [
    "B",
    [
      "B",
      "F",
      "E",
      "A",
      "C",
      "G",
      "H",
      "D",
      "D",
      "C",
      "G",
      "H",
      "A",
      "B",
      "F",
      "E",
      "C",
      "G",
      "H",
      "D",
      "A",
      "B",
      "F",
      "E",
    ],
  ],
  [
    "C",
    [
      "C",
      "G",
      "H",
      "D",
      "D",
      "C",
      "G",
      "H",
      "A",
      "B",
      "F",
      "E",
      "B",
      "F",
      "E",
      "A",
      "G",
      "H",
      "D",
      "C",
      "E",
      "A",
      "B",
      "F",
    ],
  ],
  [
    "D",
    [
      "D",
      "C",
      "G",
      "H",
      "A",
      "B",
      "F",
      "E",
      "B",
      "F",
      "E",
      "A",
      "C",
      "G",
      "H",
      "D",
      "H",
      "D",
      "C",
      "G",
      "F",
      "E",
      "A",
      "B",
    ],
  ],
  [
    "E",
    [
      "E",
      "A",
      "B",
      "F",
      "F",
      "E",
      "A",
      "B",
      "G",
      "H",
      "D",
      "C",
      "H",
      "D",
      "C",
      "G",
      "A",
      "B",
      "F",
      "E",
      "C",
      "G",
      "H",
      "D",
    ],
  ],
  [
    "F",
    [
      "F",
      "E",
      "A",
      "B",
      "G",
      "H",
      "D",
      "C",
      "H",
      "D",
      "C",
      "G",
      "E",
      "A",
      "B",
      "F",
      "B",
      "F",
      "E",
      "A",
      "D",
      "C",
      "G",
      "H",
    ],
  ],
  [
    "G",
    [
      "G",
      "H",
      "D",
      "C",
      "H",
      "D",
      "C",
      "G",
      "E",
      "A",
      "B",
      "F",
      "F",
      "E",
      "A",
      "B",
      "F",
      "E",
      "A",
      "B",
      "H",
      "D",
      "C",
      "G",
    ],
  ],
  [
    "H",
    [
      "H",
      "D",
      "C",
      "G",
      "E",
      "A",
      "B",
      "F",
      "F",
      "E",
      "A",
      "B",
      "G",
      "H",
      "D",
      "C",
      "E",
      "A",
      "B",
      "F",
      "G",
      "H",
      "D",
      "C",
    ],
  ],
]);
