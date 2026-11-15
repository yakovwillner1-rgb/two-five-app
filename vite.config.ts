import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Every file under dir, as forward-slash paths relative to dir. */
function walk(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, base) : [relative(base, p).split('\\').join('/')];
  });
}

/**
 * Writes dist/sw.js from src/sw.js after the build. The build hash covers the name and content of
 * every built file, so any change gives a new cache name and a byte-different sw.js (which is what
 * makes browsers install the new worker).
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'twofive-service-worker',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    closeBundle() {
      const files = walk(outDir).filter(f => f !== 'sw.js' && !f.startsWith('.') && !f.startsWith('_')).sort();
      const h = createHash('sha256');
      files.forEach(f => { h.update(f); h.update(readFileSync(join(outDir, f))); });
      const hash = h.digest('hex').slice(0, 10);
      const precache = ['./', ...files.map(f => './' + f)];
      const sw = readFileSync(resolve(import.meta.dirname, 'src/sw.js'), 'utf8')
        .replace('__BUILD_HASH__', hash)
        .replace('__PRECACHE__', JSON.stringify(precache));
      writeFileSync(join(outDir, 'sw.js'), sw);
      console.log(`service worker: cache twofive-${hash}, ${precache.length} files`);
    },
  };
}

export default defineConfig({
  /* Relative paths so the site works under /two-five-app/ on GitHub Pages and anywhere else. */
  base: './',
  build: { outDir: 'dist', target: 'es2020' },
  plugins: [serviceWorker()],
});
