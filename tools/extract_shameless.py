# -*- coding: utf-8 -*-
"""从《无耻之徒》Shameless 全季 .ass 双语字幕中提取对话，生成项目可用的教材 JS。

字幕结构：同一条 Dialogue 的 Text 为「中文\\N{\\r原文字幕}英文」，天然双语对齐。
输出：shameless.js —— 11 个 chapter（每季一个），chapter 下按集分 unit。

用法：
    python tools/extract_shameless.py                 # 默认每集 40 句 / 12 词
    python tools/extract_shameless.py --per-ep 60 --words 20
    python tools/extract_shameless.py --keep-profanity  # 保留脏话台词
"""
import argparse
import json
import os
import re
from collections import Counter, defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'shameless.js')

CJK = re.compile(r'[\u4e00-\u9fff]')
TAGS = re.compile(r'\{[^}]*\}')
EP_RE = re.compile(r'S(\d{1,2})E(\d{1,2})', re.I)

# 需要剔除的行（字幕组信息 / 音效 / 歌词 / 旁白标记）
JUNK_PAT = re.compile(
    r'www\.|https?://|opensubtitles|subtitle|sync|字幕组|正版|压制|翻译|校对|时间轴|'
    r'无耻之徒|第[一二三四五六七八九十\d]+季|第[一二三四五六七八九十\d]+集', re.I)

# 默认过滤的脏话/辱骂词（Shameless 为限制级剧集，默认净化）
PROFANITY = re.compile(
    r"\b(fuck\w*|shit\w*|bullshit|bitch\w*|cunt|dick\w*|cock\w*|pussy|whore|slut|"
    r"motherfuck\w*|fucker|nigg\w+|bastard|jackass|dumbass|ass|asses|arse|"
    r"wank\w*|twat|faggot|retard\w*)\b", re.I)

STOP = set("""i me my mine myself we us our ours you your yours he him his she her hers it its they them their
this that these those there here what which who whom whose when where why how
is am are was were be been being have has had do does did done doing will would shall should can could may might must
and but or nor so if then than as because while although though unless until
to of in on at by for with without about into onto over under again further
a an the all any some no not none only just very really quite too also even still yet
up down out off away back around about over through
go goes going went gone get gets getting got gotten come comes coming came
say says said saying see sees saw seen know knows knew known think thinks thought
want wants wanted need needs needed like likes liked love loves loved hate hates
make makes made made take takes took taken give gives gave given put puts
one two three four five six seven eight nine ten first second
yeah yea yep nope okay ok oh ah uh um hmm hey hi hello bye goodbye please thanks thank sorry
man men woman women guy guys girl girls kid kids thing things stuff
good bad big small little great right wrong sure true false
gonna wanna gotta ain gimme lemme outta kinda sorta
mr mrs miss ms dr sir maam mom dad mommy daddy brother sister
time times day days night way ways place home house room
""".split())


def find_subtitle_dir():
    for name in os.listdir(BASE):
        p = os.path.join(BASE, name)
        if os.path.isdir(p) and 'Shameless' in name:
            return p
    raise SystemExit('未找到 Shameless 字幕目录')


def read_text(path):
    raw = open(path, 'rb').read()
    for enc in ('utf-8-sig', 'utf-8', 'gbk', 'utf-16'):
        try:
            return raw.decode(enc)
        except Exception:
            continue
    return raw.decode('utf-8', 'replace')


def parse_ass(path):
    """返回 [(en, cn), ...]，按字幕时间顺序。"""
    text = read_text(path)
    lines = text.split('\n')
    pairs = []
    in_events = False
    for line in lines:
        s = line.strip()
        if s.startswith('['):
            in_events = s.startswith('[Events]')
            continue
        if not in_events or not s.startswith('Dialogue:'):
            continue
        parts = s.split(',', 9)
        if len(parts) < 10:
            continue
        body = TAGS.sub('', parts[9])
        segs = [x.strip() for x in re.split(r'\\N|\\n', body) if x.strip()]
        if not segs:
            continue
        en, cn = None, None
        if len(segs) >= 2:
            a, b = segs[0], ' '.join(segs[1:])
            if CJK.search(a) and not CJK.search(b):
                cn, en = a, b
            elif CJK.search(b) and not CJK.search(a):
                en, cn = a, b
            else:
                en = b if not CJK.search(b) else a
                cn = a if CJK.search(a) else None
        else:
            only = segs[0]
            if CJK.search(only):
                cn = only
            else:
                en = only
        if en and cn:
            pairs.append((en, cn))
    return pairs


def clean_en(s):
    s = s.strip()
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'^[->–]+\s*', '', s)          # 对话前缀 "-"
    s = re.sub(r'^[<{\[](.*?)[>}\]]\s*', '', s)  # [音效] 之类
    s = re.sub(r'\s*[<{\[](.*?)[>}\]]\s*', ' ', s)
    s = s.replace('\\N', ' ').replace('\\n', ' ')
    s = re.sub(r'\s+', ' ', s).strip(' -–')
    return s


