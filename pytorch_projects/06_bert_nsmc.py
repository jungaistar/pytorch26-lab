# ============================================================
# [파이토치 응용 ⑥] BERT — 한국어 영화평 감성 분석
# ------------------------------------------------------------
# 교재 15장에 해당합니다. 데이터도 교재와 같은 NSMC(네이버 영화 리뷰)입니다.
#
# 처음부터 학습시키지 않습니다. 이미 한국어를 아는 모델을 데려옵니다.
#   BERT 는 위키피디아 같은 방대한 글로 미리 학습된 모델입니다.
#   우리는 그 위에 '판단기 하나만' 얹어서 긍정/부정을 맞힙니다.
#   이걸 전이학습(Transfer Learning) 또는 파인튜닝이라고 합니다.
#
# ★ 강화학습에서 본 것과 이어집니다 ★
#   [허깅페이스] 메뉴에서 학습된 강화학습 모델을 받아 썼죠?
#   같은 발상입니다. 남이 학습시킨 것을 가져다 쓰는 것.
#   요즘 실무는 대부분 이렇게 합니다.
#
# ★ 코랩에서 GPU 를 켜세요 ★
#   [런타임] -> [런타임 유형 변경] -> GPU
#   CPU 로 하면 30분 넘게 걸립니다.
#
# 첫 셀에 이것부터 실행:
#   !pip install -q transformers
#
# ※ 로컬(특히 인텔 맥)에서 돌릴 때 주의 — 코랩은 해당 없음
#   torch 가 2.2.x 에 묶여 있으면(인텔 맥의 상한) 최신 transformers 5.x 가
#   torch 를 인식하지 못하고 이런 오류를 냅니다.
#       ImportError: Unable to convert output to PyTorch tensors format,
#                    PyTorch is not installed.
#   torch 는 멀쩡히 깔려 있는데도 이렇게 나옵니다. 해결은 버전을 낮추는 것입니다.
#       pip install "transformers<5"      (4.57.x 에서 정상 동작 확인)
#   코랩은 최신 torch 라 그냥 !pip install transformers 로 됩니다.
#
# 걸리는 시간: GPU 로 5분 안팎
# ============================================================
import torch
import torch.nn as nn
import pandas as pd
import numpy as np

torch.manual_seed(0)
np.random.seed(0)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f'사용 장치: {device}')
if device.type == 'cpu':
    print('  ※ CPU 입니다. 아주 오래 걸립니다. GPU 를 켜시길 권합니다.')
    print('    [런타임] -> [런타임 유형 변경] -> GPU')


print()
print('=' * 58)
print('1. 데이터 — NSMC (네이버 영화 리뷰)')
print('=' * 58)

# 교재에서 쓰신 데이터를 그대로 씁니다.
URL = 'https://raw.githubusercontent.com/e9t/nsmc/master/'
train = pd.read_csv(URL + 'ratings_train.txt', sep='\t').dropna()
test = pd.read_csv(URL + 'ratings_test.txt', sep='\t').dropna()

# 수업용으로 줄입니다. 전체를 쓰면 GPU 로도 20분 넘게 걸립니다.
N_TRAIN, N_TEST = 6000, 1500
train = train.sample(N_TRAIN, random_state=0).reset_index(drop=True)
test = test.sample(N_TEST, random_state=0).reset_index(drop=True)

print(f'  학습용 {len(train):,}개 / 시험용 {len(test):,}개')
print(f'  label 1 = 긍정, 0 = 부정')
print()
print('  예시 몇 개:')
for i in range(3):
    lab = '긍정' if train.label[i] == 1 else '부정'
    print(f'    [{lab}] {train.document[i][:44]}')


print()
print('=' * 58)
print('2. 토크나이저 — 글을 숫자로 바꾸기')
print('=' * 58)

from transformers import BertTokenizer, BertForSequenceClassification

# 다국어 BERT — 한국어도 압니다. 교재에서 쓰신 것과 같은 모델입니다.
MODEL = 'bert-base-multilingual-cased'
tokenizer = BertTokenizer.from_pretrained(MODEL)

sample = train.document[0]
enc = tokenizer(sample, return_tensors='pt')
print(f'  원문   : {sample[:40]}')
print(f'  토큰   : {tokenizer.tokenize(sample)[:10]} ...')
print(f'  숫자로 : {enc["input_ids"][0][:10].tolist()} ...')
print('''
  신경망은 글자를 모릅니다. 숫자만 압니다.
  토크나이저가 글을 조각내고 각 조각에 번호를 붙여 줍니다.''')

MAX_LEN = 64            # 리뷰가 짧아서 64면 충분합니다


def encode(df):
    """문장들을 한꺼번에 숫자로 바꾼다"""
    e = tokenizer(
        list(df.document), truncation=True, padding='max_length',
        max_length=MAX_LEN, return_tensors='pt')
    return e['input_ids'], e['attention_mask'], torch.tensor(df.label.values)
    # attention_mask: 짧은 문장은 빈칸으로 채우는데, 어디가 진짜 글인지 표시


X_tr, M_tr, y_tr = encode(train)
X_te, M_te, y_te = encode(test)
print(f'\n  변환 결과 모양 {tuple(X_tr.shape)}   (문장 수, 최대 길이)')


