import {
  DEFAULT_LIMITS,
  IDENTITY_VIEW,
  assertLimits,
  clampPan,
  normalizeView,
  panBy,
  sameView,
  viewTransform,
  zoomBy,
  zoomTo,
} from '../src/view';

const size = { width: 200, height: 100 };

describe('clampPan', () => {
  it('keeps the photo covering the panel', () => {
    // At zoom 2 the photo is 400 x 200, so it can move 100 x 50 each way.
    expect(clampPan({ zoom: 2, x: 500, y: -500 }, size)).toEqual({ zoom: 2, x: 100, y: -50 });
    expect(clampPan({ zoom: 2, x: -20, y: 10 }, size)).toEqual({ zoom: 2, x: -20, y: 10 });
  });

  it('allows no pan at zoom 1 and gives 0, never -0', () => {
    const view = clampPan({ zoom: 1, x: -30, y: -1 }, size);
    expect(view).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(Object.is(view.x, 0)).toBe(true);
    expect(Object.is(view.y, 0)).toBe(true);
  });

  it('treats a zoom below 1 as no room to pan', () => {
    expect(clampPan({ zoom: 0.5, x: 10, y: 10 }, size)).toEqual({ zoom: 0.5, x: 0, y: 0 });
  });
});

describe('zoomTo and zoomBy', () => {
  it('zooms around the centre by default', () => {
    expect(zoomTo(IDENTITY_VIEW, 2, DEFAULT_LIMITS, size)).toEqual({ zoom: 2, x: 0, y: 0 });
  });

  it('keeps the point under the pointer still', () => {
    const focus = { x: 50, y: 20 };
    const view = zoomTo(IDENTITY_VIEW, 2, DEFAULT_LIMITS, size, focus);
    // The photo point under the pointer was (50, 20); at zoom 2 it is drawn
    // at 2 * (50, 20) + (x, y), which must still be (50, 20).
    expect(2 * 50 + view.x).toBe(50);
    expect(2 * 20 + view.y).toBe(20);
  });

  it('stays within the limits', () => {
    expect(zoomBy(IDENTITY_VIEW, -1, DEFAULT_LIMITS, size).zoom).toBe(1);
    expect(zoomBy({ zoom: 4.9, x: 0, y: 0 }, 1, DEFAULT_LIMITS, size).zoom).toBe(5);
  });

  it('returns the same view, re-clamped, when the zoom does not change', () => {
    expect(zoomTo({ zoom: 2, x: 999, y: 0 }, 2, DEFAULT_LIMITS, size)).toEqual({
      zoom: 2,
      x: 100,
      y: 0,
    });
    expect(zoomTo({ zoom: 2, x: 0, y: 0 }, Number.NaN, DEFAULT_LIMITS, size)).toEqual({
      zoom: 2,
      x: 0,
      y: 0,
    });
  });

  it('pulls the pan back in when zooming out', () => {
    expect(zoomTo({ zoom: 3, x: 200, y: 100 }, 1, DEFAULT_LIMITS, size)).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
  });
});

describe('panBy', () => {
  it('moves within the panel', () => {
    expect(panBy({ zoom: 2, x: 0, y: 0 }, 30, -10, size)).toEqual({ zoom: 2, x: 30, y: -10 });
    expect(panBy({ zoom: 2, x: 90, y: 0 }, 30, 0, size)).toEqual({ zoom: 2, x: 100, y: 0 });
  });
});

describe('normalizeView', () => {
  it('brings an outside view inside the limits and the panel', () => {
    expect(normalizeView({ zoom: 9, x: 1e6, y: 0 }, DEFAULT_LIMITS, size)).toEqual({
      zoom: 5,
      x: 400,
      y: 0,
    });
  });

  it('replaces numbers that are not finite', () => {
    expect(
      normalizeView({ zoom: Number.NaN, x: Infinity, y: Number.NaN }, DEFAULT_LIMITS, size)
    ).toEqual({ zoom: 1, x: 0, y: 0 });
  });
});

describe('assertLimits', () => {
  it('accepts sensible limits', () => {
    expect(assertLimits({ minZoom: 1, maxZoom: 1 })).toEqual({ minZoom: 1, maxZoom: 1 });
  });

  it.each([
    [{ minZoom: Number.NaN, maxZoom: 5 }, /finite/],
    [{ minZoom: 1, maxZoom: Infinity }, /finite/],
    [{ minZoom: 0.5, maxZoom: 5 }, /minZoom must be 1/],
    [{ minZoom: 3, maxZoom: 2 }, /maxZoom must be at least/],
  ])('rejects %j', (limits, message) => {
    expect(() => assertLimits(limits)).toThrow(message);
  });
});

describe('sameView and viewTransform', () => {
  it('compares every field', () => {
    expect(sameView(IDENTITY_VIEW, { zoom: 1, x: 0, y: 0 })).toBe(true);
    expect(sameView(IDENTITY_VIEW, { zoom: 1, x: 1, y: 0 })).toBe(false);
    expect(sameView(IDENTITY_VIEW, { zoom: 1, x: 0, y: 1 })).toBe(false);
    expect(sameView(IDENTITY_VIEW, { zoom: 2, x: 0, y: 0 })).toBe(false);
  });

  it('writes translate then scale', () => {
    expect(viewTransform({ zoom: 1.5, x: -10, y: 4 })).toBe('translate(-10px, 4px) scale(1.5)');
  });

  it('freezes its defaults', () => {
    expect(Object.isFrozen(IDENTITY_VIEW)).toBe(true);
    expect(Object.isFrozen(DEFAULT_LIMITS)).toBe(true);
  });
});
