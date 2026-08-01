import {
  DataTexture,
  LinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

const TEXTURE_SIZE = 128

function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return value - Math.floor(value)
}

/** A small deterministic asphalt texture made from aggregate and grain noise. */
export function createRoadSurfaceTexture(): DataTexture {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)
  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const coarse = hash(Math.floor(x / 5), Math.floor(y / 5))
      const grain = hash(x, y)
      const aggregate = hash(Math.floor(x / 2), Math.floor(y / 2))
      let shade = 36 + coarse * 14 + grain * 8
      if (aggregate > 0.91) shade += 22
      if (aggregate < 0.08) shade -= 7

      const index = (y * TEXTURE_SIZE + x) * 4
      data[index] = shade
      data[index + 1] = shade + 1
      data[index + 2] = shade + 2
      data[index + 3] = 255
    }
  }

  const texture = new DataTexture(data, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
