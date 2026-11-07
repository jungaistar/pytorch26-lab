/**
 * pytorch_projects/*.py 를 코랩용 .ipynb 로 만든다.
 *
 * 왜 필요한가 (2026-07-29 대표 지시):
 *   "코랩에서 주피터노트북처럼 한 줄 또는 한 셀에서 단계별로 진행해 볼 수 있게
 *    해주거나 바로 통 프로그램으로 하게 해줘서 실행할 수 있게 해줘"
 *
 *   수준이 갈리는 반이라 두 가지를 다 준다.
 *     방법 ① 통째로 — 셀 하나만 실행하면 끝까지 돈다 (일단 결과부터 보고 싶은 사람)
 *     방법 ② 단계별 — 절마다 셀이 나뉘어 있다 (한 줄씩 뜯어보고 싶은 사람)
 *
 *   ①을 소스 전체 복사로 만들지 않은 이유:
 *   같은 코드가 노트북 안에 두 벌 들어가면 한쪽만 고쳐져 어긋난다.
 *   GitHub 원본(public)을 내려받아 실행하게 해서 항상 최신을 쓰게 했다.
 *
 * 셀 나누는 기준: make_colab_notebooks.mjs 와 같다.
 *   .py 안의  print('=' * NN)  구분선을 절 경계로 본다.
 *
 * 출력: <OUT_DIR>/<이름>.ipynb
 *   node scripts/make_project_notebooks.mjs <OUT_DIR>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LAB = path.join(HERE, '..')
const RAW = 'https://raw.githubusercontent.com/jungaistar/pytorch26-lab/main/pytorch_projects'

const OUT_DIR = process.argv[2]
if (!OUT_DIR) {
  console.error('사용법: node scripts/make_project_notebooks.mjs <OUT_DIR>')
  process.exit(1)
}
fs.mkdirSync(OUT_DIR, { recursive: true })

// 프로젝트별 안내. minutes 는 코랩 GPU 기준 어림값이다.
const META = {
  '01_dnn_regression': {
    title: '① DNN — 집값 예측',
    chapter: '교재 10장',
    minutes: '2분',
    gpu: false,
    pip: 'scikit-learn 은 코랩에 이미 있습니다. 설치할 것 없습니다.',
    what: `신경망의 가장 기본형입니다. 숫자 여러 개를 넣으면 숫자 하나가 나옵니다.
캘리포니아 집값 데이터로 "방 개수·소득·위치" 를 넣으면 "집값" 이 나오게 만듭니다.`,
    rl: `강화학습의 **가치 함수 V(s)** 와 똑같은 모양입니다.
상태를 넣으면 숫자 하나(가치)가 나오죠. 여기서는 집 정보를 넣으면 집값이 나옵니다.`,
  },
  '02_cnn_mnist': {
    title: '② CNN — 손글씨 숫자 알아맞히기',
    chapter: '교재 11장',
    minutes: '3분',
    gpu: false,
    pip: '설치할 것 없습니다. 데이터도 자동으로 받습니다.',
    what: `그림을 다루는 신경망입니다. 28×28 손글씨를 보고 0~9 중 무엇인지 맞힙니다.`,
    rl: `**DQN 이 게임 화면을 보고 행동을 고르는 것**과 같은 구조입니다.
그림 → 신경망 → 여러 갈래 점수. 여기서는 숫자 10개, DQN 은 행동 개수만큼.`,
  },
  '03_cnn_fashion': {
    title: '③ CNN — 옷 종류 알아맞히기',
    chapter: '교재 11장',
    minutes: '4분',
    gpu: false,
    pip: '설치할 것 없습니다.',
    what: `②와 같은 구조로 더 어려운 문제를 풉니다. 숫자보다 옷이 훨씬 헷갈립니다.
같은 코드가 문제가 어려워지면 어떻게 되는지 보는 것이 목적입니다.`,
    rl: `**같은 알고리즘도 환경이 어려워지면 성능이 떨어집니다.**
CartPole 에서 잘 되던 DQN 이 LunarLander 에서 고전하는 것과 같습니다.`,
  },
  '04_rnn_sequence': {
    title: '④ RNN — 순서가 있는 데이터',
    chapter: '교재 12장',
    minutes: '4분',
    gpu: false,
    pip: '설치할 것 없습니다.',
    what: `그림을 위에서 아래로 한 줄씩 읽으면서 "지금까지 본 것" 을 기억해 나갑니다.`,
    rl: `강화학습도 **시간 순서**를 다룹니다.
RNN 이 앞 글자를 기억한다면, 강화학습은 앞 상태의 가치를 기억합니다.`,
  },
  '05_gan_mnist': {
    title: '⑤ GAN — 없는 숫자를 만들어 내기',
    chapter: '교재 14장',
    minutes: '6분',
    gpu: false,
    pip: '설치할 것 없습니다.',
    what: `**위조범과 감정사**가 서로 겨루면서 같이 늘어납니다.
위조범은 가짜 숫자를 그리고, 감정사는 진짜와 가짜를 가려냅니다.`,
    rl: `**Actor-Critic 과 판박이입니다.**
만드는 쪽(Actor/위조범)과 평가하는 쪽(Critic/감정사)이 서로를 보고 배웁니다.
손실이 내려간다고 잘하는 게 아니라는 것도 똑같습니다 — 상대가 같이 늘기 때문입니다.`,
  },
  '06_bert_nsmc': {
    title: '⑥ BERT — 한국어 영화평 감성 분석',
    chapter: '교재 15장',
    minutes: 'GPU 로 5분 안팎',
    gpu: true,
    pip: '`transformers` 를 설치합니다. 아래 설치 셀을 먼저 실행하세요.',
    what: `이미 한국어를 아는 모델(BERT)을 데려와서, 그 위에 판단기 하나만 얹습니다.
네이버 영화 리뷰가 긍정인지 부정인지 맞힙니다.`,
    rl: `[허깅페이스] 메뉴에서 **학습된 강화학습 모델을 받아 쓴 것과 같은 발상**입니다.
남이 오래 학습시켜 둔 것을 가져다 조금만 다듬어 씁니다.`,
  },
  '07_transfer_learning': {
    title: '⑦ 전이학습 — 사진 분류기를 빠르게',
    chapter: '교재 16장',
    minutes: 'GPU 로 3분 / CPU 로 25분',
    gpu: true,
    pip: '설치할 것 없습니다. 데이터(CIFAR-10)는 자동으로 받습니다.',
    what: `ImageNet 으로 학습된 ResNet18 을 가져와 **마지막 층 하나만** 바꿔 끼웁니다.
전체 11,689,512개 중 5,130개(0.05%)만 학습합니다.`,
    rl: `**얼리기(freeze)** 는 2일차의 타깃 네트워크를 고정해 둔 것과 같은 발상입니다.
건드리지 않는 부분을 두어 안정시키는 것이죠.`,
  },
}

const mdCell = (text) => ({
  cell_type: 'markdown',
  metadata: {},
  source: text.split('\n').map((l, i, a) => (i === a.length - 1 ? l : l + '\n')),
})

const codeCell = (text) => ({
  cell_type: 'code',
  metadata: {},
  execution_count: null,
  outputs: [],
  source: text.split('\n').map((l, i, a) => (i === a.length - 1 ? l : l + '\n')),
})

/** print('=' * NN) 구분선 앞에서 끊는다 (make_colab_notebooks.mjs 와 동일) */
function splitCells(src) {
  const lines = src.split('\n')
  const isRule = (l) => /^print\('=' \* \d+\)$/.test((l ?? '').trim())
  const hasCode = (arr) => arr.some((l) => l.trim() && !l.trim().startsWith('#'))
  const chunks = []
  let cur = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === 'print()' && isRule(lines[i + 1]) && hasCode(cur)) {
      while (cur.length && cur[cur.length - 1].trim() === '') cur.pop()
      chunks.push(cur.join('\n'))
      cur = []
      continue
    }
    cur.push(line)
  }
  while (cur.length && cur[cur.length - 1].trim() === '') cur.pop()
  if (hasCode(cur)) chunks.push(cur.join('\n'))
  return chunks
}

