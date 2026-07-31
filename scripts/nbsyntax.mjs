/**
 * 노트북 코드 셀 문법 검사 — 원고를 고친 뒤 반드시 돌린다.
 *
 * 실행:  node scripts/nbsyntax.mjs [경로]
 *
 * ※ 노트북 매직 판정 주의 (2026-07-30 실제로 밟은 함정)
 *   `!pip` `%matplotlib` 은 파이썬 문법이 아니라 걸러내야 하는데,
 *   `^\s*[!%]` 로 걸렀더니 문자열 포매팅 연속 줄
 *       print('...'
 *             % (a, b))
 *   의 `% (` 까지 지워져 "unmatched )" 오류가 났다.
 *   매직은 기호 뒤에 이름이 붙는다(`%matplotlib`, `!pip`) — 그것만 거른다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// 기본값이 'book' 이었다. 그건 pytorch-study(원고 저장소) 배치라
// 여기서는 ENOENT 로 죽는다 — 스크립트를 그쪽에서 가져오면서 딸려 온 값이다.
// 이 저장소는 노트북이 뿌리 밑에 흩어져 있으므로 '.' 이 맞다.
const root = process.argv[2] || '.'
const text = (c) => (Array.isArray(c.source) ? c.source.join('') : String(c.source || ''))
const isMagic = (l) => /^\s*[!%]{1,2}[A-Za-z_]/.test(l)   // 기호 뒤에 이름이 있어야 매직

function walk(d) {
  const out = []
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.ipynb')) out.push(p)
  }
  return out
}

const files = walk(root)
console.log(`검사한 노트북 ${files.length}개\n`)   // 0 이면 검사가 안 돈 것이다

let cells = 0, bad = 0
for (const f of files) {
  const nb = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const [i, c] of (nb.cells || []).entries()) {
    if (c.cell_type !== 'code') continue
    const src = text(c)
    if (!src.trim()) continue
    // %%셀매직 은 그 셀 전체의 언어를 바꾼다 (%%writefile 이면 셀 내용이 파일 내용).
    // 파이썬으로 검사하면 안 된다. (2026-07-30 — coco8.yaml 셀에서 밟음)
    const firstLine = src.split('\n').find((l) => l.trim())
    if (firstLine && /^\s*%%/.test(firstLine)) continue

    const clean = src.split('\n').filter((l) => !isMagic(l)).join('\n')
    cells++
    try {
      execFileSync('python3', ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
        { input: clean, stdio: ['pipe', 'ignore', 'pipe'] })
    } catch (e) {
      bad++
      console.error(`★ ${f.replace(root + '/', '')}  셀${i}`)
      console.error(`   ${String(e.stderr).trim().split('\n').slice(-2).join(' / ').slice(0, 140)}`)
    }
  }
}
console.log(`\n코드 셀 ${cells}개 · 문법 오류 ${bad}개`)
if (bad) process.exit(1)
