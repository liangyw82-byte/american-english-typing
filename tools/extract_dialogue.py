# -*- coding: utf-8 -*-
"""从《走遍美国》(srt) 与《无耻之徒》(ass 双语) 抽取「真实语境一问一答」对，生成 dialogue-real.js。

思路（借鉴 MuJing「真实语境」）：字幕里相邻两句往往就是一次真实对话的问与答。
难点是相邻 ≠ 相关，所以用三道闸门保证质量：
  1) 相关性：问句与答句要有实词重叠（或答句是 Yes/No/Sure 这类完整回应）；
  2) 干净度：不含剧情人名/地名（句中大写词、高频专名）、不含脏话、无残句；
  3) 可学性：长度适中、完整句、口语化加分。
每条都带出处（第几集 / 哪一幕 / SxxExx）与上文一句，练习时可回看语境。

输出 window.DIALOGUE_REAL：
    { "restaurant": [ {q, qCn, a:[...], aCn, src, ctx, gloss:[[w, m], ...]}, ... ], ... }

用法：
    python tools/extract_dialogue.py
    python tools/extract_dialogue.py --per-scene 40
"""
import argparse
import json
import os
import re
import sys
from collections import defaultdict, Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_shameless as ex
import extract_zoubian as zb

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'dialogue-real.js')

# 日常场景：id / 中文名 / 关键词
SCENES = [
    ('restaurant', '餐厅点餐', r'\b(menu|order|waiter|waitress|table for|reservation|appetizer|main course|dessert|bill|check|tip|steak|soup|salad|rare|medium|well done|to go|takeout|fork|knife|delicious|tasty|spicy|refill)\b'),
    ('coffee', '咖啡饮品', r'\b(coffee|latte|cappuccino|espresso|tea|milk|sugar|cream|iced|cup of|refill|barista|brew)\b'),
    ('shopping', '购物消费', r'\b(buy|bought|price|cost|how much|size|fitting room|try it on|receipt|refund|return|exchange|discount|sale|cash|credit card|on sale|expensive|cheap|store|mall|grocery|cart)\b'),
    ('transport', '交通出行', r'\b(bus|subway|train|taxi|cab|uber|flight|airport|gate|boarding|ticket|platform|station|delay|traffic|park|driving|ride|transfer|seat belt|metro)\b'),
    ('hotel', '酒店住宿', r'\b(hotel|motel|check in|check out|room|key card|lobby|front desk|luggage|suite|wake.up call|housekeeping)\b'),
    ('health', '看病就医', r'\b(doctor|nurse|hospital|clinic|appointment|pain|hurt|fever|cold|flu|medicine|prescription|symptom|blood|sleep|rest|sick|injured|allergy|insurance|x.ray)\b'),
    ('work', '职场沟通', r'\b(meeting|report|deadline|client|project|boss|manager|colleague|team|office|email|presentation|schedule|overtime|promotion|raise|contract|invoice|shift)\b'),
    ('interview', '求职面试', r'\b(resume|interview|apply|position|salary|experience|qualification|hire|strength|weakness|reference|candidate|vacancy|join the team)\b'),
    ('school', '校园学习', r'\b(class|homework|exam|test|grade|teacher|professor|student|campus|course|semester|assignment|study|library|tuition|graduate|major)\b'),
    ('money', '银行支付', r'\b(bank|account|atm|deposit|withdraw|transfer|balance|exchange rate|currency|charge|fee|loan|mortgage|budget|split the bill|payment)\b'),
    ('housing', '租房住房', r'\b(rent|apartment|landlord|lease|deposit|tenant|move in|move out|furniture|utilities|neighbor|sublet|basement|garage|plumbing|leak)\b'),
    ('phone', '电话沟通', r'\b(call|phone|text|message|voicemail|hold on|pick up|hang up|dial|number|signal|leave a message|call back|ring)\b'),
    ('social', '社交寒暄', r'\b(hi|hey|hello|how are you|how.s it going|what.s up|long time|nice to meet|introduce|party|hang out|join us|weekend|plans|get together)\b'),
    ('family', '家人日常', r'\b(mom|mum|dad|mother|father|son|daughter|brother|sister|grandpa|grandma|kids|children|baby|family|dinner|cousin|uncle|aunt)\b'),
    ('feelings', '情绪态度', r'\b(sorry|apolog|thank|thanks|appreciate|congratulat|worry|worried|nervous|excited|proud|upset|angry|disappointed|grateful|hope|wish|afraid|relieved)\b'),
    ('directions', '问路指引', r'\b(where.s|how do i get|turn left|turn right|straight|block|corner|intersection|near here|far|map|address|cross the|exit|down the street)\b'),
    ('travel', '旅行度假', r'\b(trip|travel|vacation|holiday|luggage|passport|visa|sightseeing|tour|beach|booking|itinerary|souvenir|cruise|camping)\b'),
    ('entertainment', '休闲娱乐', r'\b(movie|film|show|concert|music|song|game|match|play|theater|ticket|netflix|stream|band|album|dance|performance|rehearsal)\b'),
    ('festival', '节日聚会', r'\b(birthday|thanksgiving|christmas|holiday|celebrat|party|gift|present|cake|anniversary|wedding|graduation|reunion|turkey|new year)\b'),
    ('emergency', '紧急求助', r'\b(help|emergency|police|ambulance|fire|accident|lost|stolen|rob|danger|911|urgent|bleeding|call an)\b'),
]
SCENE_NAME = {sid: cn for sid, cn, _ in SCENES}
SCENE_RE = [(sid, re.compile(pat, re.I)) for sid, _, pat in SCENES]
DEFAULT_SCENE = 'daily'
SCENE_NAME[DEFAULT_SCENE] = '日常杂谈'

