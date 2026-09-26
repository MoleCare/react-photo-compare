/**
 * The shared view of both photos: a zoom factor and a pan offset in CSS pixels.
 *
 * Each photo is drawn with `transform-origin: center` and
 * `transform: translate(x, y) scale(zoom)`, so a point `p` measured from the
 * centre of a panel is drawn at `zoom * p + (x, y)`. Everything here is a pure
 * function of its arguments: no state, no DOM.
 */
export interface View {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A point measured from the centre of a panel, in CSS pixels. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ZoomLimits {
  readonly minZoom: number;
  readonly maxZoom: number;
}

export const IDENTITY_VIEW: View = Object.freeze({ zoom: 1, x: 0, y: 0 });

export const DEFAULT_LIMITS: ZoomLimits = Object.freeze({
  minZoom: 1,
  maxZoom: 5,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Checks limits once, so a bad prop fails loudly instead of drawing oddly. */
export function assertLimits(limits: ZoomLimits): ZoomLimits {
  const { minZoom, maxZoom } = limits;
  if (!Number.isFinite(minZoom) || !Number.isFinite(maxZoom)) {
    throw new RangeError('minZoom and maxZoom must be finite numbers');
  }
  if (minZoom < 1) {
    throw new RangeError('minZoom must be 1 or more');
  }
  if (maxZoom < minZoom) {
    throw new RangeError('maxZoom must be at least minZoom');
  }
  return limits;
}

/**
 * Keeps the photo covering its panel: at zoom `z` the photo is `z` times the
 * panel, so it can move at most `(z - 1) / 2` of the panel each way.
 * Normalises -0 to 0 so views compare cleanly.
 */
export function clampPan(view: View, size: Size): View {
  const maxX = (Math.max(view.zoom, 1) - 1) * (size.width / 2);
  const maxY = (Math.max(view.zoom, 1) - 1) * (size.height / 2);
  return {
    zoom: view.zoom,
    x: clamp(view.x, -maxX, maxX) || 0,
    y: clamp(view.y, -maxY, maxY) || 0,
  };
}

/**
 * Sets the zoom, keeping the point under `focus` still (the pointer for wheel
 * and pinch, the centre for buttons and keys).
 */
export function zoomTo(
  view: View,
  zoom: number,
  limits: ZoomLimits,
  size: Size,
  focus: Point = { x: 0, y: 0 }
): View {
  const next = clamp(zoom, limits.minZoom, limits.maxZoom);
  if (!Number.isFinite(next) || next === view.zoom) {
    return clampPan(view, size);
  }
  const ratio = next / view.zoom;
  return clampPan(
    {
      zoom: next,
      x: focus.x - ratio * (focus.x - view.x),
      y: focus.y - ratio * (focus.y - view.y),
    },
    size
  );
}

/** Adds `delta` to the zoom (buttons, keys and the wheel step by a fixed amount). */
export function zoomBy(
  view: View,
  delta: number,
  limits: ZoomLimits,
  size: Size,
  focus?: Point
): View {
  return zoomTo(view, view.zoom + delta, limits, size, focus);
}

/** Moves the photo by a pointer or key movement, within the panel. */
export function panBy(view: View, dx: number, dy: number, size: Size): View {
  return clampPan({ zoom: view.zoom, x: view.x + dx, y: view.y + dy }, size);
}

/** Brings any view inside the limits and the panel (for views set from outside). */
export function normalizeView(view: View, limits: ZoomLimits, size: Size): View {
  const zoom = Number.isFinite(view.zoom)
    ? clamp(view.zoom, limits.minZoom, limits.maxZoom)
    : limits.minZoom;
  const x = Number.isFinite(view.x) ? view.x : 0;
  const y = Number.isFinite(view.y) ? view.y : 0;
  return clampPan({ zoom, x, y }, size);
}

export function sameView(a: View, b: View): boolean {
  return a.zoom === b.zoom && a.x === b.x && a.y === b.y;
}

/** The CSS transform for a view; pair it with `transform-origin: center`. */
export function viewTransform(view: View): string {
  return `translate(${String(view.x)}px, ${String(view.y)}px) scale(${String(view.zoom)})`;
}
