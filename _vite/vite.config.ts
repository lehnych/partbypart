import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin, ResolvedConfig } from 'vite';
import * as sass from 'sass';

/**
 * Vite does not write a source map for CSS. After the bundle is written, this plugin replaces the
 * stylesheet in dist/assets/css by the minified output of sass itself and adds style.css.map
 * (pointing at app/src/scss/style.scss). It works on the written files, so it does not depend on
 * when Vite emits its own CSS asset.
 */
function cssSourceMap(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'css-source-map',
    apply: 'build',
    enforce: 'post',
    configResolved(c) {
      config = c;
    },
    writeBundle() {
      const assetsDir = path.resolve(config.root, config.build.outDir, 'assets');
      const cssDir = path.join(assetsDir, 'css');
      const cssFile = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).find((f) => f.endsWith('.css')) : undefined;
      if (!cssFile) {
        this.warn('css-source-map: no CSS file found in ' + cssDir);
        return;
      }
      const scssFile = path.resolve(config.root, 'src/scss/style.scss');
      const out = sass.compile(scssFile, { style: 'compressed', sourceMap: true, sourceMapIncludeSources: true });
      const map = out.sourceMap as { file?: string; sources: string[] };
      map.file = 'style.css';
      map.sources = map.sources.map((u) =>
        u.startsWith('file:') ? path.relative(cssDir, fileURLToPath(u)).split(path.sep).join('/') : u,
      );
      fs.writeFileSync(path.join(cssDir, 'style.css'), `${out.css}\n/*# sourceMappingURL=style.css.map */\n`);
      fs.writeFileSync(path.join(cssDir, 'style.css.map'), JSON.stringify(map));
      if (cssFile !== 'style.css') fs.rmSync(path.join(cssDir, cssFile)); // the name in index.html is style.css
      // The sass output points at ../fonts/ (as the source does): from assets/css/ that is assets/fonts/, where Vite
      // already puts the font files (assetFileNames). Copy them again with their licence files, so nothing is missing.
      const fontsSrc = path.resolve(config.root, 'src/fonts');
      const fontsOut = path.join(assetsDir, 'fonts');
      fs.mkdirSync(fontsOut, { recursive: true });
      for (const f of fs.readdirSync(fontsSrc)) fs.copyFileSync(path.join(fontsSrc, f), path.join(fontsOut, f));
    },
  };
}

/**
 * Build only: preload the main text font (Inter, latin) from dist/assets/fonts/, where cssSourceMap copies it, so the
 * first paint already has it. The dev server finds the fonts through the stylesheet as before.
 */
function fontPreload(): Plugin {
  return {
    name: 'font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [
        {
          tag: 'link',
          attrs: { rel: 'preload', href: './assets/fonts/inter-latin-wght-normal.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
          injectTo: 'head',
        },
      ],
    },
  };
}

// Source in app/, deployable site in dist/: index.html + assets/js/ (app.js page and controls, viewer.js 3D view,
// three.js the library, meshes.js part shapes, each with its .map), assets/css/ (style.css + .map) and assets/fonts/
// (Inter and JetBrains Mono with their licence files).
// The scripts are ES modules, so dist/ needs a web server (http/https); it does not run from disk (file://) any more.
export default defineConfig({
  root: 'app',
  base: './',
  cacheDir: '../node_modules/.vite', // keep the dependency cache inside node_modules, not as a .vite folder in the project
  publicDir: false, // no static files; everything is bundled
  plugins: [cssSourceMap(), fontPreload()],
  json: { stringify: true }, // the mesh data (large once parts are added) is bundled as JSON.parse('…'), which browsers read faster than an object literal
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Separate files: the library and the part shapes change rarely, so the browser keeps them in its cache
        // when only the model or the page code changes, and it loads them side by side.
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.endsWith('/parts/bricks/ldraw-meshes.json')) return 'meshes';
          return undefined;
        },
        entryFileNames: 'assets/js/app.js',
        chunkFileNames: 'assets/js/[name].js',
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? info.name ?? '';
          if (name.endsWith('.css')) return 'assets/css/style.css';
          if (/\.(woff2?|ttf|otf)$/.test(name)) return 'assets/fonts/[name][extname]';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