def clean_cn(s):
    s = re.sub(r'\{[^}]*\}', '', s)
    s = re.sub(r'\s+', '', s)
    return s.strip()


def is_usable(en, cn, keep_profanity):
    if not en or not cn:
        return False
    if CJK.search(en):
        return False
    if len(cn) > 40 or len(cn) < 1:
        return False
    if JUNK_PAT.search(en) or JUNK_PAT.search(cn):
        return False
    words = re.findall(r"[A-Za-z']+", en)
    if not (3 <= len(words) <= 16):
        return False
    letters = sum(len(w) for w in words)
    if letters / max(len(en), 1) < 0.55:
        return False
    if not re.match(r'^[A-Z]', en):        # 小写开头多为字幕断句残留
        return False
    if re.search(r'\d{2,}', en):
        return False
    if en.upper() == en and len(words) > 2:   # 全大写：多为音效/喊叫
        return False
    if not keep_profanity and PROFANITY.search(en):
        return False
    if not keep_profanity and PROFANITY.search(cn):
        return False
    return True


ORAL = re.compile(r"\b(gonna|wanna|gotta|ain't|gimme|lemme|outta|kinda|sorta|come on|all right|"
                  r"what's up|no way|for real|i mean|you know|right\?|hey|dude|honestly|seriously)\b", re.I)
PRON = re.compile(r"\b(i|you|we|he|she|they|my|your|his|her|their)\b", re.I)


VERB = re.compile(r"\b(am|is|are|was|were|be|been|have|has|had|do|does|did|will|would|can|could|"
                  r"should|must|may|might|get|got|go|went|come|came|know|think|want|need|make|take|"
                  r"say|see|let|tell|try|give|put|look|feel|mean|work|call|ask|help|find|keep|"
                  r"leave|talk|walk|pay|buy|sell|eat|drink|sleep|wait|move|stop|start|turn|bring)\b", re.I)


def score(en, names=()):
    w = re.findall(r"[A-Za-z']+", en)
    n = len(w)
    s = 0
    if 4 <= n <= 12:
        s += 3
    elif n == 3 or 13 <= n <= 16:
        s += 1
    if ORAL.search(en):
        s += 2
    if PRON.search(en):
        s += 1
    if VERB.search(en):
        s += 2                          # 有谓语动词，才是完整可学的句子
    else:
        s -= 2                          # 名词片语
    if en.rstrip().endswith(('.', '?', '!')):
        s += 2
    else:
        s -= 3                          # 字幕断句留下的半截话
    if re.match(r"^(and|but|or|so|because|if|when|that|then|which|while)\b", en, re.I):
        s -= 2
    if w and w[0].lower() in names:     # 以人名开头
        s -= 1
    if re.search(r'\d', en):
        s -= 1
    caps = len(re.findall(r'\b[A-Z][a-z]+\b', en))
    if caps >= 2:                       # 人名/地名堆砌
        s -= 1
    return s


def build_name_blacklist(sentences):
    """句首之外仍大写的词，多半是人名/地名，排除出单词表。"""
    cnt = Counter()
    for en in sentences:
        words = re.findall(r"[A-Za-z][A-Za-z']*", en)
        for w in words[1:]:                 # 跳过句首（句首大写是正常书写）
            if re.match(r'^[A-Z][a-z]{2,}$', w):
                cnt[w.lower()] += 1
    return {w for w, c in cnt.items() if c >= 10}


def norm_key(en):
    return re.sub(r'[^a-z ]', '', en.lower()).strip()


def load_ocr_dict():
    path = os.path.join(BASE, 'ocr-words.js')
    d = {}
    if not os.path.exists(path):
        return d
    src = read_text(path)
    m = re.search(r'=\s*(\{.*\});?\s*$', src, re.S)
    if not m:
        return d
    try:
        data = json.loads(m.group(1))
    except Exception:
        return d
    for group in data.values():
        for it in group:
            w = (it.get('w') or '').strip().lower()
            if w and w not in d:
                d[w] = (it.get('p') or '', it.get('m') or '')
    return d


