# -*- coding: utf-8 -*-
"""从《走遍美国》(Family Album U.S.A.) 的 78 个 srt 字幕生成练习教材 zoubian.js。

结构：26 集 × 每集 3 幕 = 78 个字幕文件（Nrm.srt，N 即第 N 幕）。
字幕为纯英文，一句话常被切成多条显示行，需按「句末标点 + 下句首字母大写」重新合并成完整句。

用法：
    python tools/extract_zoubian.py
    python tools/extract_zoubian.py --words 16
"""
import argparse
import json
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_shameless as ex  # 复用 OCR 词表、单词筛选、人名识别

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'zoubian.js')

# 26 集标准目录（英文原名 + 通用中文译名）
EP_CN = {
    1: ('46 Linden Street', '林登大街46号'),
    2: ('The Blind Date', '相亲'),
    3: ("Grandpa's Trunk", '爷爷的行李箱'),
    4: ('A Piece of Cake', '小菜一碟'),
    5: ('The Right Magic', '神奇的魔力'),
    6: ('Thanksgiving', '感恩节'),
    7: ("Man's Best Friend", '人类最好的朋友'),
    8: ("You're Going to Be Fine", '你会好起来的'),
    9: ("It's Up to You", '由你决定'),
    10: ('Smell the Flowers', '闻闻花香'),
    11: ('A Place of Our Own', '自己的家'),
    12: ("You're Tops", '你最棒'),
    13: ('A Real Stewart', '真正的斯图尔特'),
    14: ('Playing Games', '玩游戏'),
    15: ('Second Honeymoon', '第二次蜜月'),
    16: ('Full of Surprises', '意外惊喜'),
    17: ('Photo Finish', '最后的瞬间'),
    18: ('Making a Difference', '有所作为'),
    19: ('I Do', '我愿意'),
    20: ('Quality Time', '黄金时光'),
    21: ('A Big Fish in a Small Pond', '小池大鱼'),
    22: ('Career Choices', '职业选择'),
    23: ('The Community Center', '社区中心'),
    24: ('Parting Friends', '饯行'),
    25: ('Country Music', '乡村音乐'),
    26: ('Opening Night', '首演之夜'),
}
ACT_NAME = {1: 'ACT I', 2: 'ACT II', 3: 'ACT III'}

ABBREV = re.compile(r"\b(mr|mrs|ms|dr|st|sr|jr|lt|prof|no|vs|etc)\.$", re.I)
TITLE_LINE = re.compile(r'(^|\s)(episode\s*\d+|act\s*(i|ii|iii|iv)\b)', re.I)


def load_index_words():
    """index.html 里各教材自带的单词（word/phonetic/meaning），作为词典补充。"""
    path = os.path.join(BASE, 'index.html')
    d = {}
    if not os.path.exists(path):
        return d
    for m in re.finditer(r'word\s*:\s*"([^"]+)"\s*,\s*phonetic\s*:\s*"([^"]*)"\s*,\s*meaning\s*:\s*"([^"]*)"',
                          ex.read_text(path)):
        w = m.group(1).strip().lower()
        if w and w not in d:
            d[w] = (m.group(2), m.group(3))
    return d


def build_dict():
    d = {}
    d.update(ex.load_ocr_dict())     # 《美国人每天说的话》附录
    d.update(load_index_words())     # 教材自带词表，质量更好，覆盖前者
    return d


def find_dir():
    for name in os.listdir(BASE):
        p = os.path.join(BASE, name)
        if os.path.isdir(p) and ('走遍美国' in name or 'Family Album' in name):
            return p
    raise SystemExit('未找到《走遍美国》字幕目录')


def clean_line(s):
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('\\N', ' ').replace('\\n', ' ')
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def parse_srt(path):
    """返回 [[字幕行, ...], ...]，按时间顺序。"""
    t = ex.read_text(path).replace('\r\n', '\n').replace('\r', '\n')
    caps = []
    for part in re.split(r'\n\s*\n', t):
        lines = [l.strip() for l in part.split('\n') if l.strip()]
        if not lines:
            continue
        if re.match(r'^\d+$', lines[0]):
            lines = lines[1:]
        if lines and '-->' in lines[0]:
            lines = lines[1:]
        lines = [clean_line(x) for x in lines if clean_line(x)]
        if lines:
            caps.append(lines)
    return caps


