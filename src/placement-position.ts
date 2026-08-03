/**
 * Keep legacy floor assets on their level plane while allowing surface-mounted
 * assets to use the mouse cursor's complete level-local position.
 */
export function resolvePlacementPosition(
  local: readonly [number, number, number],
  preserveY = false,
): [number, number, number] {
  return [local[0], preserveY ? local[1] : 0, local[2]]
}