EP_SCENE = {
    1: 'housing', 2: 'social', 3: 'family', 4: 'daily', 5: 'shopping', 6: 'festival',
    7: 'family', 8: 'health', 9: 'interview', 10: 'daily', 11: 'housing', 12: 'daily',
    13: 'family', 14: 'entertainment', 15: 'travel', 16: 'family', 17: 'entertainment',
    18: 'work', 19: 'festival', 20: 'family', 21: 'work', 22: 'interview',
    23: 'social', 24: 'social', 25: 'entertainment', 26: 'entertainment',
}

Q_START = re.compile(
    r"^(what|what's|whats|where|where's|wheres|when|when's|who|who's|whom|whose|which|why|why's|"
    r"how|how's|how do|how did|how much|how many|how about|how long|"
    r"do|does|did|is|isn't|are|aren't|was|wasn't|were|weren't|am|"
    r"can|can't|could|couldn't|would|wouldn't|will|won't|shall|should|shouldn't|"
    r"may|might|must|have|has|haven't|hasn't|had|didn't|doesn't|don't|"
    r"let's|lets|any|anyone|anybody|anything|mind if|you (?:want|wanna|got|have))\b", re.I)

# 完整回应：不需要与问句有实词重叠，但必须够完整
GENERIC_START = re.compile(
    r"^(yes|yeah|yep|no|nope|sure|okay|ok|of course|certainly|absolutely|definitely|"
    r"maybe|perhaps|i think so|i hope so|i guess so|me too|me neither|thanks|thank you|"
    r"sorry|probably|right|exactly|no problem|never mind|sounds good)\b", re.I)

ORAL = re.compile(r"\b(gonna|wanna|gotta|gimme|lemme|kinda|sorta|come on|all right|"
                  r"what's up|no way|for real|i mean|you know|hey|honestly|"
                  r"seriously|actually|basically|sounds good|no problem)\b", re.I)

CJK = re.compile(r'[\u4e00-\u9fff]')

# 剧情里不适合拿来练口语的内容（暴力 / 违法 / 成人向）
BLOCK = re.compile(
    r"\b(kill|killed|murder|smother|steal|stole|rob|robbery|drug|drugs|overdose|gun|shoot|"
    r"jail|prison|arrest|cop|cops|police officer|suicide|abuse|naked|sex|porn|weed|"
    r"cocaine|heroin|dealer|arrested|handcuff|knife fight)\b", re.I)

# 句首称呼（人名 + 逗号），如 "Ellen, where's the cinnamon?"
VOCATIVE = re.compile(r"^[A-Z][a-z]{2,}\s*,")


