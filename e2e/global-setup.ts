import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 端到端测试依赖一份确定的演示数据。这里先应用迁移、再重置并重新灌入种子，
 * 使整套测试在**全新数据库**上也能自足运行（本地首次克隆、或 CI 的服务容器），
 * 而不是依赖"开发库恰好已经迁移过"。README 中已说明该行为会重置演示数据。
 */
export default function globalSetup(): void {
  execSync('pnpm --filter @tw/api db:migrate', {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  execSync('pnpm --filter @tw/api db:seed', {
    cwd: repoRoot,
    stdio: 'inherit',
  })
}
