import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';
import { defineConfig } from 'vite';

const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);
const MIN_COMPRESS_BYTES = 512;

function collectFilesRecursive(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFilesRecursive(full, acc);
    else if (entry.isFile()) acc.push(full);
  }
  return acc;
}

/**
 * Packs text/code build artifacts into precompressed `.gz` (Gzip L9) and `.br` (Brotli Q11)
 * sidecars so static & Node servers can stream compressed bundles with zero runtime CPU cost.
 */
function precompressBuildPlugin() {
  let outDir = 'dist';
  return {
    name: 'hogwarts-precompress-gzip-brotli',
    apply: 'build',
    configResolved(cfg) {
      outDir = resolve(cfg.root, cfg.build.outDir);
    },
    closeBundle() {
      const files = collectFilesRecursive(outDir);
      let rawSum = 0;
      let gzSum = 0;
      let brSum = 0;
      let count = 0;

      for (const file of files) {
        const ext = extname(file).toLowerCase();
        if (!COMPRESSIBLE_EXTS.has(ext)) continue;
        const buf = readFileSync(file);
        if (buf.byteLength < MIN_COMPRESS_BYTES) continue;

        const gz = gzipSync(buf, { level: zlibConstants.Z_BEST_COMPRESSION });
        const br = brotliCompressSync(buf, {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
            [zlibConstants.BROTLI_PARAM_SIZE_HINT]: buf.byteLength,
          },
        });

        if (gz.byteLength < buf.byteLength) writeFileSync(`${file}.gz`, gz);
        if (br.byteLength < buf.byteLength) writeFileSync(`${file}.br`, br);

        rawSum += buf.byteLength;
        gzSum += Math.min(gz.byteLength, buf.byteLength);
        brSum += Math.min(br.byteLength, buf.byteLength);
        count += 1;
      }

      if (count > 0) {
        const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
        console.log(
          `[Precompress] Packed ${count} bundle files -> Raw ${kb(rawSum)} | Gzip ${kb(gzSum)} (-${Math.round((1 - gzSum / rawSum) * 100)}%) | Brotli ${kb(brSum)} (-${Math.round((1 - brSum / rawSum) * 100)}%)`
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [precompressBuildPlugin()],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        homescapes: resolve(import.meta.dirname, 'homescapes.html'),
        gardenscapes: resolve(import.meta.dirname, 'gardenscapes.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('/src/match3/')) return 'match3';
          if (
            id.includes('/src/data/homescapes') ||
            id.includes('/src/data/houseCommonRooms') ||
            id.includes('/src/world/homescapes')
          ) {
            return 'homescapes-world';
          }
          if (id.includes('/src/data/gardenscapes') || id.includes('/src/world/gardenscapes')) {
            return 'gardenscapes-world';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5179,
    host: true,
    watch: {
      // Build output HTML & the live SQLite WAL must never trigger dev full-reloads mid-game
      ignored: ['**/dist/**', '**/server/data/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5180',
        changeOrigin: true,
      },
    },
  },
});
