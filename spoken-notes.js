/* ============================================================
   口语笔记模块（Spoken Notes）
   对接 yarran-english-learn（AI Skill）：
   英文对话/字幕 →（AI 生成三段式笔记）→ 解析成可练习的单元
     笔记句 / 原文双语句 → 句子模式、听写模式
     单词模块          → 单词模式
   笔记保存在 localStorage，刷新后仍在。
   ============================================================ */
(function () {
  const LS_KEY = 'spokenNotes.v1';
  const TB_ID = 'spoken-notes';

  const AI_PROMPT = [
    '你是住在加州的英语母语者。我会粘贴一段英文对话/字幕（YouTube、美剧、播客或日常对话），请帮我整理成口语学习笔记。',
    '',
    '要求：',
    '1. 先校对原文（自动字幕常有同音错词、断词错误），直接改掉，不要留任何修改痕迹。',
    '2. 严格按下面的 Markdown 格式输出：',
    '',
    '## 原文（双语对照）',
    '[逐句：英文一行，紧跟中文翻译一行；保留说话人标签；翻译口语化、贴合情境，不加括号]',
    '',
    '## 笔记（句子笔记）',
    '### [值得背的地道表达]',
    '[中文翻译]',
    '💡 [这句话的社交功能 / 使用场景，1-2 句，不要讲语法]',
    '',
    '## 单词模块',
    '- [生词或固定搭配] — [中文释义]',
    '',
    '3. 笔记只选 3-8 条真正高价值的表达（高频、地道、可复用、易误解），不要逐句翻译、不要凑数。',
    '4. 保留口语原貌，不要把 No plans. 补全成 I don\'t have any plans.',
    '5. 💡 只讲“什么场景下会说、起什么作用”，不讲时态语法；不要做“X 比 Y 更口语”这类不准确的对比。',
    '6. 单词模块只收不常见的词和固定搭配 / 动词短语。',
    '',
    '下面是原文：',
    '"""',
    '__TRANSCRIPT__',
    '"""'
  ].join('\n');

  /* ---------------- 存储 ---------------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------------- 解析三段式笔记 ---------------- */
  function parseNote(md) {
    const lines = String(md || '').replace(/\r/g, '').split('\n');
    const hasCJK = s => /[\u4e00-\u9fa5]/.test(s);
    const isHead = s => /^\s{0,3}#{1,6}\s+/.test(s);
    const isItem = s => /^\s*[-*+]\s+/.test(s);

    let sec = 'none', cur = null, pendingEn = null, extMode = false;
    const rawPairs = [], notes = [], words = [];

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;

      // 分节标题
      if (isHead(l)) {
        const t = l.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
        if (/原文/.test(t)) { flush(); sec = 'raw'; continue; }
        if (/笔记/.test(t)) { flush(); sec = 'note'; continue; }
        if (/单词|词汇|Vocabulary/i.test(t)) { flush(); sec = 'vocab'; continue; }
        if (sec === 'note') { flush(); cur = { en: t, cn: '', note: '' }; continue; }
        continue;
      }

      if (sec === 'raw' || sec === 'none') {
        if (hasCJK(l)) {
          if (pendingEn) { rawPairs.push({ en: pendingEn, cn: l }); pendingEn = null; }
        } else {
          if (pendingEn) rawPairs.push({ en: pendingEn, cn: '' });
          pendingEn = l;
        }
        continue;
      }

      if (sec === 'note') {
        if (l.indexOf('💡') === 0) {
          if (cur) cur.note = l.replace(/^💡\s*/, '');
          continue;
        }
        if (/^拓展\s*[:：]/.test(l) || /^\*\*拓展/.test(l)) { if (cur) notes.push(cur); cur = null; extMode = true; continue; }
        if (isItem(l)) {
          if (cur) notes.push(cur);
          cur = { en: l.replace(/^\s*[-*+]\s+/, '').replace(/\*\*/g, ''), cn: '', note: '' };
          continue;
        }
        if (hasCJK(l)) {
          if (cur) cur.cn = cur.cn ? cur.cn + ' ' + l : l;
          else if (extMode && notes.length) notes[notes.length - 1].cn = l;
          continue;
        }
        // 纯英文行：拓展句，或标题句的续行
        if (extMode) {
          notes.push({ en: l, cn: '', note: '拓展句' });
          extMode = false;
        } else if (cur && !cur.cn) {
          cur.en += ' ' + l;
        }
        continue;
      }

      if (sec === 'vocab') {
        if (!isItem(l)) continue;
        const t = l.replace(/^\s*[-*+]\s+/, '').replace(/\*\*/g, '').trim();
        const parts = t.split(/\s+[—–]\s+|\s+—\s+|\s+[-–]\s+|\s+[:：]\s+/);
        let w = (parts[0] || '').trim().replace(/^[-•]\s*/, '');
        let m = (parts[1] || '').trim();
        if (!m && /\s/.test(w)) { // 无分隔符时，中文部分直接跟在后面
          const mm = w.match(/^(.*?)([\u4e00-\u9fa5].*)$/);
          if (mm) { w = mm[1].trim(); m = mm[2].trim(); }
        }
        w = w.replace(/[（(][^）)]*[）)]\s*$/, '').trim();
        m = m.replace(/^[（(]/, '').replace(/[）)]$/, '').trim();
        if (w && w.length < 60 && !hasCJK(w)) words.push({ word: w, phonetic: '', meaning: m, examples: [] });
      }
    }
    flush();
    if (pendingEn) rawPairs.push({ en: pendingEn, cn: '' });

    function flush() { if (cur) { notes.push(cur); cur = null; } }

    // 合并：笔记句优先，原文句补充（去重）
    const seen = new Set();
    const sentences = [];
    notes.forEach(n => {
      const en = (n.en || '').trim();
      if (!en || seen.has(en.toLowerCase())) return;
      seen.add(en.toLowerCase());
      const s = { en: en, cn: (n.cn || '').trim() };
      if (n.note) s.note = n.note;
      sentences.push(s);
    });
    rawPairs.forEach(p => {
      const en = (p.en || '').trim();
      if (!en || seen.has(en.toLowerCase())) return;
      seen.add(en.toLowerCase());
      const s = { en: en, cn: (p.cn || '').trim() };
      if (p.cn) s.source = '原文';
      sentences.push(s);
    });

    // 单词去重
    const ws = [], wseen = new Set();
    words.forEach(w => {
      const k = w.word.toLowerCase();
      if (wseen.has(k)) return;
      wseen.add(k);
      ws.push(w);
    });

    return { sentences: sentences, words: ws, noteCount: notes.length, rawCount: rawPairs.length };
  }

  /* ---------------- 教材同步 ---------------- */
  function syncTextbook() {
    if (typeof textbooks === 'undefined') return -1;
    const list = load();
    const tb = {
      id: TB_ID, title: '我的口语笔记', subtitle: 'Spoken Notes', icon: '📝',
      hasVolumes: false,
      units: [{
        chapter: '我的笔记', title: '我的口语笔记',
        units: list.map(n => ({
          _noteId: n.id, title: n.title, subtopics: [],
          words: n.words || [], sentences: n.sentences || []
        }))
      }]
    };
    const upsert = arr => {
      const i = arr.findIndex(t => t.id === TB_ID);
      if (i >= 0) arr[i] = tb; else arr.push(tb);
    };
    upsert(textbooks);
    // 内容管理会做 pristine 快照回滚，同步进快照，避免笔记教材被重置掉
    try {
      if (typeof pristineTextbooks !== 'undefined' && pristineTextbooks) upsert(pristineTextbooks);
    } catch (e) { /* ignore */ }
    return textbooks.findIndex(t => t.id === TB_ID);
  }

  /* ---------------- 页面 ---------------- */
  let state = { parsed: null, md: '', title: '' };

  function renderNotesPage() {
    const area = document.getElementById('practice-area');
    if (!area) return;
    const list = load();
    const p = state.parsed;

    let preview = '';
    if (p) {
      const s = p.sentences.slice(0, 6).map(x =>
        `<div class="mg-row" style="margin-bottom:6px"><div class="mg-main">
           <div class="mg-en">${esc(x.en)}</div>
           <div class="mg-sub">${esc(x.cn || '（无译文）')}${x.note ? ' · 💡 ' + esc(x.note) : ''}</div>
         </div></div>`).join('');
      const w = p.words.slice(0, 12).map(x =>
        `<span class="mg-badge" style="margin:0 6px 6px 0">${esc(x.word)}${x.meaning ? ' ' + esc(x.meaning) : ''}</span>`).join('');
      preview = `
        <div class="mg-row" style="margin:10px 0;flex-direction:column;align-items:stretch">
          <div class="mg-main">
            <div class="mg-en">解析结果：句子 ${p.sentences.length} 条（笔记 ${p.noteCount} / 原文 ${p.rawCount}），单词 ${p.words.length} 个</div>
            <div class="mg-sub">确认无误后生成练习单元；句子进句子模式/听写模式，单词进单词模式。</div>
          </div>
          <div style="margin-top:8px">${s || '<div class="mg-empty">没有解析到句子</div>'}</div>
          ${w ? '<div style="margin-top:8px">' + w + '</div>' : ''}
          <div class="mg-ops" style="margin-top:10px">
            <button class="mg-btn primary" onclick="snGenerate()">生成练习单元</button>
            <button class="mg-btn" onclick="snClearPreview()">取消</button>
          </div>
        </div>`;
    }

    const rows = list.map(n => `
      <div class="mg-row" style="margin-bottom:6px">
        <div class="mg-main">
          <div class="mg-en">${esc(n.title)}</div>
          <div class="mg-sub">句子 ${(n.sentences || []).length} · 单词 ${(n.words || []).length} · ${esc(n.createdAt || '')}</div>
        </div>
        <div class="mg-ops">
          <button class="mg-btn primary" onclick="snPractice('${n.id}')">练习</button>
          <button class="mg-btn danger" onclick="snRemove('${n.id}')">删除</button>
        </div>
      </div>`).join('');

    area.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:4px 2px 30px">
        <div class="mg-row" style="margin-bottom:12px">
          <div class="mg-main">
            <div class="mg-en">📝 口语笔记工作台</div>
            <div class="mg-sub">① 贴英文对话/字幕，复制提示词给 AI → ② 把 AI 返回的笔记粘回来解析 → ③ 生成练习单元</div>
          </div>
          <div class="mg-ops"><button class="mg-btn" onclick="snBack()">返回练习</button></div>
        </div>

        <div class="mg-field">
          <label>① 原始对话 / 字幕（英文，可留空直接用下面的笔记框）</label>
          <textarea id="sn-raw" style="width:100%;min-height:110px" placeholder="把 YouTube / 美剧 / 播客的英文字幕贴在这里"></textarea>
        </div>
        <div class="mg-row-flex" style="margin-bottom:16px">
          <button class="mg-btn primary" onclick="snCopyPrompt()">复制 AI 提示词</button>
          <span class="mg-status" id="sn-status"></span>
        </div>

        <div class="mg-field">
          <label>② AI 生成的笔记（Markdown，粘贴后点解析）</label>
          <textarea id="sn-md" style="width:100%;min-height:180px" placeholder="## 原文（双语对照）&#10;...&#10;&#10;## 笔记（句子笔记）&#10;### There you go.&#10;给你。&#10;💡 ...&#10;&#10;## 单词模块&#10;- mess up — 搞砸">${esc(state.md || '')}</textarea>
        </div>
        <div class="mg-row-flex" style="margin-bottom:6px">
          <input id="sn-title" class="mg-input" style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text)" placeholder="笔记标题，如 Friends S01E01" value="${esc(state.title || '')}">
          <button class="mg-btn primary" onclick="snParse()">解析</button>
        </div>
        ${preview}

        <div style="margin-top:18px">
          <div class="mg-en" style="margin-bottom:8px">已有笔记（${list.length}）</div>
          ${rows || '<div class="mg-empty">还没有笔记，先做一份试试</div>'}
        </div>
      </div>`;
  }

  /* ---------------- 交互 ---------------- */
  window.openSpokenNotes = function () {
    state = { parsed: null };
    renderNotesPage();
  };

  window.snBack = function () {
    if (typeof currentChapter !== 'undefined' && currentChapter !== null && typeof selectUnit === 'function') {
      selectUnit(currentChapter, currentUnit === null ? 0 : currentUnit);
    } else if (typeof renderSidebar === 'function') {
      renderSidebar();
      const area = document.getElementById('practice-area');
      if (area) area.innerHTML = '<div class="mg-empty">请从左侧选择一个单元开始</div>';
    }
  };

  window.snCopyPrompt = function () {
    const raw = (document.getElementById('sn-raw') || {}).value || '';
    const text = AI_PROMPT.replace('__TRANSCRIPT__', raw.trim() || '（在这里粘贴英文对话/字幕）');
    const ok = () => { const s = document.getElementById('sn-status'); if (s) s.textContent = '已复制提示词，粘贴给 AI 即可'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, () => fallbackCopy(text, ok));
    } else {
      fallbackCopy(text, ok);
    }
  };

  function fallbackCopy(text, cb) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      cb();
    } catch (e) {
      const s = document.getElementById('sn-status');
      if (s) s.textContent = '复制失败，请手动选择文本复制';
    }
  }

  window.snParse = function () {
    const md = (document.getElementById('sn-md') || {}).value || '';
    if (!md.trim()) { if (typeof toast === 'function') toast('请先粘贴笔记内容'); return; }
    const p = parseNote(md);
    if (!p.sentences.length && !p.words.length) {
      if (typeof toast === 'function') toast('没解析出内容，检查格式是否包含 ## 原文 / ## 笔记 / ## 单词模块');
      return;
    }
    const t = document.getElementById('sn-title');
    const stamp = '笔记 ' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    state.parsed = p;
    state.md = md;
    state.title = (t && t.value.trim()) || stamp;
    renderNotesPage();
    const s = document.getElementById('sn-status');
    if (s) s.textContent = '解析完成：句子 ' + p.sentences.length + '，单词 ' + p.words.length;
  };

  window.snClearPreview = function () { state.parsed = null; renderNotesPage(); };

  window.snGenerate = function () {
    const p = state.parsed;
    if (!p) return;
    const t = document.getElementById('sn-title');
    const title = (((t && t.value) || state.title || '') + '').trim() || ('笔记 ' + Date.now());
    const md = ((document.getElementById('sn-md') || {}).value) || state.md || '';
    const list = load();
    const note = {
      id: 'n' + Date.now().toString(36),
      title: title,
      createdAt: new Date().toLocaleString('zh-CN'),
      sentences: p.sentences,
      words: p.words,
      raw: md.slice(0, 4000)
    };
    list.unshift(note);
    save(list);
    state = { parsed: null, md: '', title: '' };
    const idx = syncTextbook();
    if (typeof renderSidebar === 'function') renderSidebar();
    renderNotesPage();
    if (typeof toast === 'function') toast('已生成练习单元：' + title);
    snPractice(note.id);
    return idx;
  };

  window.snPractice = function (id) {
    const idx = syncTextbook();
    if (idx < 0) return;
    const tb = textbooks[idx];
    const ui = (tb.units[0].units || []).findIndex(u => u._noteId === id);
    if (ui < 0) return;
    if (typeof switchTextbook === 'function') switchTextbook(idx);
    if (typeof selectUnit === 'function') selectUnit(0, ui);
    if (typeof currentMode !== 'undefined') {
      try { currentMode = 'sentence'; } catch (e) { /* const 时忽略 */ }
      if (typeof updateModeTabs === 'function') updateModeTabs();
    }
    if (typeof startPractice === 'function') startPractice(0);
  };

  window.snRemove = function (id) {
    const list = load().filter(n => n.id !== id);
    save(list);
    syncTextbook();
    if (typeof renderSidebar === 'function') renderSidebar();
    renderNotesPage();
    if (typeof toast === 'function') toast('已删除');
  };

  /* ---------------- 初始化 ---------------- */
  try {
    const list = load();
    if (list.length) {
      syncTextbook();
      if (typeof renderSidebar === 'function') renderSidebar();
    }
  } catch (e) { /* 初始化失败不影响主流程 */ }
})();
