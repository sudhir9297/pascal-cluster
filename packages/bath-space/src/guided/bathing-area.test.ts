import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { BathtubNode } from '../bathtub/schema'
import { ShowerArmNode } from '../shower-arm/schema'
import { ShowerHeadNode } from '../shower-head/schema'
import { ShowerControlNode } from '../shower-control/schema'
import { ShowerAssemblyNode } from '../shower-assembly/schema'
import { createAssemblyChanges } from '../shower-assembly/children'
import { ShowerDividerNode } from '../shower-divider/schema'
import {
  acceptBathingPlacement,
  bathingHead,
  bathingShowerReady,
  emptyBathingArea,
  readBathingArea,
  reconcileBathingArea,
} from './bathing-area'
import {
  guidedShowerControlWallAllowed,
  guidedShowerHeadHostAllowed,
  setGuidedPlacementContext,
} from './placement-context'
const node = (value: unknown) => value as AnyNode

test('bath and both paths require a placed bath, and reopen it after deletion', () => {
  const bath = node(BathtubNode.parse({}))
  const flow = acceptBathingPlacement(
    { ...emptyBathingArea, kind: 'both', step: 'bath' },
    bath,
  )!
  expect(flow.bathId).toBe(bath.id)
  expect(flow.step).toBe('bath')
  expect(acceptBathingPlacement(flow, node(ShowerArmNode.parse({})))).toBeNull()
  expect(reconcileBathingArea({ ...flow, step: 'review' }, {}).step).toBe(
    'bath',
  )
  expect(
    reconcileBathingArea(
      { ...flow, kind: 'bath', step: 'complete' },
      { [bath.id]: bath },
    ).step,
  ).toBe('complete')
  expect(readBathingArea(JSON.parse(JSON.stringify(flow)))).toEqual(flow)
  expect(readBathingArea({ step: 'bad' })).toEqual(emptyBathingArea)
})
test('custom shower preserves Back and repairs the exact missing component', () => {
  const arm = node(ShowerArmNode.parse({ parentId: 'wall-current' }))
  const head = node(ShowerHeadNode.parse({ parentId: arm.id }))
  const otherHead = node(ShowerHeadNode.parse({ parentId: 'other-arm' }))
  const control = node(ShowerControlNode.parse({}))
  const flow = acceptBathingPlacement(
    { ...emptyBathingArea, kind: 'shower', system: 'custom', step: 'shower' },
    arm,
  )!
  expect(flow.step).toBe('head')
  const nodes = {
    [arm.id]: arm,
    [head.id]: head,
    [otherHead.id]: otherHead,
    [control.id]: control,
  }
  expect(bathingHead(flow, nodes)?.id).toBe(head.id)
  expect(reconcileBathingArea(flow, nodes).step).toBe('head')
  expect(reconcileBathingArea({ ...flow, step: 'control' }, nodes).step).toBe(
    'control',
  )
  const complete = { ...flow, step: 'complete' as const, controlId: control.id }
  expect(bathingShowerReady(complete, nodes)).toBe(true)
  expect(
    reconcileBathingArea(complete, { [arm.id]: arm, [otherHead.id]: otherHead })
      .step,
  ).toBe('head')
  expect(
    reconcileBathingArea(complete, { [arm.id]: arm, [head.id]: head }).step,
  ).toBe('control')
  expect(reconcileBathingArea(complete, {}).step).toBe('shower')
})
test('kit completion requires all included nodes; columns take their own branch', () => {
  const head = node(ShowerHeadNode.parse({}))
  const arm = node(
    ShowerArmNode.parse({
      metadata: { showerKit: { included: [{ id: head.id }] } },
    }),
  )
  const kit = acceptBathingPlacement(
    { ...emptyBathingArea, kind: 'shower', step: 'shower' },
    arm,
  )!
  expect(bathingShowerReady(kit, { [arm.id]: arm })).toBe(false)
  expect(bathingShowerReady(kit, { [arm.id]: arm, [head.id]: head })).toBe(true)
  expect(
    reconcileBathingArea({ ...kit, step: 'complete' }, { [arm.id]: arm }).step,
  ).toBe('shower')
  expect(
    acceptBathingPlacement(
      { ...emptyBathingArea, system: 'custom', step: 'shower' },
      arm,
    ),
  ).toBeNull()
  const assembly = node(
    ShowerAssemblyNode.parse({
      headEnabled: false,
      handEnabled: false,
      hoseEnabled: false,
    }),
  )
  const flow = acceptBathingPlacement(
    { ...emptyBathingArea, kind: 'shower', system: 'assembly', step: 'shower' },
    assembly,
  )!
  expect(bathingShowerReady(flow, { [assembly.id]: assembly })).toBe(true)
})
test('divider deletion reopens only a non-skipped divider step', () => {
  const bath = node(BathtubNode.parse({})),
    divider = node(ShowerDividerNode.parse({}))
  const flow = {
    ...emptyBathingArea,
    kind: 'bath' as const,
    bathId: bath.id,
    step: 'complete' as const,
    dividerIds: [divider.id],
  }
  expect(reconcileBathingArea(flow, { [bath.id]: bath }).step).toBe('divider')
  expect(
    reconcileBathingArea({ ...flow, dividerSkipped: true }, { [bath.id]: bath })
      .step,
  ).toBe('complete')
})
test('guided custom heads target only the selected arm and controls its wall; browse releases restrictions', () => {
  const arm = node(ShowerArmNode.parse({ parentId: 'current-wall' }))
  const adapter = { id: 'adapter', parentId: arm.id } as AnyNode
  const nodes = { [arm.id]: arm, [adapter.id]: adapter }
  setGuidedPlacementContext({
    vanityId: null,
    basinId: null,
    showerArmId: arm.id,
  })
  try {
    expect(guidedShowerHeadHostAllowed(adapter.id, nodes)).toBe(true)
    expect(guidedShowerHeadHostAllowed('other-arm', nodes)).toBe(false)
    expect(guidedShowerHeadHostAllowed(null, nodes)).toBe(false)
    expect(guidedShowerControlWallAllowed('current-wall', nodes)).toBe(true)
    expect(guidedShowerControlWallAllowed('other-wall', nodes)).toBe(false)
  } finally {
    setGuidedPlacementContext(null)
  }
  expect(guidedShowerHeadHostAllowed(null, nodes)).toBe(true)
  expect(guidedShowerControlWallAllowed('other-wall', nodes)).toBe(true)
})

test('column readiness follows its enabled outlets and missing children', () => {
  const assembly = ShowerAssemblyNode.parse({})
  const changes = createAssemblyChanges(assembly)
  const nodes = Object.fromEntries(
    changes.create.map(({ node }) => [node.id, node]),
  )
  const flow = {
    ...emptyBathingArea,
    kind: 'shower' as const,
    system: 'assembly' as const,
    showerId: assembly.id,
    step: 'complete' as const,
  }
  expect(bathingShowerReady(flow, nodes)).toBe(true)
  const head = Object.values(nodes).find(
    (node) => String(node.type) === 'bath-space:shower-head',
  )!
  delete nodes[head.id]
  expect(bathingShowerReady(flow, nodes)).toBe(false)
  expect(reconcileBathingArea(flow, nodes).step).toBe('shower')
})
