import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

// 第三方依赖保持外部引用（生产依赖本就该由 node_modules 提供），
// 但 @tw/shared 必须内联：它的 package.json exports 指向 .ts 源码，
// Node 运行时无法加载源码，只能在这里编译进去。
const external = Object.keys(pkg.dependencies ?? {}).filter((name) => name !== '@tw/shared')

await build({
  absWorkingDir: root,
  entryPoints: ['src/server.ts', 'src/db/migrate.ts', 'src/db/seed.ts', 'src/db/reset.ts'],
  outbase: 'src',
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  external,
  logLevel: 'info',
})
