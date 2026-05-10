function ConstructMap() {
  const hm = new Map();
  for (let i = 0; i <= 9; i++) {
    hm.set(i, i);
  }

  for (let i = 10; i <= 35; i++) {
    hm.set(i, String.fromCharCode(87 + i));
  }

  for (let i = 36; i <= 61; i++) {
    hm.set(i, String.fromCharCode(29 + i));
  }

  return hm;
}

function MappedValues(hm, arr) {
  return hm.get(arr);
}

function shortBasesixtwocode(id) {
  const hm = ConstructMap();
  let n = id;
  let arr = [];
  let output = "";
  while (n !== 0) {
    const divideResult = Math.floor(n / 62);
    const remainder = Math.floor(n % 62);
    n = Math.floor(n / 62);
    arr.push(remainder);
  }

  for (let i = 0; i < arr.length; i++) {
    output += MappedValues(hm, arr[i]);
  }

  return output
    .split("")
    .reverse()
    .join("");
}
module.exports = { shortBasesixtwocode, MappedValues };
