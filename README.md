# @molecare/react-photo-compare

[![CI](https://github.com/MoleCare/react-photo-compare/actions/workflows/ci.yml/badge.svg)](https://github.com/MoleCare/react-photo-compare/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@molecare/react-photo-compare)](https://www.npmjs.com/package/@molecare/react-photo-compare)
[![bundle size](https://img.shields.io/bundlejs/size/@molecare/react-photo-compare)](https://bundlejs.com/?q=@molecare/react-photo-compare)
![types included](https://img.shields.io/npm/types/@molecare/react-photo-compare)
[![licence](https://img.shields.io/badge/licence-Apache--2.0-blue)](LICENSE)

Two photos side by side with one shared zoom and pan, for React. Zoom into one
photo, or drag it, and the other follows, so the same spot stays lined up in
both.

**[Try the live demo](https://molecare.github.io/react-photo-compare/)**: drag, pinch,
scroll or use the keyboard on the examples.

Good for before-and-after photos, progress photos, design or product review,
and comparing scans or maps.

- **Every input:** drag with a mouse, finger or pen; pinch; scroll or use the
  trackpad to zoom around the pointer; or use the keyboard.
- **Polite to the page:** the wheel only stops the page scrolling when it
  actually changes the zoom, so scrolling past a photo at its limit still
  scrolls the page.
- **Can't get lost:** the photo can never be dragged out of view.
- **Accessible:** panels are focusable and named, buttons are labelled, and the
  zoom level is announced.
- **Yours to style and translate:** unstyled apart from layout, and every word
  is a prop.
- **Small and safe:** no dependencies besides React, no global state, renders
  on the server, and is marked `"use client"` for the Next.js App Router.

Made by [MoleCare](https://www.molecare.co.uk), where people use it to look at
two photos of the same patch of skin taken months apart.

## Install

```bash
npm install @molecare/react-photo-compare
yarn add @molecare/react-photo-compare
pnpm add @molecare/react-photo-compare
bun add @molecare/react-photo-compare
```

React 18 or newer.

## Quick start

```tsx
import { PhotoCompare } from '@molecare/react-photo-compare';

export function BeforeAfter() {
  return (
    <PhotoCompare
      left={{ src: '/march.jpg', alt: 'Garden in March', label: 'March' }}
      right={{ src: '/june.jpg', alt: 'Garden in June', label: 'June' }}
    />
  );
}
```

### Keyboard

On a focused photo:

| Key        | Does                                 |
| ---------- | ------------------------------------ |
| `+` or `=` | Zoom in                              |
| `-`        | Zoom out                             |
| `0`        | Back to the whole photo              |
| Arrow keys | Move the view that way (when zoomed) |

Keys that would change nothing, such as an arrow at zoom 1, are left to the
page, so the page still scrolls.

## Props

| Prop             | Type                          | Default                   | What it does                                             |
| ---------------- | ----------------------------- | ------------------------- | -------------------------------------------------------- |
| `left`, `right`  | `ComparePhoto`                | required                  | The two photos                                           |
| `minZoom`        | `number`                      | `1`                       | Smallest zoom; 1 means the whole photo fits              |
| `maxZoom`        | `number`                      | `5`                       | Largest zoom                                             |
| `step`           | `number`                      | `0.25`                    | Zoom change for the buttons and the `+` `-` keys         |
| `wheelStep`      | `number`                      | `0.15`                    | Zoom change for one wheel notch                          |
| `keyPanFraction` | `number`                      | `0.1`                     | Share of the panel one arrow key press moves             |
| `view`           | `View`                        | —                         | Controlled view; pass it with `onViewChange`             |
| `defaultView`    | `View`                        | `{ zoom: 1, x: 0, y: 0 }` | Starting view when not controlled                        |
| `onViewChange`   | `(view: View) => void`        | —                         | Called with every new view                               |
| `labels`         | `Partial<PhotoCompareLabels>` | English                   | Words for the controls                                   |
| `hideControls`   | `boolean`                     | `false`                   | Hide the buttons; drag, pinch, wheel and keys still work |
| `aspectRatio`    | `string`                      | `'1 / 1'`                 | CSS `aspect-ratio` of each panel                         |
| `objectFit`      | `CSSProperties['objectFit']`  | `'contain'`               | How each photo fits its panel                            |
| `className`      | `string`                      | —                         | Added to the root, after `mpc`                           |
| `style`          | `CSSProperties`               | —                         | Merged into the root's style                             |

```ts
interface ComparePhoto {
  src?: string | null; // http, blob: or data: URL; leave empty to show `placeholder`
  alt: string; // required: say what differs, such as the date
  label?: ReactNode; // shown over the panel; names the panel when it is a string
  placeholder?: ReactNode; // shown when there is no `src`
}

interface View {
  zoom: number;
  x: number; // pan offset in CSS pixels
  y: number;
}
```

Limits that make no sense (`minZoom` below 1, `maxZoom` below `minZoom`, or not
a finite number) throw a `RangeError`, so a typo fails loudly.

## A controlled view

Keep the view in your own state to save it, share it, or drive it from your own
controls:

```tsx
import { useState } from 'react';
import { PhotoCompare, IDENTITY_VIEW, type View } from '@molecare/react-photo-compare';

export function ComparedWithSlider() {
  const [view, setView] = useState<View>(IDENTITY_VIEW);
  return (
    <>
      <PhotoCompare
        left={{ src: '/march.jpg', alt: 'March' }}
        right={{ src: '/june.jpg', alt: 'June' }}
        view={view}
        onViewChange={setView}
        hideControls
      />
      <input
        type="range"
        aria-label="Zoom"
        min={1}
        max={5}
        step={0.1}
        value={view.zoom}
        onChange={(event) => {
          setView({ ...view, zoom: Number(event.target.value) });
        }}
      />
    </>
  );
}
```

A view you set from outside is drawn as given. Views made by the component
itself always stay inside the limits and keep the photo in its panel; use
`normalizeView` if you want the same for yours.

## Translating the labels

Pass your own words; anything you leave out stays English.

```tsx
<PhotoCompare
  left={left}
  right={right}
  labels={{
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    reset: 'Zoom zurücksetzen',
    zoomLevel: (percent) => `${percent} %`,
    panel: (side) => (side === 'left' ? 'Linkes Foto' : 'Rechtes Foto'),
  }}
/>
```

The English defaults are exported as `DEFAULT_LABELS`. `panel` is only used
when a photo's `label` is not a string.

## Your own layout, any number of photos

`useSyncedView` is the same shared view without the markup. Spread
`getPanelProps(key)` onto each panel, with a different key for each, and draw
each photo with `viewTransform`:

```tsx
import { useSyncedView, viewTransform } from '@molecare/react-photo-compare';

const photoStyle = (transform: string) => ({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'contain' as const,
  transformOrigin: 'center',
  transform,
  pointerEvents: 'none' as const,
});

export function ThreeMonths({ photos }: { photos: { src: string; alt: string }[] }) {
  const synced = useSyncedView({ maxZoom: 8 });
  const transform = viewTransform(synced.view);
  return (
    <div>
      <button type="button" onClick={synced.zoomIn} disabled={!synced.canZoomIn}>
        Zoom in
      </button>
      <button type="button" onClick={synced.zoomOut} disabled={!synced.canZoomOut}>
        Zoom out
      </button>
      <button type="button" onClick={synced.reset}>
        Reset
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {photos.map((photo) => (
          <div
            key={photo.src}
            {...synced.getPanelProps(photo.src)}
            role="group"
            aria-label={photo.alt}
            style={{ ...synced.getPanelProps(photo.src).style, aspectRatio: '1 / 1' }}
          >
            <img src={photo.src} alt={photo.alt} draggable={false} style={photoStyle(transform)} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

`getPanelProps` gives each panel a `ref`, `tabIndex={0}`, the pointer and key
handlers, and the few styles the gestures need (`overflow: hidden`,
`touch-action: none`, `position: relative`, `user-select: none`). Keep that
style when you add your own, as above. The hook also returns `view`,
`canZoomIn`, `canZoomOut` and `setView`.

## Pure functions

The maths is exported too. Each function takes a view and returns a new one;
none of them touches the DOM.

| Function                                    | Returns                                                |
| ------------------------------------------- | ------------------------------------------------------ |
| `zoomTo(view, zoom, limits, size, focus?)`  | The view at `zoom`, keeping the point at `focus` still |
| `zoomBy(view, delta, limits, size, focus?)` | The same, with `zoom = view.zoom + delta`              |
| `panBy(view, dx, dy, size)`                 | The view moved by `dx`, `dy`, kept inside the panel    |
| `clampPan(view, size)`                      | The view moved back inside the panel                   |
| `normalizeView(view, limits, size)`         | Any view brought inside the limits and the panel       |
| `sameView(a, b)`                            | `true` when zoom, `x` and `y` are equal                |
| `viewTransform(view)`                       | The CSS transform: `translate(xpx, ypx) scale(zoom)`   |

`size` is the panel's `{ width, height }` in CSS pixels. `focus` is a point
measured from the panel's centre, and defaults to the centre. `limits` is
`{ minZoom, maxZoom }`; the defaults are `DEFAULT_LIMITS`, and the whole photo
is `IDENTITY_VIEW`.

## Styling

The component sets only the layout it needs. Style everything else through
these classes:

| Class                                      | Element                           |
| ------------------------------------------ | --------------------------------- |
| `mpc`                                      | The root                          |
| `mpc-toolbar`                              | The row of controls               |
| `mpc-button`                               | Each button                       |
| `mpc-zoom-in`, `mpc-zoom-out`, `mpc-reset` | One button each                   |
| `mpc-zoom-level`                           | The zoom percentage               |
| `mpc-panels`                               | The two-column grid               |
| `mpc-panel`                                | Each photo's frame                |
| `mpc-label`                                | The label over a photo            |
| `mpc-image`                                | The `<img>`                       |
| `mpc-placeholder`                          | What shows when there is no photo |

For example, a visible focus ring and rounded frames:

```css
.mpc-panel {
  border-radius: 12px;
  background: #f4f4f5;
}
.mpc-panel:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
.mpc-label {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgb(0 0 0 / 0.6);
  color: white;
}
```

## Works with

- React 18 and 19, in the browser and in server rendering
- Next.js App Router (the build starts with `"use client"`), Remix, Vite and
  any other bundler
- ES modules and CommonJS, with TypeScript types for both
- npm, Yarn 1, Yarn 4 (Plug'n'Play and `node_modules`), pnpm and Bun; CI
  installs the packed package with each one

Browsers need Pointer Events and CSS `aspect-ratio`, which every current
browser has.

## Contributing

Issues and pull requests are welcome. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) first, and report security problems
privately as described in [SECURITY.md](SECURITY.md).

> **Not a medical device.** This package displays photos; it never analyses
> them. It makes no clinical claim.

## Licence

[Apache-2.0](LICENSE) © MoleCare LTD
