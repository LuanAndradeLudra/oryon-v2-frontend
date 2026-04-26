import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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

export default defineConfig({
  plugins: [react(), tailwindcss(), appleEmojiPlugin(), canvaTokenPlugin(), designSearchPlugin()],
  server: {
    port: 3005,
    host: '0.0.0.0',  // bind to both IPv4 (127.0.0.1) and IPv6 (::1)
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['emoji-mart'],
  },
})
