import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 端到端测试依赖一份确定的演示数据。这里重置并重新灌入种子，
 * 保证断言不会受此前手工操作影响（README 中已说明该行为）。
 */
export default function globalSetup(): void {
  execSync('pnpm --filter @tw/api db:seed', {
    cwd: repoRoot,
    stdio: 'inherit',
  })
}
