import * as THREE from 'three';

/**
 * Creates a frustum-shaped box (truncated pyramid) centered at the origin.
 * The bottom quad spans the full unit square (±0.5); the top quad is scaled by
 * topX and topZ relative to the bottom.
 *
 * topX = topZ = 1  → identical to a unit BoxGeometry
 * topX = topZ < 1  → tapers toward the top  (wider at base — bell-bottoms, flared skirt)
 * topX = topZ > 1  → flares toward the top  (wider at top — inverted trapezoid)
 * topX = topZ = 0  → pyramid
 */
export function createTaperedBoxGeometry(topX: number, topZ: number): THREE.BufferGeometry {
  const bx = 0.5, bz = 0.5, by = 0.5; // bottom half-extents
  const tx = 0.5 * topX, tz = 0.5 * topZ, ty = 0.5; // top half-extents

  // 4 unique vertices per face (no sharing → flat normals per face)
  // Winding: each face uses [0,1,2], [0,2,3] triangles with CCW winding from outside
  const pos = new Float32Array([
    // Front (+Z)
    -bx, -by,  bz,   bx, -by,  bz,   tx,  ty,  tz,  -tx,  ty,  tz,
    // Back (-Z)
     bx, -by, -bz,  -bx, -by, -bz,  -tx,  ty, -tz,   tx,  ty, -tz,
    // Left (-X)
    -bx, -by, -bz,  -bx, -by,  bz,  -tx,  ty,  tz,  -tx,  ty, -tz,
    // Right (+X)
     bx, -by,  bz,   bx, -by, -bz,   tx,  ty, -tz,   tx,  ty,  tz,
    // Top (+Y)
    -tx,  ty,  tz,   tx,  ty,  tz,   tx,  ty, -tz,  -tx,  ty, -tz,
    // Bottom (-Y)
    -bx, -by, -bz,   bx, -by, -bz,   bx, -by,  bz,  -bx, -by,  bz,
  ]);

  const indices: number[] = [];
  for (let f = 0; f < 6; f++) {
    const b = f * 4;
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