def pick_words(sentences, ocr, names, limit):
    """从该集句子里挑值得学的实词：词频优先，命中 OCR 词表的（有音标/释义）排在前面。
    排除缩写（i'm / don't）、人名地名、停用词。"""
    freq = Counter()
    for s in sentences:
        for w in re.findall(r"[A-Za-z][A-Za-z'-]{2,}", s.lower()):
            w = w.strip("-'")
            if len(w) < 3 or "'" in w or w in STOP or w in names or w.isdigit():
                continue
            freq[w] += 1
    items = [w for w, c in freq.most_common() if c >= 2]
    has_def = lambda w: bool(ocr.get(w, ('', ''))[0] or ocr.get(w, ('', ''))[1])
    items.sort(key=lambda w: (0 if has_def(w) else 1, -freq[w]))
    out = []
    for w in items[:limit]:
        p, m = ocr.get(w, ('', ''))
        out.append({'word': w, 'phonetic': p, 'meaning': m, 'examples': []})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--per-ep', type=int, default=40, help='每集保留的句子数')
    ap.add_argument('--words', type=int, default=12, help='每集提取的单词数')
    ap.add_argument('--keep-profanity', action='store_true', help='保留脏话台词')
    args = ap.parse_args()

    root = find_subtitle_dir()
    ocr = load_ocr_dict()
    print('字幕目录:', os.path.basename(root))
    print('OCR 词表:', len(ocr), '条')

    # 收集文件：按 (season, episode)
    files = defaultdict(list)
    for dp, _, fn in os.walk(root):
        for f in fn:
            if not f.lower().endswith('.ass'):
                continue
            m = EP_RE.search(f)
            if not m:
                continue
            files[(int(m.group(1)), int(m.group(2)))].append(os.path.join(dp, f))

    dup = {k: v for k, v in files.items() if len(v) > 1}
    if dup:
        print('重复集号（取第一个）:', {k: len(v) for k, v in dup.items()})

    # 第一遍：解析 + 清洗，保留字幕原有的剧情顺序
    eps_clean = {}
    for (sn, ep) in sorted(files):
        path = sorted(files[(sn, ep)])[0]
        cleaned = []
        for en, cn in parse_ass(path):
            en = clean_en(en)
            cn = clean_cn(cn)
            if not is_usable(en, cn, args.keep_profanity):
                continue
            if len(norm_key(en)) < 8:
                continue
            cleaned.append((en, cn))
        eps_clean[(sn, ep)] = cleaned

    names = build_name_blacklist([e for cl in eps_clean.values() for e, _ in cl])
    print('人名/专名排除:', len(names), sorted(names)[:10])

    seasons = defaultdict(list)
    seen_global = set()
    total_s, total_w = 0, 0

    for (sn, ep) in sorted(eps_clean):
        cand = []
        for idx, (en, cn) in enumerate(eps_clean[(sn, ep)]):
            k = norm_key(en)
            if k in seen_global:
                continue
            seen_global.add(k)
            cand.append((idx, en, cn))
        cand.sort(key=lambda x: (-score(x[1], names), x[0]))
        top = sorted(cand[:args.per_ep], key=lambda x: x[0])   # 还原剧情顺序
        if not top:
            continue
        sentences = [{'en': e, 'cn': c} for _, e, c in top]
        words = pick_words([e for _, e, _ in cand], ocr, names, args.words)
        seasons[sn].append({
            'title': 'S%02dE%02d' % (sn, ep),
            'subtopics': [],
            'words': words,
            'sentences': sentences
        })
        total_s += len(sentences)
        total_w += len(words)

    chapters = []
    for sn in sorted(seasons):
        eps = sorted(seasons[sn], key=lambda u: u['title'])
        chapters.append({
            'chapter': 'Season %d' % sn,
            'title': '第 %d 季' % sn,
            'units': eps
        })

    book = {
        'id': 'shameless',
        'title': '无耻之徒 Shameless',
        'subtitle': 'Shameless US S01-S11 剧集口语',
        'icon': '📺',
        'hasVolumes': False,
        'units': chapters
    }

    js = []
    js.append('// 自动生成，源：《无耻之徒》Shameless 全季双语字幕（tools/extract_shameless.py）')
    js.append('// 共 %d 季 / %d 集 / %d 句 / %d 词' % (len(chapters), sum(len(c['units']) for c in chapters),
                                                    total_s, total_w))
    js.append('(function () {')
    js.append('  var book = ' + json.dumps(book, ensure_ascii=False, separators=(',', ':')) + ';')
    js.append('  if (typeof textbooks === "undefined") { window.SHOMELESS_BOOK = book; return; }')
    js.append('''  var i = textbooks.findIndex(function (t) { return t.id === "shameless"; });
  if (i >= 0) textbooks[i] = book; else textbooks.push(book);
  try {
    if (typeof pristineTextbooks !== "undefined" && pristineTextbooks) {
      var j = pristineTextbooks.findIndex(function (t) { return t.id === "shameless"; });
      if (j >= 0) pristineTextbooks[j] = book; else pristineTextbooks.push(book);
    }
  } catch (e) { /* ignore */ }
  if (typeof renderSidebar === "function") renderSidebar();''')
    js.append('})();')
    open(OUT, 'w', encoding='utf-8').write('\n'.join(js) + '\n')

    print('生成:', OUT)
    print('大小: %.1f KB' % (os.path.getsize(OUT) / 1024.0))
    for c in chapters:
        print('  %-10s 集 %2d 句 %4d 词 %4d' % (c['title'], len(c['units']),
                                              sum(len(u['sentences']) for u in c['units']),
                                              sum(len(u['words']) for u in c['units'])))
    print('总计: 句 %d / 词 %d' % (total_s, total_w))


if __name__ == '__main__':
    main()
