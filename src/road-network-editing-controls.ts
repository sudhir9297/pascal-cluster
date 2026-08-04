export type RoadNetworkEditingControlsState = {
  lengthArrows: boolean
  splineHandles: boolean
}

/** Resolve editor overlays independently from the always-on road hit surface. */
export function roadNetworkEditingControlsState({
  networkSelected,
  roadToolActive,
  splineEditing,
}: {
  networkSelected: boolean
  roadToolActive: boolean
  splineEditing: boolean
}): RoadNetworkEditingControlsState {
  const selectedAndIdle = networkSelected && !roadToolActive
  return {
    lengthArrows: selectedAndIdle,
    splineHandles: selectedAndIdle && splineEditing,
  }
}
