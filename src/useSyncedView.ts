import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  DEFAULT_LIMITS,
  IDENTITY_VIEW,
  assertLimits,
  normalizeView,
  panBy,
  sameView,
  zoomBy,
  zoomTo,
  type Point,
  type Size,
  type View,
} from './view';

export interface SyncedViewOptions {
  /** Smallest zoom. 1 (the photo fits the panel) or more. Default 1. */
  minZoom?: number;
  /** Largest zoom. Default 5. */
  maxZoom?: number;
  /** Zoom added or removed by `zoomIn`, `zoomOut` and the + and - keys. Default 0.25. */
  step?: number;
  /** Zoom added or removed by one wheel notch. Default 0.15. */
  wheelStep?: number;
  /** Share of the panel moved by one arrow key press. Default 0.1. */
  keyPanFraction?: number;
  /** Controlled view. Pass it with `onViewChange`, or leave both out. */
  view?: View;
  /** Starting view when uncontrolled. Default `{ zoom: 1, x: 0, y: 0 }`. */
  defaultView?: View;
  /** Called with every new view, controlled or not. */
  onViewChange?: (view: View) => void;
}

export interface PanelProps {
  ref: (element: HTMLElement | null) => void;
  tabIndex: 0;
  style: CSSProperties;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface SyncedView {
  view: View;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  setView: (view: View) => void;
  /** Spread onto every panel that should share the view. `key` names the panel. */
  getPanelProps: (key: string) => PanelProps;
}

const PANEL_STYLE: CSSProperties = Object.freeze({
  position: 'relative',
  overflow: 'hidden',
  touchAction: 'none',
  userSelect: 'none',
});

const NO_SIZE: Size = Object.freeze({ width: 0, height: 0 });

const sizeOf = (element: Element | null | undefined): Size => {
  if (!element) return NO_SIZE;
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
};

const pointIn = (element: Element, clientX: number, clientY: number): Point => {
  const rect = element.getBoundingClientRect();
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
};

interface Pinch {
  distance: number;
  mid: Point;
}

const pinchOf = (points: Point[]): Pinch | null => {
  const [a, b] = points;
  if (!a || !b) return null;
  return {
    distance: Math.hypot(a.x - b.x, a.y - b.y),
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
};

/**
 * One zoom and pan shared by any number of panels. Drag to pan, pinch or
 * scroll to zoom around the pointer, or use + - 0 and the arrow keys on a
 * focused panel. The wheel only stops the page scrolling when it changes the
 * view, so scrolling past a panel at its limit still scrolls the page.
 */
export function useSyncedView(options: SyncedViewOptions = {}): SyncedView {
  const {
    minZoom = DEFAULT_LIMITS.minZoom,
    maxZoom = DEFAULT_LIMITS.maxZoom,
    step = 0.25,
    wheelStep = 0.15,
    keyPanFraction = 0.1,
    view: controlled,
    defaultView = IDENTITY_VIEW,
    onViewChange,
  } = options;
  const limits = assertLimits({ minZoom, maxZoom });

  const [uncontrolled, setUncontrolled] = useState<View>(defaultView);
  const view = controlled ?? uncontrolled;

  // Handlers read the latest values through refs, so a fast drag never works
  // from a stale view and the panel callbacks can stay stable.
  const latest = useRef({
    view,
    limits,
    step,
    wheelStep,
    keyPanFraction,
    onViewChange,
    controlled,
  });
  useEffect(() => {
    latest.current = { view, limits, step, wheelStep, keyPanFraction, onViewChange, controlled };
  });

  const panels = useRef(new Map<string, HTMLElement>());
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | null>(null);

  const commit = useCallback((next: View) => {
    const current = latest.current;
    if (sameView(next, current.view)) return false;
    current.view = next;
    if (current.controlled === undefined) setUncontrolled(next);
    current.onViewChange?.(next);
    return true;
  }, []);

  const firstPanelSize = () => sizeOf(panels.current.values().next().value);

  const zoomIn = useCallback(() => {
    const { view: v, limits: l, step: s } = latest.current;
    commit(zoomBy(v, s, l, firstPanelSize()));
  }, [commit]);

  const zoomOut = useCallback(() => {
    const { view: v, limits: l, step: s } = latest.current;
    commit(zoomBy(v, -s, l, firstPanelSize()));
  }, [commit]);

  const reset = useCallback(() => {
    commit(normalizeView(IDENTITY_VIEW, latest.current.limits, firstPanelSize()));
  }, [commit]);

  const setView = useCallback(
    (next: View) => {
      commit(normalizeView(next, latest.current.limits, firstPanelSize()));
    },
    [commit]
  );

  const onWheel = useCallback(
    (event: WheelEvent) => {
      const element = event.currentTarget as HTMLElement;
      const { view: v, limits: l, wheelStep: s } = latest.current;
      const delta = event.deltaY < 0 ? s : event.deltaY > 0 ? -s : 0;
      if (delta === 0) return;
      const changed = commit(
        zoomBy(v, delta, l, sizeOf(element), pointIn(element, event.clientX, event.clientY))
      );
      if (changed) event.preventDefault();
    },
    [commit]
  );

  const refs = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const refFor = (key: string) => {
    let ref = refs.current.get(key);
    if (!ref) {
      ref = (element: HTMLElement | null) => {
        const previous = panels.current.get(key);
        if (previous) {
          previous.removeEventListener('wheel', onWheel);
          panels.current.delete(key);
        }
        if (element) {
          // React's onWheel is passive, so preventDefault would be ignored and
          // the page would scroll while zooming. A native listener is not.
          element.addEventListener('wheel', onWheel, { passive: false });
          panels.current.set(key, element);
        }
      };
      refs.current.set(key, ref);
    }
    return ref;
  };

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    if ('setPointerCapture' in element) element.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, pointIn(element, event.clientX, event.clientY));
    pinch.current = pinchOf([...pointers.current.values()]);
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const before = pointers.current.get(event.pointerId);
      if (!before) return;
      const element = event.currentTarget;
      const size = sizeOf(element);
      const now = pointIn(element, event.clientX, event.clientY);
      pointers.current.set(event.pointerId, now);
      const { view: v, limits: l } = latest.current;

      const previousPinch = pinch.current;
      const nextPinch = pinchOf([...pointers.current.values()]);
      if (previousPinch && nextPinch) {
        pinch.current = nextPinch;
        const scale = previousPinch.distance > 0 ? nextPinch.distance / previousPinch.distance : 1;
        const zoomed = zoomTo(v, v.zoom * scale, l, size, previousPinch.mid);
        commit(
          panBy(
            zoomed,
            nextPinch.mid.x - previousPinch.mid.x,
            nextPinch.mid.y - previousPinch.mid.y,
            size
          )
        );
        return;
      }
      commit(panBy(v, now.x - before.x, now.y - before.y, size));
    },
    [commit]
  );

  const onPointerEnd = useCallback((event: PointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    if ('releasePointerCapture' in element) element.releasePointerCapture(event.pointerId);
    pointers.current.delete(event.pointerId);
    pinch.current = pinchOf([...pointers.current.values()]);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const size = sizeOf(event.currentTarget);
      const { view: v, limits: l, step: s, keyPanFraction: f } = latest.current;
      let next: View;
      switch (event.key) {
        case '+':
        case '=':
          next = zoomBy(v, s, l, size);
          break;
        case '-':
        case '_':
          next = zoomBy(v, -s, l, size);
          break;
        case '0':
          next = normalizeView(IDENTITY_VIEW, l, size);
          break;
        // Arrows move the view the way the key points, so the photo moves
        // the other way.
        case 'ArrowLeft':
          next = panBy(v, size.width * f, 0, size);
          break;
        case 'ArrowRight':
          next = panBy(v, -size.width * f, 0, size);
          break;
        case 'ArrowUp':
          next = panBy(v, 0, size.height * f, size);
          break;
        case 'ArrowDown':
          next = panBy(v, 0, -size.height * f, size);
          break;
        default:
          return;
      }
      if (commit(next)) event.preventDefault();
    },
    [commit]
  );

  const getPanelProps = (key: string): PanelProps => ({
    ref: refFor(key),
    tabIndex: 0,
    style: PANEL_STYLE,
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onKeyDown,
  });

  return {
    view,
    canZoomIn: view.zoom < limits.maxZoom,
    canZoomOut: view.zoom > limits.minZoom,
    zoomIn,
    zoomOut,
    reset,
    setView,
    getPanelProps,
  };
}
