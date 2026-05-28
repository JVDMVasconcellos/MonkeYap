/**
 * Downloads the Vosk pt-BR model and repacks it as tar.gz for vosk-browser.
 * Runs automatically before `npm run build` and `npm run dev`.
 * Skips if the file already exists.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODELS_DIR = join(__dirname, '..', 'public', 'models')
const TARGET = join(MODELS_DIR, 'vosk-pt.tar.gz')

if (existsSync(TARGET)) {
  console.log('✓ Vosk model already present — skipping download')
  process.exit(0)
}

mkdirSync(MODELS_DIR, { recursive: true })

const TMP = '/tmp/vosk-dl'
const URL = 'https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip'

console.log('⬇  Downloading Vosk pt-BR model (~47 MB)…')
execSync(`rm -rf ${TMP} && mkdir -p ${TMP}`)
execSync(`curl -L "${URL}" -o ${TMP}/model.zip --progress-bar`, { stdio: 'inherit' })

console.log('📦 Repacking as tar.gz…')
execSync(`unzip -q ${TMP}/model.zip -d ${TMP}/`)
execSync(`tar czf "${TARGET}" -C ${TMP} vosk-model-small-pt-0.3`)
execSync(`rm -rf ${TMP}`)

console.log(`✓ Model saved to ${TARGET}`)