let made = 0
for (const [id, m] of Object.entries(META)) {
  const src = fs.readFileSync(path.join(LAB, 'pytorch_projects', `${id}.py`), 'utf8').trimEnd()
  const chunks = splitCells(src)
  const cells = []

  // ── 표지 ────────────────────────────────────
  cells.push(mdCell(`# ${m.title}

**파이토치 응용 프로젝트 · ${m.chapter} · 걸리는 시간 ${m.minutes}**

이애본 (Aebon, Ph.D) · DreamIT Biz · https://pytorch26.dreamitbiz.com

---

## 무엇을 하나요

${m.what}

## 강화학습에서 배운 것과 어디서 만나나요

${m.rl}

---

# ⚡ 실행 방법 두 가지 — 편한 쪽을 고르세요

### 방법 ① 통째로 한 번에
바로 아래 **[통째로 실행]** 셀 **하나만** 실행하면 끝까지 돕니다.
결과부터 보고 싶으신 분께 권합니다.

### 방법 ② 단계별로 하나씩
그 아래 **[단계별]** 부분을 위에서부터 \`Shift + Enter\` 로 하나씩 실행하세요.
한 셀 돌리고 결과 보고 다음으로 넘어가면 됩니다.
코드를 뜯어보고 싶으신 분께 권합니다.

> **둘 다 해보셔도 됩니다.** ①로 결과를 먼저 보고, ②로 다시 뜯어보는 것이 가장 좋습니다.

${m.gpu ? `> ### ⚠️ GPU 를 켜세요\n> 상단 메뉴 **[런타임] → [런타임 유형 변경] → 하드웨어 가속기: GPU**\n> 안 켜면 아주 오래 걸립니다.\n` : ''}
${m.pip}`))

  // ── 방법 ① 통째로 ───────────────────────────
  cells.push(mdCell(`---

# ① 통째로 한 번에 실행

아래 셀 하나만 실행하면 됩니다. GitHub 에서 원본을 받아 그대로 돌립니다.
(원본이 고쳐지면 자동으로 최신 것을 받습니다)`))

  cells.push(codeCell(
    (id === '06_bert_nsmc' ? "!pip install -q transformers\n" : '') +
    `!curl -sL ${RAW}/${id}.py -o ${id}.py\n` +
    `!python ${id}.py`,
  ))

  // ── 방법 ② 단계별 ───────────────────────────
  cells.push(mdCell(`---

# ② 단계별로 하나씩 실행

여기서부터는 절마다 셀이 나뉘어 있습니다. 모두 **${chunks.length}칸**입니다.
위에서부터 \`Shift + Enter\` 로 하나씩 실행하세요.

> ①을 이미 돌리셨어도 상관없습니다. 처음부터 다시 시작하는 것과 같습니다.`))

  if (id === '06_bert_nsmc') {
    cells.push(mdCell('### 먼저 설치 (한 번만)'))
    cells.push(codeCell('!pip install -q transformers'))
  }

  chunks.forEach((c, i) => {
    cells.push(mdCell(`### ${i + 1} / ${chunks.length} 칸`))
    cells.push(codeCell(c))
  })

  // ── 마무리 ──────────────────────────────────
  cells.push(mdCell(`---

## 다 하셨으면

- 파일 맨 아래 **[바꿔 보기]** 주석대로 숫자를 바꿔서 다시 돌려 보세요.
  숫자 하나 바꿨을 때 결과가 어떻게 달라지는지 보는 것이 가장 빨리 느는 길입니다.
- 막히면 사이트의 같은 프로젝트를 보세요 — 실행 결과와 해설이 그대로 있습니다.
  https://pytorch26.dreamitbiz.com/#/pt-projects
- 오류가 나면 **[막힐 때]** 메뉴부터 보세요.
  https://pytorch26.dreamitbiz.com/#/help

---

*Aebon, Ph.D & Claude Code 협작 전자출판 도서 · © 2026 DreamIT Biz*`))

  const nb = {
    nbformat: 4,
    nbformat_minor: 0,
    metadata: {
      colab: { provenance: [], toc_visible: true },
      kernelspec: { name: 'python3', display_name: 'Python 3' },
      language_info: { name: 'python' },
      ...(m.gpu ? { accelerator: 'GPU' } : {}),
    },
    cells,
  }

  const out = path.join(OUT_DIR, `${id}.ipynb`)
  fs.writeFileSync(out, JSON.stringify(nb, null, 1), 'utf8')
  console.log(`  ${id}.ipynb — 셀 ${cells.length}개 (단계별 ${chunks.length}칸)`)
  made++
}

console.log(`\n프로젝트 노트북 ${made}개 생성 → ${OUT_DIR}`)
