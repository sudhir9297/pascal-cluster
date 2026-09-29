export {
  countPools,
  getPoolGeometrySignature,
  getPoolResizePreviewTransform,
  getPoolWaterResolution,
  selectPoolRenderNodes,
} from './pool-render-plan'

/** Nested simulation render targets are not safe while the host owns an XR framebuffer. */
export function shouldAdvancePoolWater(
  immersiveXR: boolean,
  isWebGPURenderer: boolean,
  isDragging = false,
) {
  return !immersiveXR && isWebGPURenderer && !isDragging
}

/** The ripple field needs fewer updates when it covers few screen pixels. */
export function poolWaterSimulationHz(projectedDiameterPixels: number) {
  if (projectedDiameterPixels < 120) return 10
  if (projectedDiameterPixels < 360) return 15
  return 30
}
