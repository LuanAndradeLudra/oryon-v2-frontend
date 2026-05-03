import type { CapacitorConfig } from '@capacitor/cli'

// CAPACITOR_DEV=1 troca o WebView para apontar para o dev server da rede local
// (livereload). Em prod fica undefined → Capacitor serve o bundle estatico de
// dist/. VITE_DEV_HOST_URL deve ser http://<IP_DA_LAN>:3005 (use o script
// `npm run dev:mobile` que descobre o IP automaticamente).
const isDev = process.env.CAPACITOR_DEV === '1'
const devUrl = process.env.VITE_DEV_HOST_URL

const config: CapacitorConfig = {
  appId: 'com.oryon.app',
  appName: 'Oryon',
  webDir: 'dist',
  ...(isDev && devUrl
    ? {
        server: {
          url: devUrl,
          cleartext: true,
        },
      }
    : {}),
}

export default config
