#!/usr/bin/env bash
# Install the packed package the way an app would, with one package manager,
# next to React, and check that it loads and renders.
#
#   scripts/check-consumer.sh <npm|yarn1|yarn4-pnp|yarn4-node-modules|pnpm|bun> [path/to/package.tgz]
#
# Every package manager gets: require() from CommonJS and import from an ES
# module, each rendering the component on the server with react-dom/server.
# npm also gets the checks that do not depend on the package manager: the
# "use client" banner React Server Components need, and a strict TypeScript
# project in both node16 and bundler resolution.
set -euo pipefail

PM="${1:?package manager}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$(node -p "require('$ROOT/package.json').name")"
REACT="${REACT:-19.3.0}"

TARBALL="${2:-}"
if [ -z "$TARBALL" ]; then
  TARBALL="$ROOT/$(cd "$ROOT" && npm pack --silent | tail -n 1)"
fi
TARBALL="$(cd "$(dirname "$TARBALL")" && pwd)/$(basename "$TARBALL")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

YARN4=yarn@4.9.4
PNPM=pnpm@10.18.2
BUN=bun@1.2.23

write_package_json() {
  node -e '
    const [name, tarball, react, pm] = process.argv.slice(1);
    const pkg = {
      name: "consumer", version: "1.0.0", private: true, type: "commonjs",
      dependencies: {[name]: "file:" + tarball, react, "react-dom": react},
    };
    if (pm) pkg.packageManager = pm;
    require("fs").writeFileSync("package.json", JSON.stringify(pkg, null, 2));
  ' "$NAME" "$TARBALL" "$REACT" "${1:-}"
}

RUN=(node)
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
case "$PM" in
  npm)
    write_package_json
    npm install --no-audit --no-fund --silent
    ;;
  yarn1)
    write_package_json
    npx --yes yarn@1.22.22 install --non-interactive --silent
    ;;
  yarn4-pnp | yarn4-node-modules)
    write_package_json "$YARN4"
    printf 'nodeLinker: %s\nenableGlobalCache: false\n' "${PM#yarn4-}" > .yarnrc.yml
    YARN_ENABLE_IMMUTABLE_INSTALLS=false corepack yarn install
    [ "$PM" = yarn4-pnp ] && RUN=(corepack yarn node)
    ;;
  pnpm)
    write_package_json
    npx --yes "$PNPM" install
    ;;
  bun)
    write_package_json
    npx --yes "$BUN" install
    ;;
  *)
    echo "unknown package manager: $PM" >&2
    exit 2
    ;;
esac

echo "--- $PM: require() from CommonJS, server render"
cat > use.cjs <<JS
const { createElement } = require('react');
const { renderToString } = require('react-dom/server');
const lib = require('$NAME');
const html = renderToString(createElement(lib.PhotoCompare, {
  left: { src: '/a.jpg', alt: 'First photo' },
  right: { alt: 'Second photo', placeholder: 'Choose a photo' },
}));
if (!html.includes('alt="First photo"') || !html.includes('Choose a photo')) throw new Error('wrong html ' + html);
const view = lib.zoomTo(lib.IDENTITY_VIEW, 2, lib.DEFAULT_LIMITS, { width: 200, height: 100 }, { x: 50, y: 0 });
if (view.x !== -50) throw new Error('wrong view ' + JSON.stringify(view));
console.log('ok');
JS
"${RUN[@]}" use.cjs

echo "--- $PM: import from an ES module, server render"
cat > use.mjs <<JS
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { PhotoCompare, DEFAULT_LABELS } from '$NAME';
const html = renderToString(createElement(PhotoCompare, {
  left: { src: '/a.jpg', alt: 'First photo', label: 'March' },
  right: { src: '/b.jpg', alt: 'Second photo', label: 'June' },
  labels: { zoomIn: 'Vergrößern' },
}));
if (!html.includes('Vergrößern') || !html.includes(DEFAULT_LABELS.zoomOut)) throw new Error('wrong html ' + html);
console.log('ok');
JS
"${RUN[@]}" use.mjs

if [ "$PM" != npm ]; then
  exit 0
fi

echo "--- React Server Components: both builds start with \"use client\""
for file in node_modules/$NAME/dist/index.js node_modules/$NAME/dist/index.cjs; do
  head -n 1 "$file" | grep -qx '"use client";' || { echo "$file does not start with \"use client\"" >&2; exit 1; }
done
echo ok

npm install --no-audit --no-fund --silent typescript@~6.0.3 "@types/react@${REACT%%.*}" "@types/react-dom@${REACT%%.*}"

for resolution in node16 bundler; do
  echo "--- TypeScript, strict, moduleResolution $resolution"
  module=$([ "$resolution" = node16 ] && echo node16 || echo esnext)
  cat > tsconfig.json <<JSON
{"compilerOptions": {"strict": true, "noEmit": true, "jsx": "react-jsx", "module": "$module", "moduleResolution": "$resolution", "types": [], "skipLibCheck": false}, "include": ["*.tsx", "*.cts"]}
JSON
  cat > use-types.tsx <<TSX
import { PhotoCompare, useSyncedView, type View, type PhotoCompareProps } from '$NAME';
const props: PhotoCompareProps = { left: { alt: 'a' }, right: { alt: 'b' }, maxZoom: 8 };
export const App = () => <PhotoCompare {...props} onViewChange={(view: View) => view.zoom} />;
export function Custom() {
  const synced = useSyncedView({ step: 0.5 });
  return <div {...synced.getPanelProps('only')} />;
}
// @ts-expect-error alt text is required
export const Missing = () => <PhotoCompare left={{ src: '/a.jpg' }} right={{ alt: 'b' }} />;
TSX
  if [ "$resolution" = node16 ]; then
    cat > use-types.cts <<CTS
import lib = require('$NAME');
const view: lib.View = lib.IDENTITY_VIEW;
export = view;
CTS
  else
    rm -f use-types.cts
  fi
  npx tsc -p tsconfig.json
  echo ok
done
