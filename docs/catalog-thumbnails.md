# Catalog thumbnails

Commit sidebar thumbnails under `src/<kind>/assets/*.webp`. Before publishing new
captures, run `bun run thumbnails:optimize` and `bun run test:thumbnails`.

The optimizer fits images within 512 × 512 pixels without cropping, stretching or
upscaling. WebP quality is 90 and alpha quality is 100. Images already within the
limit remain byte-for-byte unchanged, so repeated runs do not re-encode thumbnails.
The cards display below 170 CSS pixels, leaving enough pixels for high-density
screens without shipping full-resolution renders in every offline editor runtime.

Only catalog images in the kind asset directories are processed. Model geometry,
material textures and scene data are unaffected. Keep high-resolution authoring
captures outside `src/` and pass new captures through the optimizer before release.
