#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 lilinji/English 仓库的 xlsx 词库转成项目用的 wordbooks.js。

用法:
    python tools/wordbook_build.py <仓库目录> [输出文件]

输出格式（紧凑数组，减小体积）:
    window.WORDBOOKS = [{"cat": "四级", "book": "四级词汇便携版", "words": [[w, p, m], ...]}, ...]

选择哪些词书、每本取多少词，见下方 CATS / PER_BOOK_LIMIT，改完重跑即可。
"""
import json, os, re, sys, zipfile
from xml.etree import ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
PER_BOOK_LIMIT = 1200      # 每本词书最多取多少词
UNIT_SIZE = 40             # index.html 里每个单元的词汇量
MEANING_MAX = 60           # 释义截断长度

# (仓库目录, [书名关键词...])  关键词按顺序匹配，命中即止
CATS = [
    ('2.中考',        ['5·3中考']),
    ('2.高考',        ['抗遗忘高考词汇3500']),
    ('3.四级',        ['四级词汇便携版']),
    ('4.六级',        ['六级词汇闪过乱序版']),
    ('5.考研',        ['恋练有词考研英语词汇']),
    ('3.专四',        ['专四词汇便携版']),
    ('4.专八',        ['专八词汇便携版']),
    ('7.托福',        ['TOEFL核心词汇21天突破']),
    ('7.雅思',        ['雅思分级词汇21天进阶']),
    ('6.研究生',      ['2021硕士研究生英语（一）大纲词汇']),
    ('6.考博',        ['考博词汇便携版']),
    ('8.商务英语',    ['BEC词汇乱序版']),
    ('9.其他（更多）', ['GRE词汇精选乱序版']),
    ('8.新概念英语',  ['新概念英语第一册（新版）', '新概念英语第二册（新版）',
                       '新概念英语第三册（新版）', '新概念英语第四册（新版）']),
]
CAT_CN = {
    '2.中考': '中考', '2.高考': '高考', '3.四级': '四级', '4.六级': '六级',
    '5.考研': '考研', '3.专四': '专四', '4.专八': '专八', '7.托福': '托福',
    '7.雅思': '雅思', '6.研究生': '研究生', '6.考博': '考博', '8.商务英语': '商务英语',
    '9.其他（更多）': 'GRE', '8.新概念英语': '新概念英语',
}

WORD_RE = re.compile(r"^[A-Za-z][A-Za-z'\- ]{0,38}$")
MEANING_SPLIT = re.compile(r'[\n\r;；]+')


def col_idx(ref):
    m = re.match(r'([A-Z]+)', ref or '')
    if not m:
        return 0
    n = 0
    for ch in m.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_sheet(path):
    """返回 (header, rows)，rows 为原始二维字符串"""
    z = zipfile.ZipFile(path)
    names = z.namelist()
    shared = []
    if 'xl/sharedStrings.xml' in names:
        try:
            root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            shared = [''.join(t.text or '' for t in si.iter(NS + 't')) for si in root]
        except Exception:
            shared = []
    sheets = [n for n in names if re.match(r'xl/worksheets/sheet\d*\.xml$', n)]
    sheets.sort(key=lambda n: int(re.search(r'sheet(\d+)', n).group(1)) if re.search(r'sheet(\d+)', n) else 0)
    if not sheets:
        return None, []

    def val(c):
        v, isel, t = c.find(NS + 'v'), c.find(NS + 'is'), c.get('t')
        if t == 's' and v is not None:
            try:
                return shared[int(v.text)]
            except Exception:
                return ''
        if t == 'inlineStr' and isel is not None:
            return ''.join(x.text or '' for x in isel.iter(NS + 't'))
        return (v.text if v is not None else '')

    header, rows = None, []
    with z.open(sheets[0]) as f:
        for ev, el in ET.iterparse(f, events=('end',)):
            if el.tag != NS + 'row':
                continue
            vals = []
            for c in el.iter(NS + 'c'):
                i = col_idx(c.get('r'))
                while len(vals) <= i:
                    vals.append('')
                vals[i] = val(c)
            el.clear()
            if header is None:
                if '单词' in ' '.join(vals) or 'word' in ' '.join(vals).lower():
                    header = vals
                continue
            rows.append(vals)
    return header, rows


def norm_phonetic(us, uk):
    """音标：美音优先，[xxx] -> /xxx/"""
    for s in (us, uk):
        s = (s or '').strip()
        if not s or s in ('-', '—'):
            continue
        s = re.sub(r'\s+', ' ', s)
        if s.startswith('[') and s.endswith(']'):
            s = '/' + s[1:-1] + '/'
        elif not s.startswith('/'):
            s = '/' + s.strip('/') + '/'
        return s
    return ''


def norm_meaning(s):
    s = (s or '').replace('\\n', '\n')
    first = MEANING_SPLIT.split(s)
    s = '；'.join(x.strip() for x in first if x.strip())
    s = re.sub(r'\s+', ' ', s).strip('； ')
    return s[:MEANING_MAX]


def build(root, out_path):
    result, log = [], []
    for cat_dir, keys in CATS:
        base = os.path.join(root, cat_dir)
        if not os.path.isdir(base):
            log.append('!! missing dir %s' % cat_dir)
            continue
        files = []
        for dp, dn, fn in os.walk(base):
            for f in fn:
                if f.lower().endswith('.xlsx') and not f.startswith('~$'):
                    files.append(os.path.join(dp, f))
        for key in keys:
            # 书名精确匹配优先，其次包含匹配取最全的一本
            exact = [f for f in files if os.path.basename(f)[:-5] == key]
            hit = exact or [f for f in files if key in os.path.basename(f)]
            if not hit:
                log.append('!! %s: no book matching %r' % (cat_dir, key))
                continue
            src = hit[0] if exact else sorted(hit, key=os.path.getsize)[-1]
            header, rows = read_sheet(src)
            if not header:
                log.append('!! %s: no header' % os.path.basename(src))
                continue
            low = [str(h or '').strip() for h in header]
            def col(*names):
                for n in names:
                    if n in low:
                        return low.index(n)
                return -1
            cw, cu, ck, cm = col('单词', 'word'), col('美音', '美标'), col('英音', '英标'), col('释义', 'meaning')
            if cw < 0 or cm < 0:
                log.append('!! %s: unexpected header %s' % (os.path.basename(src), low))
                continue

            words, seen = [], set()
            for r in rows:
                w = (r[cw] if cw < len(r) else '') or ''
                w = re.sub(r'\s+', ' ', str(w)).strip()
                if not WORD_RE.match(w):
                    continue
                k = w.lower()
                if k in seen:
                    continue
                seen.add(k)
                p = norm_phonetic(r[cu] if 0 <= cu < len(r) else '', r[ck] if 0 <= ck < len(r) else '')
                m = norm_meaning(r[cm] if cm < len(r) else '')
                words.append([w, p, m])
            total = len(words)
            # 字母序词书均匀抽样（否则取前 N 只会覆盖 a-c），其余取前 N（高频/乱序在前）
            heads = {w[0][0].lower() for w in words[:200] if w[0]}
            uniform = (len(words) > 500 and len(heads) <= 6) or ('大纲' in key) or ('正序' in key)
            if len(words) > PER_BOOK_LIMIT:
                if uniform:
                    step = len(words) / float(PER_BOOK_LIMIT)
                    words = [words[int(i * step)] for i in range(PER_BOOK_LIMIT)]
                else:
                    words = words[:PER_BOOK_LIMIT]
            result.append({'cat': CAT_CN.get(cat_dir, cat_dir), 'book': os.path.basename(src)[:-5],
                           'words': words})
            log.append('%-14s %-40s %6d -> %5d' % (CAT_CN.get(cat_dir, cat_dir),
                                                    os.path.basename(src)[:-5], total, len(words)))

    total = sum(len(b['words']) for b in result)
    units = sum(-(-len(b['words']) // UNIT_SIZE) for b in result)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('// 分级词库：源自 github.com/lilinji/English（单词/美音/英音/释义），按考试分类整理\n')
        f.write('// 重新生成：python tools/wordbook_build.py <仓库目录> wordbooks.js\n')
        f.write('// 共 %d 个分类、%d 条词汇，每 %d 条一个单元\n' % (len({b["cat"] for b in result}), total, UNIT_SIZE))
        f.write('window.WORDBOOKS = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('\n'.join(log))
    print('--- books=%d  words=%d  units=%d  file=%.2f MB' %
          (len(result), total, units, os.path.getsize(out_path) / 1048576.0))


if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\benla\AppData\Local\Temp\lilinji-english'
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'wordbooks.js')
    build(root, out)
