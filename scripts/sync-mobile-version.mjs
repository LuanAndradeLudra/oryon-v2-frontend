#!/usr/bin/env node
// Sprint 5.5 — sincroniza a versao do app Android com frontend/package.json.
//
// Le `version` (semver MAJOR.MINOR.PATCH), gera:
//   - versionName = "M.m.p"
//   - versionCode = M*10000 + m*100 + p (sempre crescente, ordenavel)
// Escreve em android/app/build.gradle. Idempotente.
//
// Roda automaticamente via npm script `prebuild:android` antes do gradle
// assembleRelease. Se a pasta android/ nao existir (cap add android ainda
// nao foi executado), encerra silenciosamente — desenvolvedor sem Android
// SDK consegue rodar npm install / npm test sem fricao.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FRONTEND_DIR = join(__dirname, '..')
const PKG_PATH = join(FRONTEND_DIR, 'package.json')
const GRADLE_PATH = join(FRONTEND_DIR, 'android', 'app', 'build.gradle')

if (!existsSync(GRADLE_PATH)) {
  console.log('[sync-mobile-version] android/app/build.gradle nao existe — pular. Rode `npx cap add android` primeiro.')
  process.exit(0)
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'))
const version = pkg.version
const m = version.match(/^(\d+)\.(\d+)\.(\d+)/)
if (!m) {
  console.error(`[sync-mobile-version] versao invalida em package.json: "${version}"`)
  process.exit(1)
}
const [, majorStr, minorStr, patchStr] = m
const major = parseInt(majorStr, 10)
const minor = parseInt(minorStr, 10)
const patch = parseInt(patchStr, 10)

const versionName = `${major}.${minor}.${patch}`
const versionCode = major * 10000 + minor * 100 + patch

let gradle = readFileSync(GRADLE_PATH, 'utf8')
const originalGradle = gradle

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`)

if (gradle === originalGradle) {
  console.warn('[sync-mobile-version] nao encontrei versionCode/versionName em build.gradle — confira o formato')
  process.exit(1)
}

writeFileSync(GRADLE_PATH, gradle)
console.log(`[sync-mobile-version] android: versionName=${versionName} versionCode=${versionCode}`)
