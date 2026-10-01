'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  PanelButton,
  PanelSelect,
} from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { showerConnectorSection } from './section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerConnectorNode, showerConnectorPresets, connectorPresetNode } from './schema'
export default function ShowerConnectorInspector({ node: n }: { node: ShowerConnectorNode }) {
  const update = (patch: Partial<ShowerConnectorNode>) =>
    useScene
      .getState()
      .updateNode(
        n.id as AnyNodeId,
        ShowerConnectorNode.parse({ ...n, ...patch }) as unknown as Partial<AnyNode>,
      )
  const slider = (
    key:
      | 'length'
      | 'diameter'
      | 'inletDiameter'
      | 'outletDiameter'
      | 'collarLength'
      | 'angle'
      | 'azimuth',
    label: string,
    min: number,
    max: number,
    angle = false,
  ) => (
    <SliderControl
      label={label}
      value={n[key]}
      min={min}
      max={max}
      step={angle ? 1 : 0.001}
      precision={angle ? 0 : 3}
      unit={angle ? '°' : 'm'}
      onChange={(v) => update({ [key]: v })}
    />
  )
  return (
    <PanelWrapper
      title="Shower connector"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={showerConnectorSection} onChange={update} />

      <PanelSection title="Connector shape" defaultExpanded>
        <div className="grid grid-cols-2 gap-2">
          {showerConnectorPresets.map((p) => (
            <PanelButton
              key={p.id}
              type="button"
              className="rounded border p-2 text-xs"
              onClick={() => {
                const x = connectorPresetNode(p)
                update({
                  style: x.style,
                  outletType: n.children.length ? n.outletType : x.outletType,
                  length: x.length,
                  angle: x.angle,
                  diameter: x.diameter,
                  inletDiameter: x.inletDiameter,
                  outletDiameter: x.outletDiameter,
                  inletNominal: x.inletNominal,
                  outletNominal: x.outletNominal,
                })
              }}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {slider('length', 'Body length', 0.025, 0.5)}
        {slider('diameter', 'Body diameter', 0.025, 0.06)}
        {slider('inletDiameter', 'Inlet outside diameter', 0.018, 0.035)}
        {slider('outletDiameter', 'Outlet outside diameter', 0.018, 0.035)}
        {slider('collarLength', 'Collar length', 0.005, 0.025)}
        {['elbow', 'swivel', 'articulated'].includes(n.style) && (
          <>
            {slider('angle', 'Outlet angle', -90, 90, true)}
            {slider('azimuth', 'Rotation around inlet', -180, 180, true)}
          </>
        )}
      </PanelSection>
      <PanelSection title="Connection reference" defaultExpanded>
        <label className="block text-xs">
          Thread family
          <PanelSelect
            value={n.threadFamily}
            onChange={(e) =>
              update({ threadFamily: e.target.value as ShowerConnectorNode['threadFamily'] })
            }
          >
            {['generic', 'G', 'IPS'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </PanelSelect>
        </label>
        {(['inletNominal', 'outletNominal'] as const).map((key) => (
          <label key={key} className="block text-xs">
            {key === 'inletNominal' ? 'Inlet nominal size' : 'Outlet nominal size'}
            <PanelSelect value={n[key]} onChange={(e) => update({ [key]: e.target.value })}>
              <option>1/2</option>
              <option>3/4</option>
            </PanelSelect>
          </label>
        ))}
      </PanelSection>
    </PanelWrapper>
  )
}
