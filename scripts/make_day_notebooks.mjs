/**
 * day1/*.py · day2/*.py · day3/*.py 를 교시별 코랩 노트북으로 만든다.
 *
 * 왜 필요한가 (2026-07-29 대표 지시):
 *   "1일차, 2일차 실습 소스도 코랩 노트북으로 만들어줘"
 *   기존 dayN_전체.ipynb 는 한 교시가 셀 하나였다(코드셀 7개).
 *   한 칸에 60~150줄이 들어 있으면 초보자가 돌리다 막혔을 때
 *   어디서 틀렸는지 못 찾는다. 파이토치 응용 프로젝트와 같은 방식으로
 *   ① 통째로 / ② 단계별 두 길을 주고, ②는 잘게 나눈다.
 *
 * 본문은 dayN/*.py 가 아니라 dayN/standalone/*.py 를 쓴다 (2026-07-29).
 *   교재용 dayN/*.py 는 앞 교시의 클래스를 이어 쓰는 것이 8개 있어
 *   (day1 3·4·5·6, day2 4·7, day3 2·6) 혼자서는 NameError 로 죽는다.
 *   standalone 판은 사이트의 '이 교시 전체 코드' 를 그대로 떨군 것이고
 *   21개 전부 단독 실행을 확인했다.
 *   -> 5교시만 보고 싶은 사람이 1~4교시를 돌리지 않아도 된다.
 *
 *   (교재 소스를 그대로 쓰려다 실제로 밟은 함정이다.
 *    macOS 에 timeout 명령이 없어 첫 검사가 전부 "통과" 로 보였다.
 *    파이썬 subprocess timeout 으로 다시 재니 8개가 죽었다.)
 *
 * 셀 나누는 기준 (파이썬 최상위 경계에서만 끊는다 — 함수 중간을 자르면 깨진다):
 *   ① print('=' * NN)  구분선          (day2 05·07 에 있다)
 *   ② 열 0 의 배너 주석 # ==== 시작    (버퍼에 코드가 있을 때만)
 *   ③ 열 0 의 def / class             (버퍼에 코드가 있을 때만)
 *   ④ 열 0 의 # ── 소제목 주석         (버퍼에 코드가 있을 때만)
 *   주석만 있는 마지막 덩어리(바꿔 보기 등)는 코드 셀 대신 마크다운으로 올린다.
 *
 * 출력: <일차폴더>/colab/<파일명>.ipynb
 *   node scripts/make_day_notebooks.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LAB = path.join(HERE, '..')
const RAW = 'https://raw.githubusercontent.com/aebonlee/pytorch26-lab/main'

const DAYS = {
  day1: { label: '1일차', theme: 'Tabular-based Methods', date: '2026-07-27 (월)' },
  day2: { label: '2일차', theme: 'Value-based & Policy-based Methods', date: '2026-07-28 (화)' },
  day3: { label: '3일차', theme: 'Advanced Actor-Critic Methods', date: '2026-07-29 (수)' },
}

const isBanner = (l) => /^#\s*={10,}\s*$/.test(l ?? '')
const isRule = (l) => /^print\('=' \* \d+\)$/.test((l ?? '').trim())
const isSub = (l) => /^#\s*──/.test(l ?? '')
const isDef = (l) => /^(def |class |@|for |while |with )/.test(l ?? '')

// ★ 데코레이터 뒤에서는 끊지 않는다 (2026-07-30 실제 사고)
//   @ 도 def 도 둘 다 경계로 봤더니, @torch.no_grad() 다음 줄의 def 에서
//   또 끊겨 ==데코레이터만 남은 셀== 이 12곳 생겼다.
//   단계별로 실행하면 그 셀에서 SyntaxError 가 난다(데코레이터는 혼자 못 쓴다).
//   버려진 것은 아니라 눈으로는 안 보이고, 셀을 하나씩 돌려 봐야 드러난다.
const afterDecorator = (lines, i) => {
  for (let k = i - 1; k >= 0; k--) {
    const t = (lines[k] ?? '').trim()
    if (!t) continue
    return t.startsWith('@')
  }
  return false
}
// 문자열(덩어리)과 배열(버퍼) 둘 다 받는다
const hasCode = (x) =>
  (Array.isArray(x) ? x : String(x).split('\n'))
    .some((l) => l.trim() && !l.trim().startsWith('#'))

/** 배너 여는 줄인가? (닫는 줄은 바로 앞이 주석이다) */
function opensBanner(lines, i) {
  if (!isBanner(lines[i])) return false
  for (let k = i - 1; k >= 0; k--) {
    const t = (lines[k] ?? '').trim()
    if (!t) continue
    return !t.startsWith('#')      // 앞의 실질 줄이 코드면 '여는' 배너
  }
  return true
}

