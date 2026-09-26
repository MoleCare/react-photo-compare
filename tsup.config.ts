import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // tsup's type build sets baseUrl itself, which TypeScript 6 deprecates.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  target: 'es2020',
  // The component and hook use state, so React Server Components must treat
  // this module as client code.
  banner: { js: '"use client";' },
});