print()
print('=' * 58)
print('3. 모델 — BERT 위에 판단기 하나 얹기')
print('=' * 58)

model = BertForSequenceClassification.from_pretrained(MODEL, num_labels=2).to(device)
# num_labels=2 : 긍정/부정 두 갈래
# BERT 본체는 그대로 두고, 마지막에 2개를 내놓는 층만 새로 붙습니다.

total = sum(p.numel() for p in model.parameters())
print(f'  전체 파라미터 {total:,}개 (1억 7천만 개쯤)')
print('  이걸 처음부터 학습시키려면 며칠이 걸립니다.')
print('  우리는 이미 학습된 것을 가져와 살짝 다듬기만 합니다.')

optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
# lr 이 2e-5 로 아주 작습니다.
#   이미 잘 학습된 모델이라 크게 흔들면 오히려 망가집니다.
#   "살짝 다듬는다"는 것이 학습률에도 그대로 나타납니다.


print()
print('=' * 58)
print('4. 학습')
print('=' * 58)

BATCH, EPOCHS = 32, 2


def run_epoch(X, M, y, train_mode):
    model.train() if train_mode else model.eval()
    total_loss, correct, n = 0.0, 0, 0
    perm = torch.randperm(len(X)) if train_mode else torch.arange(len(X))

    for i in range(0, len(X), BATCH):
        idx = perm[i:i + BATCH]
        ids, mask, lab = X[idx].to(device), M[idx].to(device), y[idx].to(device)

        with torch.set_grad_enabled(train_mode):
            out = model(input_ids=ids, attention_mask=mask, labels=lab)
            # transformers 는 labels 를 주면 손실까지 알아서 계산해 줍니다

            if train_mode:
                optimizer.zero_grad()
                out.loss.backward()
                optimizer.step()

        total_loss += out.loss.item() * len(idx)
        correct += (out.logits.argmax(1) == lab).sum().item()
        n += len(idx)

    return total_loss / n, correct / n


for epoch in range(EPOCHS):
    tr_loss, tr_acc = run_epoch(X_tr, M_tr, y_tr, True)
    te_loss, te_acc = run_epoch(X_te, M_te, y_te, False)
    print(f'  epoch {epoch}   학습 {tr_acc*100:5.1f}%   시험 {te_acc*100:5.1f}%'
          f'   (손실 {tr_loss:.4f} / {te_loss:.4f})')

print('''
  강사 맥북 실측 (CPU, 학습 6000개 / 시험 1500개, 최대길이 64):
      epoch 0   학습 67.8%   시험 77.5%
      epoch 1   학습 81.5%   시험 80.3%
  80% 안팎이면 정상입니다.

  왜 90% 가 안 나오나요?
    ① 다국어 BERT 라 한국어 전용 모델(KoBERT 등)보다 불리합니다.
    ② 수업용으로 6000개만 씁니다. 전체 15만개를 쓰면 더 오릅니다.
    ③ 최대길이 64 로 잘라서 긴 리뷰는 뒷부분이 버려집니다.
    ④ 2 에폭이면 짧습니다.

  그런데도 한국어를 따로 가르친 적이 없는 모델이 영화평을 80% 맞힙니다.
  처음부터 학습시켰다면 이 정확도에 며칠이 걸립니다.
  -> 이게 전이학습의 힘입니다.''')


print()
print('=' * 58)
print('5. 직접 문장을 넣어 보기')
print('=' * 58)

TESTS = [
    '연출도 좋고 배우 연기도 훌륭했다',
    '시간이 아깝다 돈 버렸음',
    '스토리는 별로인데 영상미는 대단하네',
    '이걸 왜 봤을까',
    '인생 영화입니다 강력 추천',
]

model.eval()
with torch.no_grad():
    e = tokenizer(TESTS, truncation=True, padding='max_length',
                  max_length=MAX_LEN, return_tensors='pt')
    out = model(input_ids=e['input_ids'].to(device),
                attention_mask=e['attention_mask'].to(device))
    prob = torch.softmax(out.logits, dim=1)

for t, p in zip(TESTS, prob):
    lab = '긍정' if p[1] > p[0] else '부정'
    conf = max(p).item()
    print(f'  [{lab} {conf*100:4.1f}%]  {t}')

print('\n  -> 여러분이 쓴 문장을 TESTS 목록에 넣어 시험해 보세요.')

# ============================================================
# 바꿔 보기
#   1) TESTS 에 직접 쓴 리뷰를 넣어 보세요. 애매한 문장일수록 재미있습니다.
#      ("스토리는 별로인데 영상미는 대단하네" 같은 문장을 어떻게 판단하는지)
#   2) N_TRAIN 을 20000 으로 늘리면 정확도가 오릅니다 (시간도 늘어납니다).
#   3) EPOCHS 를 5로 늘려 보세요. 시험 정확도가 언제부터 안 오르는지 보세요.
#      더 돌린다고 계속 좋아지지 않습니다.
#   4) lr 을 2e-4 로 열 배 키워 보세요.
#      이미 학습된 모델이 망가지는 것을 볼 수 있습니다 (정확도가 50%로 떨어짐).
#      -> 파인튜닝에서 학습률을 작게 쓰는 이유입니다.
# ============================================================
