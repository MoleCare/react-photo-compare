# Contributing to @molecare/react-photo-compare

Thanks for being here. This package is a small TypeScript React component with
a fast test suite and no run-time dependencies besides React, so it is a good
place for a first contribution.

## The one rule that is not negotiable

**This package shows photos. It never analyses what is in them.**

It lines two photos up and lets people look closely. It is not a medical
device and makes no clinical claim. A change that reads the content of a
photo, or tells people what they are looking at ("this has grown"), will be
declined, however good the code is.

| Fine                                        | Not fine                                  |
| ------------------------------------------- | ----------------------------------------- |
| A slider or overlay mode for the two photos | A "difference" score for the two photos   |
| Better pinch, wheel or keyboard handling    | Anything that reads the pixels of a photo |
| A new label, class name or layout option    | Built-in text that is not a prop          |

If you are unsure which side of the line a change sits on, open an issue and
ask before writing the code.

## Design rules

- **Stateless.** No module-level `let` or `var` (a test checks), no caches, no
  singletons, no `configure()`. State lives in the component or hook that
  uses it, so two comparisons on one page share nothing.
- **React is the only import.** No run-time dependencies (a test checks).
- **Every word is a prop**, with an English default in `DEFAULT_LABELS`.
- **Server-safe.** Nothing touches `window` or `document` while rendering (a
  test renders it in Node).
- **Accessible.** Every control has a name, panels are focusable and work
  from the keyboard, and the photo's `alt` text is required.
- **Unstyled.** Inline styles only for layout that must hold (overflow,
  touch-action, transform). Everything else is left to the `mpc-*` classes.

## Getting set up

```bash
git clone https://github.com/MoleCare/react-photo-compare.git
cd react-photo-compare
npm ci
```

You need Node 20.19 or newer to work on it. Tests run in Jest with jsdom and
real DOM events, so no browser is needed.

| Command                           | What it does                                                         |
| --------------------------------- | -------------------------------------------------------------------- |
| `npm test`                        | Jest tests (TypeScript, via Babel), 100% coverage required           |
| `npm run typecheck`               | `tsc` in strict mode                                                 |
| `npm run lint` / `npm run format` | ESLint (typescript-eslint strict, React hooks) and Prettier          |
| `npm run build`                   | Builds `dist/` with tsup: ES module, CommonJS and types              |
| `npm run check:package`           | Builds, then publint and arethetypeswrong on the packed package      |
| `npm run check:consumer -- pnpm`  | Installs the packed package with that package manager and renders it |

CI runs all of these on every pull request, and the consumer check with npm,
Yarn 1, Yarn 4 (PnP and node_modules), pnpm and Bun, and with React 18.

## Test images

**Never commit, attach or link a real photo of a person**, in code, tests,
issues or pull requests. Tests use tiny `data:` URLs and never need a real
image.

## Pull requests

- One change per pull request, with a test for the behaviour you changed.
- Add a line to the top section of `CHANGELOG.md` for anything a user would notice.
- Keep defaults brand-neutral: no product names, hosts or IDs.

## Releases

Maintainers bump the version in `package.json`, add its `CHANGELOG.md`
section, and publish a GitHub Release tagged `v<version>`. The release workflow
checks the tag and the changelog, runs every check, builds once, and publishes
to npm with provenance through GitHub's OIDC trusted publishing, so no npm
token is stored anywhere.
