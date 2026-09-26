import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// All state lives in the component or hook that uses it, so two comparisons on
// one page never share anything. Module-level `let` or `var` would break that.
const srcDir = join(__dirname, '..', 'src');
const sources = readdirSync(srcDir)
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => [file, readFileSync(join(srcDir, file), 'utf8')] as const);

it.each(sources)('%s keeps no module-level state', (_file, source) => {
  expect(source).not.toMatch(/^(let|var)\s/m);
  expect(source).not.toMatch(/^(export\s+)?(let|var)\s/m);
});

it.each(sources)('%s imports nothing but React', (_file, source) => {
  const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  imports.forEach((name) => {
    expect(name === 'react' || name?.startsWith('./')).toBe(true);
  });
});
