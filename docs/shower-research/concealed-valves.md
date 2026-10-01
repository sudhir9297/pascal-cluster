# Concealed valve bodies

Research captured 2026-10-01 before implementation.

## Evidence

- Google Images: `concealed shower valve rough in body pressure balancing thermostatic universal`, [representative shapes](valve-google-images.png). Rounded cast bodies, taller paired cartridges, multi-outlet manifolds and installation housings are distinct visible families.
- [Kohler Rite-Temp body](https://me.kohler.com/product/rite-temp-k-8304-k/), [browser screenshot](valve-kohler.png), [manufacturer specification](https://techcomm.kohler.com/techcomm/pdf/K-8304-K_spec_US-CA_Kohler_en.pdf): pressure-balancing body/cartridge with a rough-in guide and mudguard; service-stop variants are available in the manufacturer's valve range.
- [Hansgrohe iBox universal 2](https://www.hansgrohe.com/articledetail-ibox-universal-2-basic-set-01500180), [browser screenshot](valve-hansgrohe.png): brass/foam installation body with a mounting ring and sliding sleeve; mounting depth 80–108 mm, half-inch connections, and specific compatible finish sets. Older finish sets require the documented adapter, so generic visual fit must not imply brand compatibility.

## Implementation

Six generic presets cover pressure balancing, pressure balancing with service stops, thermostatic, transfer, stop and universal installation housing. [Rendered gallery](valve-models.png) uses neutral materials. Body shape, width/height, mounting depth, port diameter/projection, outlet count, service stops and housing are editable. The model sits behind the wall face; its named hot/cold or mixed inlet and outlet targets follow its dimensions.

A body attaches to the `valve-body` slot of concealed control trim. Generic compatibility checks match mixer/diverter/flow function, single/dual control layout and available outlet count; exposed mixers reject these bodies. Valve depth must fit the wall thickness. Replacement enforces capacity one and retains a moved valve's identity. Trim settings prevent a variant change that would invalidate its attached body. Manufacturer-specific cartridges, thread standards, pressure behavior and certification are not represented by this generic visual compatibility rule.

The trim's existing system drives the body transform, so it follows trim position and either wall face. A plan footprint and a slot-placement tool support the two editing views. The model remains physically concealed by the wall in the normal render; a cutaway is needed to see its body.

## Verification

Four valve tests pass: finite geometry at dimension limits, exact stable ports, JSON persistence, compatibility/depth rejection, replacement, movement transforms and front/back plan geometry. A real scene-store test verifies replacement undo/redo restores the correct child. Combined valve/kit/assembly/control tests: 16 passing across seven files. TypeScript passes at this checkpoint. The full package suite has 194 passing tests and one existing failure for the flush plate seam-width drawing in the bath dimension audit; the full suite is not green.

The [editor catalog](valve-editor-catalog.png) loads all six presets. Actual editor attachment is verified: selecting the universal installation box and clicking the kit trim creates its five named supply/output targets behind the wall. Editor undo removes the targets and redo restores them. The [editor inspector](valve-editor-inspector.png) loads dimensions, ports and family controls. An incompatible pressure-balancing change is rejected; a compatible thermostatic change keeps the body ID and updates its four ports and dimensions. Remote water connections and manufacturer-specific compatibility remain pending in the final connection audit. Other valve presets, pointer resizing and the complete water network remain in the final audit.
