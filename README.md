# Pascal Landscape plugin

Landscape design tools for the Pascal editor. Exports `landscapePlugin` and
`landscapeHostPanel`, with a freestanding open-slat pergola as the first tool.
Requires compatible Pascal core, editor, and viewer 1.x packages.

## Pergola

Open **Landscape → Pergolas** and click the **Open-slat pergola** thumbnail,
then click in the scene to place it. Use **R / T** to rotate the placement
preview and **Escape** to cancel. Select a placed pergola to edit its dimensions
and structure in the editor inspector. Use the editor paint tool for its finish.

The Landscape sidebar starts with a two-column catalog. Each item opens its
own scrollable view with placement thumbnails. Use **Landscape catalog** to
return to the grid; this cancels active placement.
Pathways offers **Straight / polyline** and **Smooth curve** thumbnails to start
drawing with the current width and color.
**Stone walkway · 1.8 m** starts the reference-style layout with three individual
stone columns, visible joints, and a continuous border. Standard drawing starts
at 1.2 m. In the floating settings, **Width** resizes the entire selected
walkway. Paving finishes are arranged in a two-column grid. Laid stone has no
backing slab, and its stone dimensions stay consistent as the route gets longer.

The first version includes four posts, a perimeter beam frame, rafters, optional shade
slats and knee braces, with paintable surfaces. Each enabled knee brace has shaped
ends that meet the post and beam along the pergola's width and depth. It provides 3D geometry,
a 2D floor-plan representation, and editor movement, rotation, and sizing
controls. Placement is intended for level ground or a slab; individual post
heights do not yet adapt to sloping terrain.

The selected pergola's inspector offers flat, single-slope, gable, and curved
roof forms. Single-slope uses separate front and back heights; gable and curved
roofs use an adjustable rise. The inspector can also inset posts independently
from each side and switch them between square, chamfered, round, and tapered
profiles. All posts still sit on the same level surface.
Gable roofs include a full-width curved timber arch under each pitched end beam
by default. Its upper and lower edges rise together, and a center king post and
short diagonal struts connect it to the gable above. The arch
can instead be placed at the front, back, both ends, or removed on any roof
form. Segmental, rounded, and pointed styles have adjustable drop, rise, and
depth. Curved roofs have matching curved end beams, and their arches follow
the beams. The roof profile follows the post positions when posts are inset.

Roof member layout offers open rafters, close shade slats, and a two-direction
grid. Rafter size and spacing are independent of the shade slats or grid cross
members. The grid also lets either the rafters or cross members sit on top.
Existing pergolas with the older Cross slats setting keep their previous roof
layout until changed in the inspector.

The post detail control adds only bands or top trim. Changing the post profile
resets this detail to Plain. One post base control handles all bottom shaping,
following the editor column's simple block, square plinth, stepped square,
rounded rings, and panelled pedestal forms. The base can also be removed, and
its width and height are adjustable. Bases use the post finish by default.
The post shaft begins at the base's top tier, while the neck of each base
adapts to the selected square, chamfered, round, or tapered post profile.
Round and tapered posts expose straight, bulged, and hourglass shaft shapes
below the profile selector. Tapered posts also expose taper strength, and the
curved shapes expose shaft curve strength. Braces and base necks follow the
resulting profile.

Knee brace settings in the inspector include diagonal, arched, and swept
styles, thickness, reach along the beam, and drop down the post. Brace ends
follow the selected post profile, including tapered posts.

Pergola code lives in `src/pergola/`:

- `domain/`: validated node data and member layout.
- `rendering/`: 3D geometry, floor-plan drawing, and placement preview.
- `editor/`: placement tool, property controls, and panel illustration.
- `definition.ts`: registration with the editor's node system.

Pathway and walkway research, design notes, and future feature code live in
[`src/pathways/`](./src/pathways/README.md).

## Local development

Install dependencies in this repository and in the editor checkout once. Then,
from this repository:

```bash
bun run dev
```

This links the source into the neighboring `../editor` checkout, rebuilds its
built-in node packages, and starts the editor at http://localhost:3004. Source
edits update through Next.js Fast Refresh. React and Pascal core resolve to the
host's copies.

The link changes only `node_modules`. It does not edit the editor's dependency
URL or lockfile and requires no global Bun link registration.

To link without starting another server:

```bash
bun run dev:link
```

Restart an already running editor after switching between local and installed
packages. Subsequent source edits hot reload without restarting.

Optional settings:

```bash
PASCAL_EDITOR_PATH=/path/to/editor PORT=3004 bun run dev
```

In an existing scene, open **Plugins → Landscape → Install**, then select
**Landscape** in the sidebar.

## GitHub installation

Push this repository to your intended GitHub repository. In the editor's
`apps/editor/package.json`, set the dependency to its URL and a release tag or
commit, for example:

```json
"@pascal-app/plugin-landscape": "git+ssh://git@github.com/sudhir9297/landscape-pascal-plugin.git#COMMIT_OR_TAG"
```

The repository is private. Installing machines need GitHub access through an
SSH key or a Git credential helper; CI needs credentials with access to this
repository. Never put credentials in the dependency URL.

Run `bun install` from the editor root and restart the editor. Its existing
plugin registration, TypeScript transpilation, CSS scanning, and package
resolution work with either an installed dependency or the local development
link. No source-path or Next.js configuration edits are needed when switching.

The package ships TypeScript source at `src/index.ts`, including its lazy panel
imports. No generated `dist` directory, build hooks, or consumer-side build step
is needed in this editor. A different host must transpile this source package
and register its manifest and panel as described in the
[Pascal plugin guide](https://editor.pascal.app/docs/developers/plugins).

To return from local development to the editor's pinned GitHub version:

```bash
bun run dev:unlink
```

This removes the local override and reinstalls from the editor's frozen lockfile.
Restart the editor afterward. To resume local work, run `bun run dev` again.

A GitHub push does not update a pinned installation automatically. To deploy a
new release, update the tag/commit in the editor dependency, run `bun install`,
and commit its package manifest and lockfile.

## Checks

```bash
bun run check-types
bun test
bun pm pack --dry-run
```

## License

MIT
