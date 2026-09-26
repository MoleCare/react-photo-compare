# Changelog

All notable changes to this package are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- A live demo site (`demo/`, published to GitHub Pages from `main`) with six
  examples: basic, drawing review, controlled view, the hook with three
  pictures, translated labels, and styling. Its pictures are drawn in code.
- Issue and pull request templates, CODEOWNERS, Dependabot for dev tools and
  actions, `.editorconfig` and `.nvmrc`.

### Security

- Dev tools only: esbuild pinned to 0.28.1 or newer (GHSA-g7r4-m6w7-qqqr, a
  Windows dev-server file read). The published package was never affected.

## 0.1.0

### Added

- `PhotoCompare`: two photos side by side with one shared zoom and pan. Drag
  with mouse, touch or pen, pinch, scroll around the pointer, or use `+` `-`
  `0` and the arrow keys on a focused panel. Every word is a prop.
- `useSyncedView`: the same shared view for any number of panels in your own
  layout.
- Pure view functions (`zoomTo`, `zoomBy`, `panBy`, `clampPan`,
  `normalizeView`, `sameView`, `viewTransform`) with no DOM.
- Extracted from the MoleCare web app's photo comparison, with four fixes on
  the way: the page no longer scrolls while zooming with the wheel, touch and
  pen work, the photo can no longer be dragged out of view, and the controls
  are named for screen readers and usable from the keyboard.
