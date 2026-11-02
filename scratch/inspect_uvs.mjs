import * as THREE from 'three';

function createSolidCakeWedge(
  radius,
  startAngle,
  endAngle,
  height,
  bevel = 0.012
) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(radius * Math.cos(startAngle), -radius * Math.sin(startAngle));
  shape.absarc(0, 0, radius, -startAngle, -endAngle, true);
  shape.lineTo(0, 0);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 40,
  });
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

const geom = createSolidCakeWedge(1.15, 0.95, 0.20 + Math.PI * 2, 0.23, 0.005);
const uvs = geom.attributes.uv.array;
const pos = geom.attributes.position.array;

console.log('Total vertices:', pos.length / 3);
console.log('Sample UVs:');
for (let i = 0; i < 20; i++) {
  console.log(`v${i}: pos=(${pos[i*3].toFixed(2)}, ${pos[i*3+1].toFixed(2)}, ${pos[i*3+2].toFixed(2)}) uv=(${uvs[i*2].toFixed(3)}, ${uvs[i*2+1].toFixed(3)})`);
}
