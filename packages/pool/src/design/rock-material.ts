import { Color } from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { abs, color, float, mix, normalWorld, positionLocal, positionWorld, sin, smoothstep } from 'three/tsl'

type WetContact = {
  halfWidth: number
  frontZ: number
  topY: number
}

/** Mineral-scale variation shared by pool coping and waterfall stones. */
export function createPoolRockMaterial(baseColor: string | Color, wetContact?: WetContact) {
  const base = new Color(baseColor)
  const material = new MeshStandardNodeMaterial({ color: base, roughness: 0.86, metalness: 0 })
  const p = positionWorld
  const normal = abs(normalWorld)
  const weights = normal.mul(normal)
  const weightSum = weights.x.add(weights.y).add(weights.z).max(0.001)
  const xDetail = sin(p.y.mul(4.3).add(p.z.mul(3.1)))
    .mul(sin(p.y.mul(11.7).sub(p.z.mul(7.1))))
  const yDetail = sin(p.x.mul(4.1).add(p.z.mul(3.8)))
    .mul(sin(p.x.mul(12.4).sub(p.z.mul(8.3))))
  const zDetail = sin(p.x.mul(4.7).add(p.y.mul(3.4)))
    .mul(sin(p.x.mul(10.8).sub(p.y.mul(9.1))))
  const mineral = xDetail.mul(weights.x).add(yDetail.mul(weights.y)).add(zDetail.mul(weights.z))
    .div(weightSum)
  const grain = sin(p.x.mul(32).add(p.z.mul(18)))
    .mul(sin(p.y.mul(27).sub(p.z.mul(31))))
  const crackWave = p.x.mul(2.7).add(p.z.mul(1.9)).add(p.y.mul(0.8))
  const crackSignal = abs(sin(crackWave))
  const fracture = smoothstep(0.005, 0.06, crackSignal).oneMinus()
  const shade = mineral.mul(0.11).add(grain.mul(0.025)).sub(fracture.mul(0.08)).add(0.94)
  const moss = smoothstep(0.35, 0.75, normalWorld.y)
    .mul(smoothstep(0.35, 0.8, mineral))
  const wet = wetContact ? (() => {
    const across = smoothstep(wetContact.halfWidth * 0.8, wetContact.halfWidth * 1.55,
      abs(positionLocal.x)).oneMinus()
    const proximity = smoothstep(0.08, 0.55,
      abs(positionLocal.z.sub(wetContact.frontZ))).oneMinus()
    const belowLip = smoothstep(wetContact.topY - 0.5, wetContact.topY + 0.15,
      positionLocal.y).oneMinus()
    return across.mul(proximity).mul(belowLip).mul(0.72)
  })() : float(0)
  material.colorNode = mix(
    mix(color(base), color(base).mul(0.73), moss.mul(0.32)).mul(shade),
    color(base).mul(0.48),
    wet,
  )
  material.roughnessNode = mix(float(0.9), float(0.34), wet)
  return material
}
