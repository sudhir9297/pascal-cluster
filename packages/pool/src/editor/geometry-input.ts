const POSE_AND_SCENE_FIELDS = new Set([
  'id', 'object', 'name', 'metadata', 'parentId', 'children', 'visible',
  'position', 'rotation', 'poolId', 'wallIndex', 'wallT', 'floorAnchor',
  'showFlow', 'verticalOffset',
])

/** Equipment meshes are local; scene membership and pose do not change them. */
export function equipmentGeometrySignature(node: object) {
  return JSON.stringify(Object.entries(node)
    .filter(([key]) => !POSE_AND_SCENE_FIELDS.has(key))
    .sort(([a], [b]) => a.localeCompare(b)))
}
