# Image format audit

All 924 standalone raster image files in the project now use WebP. Dependency directories, Git metadata, ignored build outputs, embedded model textures, and externally hosted image services are outside this standalone asset audit.

Converted 352 PNG files and 18 JPEG files using cwebp lossless encoding with exact transparent RGB preservation. Every output decoded successfully before the original was removed. Total size changed from 97,420,581 bytes to 71,764,792 bytes, a 26.3% reduction.

Updated local image imports, documentation links, tree texture lookup keys, species presets and texture filename builders. All 555 relative WebP references in code resolve to existing files. Removed obsolete PNG/JPEG module declarations from Landscape.

Verification: no standalone PNG/JPEG/GIF/BMP/TIFF/AVIF/ICO files remain in the project inventory; all 29 images in the current editor preview decode; 57 Landscape source files pass syntax checks; four focused tree rendering tests pass. External map tile URLs and historical generation records retain their original formats.
