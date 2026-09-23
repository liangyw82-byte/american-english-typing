/* ============================================================
   情景对话口语（Dialogue Drill）
   把「日常场景对话库」+「真实语境问答对」变成可以随时开练的口语反应训练。

   怎么练：
     1. 选场景（或全部随机）→ 随机抽一道；
     2. 对方说一句（英文 + 中文，中文可隐藏），你打出你会怎么接；
     3. 卡住了就点提示：场景思路 / 首词 / 随机几个候选 / 直接看答案；
     4. 提交后看参考答案（多种说法都算对）+ 💡 这句话的社交功能；
     5. 练错的题会自动提高下次出现概率，掌握度按场景累计。

   三个来源的理念：
     - MuJing（幕境）：真实语境 —— 真实语境题带出处与上一句，能回看它原本发生在哪；
                      键盘拼写形成肌肉记忆，提交后逐字符比对错在哪。
     - byoungd/up（人生进阶指南·口语篇）：不背整段，只练「听到这句我怎么接」；
                      每题带 💡 使用场合，练完留证据（正确率、掌握度、七日趋势）。
     - 项目已有语料：字幕抽取的真实问答 + 词库释义，作为提示与补充。
   ============================================================ */
(function () {
  const LS_KEY = 'dialogueDrill.v1';
  const STYLE_ID = 'dd-style';

  /* ---------------- 样式（只在模块首次打开时注入一次） ---------------- */
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .dd-bubble{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;position:relative}
      .dd-who{font-size:12px;color:var(--text-sub);margin-bottom:6px;display:flex;align-items:center;gap:6px}
      .dd-en{font-size:20px;line-height:1.5;font-weight:600;color:var(--text)}
      .dd-cn{font-size:14px;color:var(--text-sub);margin-top:8px}
      .dd-src{font-size:12px;color:var(--text-sub);opacity:.75;margin-top:8px}
      .dd-tip{background:rgba(255,193,7,.10);border-left:3px solid #f0b429;border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);margin-top:10px;line-height:1.6}
      .dd-input{width:100%;min-height:56px;resize:vertical;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-card);color:var(--text);font-size:16px;line-height:1.5}
      .dd-input:focus{outline:none;border-color:var(--primary,#4f8cff)}
      .dd-opts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .dd-opt{background:var(--bg-card);border:1px dashed var(--border);border-radius:10px;padding:8px 12px;font-size:14px;cursor:pointer;color:var(--text)}
      .dd-opt:hover{border-color:var(--primary,#4f8cff);color:var(--primary,#4f8cff)}
      .dd-ok{color:#2f9e44;font-weight:600}
      .dd-no{color:#e03131;font-weight:600}
      .dd-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;margin:0 6px 6px 0;border-radius:999px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:13px;cursor:pointer}
      .dd-chip.on{background:var(--primary,#4f8cff);color:#fff;border-color:transparent}
      .dd-bar{height:8px;border-radius:4px;background:var(--border);overflow:hidden;flex:1}
      .dd-bar > i{display:block;height:100%;background:var(--primary,#4f8cff)}
      .dd-kbd{font-size:11px;color:var(--text-sub);opacity:.8}
      .dd-diff{font-family:ui-monospace,Consolas,monospace;font-size:15px;line-height:1.9;word-break:break-word}
      .dd-diff .g{color:var(--text)} .dd-diff .b{color:#e03131;background:rgba(224,49,49,.12);border-radius:3px}
      .dd-diff .m{color:#e03131;border-bottom:2px dotted #e03131} .dd-diff .i{opacity:.45}
      .dd-gloss{font-size:12px;color:var(--text-sub);margin-top:6px}
    `;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function notify(msg) {
    if (typeof toast === 'function') toast(msg);
  }
  function say(text, rate) {
    if (typeof speakText === 'function' && text) speakText(text, rate || 0.95);
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* 停掉主程序正在播放的语音：听写的循环跟读、自动进入下一个的定时器都要清掉，
     否则切到情景对话后声音还在响，回来时进度也被定时器推走了 */
  function stopSpeech() {
    try { if (typeof synth !== 'undefined' && synth) synth.cancel(); } catch (e) { /* 忽略 */ }
    try {
      if (typeof dictationRepeatStop === 'function' && dictationRepeatStop) {
        dictationRepeatStop();
        dictationRepeatStop = null;
      }
    } catch (e) { /* 忽略 */ }
    try {
      if (typeof dictationAutoAdvanceTimer !== 'undefined' && dictationAutoAdvanceTimer) {
        clearInterval(dictationAutoAdvanceTimer);
        dictationAutoAdvanceTimer = null;
      }
    } catch (e) { /* 忽略 */ }
  }

  /* 把侧栏高亮和面包屑同步回指定单元（与 selectUnit 里的处理保持一致） */
  function syncChrome(ci, ui) {
    try {
      document.querySelectorAll('.unit-item').forEach(el => el.classList.remove('active'));
      const chapterDiv = document.querySelectorAll('.chapter-item')[ci];
      if (chapterDiv) {
        chapterDiv.classList.add('expanded');
        const unitItems = chapterDiv.querySelectorAll('.unit-item');
        if (unitItems[ui]) unitItems[ui].classList.add('active');
      }
      const bc = document.getElementById('breadcrumb');
      const chapter = typeof getCurrentUnits === 'function' ? getCurrentUnits()[ci] : null;
      const unit = chapter && chapter.units ? chapter.units[ui] : null;
      if (bc && chapter && unit) {
        bc.innerHTML = esc(chapter.chapter) + ' > <span>' + esc(unit.title) + '</span>';
      }
    } catch (e) { /* 侧栏结构不一致就算了，不影响练习 */ }
  }

  /* ---------------- 存档：掌握度 / 错题 / 每日记录 ---------------- */
  function loadStore() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY)) || {};
      return { marks: s.marks || {}, days: s.days || {}, last: s.last || {} };
    } catch (e) { return { marks: {}, days: {}, last: {} }; }
  }
  function saveStore() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* 忽略 */ }
  }
  let store = loadStore();

  function markOf(id) {
    return store.marks[id] || { w: 0, r: 0, ok: 0 };   // w=答错次数 r=出现次数 ok=答对次数
  }
  function record(id, ok) {
    const m = store.marks[id] || { w: 0, r: 0, ok: 0 };
    m.r++;
    if (ok) m.ok++; else m.w++;
    store.marks[id] = m;
    const d = today();
    const rec = store.days[d] || { n: 0, ok: 0 };
    rec.n++;
    if (ok) rec.ok++;
    store.days[d] = rec;
    saveStore();
  }

  /* ---------------- 题库：内置场景 + 真实语境 ---------------- */
  let INDEX = null;

  function buildIndex() {
    const scenes = [];   // {id, name, icon, count}
    const items = [];    // {id, sid, q, qCn, a[], aCn, tip, alt[], src, ctx, gloss[], kind}
    const byId = {};

    const builtin = (window.DIALOGUE_SCENES || {}).scenes || [];
    builtin.forEach(sc => {
      byId[sc.id] = { id: sc.id, name: sc.name, icon: sc.icon || '💬', count: 0 };
      (sc.items || []).forEach((it, i) => {
        if (!it || !it.q || !it.a || !it.a.length) return;
        byId[sc.id].count++;
        items.push({
          id: 's:' + sc.id + ':' + i, sid: sc.id,
          q: it.q, qCn: it.qCn || '', a: it.a.slice(), aCn: it.aCn || '',
          tip: it.tip || '', alt: it.alt || [], src: '', ctx: '', gloss: [], kind: 'scene'
        });
      });
    });

    const real = window.DIALOGUE_REAL || {};
    const meta = ((window.DIALOGUE_REAL_META || {}).scenes) || [];
    meta.forEach(s => {
      if (!byId[s.id]) byId[s.id] = { id: s.id, name: s.name, icon: '🎬', count: 0 };
    });
    Object.keys(real).forEach(sid => {
      if (!byId[sid]) byId[sid] = { id: sid, name: sid, icon: '🎬', count: 0 };
      (real[sid] || []).forEach((it, i) => {
        if (!it || !it.q || !it.a || !it.a.length) return;
        byId[sid].count++;
        items.push({
          id: 'r:' + sid + ':' + i, sid: sid,
          q: it.q, qCn: it.qCn || '', a: it.a.slice(), aCn: it.aCn || '',
          tip: '', alt: [], src: it.src || '', ctx: it.ctx || '', gloss: it.gloss || [],
          kind: 'real'
        });
      });
    });

    Object.keys(byId).forEach(k => { if (byId[k].count) scenes.push(byId[k]); });
    scenes.sort((a, b) => b.count - a.count);
    return { scenes: scenes, items: items, bySid: byId };
  }

  function index() {
    if (!INDEX) INDEX = buildIndex();
    return INDEX;
  }

  /* ---------------- 出题状态 ---------------- */
  let state = {
    scene: 'all',          // 'all' 或场景 id
    role: 'answer',        // answer=对方问我答 / ask=对方回应，我问
    useReal: true,
    useBuiltin: true,
    item: null,
    hint: null,            // {tip, cn, first, opts:[...]}
    result: null,          // {ok, typed}
    seq: 0
  };

  function pool() {
    const ix = index();
    return ix.items.filter(it => {
      if (state.scene !== 'all' && it.sid !== state.scene) return false;
      if (it.kind === 'real' && !state.useReal) return false;
      if (it.kind === 'scene' && !state.useBuiltin) return false;
      return true;
    });
  }

  function pickItem() {
    const list = pool();
    if (!list.length) return null;
    // 加权：错过的题、没练过的题更容易出现（幕境「熟悉/困难」的思路）
    const weights = list.map(it => {
      const m = markOf(it.id);
      let w = 1;
      if (m.w > 0) w += m.w * 2;
      if (m.r === 0) w += 0.8;
      if (m.ok > 0 && m.w === 0) w = Math.max(0.25, w - m.ok * 0.3);
      return Math.max(0.2, w);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function nextItem(keepScene) {
    const prev = state.item;
    let it = pickItem();
    if (it && prev && it.id === prev.id && pool().length > 1) it = pickItem();
    state.item = it;
    state.hint = null;
    state.result = null;
    state.seq++;
    if (!keepScene) render();
    else render();
    const inp = document.getElementById('dd-input');
    if (inp) { inp.value = ''; inp.focus(); }
    if (it) say(promptText(it), 0.95);
  }

  /* ---------------- 题干：我回答 → 对方说 q；我提问 → 对方说 a ---------------- */
  function promptText(it) { return state.role === 'answer' ? it.q : it.a[0]; }
  function promptCn(it) { return state.role === 'answer' ? it.qCn : it.aCn; }
  function answerList(it) { return state.role === 'answer' ? it.a : [it.q].concat(it.alt || []); }
  function answerCn(it) { return state.role === 'answer' ? it.aCn : it.qCn; }

  /* ---------------- 判分 ---------------- */
  function judge(typed) {
    const list = answerList(state.item);
    for (let i = 0; i < list.length; i++) {
      if (typeof isAnswerMatch === 'function') {
        if (isAnswerMatch(typed, list[i])) return true;
      } else if (String(typed).trim().toLowerCase() === String(list[i]).trim().toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  function submit() {
    const inp = document.getElementById('dd-input');
    if (!inp || !state.item) return;
    const typed = inp.value.trim();
    if (!typed) { notify('先打一句，或直接点「看答案」'); return; }
    if (state.result) { nextItem(true); return; }
    const ok = judge(typed);
    state.result = { ok: ok, typed: typed };
    record(state.item.id, ok);
    render();
    if (ok) {
      say(answerList(state.item)[0], 1);
      const el = document.getElementById('dd-input');
      if (el) el.blur();
    } else {
      const el = document.getElementById('dd-input');
      if (el) el.focus();
    }
  }

  /* ---------------- 提示：随机给几个候选 ---------------- */
  function makeOptions() {
    const it = state.item;
    const right = answerList(it)[0];
    const others = shuffle(pool().filter(x => x.id !== it.id)
      .map(x => answerList(x)[0])
      .filter(x => x && x.toLowerCase() !== right.toLowerCase()));
    const picks = others.slice(0, 2);
    return shuffle([right].concat(picks));
  }

  function toggleHint(key) {
    if (!state.hint) state.hint = {};
    if (key === 'opts') {
      state.hint.opts = state.hint.opts ? null : makeOptions();   // 每次点都重新随机
    } else {
      state.hint[key] = !state.hint[key];
    }
    render();
  }

  function reveal() {
    if (!state.item) return;
    state.hint = state.hint || {};
    state.hint.cn = true;
    state.hint.tip = true;
    state.result = { ok: false, typed: '', reveal: true };
    record(state.item.id, false);
    render();
  }

  /* ---------------- 差异高亮（复用主程序的比对算法） ---------------- */
  function diffHtml(expected, typed) {
    if (typeof buildTypeDiff === 'function') {
      try {
        const d = buildTypeDiff(expected, typed);
        const line = arr => (arr || []).map(x => {
          if (x.cls === 'ignored') return '<span class="i">' + esc(x.ch) + '</span>';
          return '<span class="' + (x.cls === 'good' ? 'g' : x.cls === 'bad' ? 'b' : 'm') + '">' +
            esc(x.ch === '-' ? ' ' : x.ch) + '</span>';
        }).join('');
        return '<div class="dd-diff"><div>你输入的：' + line(d.typedLine) + '</div>' +
          '<div>参考答案：' + line(d.expectedLine) + '</div></div>';
      } catch (e) { /* 退回简单对比 */ }
    }
    const ew = String(expected).split(/\s+/), tw = String(typed).split(/\s+/);
    const mark = (arr, base) => arr.map((w, i) =>
      (base[i] && base[i].toLowerCase() === w.toLowerCase()) ? esc(w) : '<span class="b">' + esc(w) + '</span>').join(' ');
    return '<div class="dd-diff"><div>你输入的：' + mark(tw, ew) + '</div><div>参考答案：' + mark(ew, ew) + '</div></div>';
  }

  /* ---------------- 统计（证据卡） ---------------- */
  function statsHtml() {
    const days = Object.keys(store.days).sort();
    const tot = days.reduce((a, d) => a + store.days[d].n, 0);
    const okc = days.reduce((a, d) => a + store.days[d].ok, 0);
    const t = store.days[today()];
    const rate = n => (n ? Math.round(okc / tot * 100) : 0);

    // 最近 7 天趋势
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      last7.push(store.days[key] ? store.days[key].n : 0);
    }
    const max = Math.max.apply(null, last7.concat([1]));
    const bars = '▁▂▃▄▅▆▇█';
    const spark = last7.map(v => (v ? bars[Math.min(7, Math.round(v / max * 7))] : '▁')).join('');

    // 场景掌握度
    const ix = index();
    const rows = ix.scenes.map(s => {
      const ids = ix.items.filter(it => it.sid === s.id).map(it => it.id);
      let n = 0, ok = 0;
      ids.forEach(id => { const m = store.marks[id]; if (m) { n += m.r; ok += m.ok; } });
      return { name: s.name, n: n, pct: n ? Math.round(ok / n * 100) : 0 };
    }).filter(r => r.n > 0).sort((a, b) => b.n - a.n).slice(0, 6);

    return `
      <div class="mg-row" style="margin-bottom:10px">
        <div class="mg-main">
          <div class="mg-en">练过的证据</div>
          <div class="mg-sub">今天 ${t ? t.n : 0} 题 · 累计 ${tot} 题 · 总正确率 ${rate()}%　<span style="font-size:16px">${spark}</span>（最近 7 天题量）</div>
        </div>
      </div>
      ${rows.length ? rows.map(r => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="width:88px;font-size:13px">${esc(r.name)}</span>
          <span class="dd-bar"><i style="width:${r.pct}%"></i></span>
          <span style="width:74px;font-size:12px;color:var(--text-sub);text-align:right">${r.pct}% · ${r.n} 题</span>
        </div>`).join('') : '<div class="mg-empty">还没有记录，练几题就有了</div>'}
      <div class="dd-kbd" style="margin-top:8px">错题会自动提高下次出现概率；掌握度 100% 的题会少出现</div>`;
  }

  /* ---------------- 页面渲染 ---------------- */
  function render() {
    const area = document.getElementById('practice-area');
    if (!area) return;
    const ix = index();
    const it = state.item;

    const chips = [`<span class="dd-chip ${state.scene === 'all' ? 'on' : ''}" onclick="ddSetScene('all')">🎲 全部随机</span>`]
      .concat(ix.scenes.map(s =>
        `<span class="dd-chip ${state.scene === s.id ? 'on' : ''}" onclick="ddSetScene('${esc(s.id)}')">${s.icon || '💬'} ${esc(s.name)} ${s.count}</span>`))
      .join('');

    const roleHtml = `
      <span class="dd-chip ${state.role === 'answer' ? 'on' : ''}" onclick="ddSetRole('answer')">🎯 对方说，我回答</span>
      <span class="dd-chip ${state.role === 'ask' ? 'on' : ''}" onclick="ddSetRole('ask')">🙋 对方回应，我开口问</span>
      <span class="dd-chip ${state.useBuiltin ? 'on' : ''}" onclick="ddToggle('useBuiltin')">📚 场景对话</span>
      <span class="dd-chip ${state.useReal ? 'on' : ''}" onclick="ddToggle('useReal')">🎬 真实语境</span>`;

    // 对话卡片
    let card = '<div class="mg-empty">当前筛选下没有题目，换个场景或打开「真实语境」</div>';
    if (it) {
      const h = state.hint || {};
      const pText = promptText(it);
      const pCn = promptCn(it);
      const gloss = (it.gloss || []).map(g => esc(g[0]) + ' ' + esc(g[1])).join(' · ');
      const firstWord = answerList(it)[0].split(/\s+/).slice(0, 2).join(' ');
      const wc = answerList(it)[0].split(/\s+/).length;

      let resultHtml = '';
      if (state.result) {
        const r = state.result;
        const ans = answerList(it);
        const aCn = answerCn(it);
        if (r.reveal) {
          resultHtml = `
            <div class="dd-bubble" style="margin-top:12px;border-color:#f0b429">
              <div class="dd-who">👀 参考答案（${ans.length > 1 ? '任一种都算对' : '标准说法'}）</div>
              ${ans.map((x, i) => `<div class="dd-en">${esc(x)}</div>`).join('<div style="height:6px"></div>')}
              ${aCn ? `<div class="dd-cn">${esc(aCn)}</div>` : ''}
            </div>`;
        } else if (r.ok) {
          resultHtml = `
            <div class="dd-bubble" style="margin-top:12px;border-color:#2f9e44">
              <div class="dd-who"><span class="dd-ok">✅ 说得通</span>　${ans.length > 1 ? '其他说法：' : ''}</div>
              ${ans.slice(1).map(x => `<div class="dd-en">${esc(x)}</div>`).join('<div style="height:6px"></div>')}
              ${aCn ? `<div class="dd-cn">${esc(aCn)}</div>` : ''}
              <div class="dd-ops" style="margin-top:10px">
                <button class="mg-btn" onclick="ddSayAnswer()">🔊 再听一遍</button>
                <button class="mg-btn primary" onclick="ddNext()">下一题 →</button>
              </div>
            </div>`;
        } else {
          resultHtml = `
            <div class="dd-bubble" style="margin-top:12px;border-color:#e03131">
              <div class="dd-who"><span class="dd-no">✏️ 对照一下</span>　（意思对但写法不同？点提示看看还有什么说法）</div>
              ${diffHtml(ans[0], r.typed)}
              ${ans.length > 1 ? `<div class="dd-cn">也可以说：${ans.slice(1).map(x => esc(x)).join(' / ')}</div>` : ''}
              ${aCn ? `<div class="dd-cn">${esc(aCn)}</div>` : ''}
              <div class="dd-ops" style="margin-top:10px">
                <button class="mg-btn" onclick="ddFillAnswer()">照着打一遍</button>
                <button class="mg-btn primary" onclick="ddNext()">下一题 →</button>
              </div>
            </div>`;
        }
      }

      card = `
        <div class="dd-bubble">
          <div class="dd-who">
            <span>${state.role === 'answer' ? '🗣️ 对方说' : '💬 对方的回应'}</span>
            <button class="mg-btn" style="padding:2px 8px;font-size:12px" onclick="ddSay()">🔊 听</button>
            ${it.kind === 'real' ? '<span style="opacity:.7">真实语境</span>' : ''}
          </div>
          <div class="dd-en">${esc(pText)}</div>
          ${(h.cn || state.result) && pCn ? `<div class="dd-cn">${esc(pCn)}</div>` : ''}
          ${it.ctx && h.tip ? `<div class="dd-src">上文：${esc(it.ctx)}</div>` : ''}
          ${it.src ? `<div class="dd-src">${esc(it.src)}</div>` : ''}
          ${gloss ? `<div class="dd-gloss">关键词：${gloss}</div>` : ''}
          ${h.tip && it.tip ? `<div class="dd-tip">💡 ${esc(it.tip)}</div>` : ''}
        </div>

        <div class="mg-field" style="margin-top:12px">
          <label>${state.role === 'answer' ? '你会怎么接？（打字，Enter 提交）' : '你会怎么开口问？（打字，Enter 提交）'}</label>
          <textarea id="dd-input" class="dd-input" rows="2" placeholder="${state.role === 'answer' ? 'Type your reply...' : 'Type your question...'}"
            onkeydown="ddKey(event)"></textarea>
        </div>

        <div class="mg-row-flex" style="margin-top:8px;flex-wrap:wrap;gap:8px">
          <button class="mg-btn primary" onclick="ddSubmit()">提交</button>
          <button class="mg-btn" onclick="ddHint('cn')">${h.cn ? '隐藏中文' : '中文意思'}</button>
          <button class="mg-btn" onclick="ddHint('tip')">💡 场景思路</button>
          <button class="mg-btn" onclick="ddHint('first')">🔤 开头</button>
          <button class="mg-btn" onclick="ddHint('opts')">🎲 给几个候选</button>
          <button class="mg-btn" onclick="ddReveal()">👀 看答案</button>
          <button class="mg-btn" onclick="ddNext()">⏭ 换一题</button>
        </div>

        ${h.first ? `<div class="dd-tip" style="margin-top:10px">开头是：<b>${esc(firstWord)}</b>　共 ${wc} 个词</div>` : ''}
        ${h.opts ? `
          <div style="margin-top:10px">
            <div class="dd-kbd" style="margin-bottom:6px">这几个里有一个是对的（点一下填进输入框，照打一遍印象更深）</div>
            <div class="dd-opts">
              ${h.opts.map(o => `<span class="dd-opt" onclick="ddPick(this)">${esc(o)}</span>`).join('')}
            </div>
          </div>` : ''}
        ${resultHtml}`;
    }

    area.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:4px 2px 30px">
        <div class="mg-row" style="margin-bottom:12px">
          <div class="mg-main">
            <div class="mg-en">💬 情景对话口语</div>
            <div class="mg-sub">选一个日常场景随机开练：对方说一句，你接一句；卡住就点提示，会随机给你几个说法</div>
          </div>
          <div class="mg-ops"><button class="mg-btn" onclick="ddBack()">返回练习</button></div>
        </div>

        <div style="margin-bottom:8px">${roleHtml}</div>
        <div style="margin-bottom:14px">${chips}</div>

        ${card}

        <div style="margin-top:22px">
          <div class="mg-en" style="margin-bottom:8px">📈 我的练习记录</div>
          ${statsHtml()}
        </div>
      </div>`;

    const inp = document.getElementById('dd-input');
    if (inp && !state.result) inp.focus();
  }

  window.ddStopSpeech = function () { stopSpeech(); };

  /* ---------------- 交互（挂到 window 供 onclick 调用） ---------------- */
  /* 离开练习区去做别的事（情景对话、口语笔记等）时调用：
     停掉正在放的语音，并返回当前进度快照，回来时原样接上 */
  window.ddLeavePractice = function () {
    stopSpeech();
    // 挂在主页统一的「练习挂起」里：位置、模式、语音都由那边管，出来时原样接上
    if (typeof parkPractice === 'function') return parkPractice();
    if (typeof currentChapter === 'undefined') return null;
    try {
      return {
        ci: currentChapter, ui: currentUnit,
        mode: (typeof currentMode !== 'undefined' ? currentMode : 'word'),
        idx: (typeof currentIndex !== 'undefined' ? currentIndex : 0),
        wrong: (typeof isWrongMode !== 'undefined' ? isWrongMode : false)
      };
    } catch (e) { return null; }
  };

  /* 按快照回到原来那一课、原来那一项；恢复成功返回 true */
  window.ddReturnToPractice = function (snap) {
    stopSpeech();
    if (typeof unparkPractice === 'function' && unparkPractice()) return true;
    if (!snap || snap.ci === null || snap.ci === undefined || typeof startPractice !== 'function') return false;
    try {
      currentChapter = snap.ci;
      currentUnit = snap.ui;
      currentMode = snap.mode || 'word';
      if (typeof isWrongMode !== 'undefined') isWrongMode = !!snap.wrong;
      syncChrome(snap.ci, snap.ui);
      startPractice(snap.idx || 0);          // startPractice 支持起始下标，不会从头开始
      if (typeof saveProgress === 'function') saveProgress();
      return true;
    } catch (e) { return false; }
  };

  let ddReturn = null;   // 进入情景对话前的进度快照

  window.openDialogueDrill = function () {
    if (typeof window.ddLeavePractice === 'function') ddReturn = window.ddLeavePractice();
    injectStyle();
    index();
    if (!state.item) nextItem(true); else render();
  };

  window.ddBack = function () {
    const r = ddReturn;
    ddReturn = null;
    if (r && window.ddReturnToPractice(r)) return;
    if (typeof currentChapter !== 'undefined' && currentChapter !== null && typeof selectUnit === 'function') {
      selectUnit(currentChapter, currentUnit === null ? 0 : currentUnit);
    } else if (typeof renderSidebar === 'function') {
      renderSidebar();
      const area = document.getElementById('practice-area');
      if (area) area.innerHTML = '<div class="mg-empty">请从左侧选择一个单元开始</div>';
    }
  };

  window.ddSetScene = function (sid) {
    state.scene = sid;
    nextItem(true);
  };

  window.ddSetRole = function (role) {
    state.role = role;
    nextItem(true);
  };

  window.ddToggle = function (key) {
    state[key] = !state[key];
    if (!state.useReal && !state.useBuiltin) state[key] = true;   // 至少留一个来源
    nextItem(true);
  };

  window.ddNext = function () { nextItem(true); };

  window.ddSubmit = function () { submit(); };

  window.ddKey = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  window.ddHint = function (key) { toggleHint(key); };

  window.ddReveal = function () { reveal(); };

  window.ddSay = function () { if (state.item) say(promptText(state.item), 0.9); };

  window.ddSayAnswer = function () {
    if (state.item) say(answerList(state.item)[0], 1);
  };

  window.ddFillAnswer = function () {
    const inp = document.getElementById('dd-input');
    if (inp && state.item) { inp.value = answerList(state.item)[0]; inp.focus(); }
  };

  window.ddPick = function (el) {
    const inp = document.getElementById('dd-input');
    if (inp) {
      inp.value = el.textContent;
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  };

  /* ---------------- 初始化：不打断主流程 ---------------- */
  try {
    index();
  } catch (e) { /* 数据没准备好也不影响主程序 */ }

  // 调试用：控制台里可查看当前题、题库、出题池
  window.ddDebug = { state: state, index: index, pool: pool, pick: pickItem };
})();
