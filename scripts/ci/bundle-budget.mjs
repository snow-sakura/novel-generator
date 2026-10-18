#!/usr/bin/env node
/**
 * 前端产物体积预算（gzip）— 防止性能悄悄劣化
 * 用法：node scripts/ci/bundle-budget.mjs <dist目录> <totalKB上限>
 * 基线 2026-10-18：V3=151KB / V1=118KB，预算 ≈ 基线 +20~25%
 */
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, relative, resolve } from 'node:path'

const [distDir, maxKB] = process.argv.slice(2)
if (!distDir || !maxKB) {
  console.error('usage: bundle-budget.mjs <distDir> <totalKBMax>')
  process.exit(2)
}

const walk = (d) => readdirSync(d, { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])

let total = 0
const files = []
for (const f of walk(resolve(distDir))) {
  const gz = gzipSync(readFileSync(f)).length
  total += gz
  files.push([relative(distDir, f), gz])
}
files.sort((a, b) => b[1] - a[1])

const totalKB = total / 1024
const limit = Number(maxKB)
console.log(`dist gzip 总量: ${totalKB.toFixed(1)} KB / 预算 ${limit} KB`)
for (const [name, gz] of files.slice(0, 8)) {
  console.log(`  ${(gz / 1024).toFixed(1).padStart(7)} KB  ${name}`)
}
if (totalKB > limit) {
  console.error(`::error::bundle 体积超预算：${totalKB.toFixed(1)} KB > ${limit} KB。请做代码分割/移除依赖，或有意识地更新预算基线`)
  process.exit(1)
}
console.log('✅ 体积预算通过')
