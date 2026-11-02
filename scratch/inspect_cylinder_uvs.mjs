import * as THREE from 'three';

function createSolidCakeWedge(radius, startAngle, endAngle, height, bevel = 0.012) {
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

// Find vertices on the outer cylinder: x^2 + z^2 ≈ radius^2
const radius = 1.15;
console.log('Outer cylinder vertices:');
let count = 0;
for (let i = 0; i < pos.length / 3; i++) {
  const x = pos[i * 3];
  const y = pos[i * 3 + 1];
  const z = pos[i * 3 + 2];
  const dist = Math.sqrt(x * x + z * z);
  if (Math.abs(dist - radius) < 0.02 && Math.abs(y - 0.1) < 0.08) {
    console.log(`pos=(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) uv=(${uvs[i*2].toFixed(3)}, ${uvs[i*2+1].toFixed(3)})`);
    count++;
    if (count > 25) break;
  }
}
