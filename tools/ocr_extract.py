# -*- coding: utf-8 -*-
"""扫描版教材 → CSV 词条提取

用法: python ocr_extract.py <起始页> <结束页> [输出.csv]
思路:
  1. PyMuPDF 把扫描页渲染成图片
  2. RapidOCR 识别，拿到带坐标的文本段
  3. 按 x 分左右栏，按 y（行高自适应）聚成行
  4. 按「英文 [音标] 词性. 中文」的版式拆词条（一行被粘在一起也能按音标拆开）
  5. 音标一律丢弃（OCR 对 IPA 符号不可靠），留空让应用联网补齐
"""
import os, re, sys, time, csv
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import fitz
from rapidocr_onnxruntime import RapidOCR

DIR = r'e:\hl\Program Files\traework\book'
TEMP = os.environ['TEMP']
PDF = os.path.join(DIR, [f for f in os.listdir(DIR) if f.lower().endswith('.pdf')][0])

START = int(sys.argv[1]) if len(sys.argv) > 1 else 1
END = int(sys.argv[2]) if len(sys.argv) > 2 else 10
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(DIR, 'ocr_words.csv')

CJK = re.compile('[\u4e00-\u9fff]')
# 音标段：[...] 或 /.../
PH_SPLIT = re.compile(r'[\[/]([^\]\[/]{1,40})[\]/]')
ENGLISH = re.compile(r"[A-Za-z][A-Za-z'’\-]*(?: [A-Za-z][A-Za-z'’\-]*){0,3}")


def strip_no(s):
    """去掉行首序号：① 被 OCR 认成 O / 0 的情况很常见"""
    return re.sub(r'^\s*[0-9OoQ①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]{1,2}(?=[A-Za-z])', '', s)


def clean_cn(s):
    s = s.strip()
    s = re.sub(r'^[）)\]】】,，、.。;；:：·\-\s]+', '', s)   # 开头残缺标点
    s = re.sub(r'[（(\[【]\s*$', '', s)                      # 结尾半个括号
    if '）' in s and '（' not in s:                          # OCR 漏掉左括号，例如「局部覆盖的）地毯」
        s = '（' + s
    if '】' in s and '【' not in s:
        s = '【' + s
    return re.sub(r'\s+', ' ', s).strip()


def last_english(before):
    """音标之前最后一段英文（前面可能粘着上一个词条的中文）"""
    cands = ENGLISH.findall(strip_no(before))
    return cands[-1].strip() if cands else ''


def first_chinese(after):
    """音标之后的中文，截到下一个英文单词为止"""
    m = CJK.search(after)
    if not m:
        return ''
    seg = after[m.start():]
    m2 = re.search(r'\s[A-Za-z]{3,}', seg)
    if m2:
        seg = seg[:m2.start()]
    return clean_cn(seg)


def split_entries(line):
    """一行 → 若干 (英文, 中文)；靠音标切分，粘行也能拆开"""
    toks = PH_SPLIT.split(line)
    out = []
    for i in range(1, len(toks), 2):
        before = toks[i - 1]
        after = toks[i + 1] if i + 1 < len(toks) else ''
        en = last_english(before)
        if len(en) < 2 or not re.match(r'^[A-Za-z]', en):
            continue
        out.append((re.sub(r'\s+', ' ', en), first_chinese(after), line))
    return out


def make_row(segs, col):
    segs = sorted(segs, key=lambda s: s['x'])
    return {
        'line': ' '.join(s['t'] for s in segs).strip(),
        'y': sum(s['y'] for s in segs) / len(segs),
        'x': min(s['x'] for s in segs),
        'h': max(s['h'] for s in segs),
        'col': col
    }


def find_cn_below(row, rows):
    """英文行下方紧邻的纯中文行 —— 补回换行排版的释义"""
    best = None
    for r in rows:
        if r is row or r['col'] != row['col']:
            continue
        dy = r['y'] - row['y']
        if dy <= 0 or dy > max(30, row['h'] * 1.8):
            continue
        if abs(r['x'] - row['x']) > 260:
            continue
        if PH_SPLIT.search(r['line']) or not CJK.search(r['line']):
            continue      # 带音标的是另一个词条，不是释义
        if best is None or r['y'] < best['y']:
            best = r
    return clean_cn(best['line']) if best else ''


def page_entries(ocr, doc, pno):
    png = os.path.join(TEMP, 'ocr_tmp_%d.png' % pno)
    doc[pno - 1].get_pixmap(dpi=200).save(png)
    result, _ = ocr(png)
    os.remove(png)
    if not result:
        return []

    segs = []
    for item in result:
        box, text = item[0], item[1]
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        segs.append({
            'x': min(xs), 'y': sum(ys) / len(ys),
            'h': max(ys) - min(ys) or 20,
            't': text.strip()
        })
    if not segs:
        return []
    width = max(s['x'] for s in segs) + 200

    rows = []
    for ci, col in enumerate(([s for s in segs if s['x'] < width / 2],
                              [s for s in segs if s['x'] >= width / 2])):
        col.sort(key=lambda s: s['y'])
        cur, last_y, last_h = [], None, 20
        for s in col:
            # 收紧：宁可漏中文，也不要把相邻词条粘成一行导致释义错配
            if last_y is not None and abs(s['y'] - last_y) > max(10, min(last_h, s['h']) * 0.9):
                if cur:
                    rows.append(make_row(cur, ci))
                cur = []
            cur.append(s)
            last_y, last_h = s['y'], s['h']
        if cur:
            rows.append(make_row(cur, ci))

    entries = []
    for row in rows:
        if not row['line']:
            continue
        for en, cn, raw in split_entries(row['line']):
            entries.append((en, cn or find_cn_below(row, rows), raw))
    return entries


def main():
    t0 = time.time()
    ocr = RapidOCR()
    doc = fitz.open(PDF)
    end = min(END, doc.page_count)
    all_entries, hit_pages = [], 0
    for pno in range(START, end + 1):
        ents = page_entries(ocr, doc, pno)
        if ents:
            hit_pages += 1
            all_entries.extend(ents)
        if (pno - START) % 5 == 0:
            print('  进度 %d/%d，已得 %d 条，用时 %.0fs' % (pno - START + 1, end - START + 1, len(all_entries), time.time() - t0))

    seen, rows = set(), []
    for en, cn, raw in all_entries:
        k = en.lower()
        if k in seen:
            continue
        seen.add(k)
        rows.append({'word': en, 'phonetic': '', 'meaning': cn})

    with open(OUT, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=['word', 'phonetic', 'meaning'])
        w.writeheader()
        w.writerows(rows)

    print('\n===== 完成 =====')
    print('扫描页: %d-%d（共 %d 页），命中单词表的页: %d' % (START, end, end - START + 1, hit_pages))
    print('提取词条: %d 条，去重后: %d 条' % (len(all_entries), len(rows)))
    print('用时: %.0fs，输出: %s' % (time.time() - t0, OUT))
    print('\n前 25 条预览：')
    for r in rows[:25]:
        print('  %-22s %s' % (r['word'], r['meaning']))


if __name__ == '__main__':
    main()