function splitCells(src) {
  const lines = src.split('\n')
  const chunks = []
  let cur = []
  const flush = () => {
    while (cur.length && cur[cur.length - 1].trim() === '') cur.pop()
    if (cur.length) chunks.push(cur.join('\n'))
    cur = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const cut =
      hasCode(cur) &&
      !afterDecorator(lines, i) &&          // 데코레이터와 def 사이는 붙여 둔다
      ((line.trim() === 'print()' && isRule(lines[i + 1])) ||
        opensBanner(lines, i) ||
        isDef(line) ||
        isSub(line))
    if (cut) {
      flush()
      if (line.trim() === 'print()') continue   // 셀 첫 줄 빈 출력 방지
    }
    cur.push(line)
  }
  flush()
  return chunks
}

const mdCell = (t) => ({
  cell_type: 'markdown', metadata: {},
  source: t.split('\n').map((l, i, a) => (i === a.length - 1 ? l : l + '\n')),
})
const codeCell = (t) => ({
  cell_type: 'code', metadata: {}, execution_count: null, outputs: [],
  source: t.split('\n').map((l, i, a) => (i === a.length - 1 ? l : l + '\n')),
})

/**
 * 전체본을 [앞 교시 준비 코드] 와 [이 교시 코드] 로 가른다.
 *
 * 왜 가르나: 7교시 전체본은 1~7교시가 다 들어 있어 잘게 나누면 35칸이 된다.
 * 7교시만 보러 온 사람이 35번 실행하게 할 수는 없다.
 * 준비 코드는 통째로 한 칸(접어 두고 그냥 실행), 이 교시 코드만 잘게 나눈다.
 *
 * 가르는 법: 교재 소스(dayN/NN.py)의 머리말을 걷어낸 본문이
 * 전체본의 어디서 시작하는지 뒤에서부터 찾는다.
 */
function splitPrep(fullSrc, ownSrc) {
  const std = fullSrc.split('\n')
  const own = ownSrc.split('\n')
  let i = 0
  while (i < own.length && (own[i].startsWith('#') || !own[i].trim())) i++   // 머리말 건너뛰기
  const body = own.slice(i)
  if (!body.length) return { prep: '', main: fullSrc }
  const probe = body.slice(0, Math.min(6, body.length))
  for (let k = std.length - body.length; k >= 0; k--) {
    if (probe.every((l, j) => std[k + j] === l)) {
      return { prep: std.slice(0, k).join('\n').trimEnd(), main: std.slice(k).join('\n') }
    }
  }
  return { prep: '', main: fullSrc }        // 못 찾으면 통째로 본문 취급
}