def is_question(s):
    s = s.strip()
    if s.endswith('?'):
        return True
    w = s.split()
    return len(w) >= 2 and bool(Q_START.match(w[0]))


def is_answer(s):
    s = s.strip()
    return (not is_question(s)) and 1 <= len(s.split()) <= 16


def clean_en(s):
    s = re.sub(r'^[-\s]+', '', s).strip()
    s = re.sub(r'([?!.])\s*\1+', r'\1', s)          # "? ?" 这类重复标点
    s = re.sub(r'(?<=[A-Za-z,])\s*-\s*(?=[A-Z])', ' ', s)   # "-No." 这种字幕断句残符
    s = re.sub(r'\s+', ' ', s)
    return s.strip(' "\'')


def classify(text, fallback=DEFAULT_SCENE):
    for sid, rx in SCENE_RE:
        if rx.search(text):
            return sid
    return fallback


def norm_key(s):
    return re.sub(r'[^a-z ]', '', s.lower()).strip()


def stem(w):
    for suf in ('ing', 'edly', 'ies', 'ied', 'es', 'ed', 'ly', 's'):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[:-len(suf)]
    return w


def content_words(s):
    out = set()
    for w in re.findall(r"[a-z']{4,}", s.lower()):
        w = w.replace("'", '')
        if w in ex.STOP:
            continue
        out.add(stem(w))
    return out


def related(q, a):
    """问句与答句是否真的成对：实词重叠，或答句是完整的通用回应。"""
    if content_words(q) & content_words(a):
        return True
    aw = a.split()
    return len(aw) <= 10 and bool(GENERIC_START.match(a.strip()))


def has_proper_noun(s, names, vocab=frozenset(), check_voc=False):
    w = s.split()
    if not w:
        return True
    if re.match(r"^[A-Z][a-z]{2,}$", w[0]) and w[0].lower() in names:
        return True
    # 句首 "Ellen," 这类直呼其名（教学片《走遍美国》里是正常台词，只对美剧启用）
    if check_voc and VOCATIVE.match(s) and w[0].lower().strip(',') not in vocab \
            and w[0].lower() not in ex.STOP:
        return True
    for x in w[1:]:
        x = re.sub(r"[^A-Za-z']", '', x)
        if re.match(r"^[A-Z][a-z]{2,}$", x) and x not in ("I", "I'm", "I've", "I'll", "I'd"):
            return True
    return False


def load_wordbook_dict():
    """wordbooks.js 里的分级词库（19132 条，带中文释义），用来给关键词配释义。"""
    path = os.path.join(BASE, 'wordbooks.js')
    d = {}
    if not os.path.exists(path):
        return d
    m = re.search(r'=\s*(\[.*\]);?\s*$', ex.read_text(path), re.S)
    if not m:
        return d
    try:
        data = json.loads(m.group(1))
    except Exception:
        return d
    for b in data:
        for w in b.get('words', []) or []:
            if isinstance(w, dict):
                key, mean = (w.get('word') or '').strip().lower(), w.get('meaning') or ''
            else:                                   # [word, phonetic, meaning]
                key, mean = str(w[0]).strip().lower(), (w[2] if len(w) > 2 else '')
            if key and key not in d:
                d[key] = ('', mean)          # 与 load_ocr_dict / load_index_words 统一：值 = (音标, 释义)
    return d


def build_names(sentences, vocab):
    """句中（非句首）仍大写的词 = 人名/地名；常见词（停用词/词典里有的）不算。"""
    cnt = Counter()
    for s in sentences:
        for w in re.findall(r"[A-Z][a-z]{2,}", s)[1:]:
            lw = w.lower()
            if lw in ex.STOP or lw in vocab:
                continue
            cnt[lw] += 1
    return {w for w, c in cnt.items() if c >= 4}


