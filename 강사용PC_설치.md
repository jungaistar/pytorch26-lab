# 강사용 PC 설치 (강의장, Windows)

2026-07-27 강의 당일 작성. **아무것도 안 깔린 상태**에서 시작하는 기준입니다.

전체 20~30분, 대부분은 PyTorch 내려받는 시간입니다.

---

## 0. 확인만 하고 넘어갈 것

강의장 PC 사양은 **Intel i7-8700 / RTX 2070 / Windows** 입니다.

**GPU는 있어도 이번 과정 실습은 대부분 CPU로 돕니다.** 신경망이 작아 CPU가 오히려 빠릅니다.
GPU 빌드를 깔아 두는 이유는 2일차 파이토치 기초에서 `cuda` 로 잡히는 것을 보여주기 위해서입니다.

---

## 1. 아나콘다 설치

<https://www.anaconda.com/download>

설치 중 **"Add Anaconda to my PATH environment variable"** 체크.

> 용량이 부담되면 미니콘다도 됩니다 — 이후 명령은 완전히 같고, 시작 메뉴 이름만
> **Anaconda Prompt (Miniconda3)** 로 다릅니다.

---

## 2. 가상환경 만들기

시작 메뉴에서 **Anaconda Prompt** 실행 후,

```
conda create -n rl python=3.10 -y
conda activate rl
```

### 채널 3개가 뜨고 `a` 를 누르라고 하면 — 정상입니다

최근 conda 는 **채널(패키지 저장소)마다 이용약관 동의**를 받습니다.
윈도우 아나콘다의 기본 채널이 `pkgs/main` · `pkgs/r` · `pkgs/msys2` 3개라 세 줄이 뜹니다.

```
[(a)ccept/(r)eject/(v)iew]
```

여기서 **`a`** 를 누르면 됩니다. 동의하지 않으면 그 채널에서 설치가 아예 되지 않습니다.

> 맥은 `msys2` 채널이 없어 2개만 뜹니다. **윈도우에서만 3개로 보이는 이유**입니다.

미리 동의해 두려면 (선택):

```
conda tos accept
```

프롬프트 앞에 `(rl)` 이 보이면 됐습니다.

---

## 3. PyTorch 설치 (GPU 빌드)

```
pip install torch --index-url https://download.pytorch.org/whl/cu126
```

**`--index-url` 을 빼면 CPU 전용이 깔려 RTX 2070을 못 씁니다.**
PyPI 기본 Windows 휠은 122MB 짜리 CPU 전용입니다(직접 확인한 사실).

용량이 커서 몇 분 걸립니다.

---

## 4. 강화학습 라이브러리

```
pip install "gymnasium[box2d]" numpy matplotlib
```

`[box2d]` 를 빼면 미니 프로젝트의 **달 착륙선(LunarLander)** 이 안 돕니다.
따옴표를 꼭 붙이세요 — 없으면 명령창이 대괄호를 다르게 해석합니다.

---

## 5. 실습 파일 받기

```
cd %USERPROFILE%\Desktop
git clone https://github.com/jungaistar/pytorch26-lab.git
cd pytorch26-lab
```

git 이 없으면 <https://git-scm.com/download/win> 에서 설치하거나,
GitHub 페이지에서 **Code → Download ZIP** 으로 받아도 됩니다.

---

## 6. 설치 확인 (가장 중요)

```
python 00_env_check.py
```

아래처럼 나오면 준비 완료입니다.

```
[OK]   PyTorch: 2.x.x
[OK]   Gymnasium: 1.3.0
[OK]   NumPy: ...
[OK]   NumPy↔PyTorch 연동: torch.from_numpy 정상 (합 6)
[OK]   GPU(CUDA): 사용 가능 — NVIDIA GeForce RTX 2070 (CUDA 12.6)
[OK]   실습 환경(Gym): 7종 전부 정상
 준비 완료 — 이대로 수업에 들어오시면 됩니다.
```

**`GPU(CUDA): 사용 불가` 로 나오면** 3단계에서 `--index-url` 을 빠뜨린 것입니다.

```
pip uninstall torch -y
pip install torch --index-url https://download.pytorch.org/whl/cu126
```

---

## 7. VS Code

<https://code.visualstudio.com/>

- 확장에서 **Python**, **Korean Language Pack** 설치
- `Ctrl+Shift+P` → **Python: Select Interpreter** → **rl** 선택
  - **이걸 빠뜨리면 분명히 설치했는데도 라이브러리를 못 찾습니다.** 가장 흔한 실수입니다.
- 프로젝터 가독성이 나쁘면 **설정 → Color Theme → Light**

---

## 강의 진행 방법

**교시별 `.py` 파일은 단독으로 안 돕니다.** 뒤 교시가 앞 교시의 변수·클래스를 이어 쓰기 때문입니다
(1일차 3~5교시, 2일차 4·7교시, 3일차 2·6교시).

**진행은 일차별 노트북으로 하세요.**

```
day1/day1_전체.ipynb
day2/day2_전체.ipynb
day3/day3_전체.ipynb
```

위에서부터 순서대로 실행하면 이어집니다. 3일차 노트북에는 2일차의 `ReplayBuffer` 가
"(이어받기)" 셀로 맨 앞에 들어 있어, 3일차만 새로 열어도 됩니다.

교시별 `.py` 는 특정 교시 코드만 화면에 크게 띄우거나 수강생에게 파일로 줄 때 씁니다.

---

## 학습 대기 시간 (실측, CPU 기준)

강사 맥(Intel i9)에서 잰 값입니다. **RTX 2070 PC에서도 이 코드들은 CPU로 도니 비슷합니다.**

| 일차 | 대기 총합 | 긴 교시 |
|---|---|---|
| 1일차 | 2초 | 없음 |
| 2일차 | 149초 | 4교시 DQN 52초 · 5교시 REINFORCE 77초 |
| 3일차 | **약 15분** | **2교시 DDPG 6분 · 6교시 SAC 8분 43초** |

3일차 대기는 2교시와 6교시 두 곳에 몰려 있습니다.
**학습이 도는 동안 이론을 설명하는 방식으로 진행합니다**(대표 결정) — 에피소드 수는 줄이지 않았습니다.
노트북 셀 위에 예상 시간을 표기해 두었으니 설명 분량을 배분하시면 됩니다.

---

## 문제가 생기면

| 증상 | 조치 |
|---|---|
| `conda` 명령을 못 찾음 | 일반 명령창 말고 **Anaconda Prompt** |
| `No module named 'torch'` | `conda activate rl` 안 했거나 VS Code 인터프리터가 rl 이 아님 |
| `No module named 'Box2D'` | `pip install "gymnasium[box2d]"` |
| `RuntimeError: Numpy is not available` | `pip install "numpy<2"` |
| 그래프 한글이 □□□ | Windows는 맑은 고딕이 기본이라 보통 안 생깁니다. 나면 알려주세요 |

**최후의 수단**: <https://colab.research.google.com/> 에서 노트북을 열면 그대로 돕니다.
사이트 [환경설정] → [05 Google Colab] 참고.
