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
  // Forca o WebView a ter fundo preto (matching o tema escuro do app).
  // Sem isso o WebView mostra branco entre o boot do app e o primeiro paint
  // do React, dando a sensacao de "barra branca".
  backgroundColor: '#000000',
  android: {
    backgroundColor: '#000000',
  },
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