def score_pair(q, a):
    qw, aw = q.split(), a.split()
    s = 0
    if 3 <= len(qw) <= 12:
        s += 3
    elif len(qw) == 2 or 13 <= len(qw) <= 14:
        s += 1
    else:
        s -= 2
    if 2 <= len(aw) <= 12:
        s += 3
    elif len(aw) == 1:
        s += 1
    else:
        s -= 1
    if q.rstrip().endswith('?'):
        s += 2
    else:
        s -= 2
    if ORAL.search(q) or ORAL.search(a):
        s += 1
    if content_words(q) & content_words(a):
        s += 2
    if re.match(r'^(and|but|or|so|because|if|when|that|then|which|while)\b', a, re.I):
        s -= 3
    if re.search(r'\d', q + ' ' + a):
        s -= 1
    return s


def collect_zoubian():
    root = zb.find_dir()
    files = {}
    for f in os.listdir(root):
        m = re.match(r'(\d+)', f)
        if m and f.lower().endswith('.srt'):
            files[int(m.group(1))] = os.path.join(root, f)
    blocks = []
    for num in sorted(files):
        sents = zb.build_sentences(zb.parse_srt(files[num]))
        ep = (num - 1) // 3 + 1
        act = (num - 1) % 3 + 1
        en_name, cn_name = zb.EP_CN.get(ep, ('', ''))
        blocks.append({
            'sents': sents, 'from': 'zoubian',
            'src': '《走遍美国》第 %d 集 %s · %s' % (ep, cn_name or en_name, zb.ACT_NAME.get(act, '')),
            'fallback': EP_SCENE.get(ep, DEFAULT_SCENE),
        })
    return blocks


def collect_shameless():
    root = ex.find_subtitle_dir()
    files = defaultdict(list)
    for dp, _, fn in os.walk(root):
        for f in fn:
            if f.lower().endswith('.ass') and ex.EP_RE.search(f):
                m = ex.EP_RE.search(f)
                files[(int(m.group(1)), int(m.group(2)))].append(os.path.join(dp, f))
    blocks = []
    for (sn, ep) in sorted(files):
        seq = []
        for en, cn in ex.parse_ass(sorted(files[(sn, ep)])[0]):
            en, cn = ex.clean_en(en), ex.clean_cn(cn)
            if ex.is_usable(en, cn, False) and not CJK.search(en):
                seq.append((en, cn))
        blocks.append({'seq': seq, 'from': 'shameless',
                       'src': '《无耻之徒》S%02dE%02d' % (sn, ep),
                       'fallback': DEFAULT_SCENE})
    return blocks


def pair_up(blocks, ocr, names, need_gloss=False, strict=False):
    """把每个剧本的句子序列切成一问一答。strict=True 时额外过滤暴力/违法内容与直呼其名。"""
    vocab = set(ocr)
    pairs = []
    for b in blocks:
        seq = b.get('seq') or [(s, '') for s in b['sents']]
        for i in range(len(seq) - 1):
            q, q_cn = seq[i]
            a, a_cn = seq[i + 1]
            if not is_question(q) or not is_answer(a):
                continue
            q, a = clean_en(q), clean_en(a)
            if len(q) < 10 or len(a) < 2:
                continue
            if has_proper_noun(q, names, vocab, strict) or has_proper_noun(a, names, vocab, strict):
                continue
            if ex.PROFANITY.search(q) or ex.PROFANITY.search(a) or ex.PROFANITY.search(a_cn or ''):
                continue
            if strict and (BLOCK.search(q) or BLOCK.search(a) or BLOCK.search(a_cn or '')):
                continue
            if not related(q, a):
                continue
            if ex.JUNK_PAT.search(q) or ex.JUNK_PAT.search(a):
                continue
            alts = []
            if len(a.split()) <= 2 and i + 2 < len(seq):
                n2 = seq[i + 2][0]
                if is_answer(n2) and len((a + ' ' + n2).split()) <= 16:
                    alts.append(clean_en(a + ' ' + n2))
            gloss = build_gloss(q + ' ' + a, ocr, names)
            if need_gloss and not a_cn and not gloss:
                continue      # 无译文又查不到词义的，中文用户无从下手，丢弃
            pairs.append({
                'q': q, 'qCn': q_cn or '', 'a': [a] + alts, 'aCn': a_cn or '',
                'src': b['src'], 'ctx': clean_en(seq[i - 1][0]) if i > 0 else '',
                'from': b['from'], 'scene': classify(q + ' ' + a, b['fallback']),
                'gloss': gloss if not a_cn else [],
                'score': score_pair(q, a),
            })
    return pairs


