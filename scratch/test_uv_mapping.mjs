import * as THREE from 'three';

function applyCylindricalCakeUVs(geometry, radius, startAngle, endAngle, height) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const count = pos.count;

  // Clone or modify in-place
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const r = Math.sqrt(x * x + z * z);
    const normY = THREE.MathUtils.clamp(y / height, 0, 1);

    // Check if this vertex is on the outer cylindrical curve
    if (r > radius - 0.02) {
      let angle = Math.atan2(z, x);
      // Normalize angle relative to startAngle
      let relAngle = angle - startAngle;
      while (relAngle < 0) relAngle += Math.PI * 2;
      while (relAngle >= Math.PI * 2) relAngle -= Math.PI * 2;
      
      const totalArc = endAngle - startAngle;
      const u = (relAngle / totalArc) * (radius * totalArc); // Arc length for 1:1 scale
      const v = normY;
      uv.setXY(i, u, v);
    } else if (y > height - 0.005) {
      // Top face
      uv.setXY(i, (x / radius) * 0.5 + 0.5, (z / radius) * 0.5 + 0.5);
    } else if (y < 0.005) {
      // Bottom face
      uv.setXY(i, (x / radius) * 0.5 + 0.5, (z / radius) * 0.5 + 0.5);
    } else {
      // Interior radial cut walls
      // Distance from center as U, height as V
      uv.setXY(i, r / radius, normY);
    }
  }
  uv.needsUpdate = true;
}

const shape = new THREE.Shape();
shape.moveTo(0, 0);
const startAngle = 0.20;
const endAngle = 0.95;
const radius = 1.15;
const height = 0.23;

shape.lineTo(radius * Math.cos(startAngle), -radius * Math.sin(startAngle));
shape.absarc(0, 0, radius, -startAngle, -endAngle, true);
shape.lineTo(0, 0);

const geom = new THREE.ExtrudeGeometry(shape, {
  depth: height,
  bevelEnabled: true,
  bevelSize: 0.005,
  bevelThickness: 0.005,
  bevelSegments: 3,
  curveSegments: 40,
});
geom.rotateX(-Math.PI / 2);
geom.computeVertexNormals();

applyCylindricalCakeUVs(geom, radius, startAngle, endAngle, height);

console.log('Successfully applied cylindrical UVs!');
const uvs = geom.attributes.uv.array;
const pos = geom.attributes.position.array;
for (let i = 0; i < 15; i++) {
  console.log(`v${i}: pos=(${pos[i*3].toFixed(2)}, ${pos[i*3+1].toFixed(2)}, ${pos[i*3+2].toFixed(2)}) -> uv=(${uvs[i*2].toFixed(3)}, ${uvs[i*2+1].toFixed(3)})`);
}
