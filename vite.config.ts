import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import fs from 'fs'
import https from 'https'
import { execFileSync } from 'child_process'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

// Load .env.local server-side so CANVA_CLIENT_SECRET never reaches the browser
const env = loadEnv('development', process.cwd(), '')  // '' = load ALL vars (including non-VITE_)
const CANVA_CLIENT_ID     = env.VITE_CANVA_CLIENT_ID     ?? ''
const CANVA_CLIENT_SECRET = env.CANVA_CLIENT_SECRET      ?? ''  // no VITE_ prefix = server-only

// ─── Design Search Plugin ─────────────────────────────────────────────────────
// Exposes GET /api/design-search?q=<query>&domain=<domain>&n=<count>
// Calls the ui-ux-pro-max Python search script server-side so the browser
// copilot tool can fetch design recommendations without a separate backend.

// ─── Apple Emoji Images Plugin ────────────────────────────────────────────────
// Serves individual Apple emoji PNGs from node_modules so the <em-emoji> web
// component renders locally without any CDN dependency.
// Route: GET /emoji-apple/{unified}.png  → emoji-datasource-apple/img/apple/64/{unified}.png

function appleEmojiPlugin(): Plugin {
  const emojiDir = path.resolve(
    __dirname,
    'node_modules/emoji-datasource-apple/img/apple/64',
  )
  return {
    name: 'apple-emoji',
    configureServer(server) {
      server.middlewares.use(
        '/emoji-apple',
        (req: IncomingMessage, res: ServerResponse) => {
          const file = path.join(emojiDir, req.url ?? '')
          if (!file.startsWith(emojiDir) || !file.endsWith('.png')) {
            res.statusCode = 404
            res.end()
            return
          }
          if (!fs.existsSync(file)) {
            res.statusCode = 404
            res.end()
            return
          }
          res.setHeader('Content-Type', 'image/png')
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          fs.createReadStream(file).pipe(res)
        },
      )
    },
  }
}

// ─── Canva Token Proxy Plugin ─────────────────────────────────────────────────
// Proxies POST /api/canva-token → https://api.canva.com/rest/v1/oauth/token
// Avoids CORS restriction on the Canva token endpoint when called from browser.

function canvaTokenPlugin(): Plugin {
  return {
    name: 'canva-token-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/canva-token',
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            res.statusCode = 204
            res.end()
            return
          }

          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            const bodyBuf  = Buffer.from(body, 'utf8')
            // Build Basic auth server-side — secret never exposed to browser
            const basicAuth = Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString('base64')
            const options = {
              hostname: 'api.canva.com',
              path:     '/rest/v1/oauth/token',
              method:   'POST',
              headers:  {
                'Content-Type':   'application/x-www-form-urlencoded',
                'Content-Length': bodyBuf.length,
                'Authorization':  `Basic ${basicAuth}`,
              },
            }

            const proxyReq = https.request(options, (proxyRes) => {
              let data = ''
              proxyRes.on('data', (c: Buffer) => { data += c.toString() })
              proxyRes.on('end', () => {
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.statusCode = proxyRes.statusCode ?? 500
                res.end(data)
              })
            })

            proxyReq.on('error', (err: Error) => {
              res.statusCode = 502
              res.end(JSON.stringify({ error: err.message }))
            })

            proxyReq.write(bodyBuf)
            proxyReq.end()
          })
        },
      )
    },
  }
}

function designSearchPlugin(): Plugin {
  return {
    name: 'design-search',
    configureServer(server) {
      server.middlewares.use(
        '/api/design-search',
        (req: IncomingMessage, res: ServerResponse) => {
          try {
            const url    = new URL(req.url ?? '/', 'http://localhost')
            const query  = url.searchParams.get('q')  ?? ''
            const domain = url.searchParams.get('domain') ?? ''
            const n      = url.searchParams.get('n')  ?? '3'

            const scriptPath = path.resolve(
              __dirname,
              'ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py',
            )

            const args = [scriptPath, query, '--domain', domain, '-n', n]
            const output = execFileSync('python3', args, {
              timeout: 8000,
              encoding: 'utf8',
            })

            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(output)
          } catch (err) {
            res.statusCode = 500
            res.end(String(err))
          }
        },
      )
    },
  }
}