/** 파일 머리말에서 교시 제목과 학습목표를 뽑는다 */
function readHead(src) {
  const lines = src.split('\n')
  const title = (lines.find((l) => /교시 —/.test(l)) || '').replace(/^#\s*/, '').trim()
  const goals = []
  let inGoals = false
  for (const l of lines) {
    if (/\[학습목표\]/.test(l)) { inGoals = true; continue }
    if (!inGoals) continue
    const m = l.match(/^#\s*-\s*(.+)$/)
    if (m) goals.push(m[1].trim())
    else if (!/^#/.test(l) || /^#\s*$/.test(l)) break
  }
  return { title, goals }
}

let made = 0
for (const [day, meta] of Object.entries(DAYS)) {
  const outDir = path.join(LAB, day, 'colab')
  fs.mkdirSync(outDir, { recursive: true })

  const files = fs.readdirSync(path.join(LAB, day)).filter((f) => /^\d\d_.*\.py$/.test(f)).sort()

  for (const file of files) {
    const id = file.replace(/\.py$/, '')
    const slot = Number(id.slice(0, 2))
    // 머리말(제목·학습목표)은 교재 소스에서, 본문은 단독 실행판에서 가져온다
    const head = fs.readFileSync(path.join(LAB, day, file), 'utf8')
    const src = fs.readFileSync(path.join(LAB, day, 'standalone', file), 'utf8').trimEnd()
    const { title, goals } = readHead(head)
    const { prep, main } = splitPrep(src, head)
    const chunks = splitCells(main)

    // 마지막이 주석뿐이면(바꿔 보기 등) 마크다운으로 돌린다
    let tail = null
    if (chunks.length && !hasCode(chunks[chunks.length - 1])) {
      tail = chunks.pop().split('\n')
        .map((l) => l.replace(/^#\s?/, '').replace(/^={10,}$/, ''))
        .join('\n').trim()
    }

    const cells = []

    cells.push(mdCell(`# ${title || `${meta.label} ${slot}교시`}

**PyTorch로 배우는 강화학습 · ${meta.label} ${meta.theme} · ${meta.date}**

이애본 (Aebon, Ph.D) · DreamIT Biz · https://pytorch26.dreamitbiz.com

---
${goals.length ? `\n## 🎯 학습목표\n\n${goals.map((g) => `- ${g}`).join('\n')}\n\n---\n` : ''}
# ⚡ 실행 방법 두 가지 — 편한 쪽을 고르세요

### 방법 ① 통째로 한 번에
바로 아래 **[통째로 실행]** 셀 **하나만** 실행하면 끝까지 돕니다.
결과부터 보고 싶으신 분께 권합니다.

### 방법 ② 단계별로 하나씩
그 아래 **[단계별]** 부분을 위에서부터 \`Shift + Enter\` 로 하나씩 실행하세요.
모두 **${chunks.length}칸**입니다. 한 칸 돌리고 결과 보고 넘어가면 됩니다.

> **이 교시는 혼자 돌아갑니다.** 앞 교시를 먼저 실행하지 않아도 됩니다.
> (앞 교시에서 만든 것을 이 노트북 안에 다시 넣어 뒀습니다 — 사이트의 *이 교시 전체 코드* 와 같은 판입니다.)
> 설치할 것도 없습니다 — 코랩에 다 들어 있습니다.`))

    cells.push(mdCell(`---

# ① 통째로 한 번에 실행

GitHub 에서 원본을 받아 그대로 돌립니다. 원본이 고쳐지면 자동으로 최신을 받습니다.`))
    cells.push(codeCell(`!curl -sL ${RAW}/${day}/standalone/${file} -o ${file}\n!python ${file}`))

    cells.push(mdCell(`---

# ② 단계별로 하나씩 실행

${prep ? `먼저 **준비 코드** 한 칸을 실행하고(앞 교시에서 만든 것들입니다),
그다음부터 이 교시 내용이 **${chunks.length}칸**입니다.` : `이 교시 내용이 **${chunks.length}칸**입니다.`}
위에서부터 \`Shift + Enter\`.

> ①을 이미 돌리셨어도 상관없습니다. 처음부터 다시 하는 것과 같습니다.`))

    if (prep) {
      cells.push(mdCell(`### 0 칸 — 준비 (앞 교시에서 만든 것들)

읽지 않고 그냥 실행하셔도 됩니다. 앞 교시에서 이미 다룬 코드입니다.`))
      cells.push(codeCell(prep))
    }

    chunks.forEach((c, i) => {
      cells.push(mdCell(`### ${i + 1} / ${chunks.length} 칸`))
      cells.push(codeCell(c))
    })

    if (tail) cells.push(mdCell(`---\n\n## 🔧 ${tail}`))

    cells.push(mdCell(`---

## 막히면

- 사이트의 같은 교시를 보세요 — 실행 결과와 해설이 그대로 있습니다.
  https://pytorch26.dreamitbiz.com/#/day/${day.slice(-1)}/${slot}
- 오류가 나면 **[막힐 때]** 메뉴부터.
  https://pytorch26.dreamitbiz.com/#/help

---

*Aebon, Ph.D & Claude Code 협작 전자출판 도서 · © 2026 DreamIT Biz*`))

    const nb = {
      nbformat: 4, nbformat_minor: 0,
      metadata: {
        colab: { provenance: [], toc_visible: true },
        kernelspec: { name: 'python3', display_name: 'Python 3' },
        language_info: { name: 'python' },
      },
      cells,
    }
    fs.writeFileSync(path.join(outDir, `${id}.ipynb`), JSON.stringify(nb, null, 1), 'utf8')
    console.log(`  ${day}/${id}.ipynb — 단계별 ${chunks.length}칸`)
    made++
  }
}

console.log(`\n교시별 노트북 ${made}개 생성`)
