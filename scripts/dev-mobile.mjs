#!/usr/bin/env node
import { networkInterfaces } from 'node:os'
import { spawn } from 'node:child_process'

function detectLanIp() {
  const ifs = networkInterfaces()
  for (const name of Object.keys(ifs)) {
    for (const info of ifs[name] ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        return info.address
      }
    }
  }
  return null
}

const ip = detectLanIp()
if (!ip) {
  console.error('[dev:mobile] Nao consegui detectar um IP de LAN. Conecte-se a uma rede Wi-Fi ou Ethernet.')
  process.exit(1)
}

const port = process.env.PORT ?? '3005'
const url = `http://${ip}:${port}`

console.log('')
console.log(`[dev:mobile] Servindo em ${url}`)
console.log('[dev:mobile] Abra esse endereco no navegador do celular ou rode `npx cap run android -l --external` em outro terminal.')
console.log('')

// Aponta o app pro backend via IP da LAN — sem isso, o celular (que vai
// carregar o bundle do dev server) tentaria localhost (= proprio celular).
// Substitui o que antes estava em .env.local (que vazava pro `npm run dev`
// do desktop e quebrava o login por cross-site cookies).
const env = {
  ...process.env,
  VITE_DEV_HOST_URL: url,
  VITE_API_URL: `http://${ip}:3000/api`,
  VITE_WS_URL: `http://${ip}:3000`,
  VITE_AGENT_SERVER_URL: `http://${ip}:3002`,
  CAPACITOR_DEV: '1',
}

const child = spawn('npx', ['vite', '--host'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
})

child.on('exit', (code) => process.exit(code ?? 0))