def tidy_meaning(m):
    """词义只留第一段，去掉词性前缀和夹带的音标。"""
    m = re.split(r'[；;，,。/]', str(m or ''))[0].strip()
    m = re.sub(r'^[a-z]{1,4}\.\s*', '', m)
    m = re.sub(r'\s*\[[^\]]*\]\s*$', '', m).strip()
    return m[:18]


def build_gloss(text, ocr, names, limit=3):
    out, seen = [], set()
    for w in re.findall(r"[A-Za-z][A-Za-z']{3,}", text.lower()):
        w = w.replace("'", '')
        if w in seen or w in ex.STOP or w in names:
            continue
        m = tidy_meaning((ocr.get(w) or ('', ''))[1])
        if len(m) >= 2 and re.search(r'[\u4e00-\u9fffA-Za-z]', m):
            seen.add(w)
            out.append([w, m])
            if len(out) >= limit:
                break
    return out


def interleave(a, b):
    out, i = [], 0
    while i < max(len(a), len(b)):
        if i < len(a):
            out.append(a[i])
        if i < len(b):
            out.append(b[i])
        i += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--per-scene', type=int, default=40, help='每个场景最多保留的问答对数')
    ap.add_argument('--zoubian', type=int, default=40, help='每场景《走遍美国》最多条数')
    ap.add_argument('--shameless', type=int, default=16, help='每场景《无耻之徒》最多条数')
    args = ap.parse_args()

    ocr = ex.load_ocr_dict()
    ocr.update(zb.load_index_words())
    ocr.update(load_wordbook_dict())
    print('词典:', len(ocr), '条')

    zb_blocks = collect_zoubian()
    sh_blocks = collect_shameless()
    all_sents = [s for b in zb_blocks for s in b['sents']]
    all_sents += [en for b in sh_blocks for en, _ in b['seq']]
    names = build_names(all_sents, ocr)
    print('专名排除:', len(names), sorted(names)[:8])

    zb_pairs = pair_up(zb_blocks, ocr, names, need_gloss=True)
    sh_pairs = pair_up(sh_blocks, ocr, names, strict=True)
    print('候选：走遍美国 %d 条 / 无耻之徒 %d 条' % (len(zb_pairs), len(sh_pairs)))

    groups = defaultdict(lambda: {'zoubian': [], 'shameless': []})
    seen = set()
    for p in sorted(zb_pairs + sh_pairs, key=lambda x: -x['score']):
        k = norm_key(p['q'])[:60] + '|' + norm_key(p['a'][0])[:40]
        if k in seen:
            continue
        seen.add(k)
        groups[p['scene']][p['from']].append(p)

    data, total = {}, 0
    for sid in sorted(groups, key=lambda s: -(len(groups[s]['zoubian']) + len(groups[s]['shameless']))):
        g = groups[sid]
        items = interleave(g['zoubian'][:args.zoubian], g['shameless'][:args.shameless])[:args.per_scene]
        for p in items:
            p.pop('score', None)
            p.pop('from', None)
        if items:
            data[sid] = items
            total += len(items)

    meta = {'scenes': [{'id': sid, 'name': SCENE_NAME.get(sid, sid), 'count': len(v)}
                       for sid, v in sorted(data.items(), key=lambda kv: -len(kv[1]))],
            'total': total}

    js = [
        '// 自动生成，源：《走遍美国》78 幕字幕 +《无耻之徒》全季双语字幕（tools/extract_dialogue.py）',
        '// 真实语境一问一答：共 %d 个场景 / %d 组对话；src=出处，ctx=上一句语境，gloss=关键词释义' % (len(data), total),
        'window.DIALOGUE_REAL = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';',
        'window.DIALOGUE_REAL_META = ' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')) + ';',
    ]
    open(OUT, 'w', encoding='utf-8').write('\n'.join(js) + '\n')

    print('生成:', OUT, '%.1f KB' % (os.path.getsize(OUT) / 1024.0))
    for s in meta['scenes']:
        print('  %-14s %-8s %3d' % (s['id'], s['name'], s['count']))
    print('总计:', total)


if __name__ == '__main__':
    main()
