// Playwright global setup: bundles each recipe's fixture.jsx into fixture.build.js (gitignored),
// so a test page can load a React fixture from a plain <script> on a file:// URL.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export default async function buildFixtures() {
  const assets = fileURLToPath(new URL('../recipes/assets/', import.meta.url));
  const entries = readdirSync(assets)
    .map((name) => join(assets, name, 'fixture.jsx'))
    .filter((path) => existsSync(path));
  await Promise.all(
    entries.map((entry) =>
      build({
        entryPoints: [entry],
        outfile: entry.replace(/\.jsx$/, '.build.js'),
        bundle: true,
        format: 'iife',
        jsx: 'automatic',
        define: { 'process.env.NODE_ENV': '"production"' },
        logLevel: 'warning',
      }),
    ),
  );
}
