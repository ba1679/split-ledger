# 006 image fixture assets

All images are synthetic RGB shapes generated for automated tests; no third-party source photos,
personal metadata or external media are included. Original generated files remain test-only.

## Fixed HEVC samples

Created 2026-11-15 from a sharp 0.35.5 32×32 solid `#c25631` PNG using macOS ImageIO:
`/usr/bin/sips -s format heic source.png --out synthetic.heic`.
The HEIF sample preserves the same complete HEVC item/mdat and changes the primary brand to `mif1`;
`mif1` is already a compatible brand in the original. Both files were decoded back to 32×32 PNG with
ImageIO before inclusion (`.cache/implement-006/t048-heic-authoring.log`, `t048-heif-decode.log`).
Runtime tests use these fixed samples on Linux without requiring a HEVC encoder/decoder in the app.
The generic HEIF/HEIC media distinction follows the [IANA registration](https://www.iana.org/assignments/media-types/image/heif).

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `synthetic.heic` | 640 | `6521f0060835b42123335928bb9dcdea73b60189dbf70b3b2abf6d6e00000226` |
| `synthetic.heif` | 640 | `b6a94c76ad85e7e123ddd0cfe73f8f904cdcad3f551a54b6a8008cfe193cab6e` |

## Generated fixtures

`support/trip-management/invalid-images.ts` generates real AVIF, GIF (one/two frames), WebP animation,
two-page TIFF, SVG and a minimal valid PDF. APNG has two independently decodable pixel streams and
ordered acTL/fcTL/fdAT chunks according to [PNG Third Edition](https://www.w3.org/TR/png-3/#11acTL).
Tests verify both APNG frame contents rather than relying on sharp's first-frame-only PNG metadata.
Zero-dimension PNGs retain valid chunk CRCs; truncated JPEG/plain-text/zero-byte fixtures are deliberately
invalid contents. A mislabeled HEIC retains its real complete bytes with JPEG filename/MIME.

`support/trip-management/generated-images.ts` creates exact-size static JPEG/PNG/WebP using legal
COM/ancillary/JUNK padding. Every file is metadata-checked and fully decoded before use, even when its
size/pixel count deliberately exceeds the product limit.
Generated files live only in isolated temporary workspaces with success/error teardown.

`photo-fixture.ts` builds synthetic orientation-6 JPEG corner markers, reproducible high-entropy RGB
noise, and a 1×1 half-transparent PNG. All three carry real ICC plus TIFF-based orientation/GPS
metadata. GPS coordinates are fixed synthetic test values, not a device/user location. Tag types and
GPS IFD layout reference the [CIPA Exif specification](https://www.cipa.jp/std/documents/e/CIPA_DC-X008-Translation-2016-E.pdf).
Support tests parse the real GPS rationals, inspect ICC/orientation, and verify the independent rotated
corner/alpha oracle. The noise fixture is checked to exceed 512 KiB for the first candidate and fit
the second; it is not allowed to turn into an error fixture merely because it is high entropy.
