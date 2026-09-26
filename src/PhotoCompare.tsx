import type { CSSProperties, ReactNode } from 'react';
import { useSyncedView, type SyncedViewOptions } from './useSyncedView';
import { viewTransform } from './view';

export interface ComparePhoto {
  /** Image URL (http, blob: or data:). Leave empty to show `placeholder`. */
  src?: string | null;
  /** Describes the photo for screen readers. Required: say what differs, e.g. the date. */
  alt: string;
  /** Shown over the panel, e.g. a date. Also names the panel for screen readers when it is a string. */
  label?: ReactNode;
  /** Shown when there is no `src`, e.g. "Choose a photo". */
  placeholder?: ReactNode;
}

export interface PhotoCompareLabels {
  zoomIn: string;
  zoomOut: string;
  reset: string;
  /** Text for the zoom level, from a whole percentage. */
  zoomLevel: (percent: number) => string;
  /** Names a panel for screen readers when its `label` is not a string. */
  panel: (side: 'left' | 'right') => string;
}

export const DEFAULT_LABELS: PhotoCompareLabels = Object.freeze({
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset zoom',
  zoomLevel: (percent: number) => `${String(percent)}%`,
  panel: (side: 'left' | 'right') => (side === 'left' ? 'Left photo' : 'Right photo'),
});

export interface PhotoCompareProps extends SyncedViewOptions {
  left: ComparePhoto;
  right: ComparePhoto;
  /** Words for the controls; pass your translations. Missing keys use English. */
  labels?: Partial<PhotoCompareLabels>;
  /** Hide the zoom buttons (wheel, pinch, drag and keys still work). */
  hideControls?: boolean;
  /** Width to height of each panel, as CSS `aspect-ratio`. Default `'1 / 1'`. */
  aspectRatio?: string;
  /** How each photo fits its panel. Default `'contain'`. */
  objectFit?: CSSProperties['objectFit'];
  className?: string;
  style?: CSSProperties;
}

const ROOT_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const TOOLBAR_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem' };
const PANELS_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: '0.5rem',
};
const LABEL_STYLE: CSSProperties = {
  position: 'absolute',
  top: '0.5rem',
  left: '0.5rem',
  zIndex: 1,
  pointerEvents: 'none',
};
const PLACEHOLDER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
};

/**
 * Two photos side by side with one zoom and pan: zoom into one and the other
 * follows, so the same spot stays lined up in both. Unstyled apart from layout;
 * style it through the `mpc-*` class names.
 */
export function PhotoCompare(props: PhotoCompareProps) {
  const {
    left,
    right,
    labels: labelOverrides,
    hideControls = false,
    aspectRatio = '1 / 1',
    objectFit = 'contain',
    className,
    style,
    ...viewOptions
  } = props;
  const labels: PhotoCompareLabels = { ...DEFAULT_LABELS, ...labelOverrides };
  const synced = useSyncedView(viewOptions);
  const transform = viewTransform(synced.view);

  const panel = (side: 'left' | 'right', photo: ComparePhoto) => {
    const panelProps = synced.getPanelProps(side);
    return (
      <div
        {...panelProps}
        role="group"
        aria-label={typeof photo.label === 'string' ? photo.label : labels.panel(side)}
        className="mpc-panel"
        style={{ ...panelProps.style, aspectRatio }}
      >
        {photo.label != null && (
          <div className="mpc-label" style={LABEL_STYLE}>
            {photo.label}
          </div>
        )}
        {photo.src ? (
          <img
            className="mpc-image"
            src={photo.src}
            alt={photo.alt}
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit,
              transformOrigin: 'center',
              transform,
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div className="mpc-placeholder" style={PLACEHOLDER_STYLE}>
            {photo.placeholder}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className ? `mpc ${className}` : 'mpc'} style={{ ...ROOT_STYLE, ...style }}>
      {!hideControls && (
        <div className="mpc-toolbar" style={TOOLBAR_STYLE}>
          <button
            type="button"
            className="mpc-button mpc-zoom-out"
            onClick={synced.zoomOut}
            disabled={!synced.canZoomOut}
            aria-label={labels.zoomOut}
            title={labels.zoomOut}
          >
            −
          </button>
          <span className="mpc-zoom-level" aria-live="polite">
            {labels.zoomLevel(Math.round(synced.view.zoom * 100))}
          </span>
          <button
            type="button"
            className="mpc-button mpc-zoom-in"
            onClick={synced.zoomIn}
            disabled={!synced.canZoomIn}
            aria-label={labels.zoomIn}
            title={labels.zoomIn}
          >
            +
          </button>
          <button
            type="button"
            className="mpc-button mpc-reset"
            onClick={synced.reset}
            disabled={!synced.canZoomOut && synced.view.x === 0 && synced.view.y === 0}
            aria-label={labels.reset}
            title={labels.reset}
          >
            ↺
          </button>
        </div>
      )}
      <div className="mpc-panels" style={PANELS_STYLE}>
        {panel('left', left)}
        {panel('right', right)}
      </div>
    </div>
  );
}