def looks_title(s):
    if not s:
        return True
    if TITLE_LINE.search(s):
        return True
    if re.match(r'^\s*u?\d{1,2}\s*[-–.]?\s*\d?\s*$', s):
        return True
    if re.match(r'^\s*u?\d{1,2}[-–.]', s) and len(s.split()) <= 7:
        return True
    return False


def usable(s):
    w = s.split()
    if not (2 <= len(w) <= 28):
        return False
    if not re.match(r'^[A-Za-z"\']', s):
        return False
    letters = sum(len(x) for x in re.findall(r"[A-Za-z']+", s))
    if letters / max(len(s), 1) < 0.6:
        return False
    if s.upper() == s and len(w) > 3:      # 全大写：音效/喊叫
        return False
    return True


def build_sentences(caps):
    """把被切碎的字幕行合并成完整句子。"""
    out = []
    buf = ''

    def flush():
        nonlocal buf
        s = re.sub(r'\s+', ' ', buf).strip()
        s = re.sub(r'^[-\s–]+', '', s).strip()
        if usable(s):
            out.append(s)
        buf = ''

    for cap in caps:
        for ln in cap:
            if not ln:
                continue
            if looks_title(ln):            # 集名/幕标记行
                flush()
                continue
            if buf:
                new_turn = ln.startswith(('-', '—', '"', "'"))
                ended = re.search(r'[.?!]["\')\]]?\s*$', buf)
                if new_turn or (ended and not ABBREV.search(buf) and re.match(r'^[A-Z"\']', ln)):
                    flush()
            buf = (buf + ' ' + ln).strip() if buf else ln
            if len(buf.split()) > 26:
                flush()
    flush()
    return out


