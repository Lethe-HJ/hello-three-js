# ConvexGeometry

ConvexGeometry can be used to generate a convex hull for a given array of 3D points. The average time complexity for this task is considered to be `O(nlog(n))`.

## Code Example

```js
const geometry = new ConvexGeometry( points );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );
```

## Examples

[geometry / convex](https://threejs.org/examples/#webgl_geometry_convex)

## Constructor

### ConvexGeometry( points : Array )

points — Array of Vector3s that the resulting convex hull will contain.

## Source

[examples/jsm/geometries/ConvexGeometry.js](https://github.com/mrdoob/three.js/blob/master/examples/jsm/geometries/ConvexGeometry.js)
