'use client'
import type { ComponentProps } from 'react'
import { useScene } from '@pascal-app/core'
import { PanelButton, SliderControl } from '../inspector-controls'
import { useSectionSizingMode } from '../section/sizing-mode'
import { vanityDimensionReferences } from './size-options'
import type { VanityNode } from './schema'

export function VanitySliderControl({node, dimensionKey, elevation = 0, ...props}: ComponentProps<typeof SliderControl> & {node: VanityNode; dimensionKey: string; elevation?: number}) {
  const mode = useSectionSizingMode()
  const readOnly = useScene(state => state.readOnly)
  const references = vanityDimensionReferences(node, dimensionKey, dimensionKey === 'width' ? props.max : undefined).map(reference => ({...reference, value: reference.value + elevation})).filter(reference => reference.value >= (props.min ?? 0) && reference.value <= (props.max ?? Infinity))
  const values = dimensionKey === 'height' ? [] : references.map(reference => reference.value)
  return <div><SliderControl {...props} precision={references.length ? Math.max(props.precision ?? 2, ...references.map(reference => Number(reference.value.toFixed(6)).toString().split('.')[1]?.length ?? 0)) : props.precision} onChange={value => {
    if (!readOnly) props.onChange(mode?.enabled && values.length ? values.reduce((best, item) => Math.abs(item - value) < Math.abs(best - value) ? item : best) : value)
  }}/>{references.length > 0 && <div className="flex flex-wrap gap-1 pb-2">{references.map(reference => <PanelButton key={reference.value} disabled={readOnly} onClick={() => props.onChange(reference.value)}>{Number((reference.value * 1000).toFixed(2))} mm</PanelButton>)}</div>}</div>
}
