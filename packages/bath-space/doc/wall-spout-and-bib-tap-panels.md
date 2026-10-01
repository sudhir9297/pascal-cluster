# Wall spout and bib tap model panels

Updated all 15 existing presets (12 wall spouts and 3 bib taps). Scope excludes wall geometry and other tap models.

- Catalog and model selectors use side silhouettes projected from actual fixture geometry.
- Both inspectors begin with the editable plan and section drawing and offer visual model cards.
- Shape-specific controls expose arch rise only for arched spouts and bend radius only for curved spouts.
- Mounting controls show the wall face, support switching faces, and provide repositioning on the wall.
- Finish swatches apply chrome, brushed steel, brass, black, or white to the existing finish slots. Metallic choices have different roughness and metalness, and cached shared materials are cloned before editing.
- Model changes preserve identity, wall mounting, and finish; incompatible changes remain disabled when connected children require their sockets.

Review scene: http://localhost:3002/scene/a2f5d1f3b080

## Visual review

- [Wall spout section](panel-references/wall-spout-section.png)
- [Bib tap models](panel-references/bib-tap-models.png)
- [Bib tap mounting and finishes](panel-references/bib-tap-finishes.png)

Validation: five focused wall-spout tests pass; bath-space type checking passes. Browser checks confirmed model switching, inactive-control removal, finish selection and persistence through model changes. A broader section test run encountered an unrelated existing flush-plate seamWidth drawing failure; no flush-plate code was changed.
