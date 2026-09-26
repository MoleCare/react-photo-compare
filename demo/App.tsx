import { useEffect, useState, type ReactNode } from 'react';
import {
  IDENTITY_VIEW,
  PhotoCompare,
  useSyncedView,
  viewTransform,
  type PhotoCompareLabels,
  type View,
} from '../src';
import { JULY, MARCH, MONTHS, floorPlan, garden } from './scenes';

const REPO = 'https://github.com/MoleCare/react-photo-compare';
const NPM = 'https://www.npmjs.com/package/@molecare/react-photo-compare';

const gardenLeft = {
  src: garden(MARCH),
  alt: 'Garden plan in March: seedlings just coming up',
  label: 'March',
};
const gardenRight = {
  src: garden(JULY),
  alt: 'Garden plan in July: full plants with flowers and fruit',
  label: 'July',
};

function Example(props: {
  id: string;
  title: string;
  intro: ReactNode;
  code: string;
  children: ReactNode;
}) {
  return (
    <section className="example" aria-labelledby={`${props.id}-title`}>
      <h2 id={`${props.id}-title`}>{props.title}</h2>
      <p className="intro">{props.intro}</p>
      <div className="stage">{props.children}</div>
      <details>
        <summary>Show the code</summary>
        <pre>
          <code>{props.code.trim()}</code>
        </pre>
      </details>
    </section>
  );
}

function Basic() {
  return (
    <Example
      id="basic"
      title="Zoom one, the other follows"
      intro={
        <>
          Scroll or pinch over either picture, then drag. Zoom in on a bed label: the small print
          only becomes readable up close. On a keyboard, press Tab to reach a picture, then use{' '}
          <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd> and the arrow keys.
        </>
      }
      code={`
import { PhotoCompare } from '@molecare/react-photo-compare';

<PhotoCompare
  left={{ src: '/march.jpg', alt: 'Garden plan in March', label: 'March' }}
  right={{ src: '/july.jpg', alt: 'Garden plan in July', label: 'July' }}
/>`}
    >
      <PhotoCompare left={gardenLeft} right={gardenRight} aspectRatio="4 / 3" />
    </Example>
  );
}

function DesignReview() {
  return (
    <Example
      id="review"
      title="Review two revisions of a drawing"
      intro="Zoom into the kitchen: the wall has moved and a window has appeared. Up to 8× zoom here, so the dimension text is easy to read."
      code={`
<PhotoCompare
  left={{ src: planA, alt: 'Floor plan, revision A', label: 'Revision A' }}
  right={{ src: planB, alt: 'Floor plan, revision B', label: 'Revision B' }}
  maxZoom={8}
  aspectRatio="4 / 3"
/>`}
    >
      <PhotoCompare
        left={{ src: floorPlan('A'), alt: 'Floor plan, revision A', label: 'Revision A' }}
        right={{ src: floorPlan('B'), alt: 'Floor plan, revision B', label: 'Revision B' }}
        maxZoom={8}
        aspectRatio="4 / 3"
      />
    </Example>
  );
}

function Controlled() {
  const [view, setView] = useState<View>(IDENTITY_VIEW);
  return (
    <Example
      id="controlled"
      title="Keep the view in your own state"
      intro="Controlled mode: the view lives in your state, so you can drive it from your own controls, save it, or share it. The built-in buttons are hidden here."
      code={`
const [view, setView] = useState<View>(IDENTITY_VIEW);

<PhotoCompare left={left} right={right} view={view} onViewChange={setView} hideControls />
<input
  type="range" aria-label="Zoom" min={1} max={5} step={0.05}
  value={view.zoom}
  onChange={(e) => setView({ ...view, zoom: Number(e.target.value) })}
/>`}
    >
      <PhotoCompare
        left={gardenLeft}
        right={gardenRight}
        view={view}
        onViewChange={setView}
        hideControls
        aspectRatio="4 / 3"
      />
      <div className="controls">
        <label>
          Zoom
          <input
            type="range"
            min={1}
            max={5}
            step={0.05}
            value={view.zoom}
            onChange={(event) => {
              setView({ ...view, zoom: Number(event.target.value) });
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setView(IDENTITY_VIEW);
          }}
        >
          Reset
        </button>
        <output aria-label="Current view">
          zoom {view.zoom.toFixed(2)} · x {Math.round(view.x)} · y {Math.round(view.y)}
        </output>
      </div>
    </Example>
  );
}

