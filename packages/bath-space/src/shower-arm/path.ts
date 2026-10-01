import { CurvePath, LineCurve3, QuadraticBezierCurve3, Vector3 } from 'three'
import { armOutletAngle, type ShowerArmNode } from './schema'
/** Geometry, section drawing and attachment targets share this centreline. */
export function armPath(n: ShowerArmNode) {
  const path = new CurvePath<Vector3>(),
    start = new Vector3(),
    end = new Vector3(0, 0, n.length)
  const line = (a: Vector3, b: Vector3) => {
    if (a.distanceTo(b) > 1e-10) path.add(new LineCurve3(a, b))
  }
  if (n.style.endsWith('gooseneck')) {
    const top = new Vector3(0, n.rise, n.length * 0.45)
    end.y = n.rise - n.drop
    path.add(new QuadraticBezierCurve3(start, new Vector3(0, n.rise, 0), top))
    path.add(new QuadraticBezierCurve3(top, new Vector3(0, n.rise, n.length), end))
  } else if (n.style.endsWith('curved')) {
    end.y = -n.drop
    const radius = Math.min(n.bendRadius, n.length * 0.8, n.drop),
      a = new Vector3(0, 0, n.length - radius),
      b = new Vector3(0, -radius, n.length)
    line(start, a)
    path.add(new QuadraticBezierCurve3(a, new Vector3(0, 0, n.length), b))
    line(b, end)
  } else {
    const angle = (armOutletAngle(n) * Math.PI) / 180
    if (angle < 1e-9) line(start, end)
    else {
      const drop = Math.min(n.drop, n.length * Math.tan(angle) * 0.8),
        horizontal = angle >= Math.PI / 2 - 1e-9 ? 0 : drop / Math.tan(angle)
      end.y = -drop
      const corner = new Vector3(0, 0, n.length - horizontal)
      line(start, corner)
      line(corner, end)
    }
  }
  const direction = path.curves[path.curves.length - 1]!.getTangent(1).normalize()
  return { path, end, direction }
}
