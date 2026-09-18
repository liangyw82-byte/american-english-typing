# -*- coding: utf-8 -*-
"""合并 OCR 分片结果 → 最终 CSV（去重、补齐缺失释义、统计质量）"""
import os, re, sys, csv

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TEMP = os.environ['TEMP']
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else HERE          # 放 part1..4.csv 的目录
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(HERE), 'ocr_words.csv')

def clean_meaning(m):
    """清掉 OCR 残留：&vt. 之类的词性、重复分号"""
    m = re.sub(r'\s*&+\s*[a-zA-Z]+\.\s*', '；', m)
    m = re.sub(r'\s*&+\s*', '；', m)
    m = re.sub(r'[；;]{2,}', '；', m)
    return m.strip('；;· ')


rows = []
for i in range(1, 5):
    p = os.path.join(SRC, 'part%d.csv' % i)
    if not os.path.exists(p):
        continue
    with open(p, encoding='utf-8-sig') as f:
        rows.extend(list(csv.DictReader(f)))

merged = {}
order = []
for r in rows:
    w = (r.get('word') or '').strip()
    m = clean_meaning((r.get('meaning') or '').strip())
    if len(w) < 2 or not re.match(r'^[A-Za-z][A-Za-z\'’\- ]*$', w):
        continue
    if re.search('[\u4e00-\u9fff]', w):
        continue
    if not re.search(r'[aeiouyAEIOUY]', w):      # rtt 这种没元音的 OCR 噪声
        continue
    w = re.sub(r'\s+[a-z]$', '', w)              # 末尾多出来的孤立字母，如 luggage u
    w = re.sub(r'\s+', ' ', w).strip()
    k = w.lower()
    if k not in merged:
        merged[k] = {'word': w, 'phonetic': '', 'meaning': m}
        order.append(k)
    elif not merged[k]['meaning'] and m:
        merged[k]['meaning'] = m          # 用后面分片补齐缺失的中文

final = [merged[k] for k in order]

with open(OUT, 'w', newline='', encoding='utf-8-sig') as f:
    wcsv = csv.DictWriter(f, fieldnames=['word', 'phonetic', 'meaning'])
    wcsv.writeheader()
    wcsv.writerows(final)

n = len(final)
with_cn = sum(1 for r in final if r['meaning'])
print('合并前 %d 条 → 去重后 %d 条' % (len(rows), n))
print('有中文释义: %d 条（%.1f%%），缺失: %d 条' % (with_cn, with_cn / n * 100 if n else 0, n - with_cn))
print('输出: %s' % OUT)
print('\n随机抽 30 条核对：')
import random
random.seed(7)
for r in random.sample(final, min(30, n)):
    print('  %-22s %s' % (r['word'], r['meaning']))