function ThreeMonths() {
  const synced = useSyncedView({ maxZoom: 6 });
  const transform = viewTransform(synced.view);
  return (
    <Example
      id="hook"
      title="Your own layout, any number of pictures"
      intro="useSyncedView is the shared view without the markup. Here three months share one zoom, in a layout written by hand."
      code={`
const synced = useSyncedView({ maxZoom: 6 });
const transform = viewTransform(synced.view);

{months.map((month) => {
  const panel = synced.getPanelProps(month.name);
  return (
    <div key={month.name} {...panel} role="group" aria-label={month.name}
         style={{ ...panel.style, aspectRatio: '4 / 3' }}>
      <img src={month.src} alt={month.alt} draggable={false}
           style={{ width: '100%', height: '100%', objectFit: 'contain',
                    transformOrigin: 'center', transform, pointerEvents: 'none' }} />
    </div>
  );
})}`}
    >
      <div className="controls">
        <button type="button" onClick={synced.zoomOut} disabled={!synced.canZoomOut}>
          Zoom out
        </button>
        <button type="button" onClick={synced.zoomIn} disabled={!synced.canZoomIn}>
          Zoom in
        </button>
        <button type="button" onClick={synced.reset}>
          Reset
        </button>
      </div>
      <div className="three">
        {MONTHS.map((month) => {
          const panel = synced.getPanelProps(month.name);
          return (
            <div
              key={month.name}
              {...panel}
              role="group"
              aria-label={month.name}
              className="mpc-panel"
              style={{ ...panel.style, aspectRatio: '4 / 3' }}
            >
              <span className="mpc-label">{month.name}</span>
              <img
                src={garden(month)}
                alt={`Garden plan in ${month.name}`}
                draggable={false}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transformOrigin: 'center',
                  transform,
                  pointerEvents: 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </Example>
  );
}

interface Language {
  name: string;
  labels: PhotoCompareLabels;
}

const ENGLISH: Language = {
  name: 'English',
  labels: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset zoom',
    zoomLevel: (p) => `${String(p)}%`,
    panel: (side) => (side === 'left' ? 'Left picture' : 'Right picture'),
  },
};

const LANGUAGES: Record<string, Language> = {
  en: ENGLISH,
  de: {
    name: 'Deutsch',
    labels: {
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      reset: 'Zoom zurücksetzen',
      zoomLevel: (p) => `${String(p)} %`,
      panel: (side) => (side === 'left' ? 'Linkes Bild' : 'Rechtes Bild'),
    },
  },
  es: {
    name: 'Español',
    labels: {
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      reset: 'Restablecer zoom',
      zoomLevel: (p) => `${String(p)} %`,
      panel: (side) => (side === 'left' ? 'Imagen izquierda' : 'Imagen derecha'),
    },
  },
  fr: {
    name: 'Français',
    labels: {
      zoomIn: 'Zoom avant',
      zoomOut: 'Zoom arrière',
      reset: 'Réinitialiser le zoom',
      zoomLevel: (p) => `${String(p)} %`,
      panel: (side) => (side === 'left' ? 'Image de gauche' : 'Image de droite'),
    },
  },
};

function Translated() {
  const [lang, setLang] = useState('de');
  const language = LANGUAGES[lang] ?? ENGLISH;
  return (
    <Example
      id="labels"
      title="Every word is a prop"
      intro="There is no built-in language. Pass your translations; anything you leave out stays English. Hover or focus the buttons to see their names."
      code={`
<PhotoCompare
  left={left}
  right={right}
  labels={{
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    reset: 'Zoom zurücksetzen',
    zoomLevel: (percent) => \`\${percent} %\`,
  }}
/>`}
    >
      <div className="controls">
        <label>
          Language
          <select
            value={lang}
            onChange={(event) => {
              setLang(event.target.value);
            }}
          >
            {Object.entries(LANGUAGES).map(([code, { name }]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div lang={lang}>
        <PhotoCompare
          left={{ ...gardenLeft, label: undefined }}
          right={{ ...gardenRight, label: undefined }}
          labels={language.labels}
          aspectRatio="4 / 3"
        />
      </div>
    </Example>
  );
}

const STYLE_CODE = `
/* The component only sets the layout it needs. */
.mpc-panel { border-radius: 14px; background: var(--panel); }
.mpc-panel:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.mpc-label { padding: 2px 10px; border-radius: 999px;
             background: rgb(0 0 0 / 0.65); color: white; }
.mpc-button { min-width: 44px; min-height: 44px; border-radius: 10px; }`;

type Theme = 'system' | 'light' | 'dark';

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('rpc-demo-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function App() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('rpc-demo-theme', theme);
    } catch {
      // Private windows may block storage; the theme still applies.
    }
  }, [theme]);

  const install = 'npm install @molecare/react-photo-compare';

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="top">
            <span className="brand">react-photo-compare</span>
            <nav aria-label="Project links">
              <a href={REPO}>GitHub</a>
              <a href={NPM}>npm</a>
              <button
                type="button"
                className="theme"
                onClick={() => {
                  setTheme(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system');
                }}
                aria-label={`Colour theme: ${theme}. Change theme`}
              >
                {theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </nav>
          </div>
          <h1>Two photos, one zoom.</h1>
          <p className="lead">
            A React component that shows two pictures side by side with a shared zoom and pan. Zoom
            into one and the other follows, so the same spot stays lined up in both. Mouse, touch,
            pen and keyboard. No dependencies.
          </p>
          <div className="install">
            <code>{install}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(install)
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => {
                      setCopied(false);
                    }, 1500);
                  })
                  .catch(() => {
                    // Clipboard blocked: the command is still there to select.
                  });
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </header>
      <main className="wrap">
        <Basic />
        <DesignReview />
        <Controlled />
        <ThreeMonths />
        <Translated />
        <Example
          id="style"
          title="Unstyled, so it looks like your app"
          intro="Everything on this page is styled with plain CSS on the mpc-* class names, including the dark theme. Switch the theme at the top to see."
          code={STYLE_CODE}
        >
          <PhotoCompare
            left={{ src: floorPlan('A'), alt: 'Floor plan, revision A', label: 'A' }}
            right={{ src: floorPlan('B'), alt: 'Floor plan, revision B', label: 'B' }}
            aspectRatio="16 / 9"
            objectFit="cover"
            maxZoom={8}
          />
        </Example>
      </main>
      <footer className="wrap footer">
        <p>
          Apache-2.0 · made by <a href="https://www.molecare.co.uk">MoleCare</a> ·{' '}
          <a href={REPO}>source and docs</a>
        </p>
        <p className="small">
          The pictures on this page are drawn in code; no real photos are used. Not a medical
          device: this package displays photos and never analyses them.
        </p>
      </footer>
    </>
  );
}