// Sentry source-map upload — only runs when SENTRY_AUTH_TOKEN is present in
// the build environment (CI). Devs without the token still get a clean build;
// the plugin is omitted entirely, so nothing fails. Org / project default to
// the Oryon values but can be overridden per-environment.
const sentryAuthToken = env.SENTRY_AUTH_TOKEN ?? ''
const sentryOrg = env.SENTRY_ORG ?? 'oryon'
const sentryProject = env.SENTRY_PROJECT ?? 'frontend'
const sentryRelease = env.SENTRY_RELEASE ?? env.VITE_SENTRY_RELEASE ?? undefined
const sentryPlugins = sentryAuthToken
  ? [sentryVitePlugin({
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      release: sentryRelease ? { name: sentryRelease } : undefined,
      sourcemaps: { assets: './dist/**' },
      // Don't fail the build if Sentry is unreachable — sourcemap upload is
      // observability infra, not a release blocker.
      errorHandler: (err) => { console.warn('[sentry-vite-plugin]', err.message) },
    })]
  : []

export default defineConfig({
  plugins: [react(), tailwindcss(), appleEmojiPlugin(), canvaTokenPlugin(), designSearchPlugin(), ...sentryPlugins],
  build: {
    // Sourcemaps are required for Sentry to symbolicate stack traces.
    // 'hidden' means the bundle doesn't ship a //# sourceMappingURL comment
    // to browsers — devs without Sentry don't accidentally serve sourcemaps
    // from the public dist.
    sourcemap: sentryAuthToken ? 'hidden' : false,
    rollupOptions: {
      // Duas entradas: o app (index.html) e o documento de demonstração que o
      // Hero da landing abre num iframe (demo.html — o Oryon real com backend
      // em memória). Os pedaços comuns saem compartilhados, então a demo
      // reaproveita o que a landing já baixou.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        demo: path.resolve(__dirname, 'demo.html'),
      },
      output: {
        // O pedaço de ENTRADA do app (main-*.js) roda o bootstrap ao ser
        // importado: monta o App inteiro no #root. O Rollup içava para ele
        // módulos que o main.tsx/App.tsx importam direto (lib/emojiText, o
        // modal do AdminMobileBlock…) — e as páginas preguiçosas (Disparos,
        // Agentes IA…) passavam a importar main-*.js. No app é inofensivo (já
        // carregou); na DEMONSTRAÇÃO, abrir Disparos subia o app real por cima
        // e o Hero mostrava a Home. Medido no build de produção em 26/09.
        // Regra: o que main.tsx/App.tsx importam direto vai para um pedaço
        // próprio — a entrada fica só com o bootstrap.
        manualChunks(id, { getModuleInfo }) {
          const norm = id.replace(/\\/g, '/')
          // Gráficos (recharts + d3) num pedaço só deles: o Rollup os juntava a
          // utilitários comuns e a landing/demo avaliavam ~300 kB de gráfico
          // em telas sem gráfico nenhum (medido no perfil da demo, 26/09).
          if (/\/node_modules\/(recharts|victory-vendor|d3-[a-z-]+|internmap|decimal\.js-light|react-smooth|recharts-scale)\//.test(norm)) return 'graficos'
          if (norm.endsWith('/src/main.tsx') || norm.endsWith('/src/App.tsx')) return undefined
          const info = getModuleInfo(id)
          const doBoot = info?.importers.some((i) => {
            const n = i.replace(/\\/g, '/')
            return n.endsWith('/src/main.tsx') || n.endsWith('/src/App.tsx')
          })
          return doBoot ? 'app-base' : undefined
        },
      },
    },
  },
  server: {
    port: 3005,
    host: '0.0.0.0',  // bind to both IPv4 (127.0.0.1) and IPv6 (::1)
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'lucide-react': path.resolve(__dirname, './src/lib/icons.tsx'),
      'lucide-react-original': path.resolve(__dirname, './node_modules/lucide-react'),
    },
  },
  optimizeDeps: {
    include: ['emoji-mart'],
  },
})
