import { copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../../llms.txt', import.meta.url))
const target = fileURLToPath(new URL('../public/llms.txt', import.meta.url))
await copyFile(source, target)