def guess_ep_name(caps):
    """从首条字幕里取集名（英文字幕里偶尔带中文译名），用于校验/补全目录。"""
    if not caps:
        return None
    first = ' '.join(caps[0])
    cn = ''.join(re.findall(r'[\u4e00-\u9fff]+', first))
    en = None
    m = re.search(r'Episode\s*\d+:\s*(.+?)\s*(ACT\b|$)', first, re.I)
    if m:
        en = m.group(1)
    else:
        m = re.match(r'^\s*u?\d{1,2}\s*[-–.]?\s*\d?\s*(.+?)\s*(ACT\b|$)', first, re.I)
        if m:
            en = m.group(1)
            en = re.sub(r'^[\d\s\-–.]+', '', en)      # 去掉 "24-1" 这类编号前缀
    if en:
        en = re.sub(r'[\u4e00-\u9fff]+', '', en).strip(' -–.')
        en = re.sub(r'\s+', ' ', en)
        if en.isupper() and len(en) <= 24:
            en = en.title()
    if not en or re.match(r'^(act\s*(i|ii|iii|iv)?|\d+)$', en.strip(), re.I) or len(en.split()) > 6:
        en = None
    return (en, cn) if (en or cn) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--words', type=int, default=12, help='每幕提取的单词数')
    args = ap.parse_args()

    root = find_dir()
    ocr = build_dict()
    print('字幕目录:', os.path.basename(root))
    print('词典:', len(ocr), '条（OCR 附录 + 项目教材词表）')

    files = {}
    for f in os.listdir(root):
        m = re.match(r'(\d+)', f)
        if m and f.lower().endswith('.srt'):
            files[int(m.group(1))] = os.path.join(root, f)

    # 第一遍：解析全部，得到每幕的句子（保留剧情顺序）
    acts = {}
    ep_names = {}
    for num in sorted(files):
        caps = parse_srt(files[num])
        ep = (num - 1) // 3 + 1
        act = (num - 1) % 3 + 1
        g = guess_ep_name(caps)
        if g:
            g_en, g_cn = g
            rec = ep_names.setdefault(ep, {'en': '', 'cn': ''})
            if g_en and len(g_en) > len(rec['en']):
                rec['en'] = g_en
            if g_cn and not rec['cn']:
                rec['cn'] = g_cn
            want = EP_CN.get(ep, ('', ''))[0]
            if g_en and want and g_en.lower().replace("'", '') != want.lower().replace("'", ''):
                print('  集名不一致 E%02d: 字幕=%r 目录=%r' % (ep, g_en, want))
        acts[num] = (ep, act, build_sentences(caps))

    names = ex.build_name_blacklist([s for _, _, ss in acts.values() for s in ss])
    print('人名/专名排除:', len(names), sorted(names)[:8])

    chapters = defaultdict(list)
    seen = set()
    total_s = total_w = 0
    for num in sorted(acts):
        ep, act, sents = acts[num]
        uniq = []
        for s in sents:
            k = re.sub(r'[^a-z ]', '', s.lower()).strip()
            if k in seen or len(k) < 6:
                continue
            seen.add(k)
            uniq.append(s)
        if not uniq:
            continue
        words = ex.pick_words(uniq, ocr, names, args.words)
        chapters[ep].append({
            'title': ACT_NAME[act],
            'subtopics': [],
            'words': words,
            'sentences': [{'en': s, 'cn': ''} for s in uniq],
        })
        total_s += len(uniq)
        total_w += len(words)

    book_units = []
    for ep in sorted(chapters):
        en_name, cn_name = EP_CN.get(ep, ('Episode %d' % ep, ''))
        sub = ep_names.get(ep)
        if sub:
            en_name = sub['en'] or en_name
            cn_name = sub['cn'] or cn_name
        book_units.append({
            'chapter': 'Episode %d' % ep,
            'title': '第 %d 集 %s %s' % (ep, en_name, cn_name),
            'units': sorted(chapters[ep], key=lambda u: list(ACT_NAME.values()).index(u['title'])),
        })

    book = {
        'id': 'zoubian-meiguo',
        'title': '走遍美国',
        'subtitle': 'Family Album U.S.A. 26 集全 78 幕',
        'icon': '🎬',
        'hasVolumes': False,
        'units': book_units,
    }

    js = []
    js.append('// 自动生成，源：《走遍美国》Family Album U.S.A. 78 幕英文字幕（tools/extract_zoubian.py）')
    js.append('// 共 %d 集 / %d 幕 / %d 句 / %d 词' % (len(book_units), sum(len(c['units']) for c in book_units),
                                                    total_s, total_w))
    js.append('(function () {')
    js.append('  var book = ' + json.dumps(book, ensure_ascii=False, separators=(',', ':')) + ';')
    js.append('  if (typeof textbooks === "undefined") { window.ZOUBIAN_BOOK = book; return; }')
    js.append('''  var i = textbooks.findIndex(function (t) { return t.id === "zoubian-meiguo"; });
  if (i >= 0) textbooks[i] = book; else textbooks.push(book);
  try {
    if (typeof pristineTextbooks !== "undefined" && pristineTextbooks) {
      var j = pristineTextbooks.findIndex(function (t) { return t.id === "zoubian-meiguo"; });
      if (j >= 0) pristineTextbooks[j] = book; else pristineTextbooks.push(book);
    }
  } catch (e) { /* ignore */ }
  if (typeof renderSidebar === "function") renderSidebar();''')
    js.append('})();')
    open(OUT, 'w', encoding='utf-8').write('\n'.join(js) + '\n')

    print('生成:', OUT)
    print('大小: %.1f KB' % (os.path.getsize(OUT) / 1024.0))
    for c in book_units:
        print('  %-34s 幕 %d 句 %4d 词 %3d' % (c['title'], len(c['units']),
                                             sum(len(u['sentences']) for u in c['units']),
                                             sum(len(u['words']) for u in c['units'])))
    print('总计: 句 %d / 词 %d' % (total_s, total_w))


if __name__ == '__main__':
    main()
