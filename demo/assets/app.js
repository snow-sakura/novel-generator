/* =========================================================
 * 🍅 番茄小说生成器 · 在线 Demo
 * 纯静态实现：模拟 V3 灵魂版全流程
 *  - 四智能体流水线：ParserAgent → OutlinerAgent → WriterAgent → TitlerAgent
 *  - 数据记录：浏览器 localStorage（零后端，GitHub Pages 即可运行）
 * ======================================================= */
'use strict';

const LS_RECORDS = 'tomato.demo.records.v1';
const LS_CONFIG = 'tomato.demo.config.v1';

/* ---------------- 常量（与真实项目 lib/constants 对应） ---------------- */
const CHANNELS = ['男频', '女频'];
const GENRES = ['玄幻', '都市', '科幻', '悬疑', '历史', '武侠', '仙侠', '系统', '穿越', '无限流'];
const STYLES = ['热血燃系', '轻松搞笑', '冷硬暗黑', '细腻治愈', '爽文快节奏', '文青慢热'];

const AGENTS = [
  { id: 'parser',   name: 'ParserAgent',   role: '故事要素分析师 · 提取六维要素' },
  { id: 'outliner', name: 'OutlinerAgent', role: '大纲架构师 · 构建六层大纲' },
  { id: 'writer',   name: 'WriterAgent',   role: '章节作家 · 逐章流式生成' },
  { id: 'titler',   name: 'TitlerAgent',   role: '标题专家 · 生成书名' },
];

const SEED_CHIPS = [
  '程序员猝死后穿越成修仙宗门杂役，发现代码可以改写天条',
  '深夜便利店迎来第一位客人，他递上的硬币来自三百年后',
  '全球游戏化第一天，我的天赋是「BUG 编译器」',
  '被退婚那天，我捡到了前魔尊的记忆碎片',
];

const PROMPTS = [
  { cat: '都市 × 系统', text: '外卖员绑定「人生重开系统」，每完成一单就能抽取客户的一项人生技能' },
  { cat: '玄幻 × 废柴流', text: '全灵根测试垫底的少年，丹田里沉睡着一整座被封印的上古剑冢' },
  { cat: '科幻 × 无限流', text: '末班地铁驶向不存在的站点，乘客们必须在七站之内解开城市毁灭的真相' },
  { cat: '悬疑 × 古物', text: '古董修复师接到一桩怪活：修一只会自己走字的八音盒' },
  { cat: '历史 × 种田', text: '农科博士穿成被贬皇子，封地是盐碱地，开局一把锄头' },
  { cat: '仙侠 × 苟道', text: '修仙万年只练防御的老仆，在主宗覆灭那日挡在了全宗门前' },
];

/* ---------------- 工具 ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const now = () => new Date().toLocaleString('zh-CN', { hour12: false });

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._tm); t._tm = setTimeout(() => (t.hidden = true), 2200);
}

/* ---------------- localStorage 数据层 ---------------- */
const Store = {
  records: () => JSON.parse(localStorage.getItem(LS_RECORDS) || '[]'),
  save(rec) {
    const list = Store.records();
    list.unshift(rec);
    localStorage.setItem(LS_RECORDS, JSON.stringify(list));
    refreshStorageInfo();
  },
  remove(id) {
    localStorage.setItem(LS_RECORDS, JSON.stringify(Store.records().filter(r => r.id !== id)));
    refreshStorageInfo();
  },
  clear() { localStorage.removeItem(LS_RECORDS); refreshStorageInfo(); },
  config: () => JSON.parse(localStorage.getItem(LS_CONFIG) || '{}'),
  saveConfig(c) { localStorage.setItem(LS_CONFIG, JSON.stringify(c)); },
};

function refreshStorageInfo() {
  const n = Store.records().length;
  const words = Store.records().reduce((s, r) => s + r.wordCount, 0);
  $('#storageInfo').textContent = `本地存储：${n} 条记录 · ${words.toLocaleString()} 字`;
  const badge = $('#navCount');
  badge.textContent = n; badge.hidden = n === 0;
}

/* ---------------- 导航 ---------------- */
function go(page) {
  $$('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  if (page === 'history') renderHistory();
  location.hash = page;
  window.scrollTo(0, 0);
}
$('#nav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-item');
  if (btn) go(btn.dataset.page);
});

/* ---------------- 创作页初始化 ---------------- */
function buildChips(box, items, multi = false) {
  const el = $(box);
  el.innerHTML = '';
  items.forEach((it, i) => {
    const c = document.createElement('button');
    c.className = 'chip' + (!multi && i === 0 ? ' on' : '');
    c.textContent = it;
    c.onclick = () => {
      if (multi) c.classList.toggle('on');
      else { [...el.children].forEach(x => x.classList.remove('on')); c.classList.add('on'); }
    };
    el.appendChild(c);
  });
}
buildChips('#channelChips', CHANNELS);
buildChips('#genreChips', GENRES, true);
buildChips('#styleChips', STYLES);
SEED_CHIPS.forEach(s => {
  const c = document.createElement('button');
  c.className = 'chip'; c.textContent = s.length > 18 ? s.slice(0, 18) + '…' : s; c.title = s;
  c.onclick = () => { $('#seed').value = s; };
  $('#seedChips').appendChild(c);
});

/* ---------------- 简易文本引擎（模拟 LLM） ---------------- */
function extractElements(seed) {
  const s = seed.trim();
  const who = pick(['林衡', '苏眠', '陈默', '顾青山', '叶知秋']);
  return {
    人物: who,
    时间: pick(['一个暴雨将至的黄昏', '灵气复苏第三年', '末法时代末期', '凌晨两点']),
    地点: pick(['青云宗外门杂役院', '城南 24 小时便利店', '旧城地铁站深处', '七十二峰藏经阁']),
    起因: s.slice(0, 24) + (s.length > 24 ? '……' : ''),
    发展: pick(['实力与认知被彻底颠覆，旧秩序开始崩塌', '被迫卷入一场跨越百年的布局', '每一步变强都在靠近被抹去的真相']),
    结局: pick(['掀翻旧规则，成为新传说的起点', '以凡人之躯改写天条', '站在巅峰回望，一切从那句种子句开始']),
  };
}

const PARAGRAPHS = [
  '{time}，{place}的风里第一次有了「数字」的味道。{hero}盯着掌心浮起的那行淡金色小字，喉结动了动，没有出声。',
  '没有人告诉他发生了什么。但{hero}知道，从这一刻起，过去十九年所有被视为理所当然的东西，都开始以肉眼可见的速度瓦解。',
  '「这不合理。」{hero}听见自己说。可指尖落下的瞬间，不合理的事再次发生——{twist}。',
  '远处传来钟鸣，一声，两声。整座城市（整座山门）都在同一秒安静下来。{hero}明白，{develop}，而他已经没有退路。',
  '有人在大声质问，有人在跪地祈祷。混乱像墨滴进水里迅速晕开，只有{hero}站在漩涡中央，感到一种奇异的平静。',
  '很多年后，当说书人把这卷故事讲到这一章，总会停下来喝一口茶：「各位，命运在这里拐了个弯。而拐弯的原因，不过是{cause}。」',
  '夜色沉下去，天光浮上来。{hero}把涌到喉咙口的话又咽了回去，转身走进人群。故事才刚刚开始。',
  '他终于看清了那行小字的全貌，也看清了自己真正的处境——{ending}。',
];

function renderParagraph(el) {
  return PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)]
    .replaceAll('{hero}', el.人物).replaceAll('{time}', el.时间).replaceAll('{place}', el.地点)
    .replaceAll('{twist}', pick(['一直温顺的灵纹突然逆流成环', '系统面板弹出了一行红色警告', '消失三年的名字重新出现在名册上']))
    .replaceAll('{develop}', el.发展).replaceAll('{cause}', el.起因).replaceAll('{ending}', el.结局);
}

const CHAPTER_TITLES = ['门后的第一道光', '名册上消失的名字', '逆流的灵纹', '子夜钟鸣', '旧规则崩塌之夜', '谁在改写天条', '藏经阁惊变', '凡人之躯', '天光大亮', '新传说'];

function genTitle(seed) {
  const kw = (seed.match(/[\u4e00-\u9fa5]{2,4}/g) || ['命运']).filter(w => !['一个', '发现', '自己', '开始', '那天'].includes(w));
  const a = pick(kw), b = pick(['纪元', '长夜', '逆旅', '残卷', '黎明', '天条']);
  return pick([`《${a}${b}》`, `《我在${a}的${b}》`, `《${a}：${b}之前》`]);
}

/* ---------------- 生成流程（四智能体流式模拟） ---------------- */
let generating = false;

function log(cls, html) {
  const box = $('#genLog');
  const div = document.createElement('div');
  div.className = cls; div.innerHTML = html;
  box.appendChild(div); box.scrollTop = box.scrollHeight;
  return div;
}

async function typeInto(el, text, speed = 18) {
  for (let i = 0; i < text.length; i += 2) {
    el.textContent += text.slice(i, i + 2);
    $('#genLog').scrollTop = $('#genLog').scrollHeight;
    await sleep(speed);
  }
}

function setAgent(id, state) {
  const el = $(`.agent[data-agent="${id}"]`);
  el.classList.remove('active', 'done');
  if (state) el.classList.add(state);
}

function progress(p) { $('#progressBar').style.width = p + '%'; }

async function generate() {
  if (generating) return;
  const seed = $('#seed').value.trim();
  if (!seed) { toast('请输入种子句 🌱'); $('#seed').focus(); return; }

  generating = true;
  const btn = $('#btnGenerate');
  btn.disabled = true; btn.textContent = '⏳ 生成中…';
  $('#genLog').innerHTML = '';
  $('#pipeline').innerHTML = AGENTS.map(a =>
    `<div class="agent" data-agent="${a.id}"><span class="dot"></span><div><div class="a-name">${a.name}</div><div class="a-role">${a.role}</div></div></div>`).join('');
  progress(0);
  const st = $('#genStatus');
  st.className = 'status-pill running'; st.textContent = '● 生成中';

  const channel = $('#channelChips .chip.on').textContent;
  const genres = $$('#genreChips .chip.on').map(c => c.textContent);
  const style = $('#styleChips .chip.on')?.textContent || STYLES[0];
  const nChapters = +$('#chapterCount').value;

  log('lg-sys', `[系统] ${now()} 收到种子句：「${seed}」 频道=${channel} 题材=${genres.join('/')} 风格=${style}`);

  // ---- Agent 1: Parser ----
  setAgent('parser', 'active');
  await sleep(600);
  log('lg-agent', '▶ ParserAgent（要素解析）');
  const el = extractElements(seed);
  const elDiv = log('lg-text', '');
  await typeInto(elDiv, Object.entries(el).map(([k, v]) => `  ${k}：${v}`).join('\n'));
  log('lg-ok', '✔ 六维要素解析完成');
  setAgent('parser', 'done'); progress(15);

  // ---- Agent 2: Outliner ----
  setAgent('outliner', 'active');
  await sleep(500);
  log('lg-agent', '▶ OutlinerAgent（大纲规划）');
  const titles = [...CHAPTER_TITLES].sort(() => Math.random() - .5).slice(0, nChapters).map((t, i) => `第${i + 1}章 ${t}`).sort();
  const olDiv = log('lg-text', '');
  await typeInto(olDiv,
    `  战略层：以「${seed.slice(0, 14)}…」为核心爽点\n  人物层：主角 ${el.人物} + 对手 + 盟友\n  结构层：起承转合 × ${nChapters} 章\n  大纲：\n` + titles.map(t => '   · ' + t).join('\n'));
  log('lg-ok', '✔ 六层大纲构建完成');
  setAgent('outliner', 'done'); progress(30);

  // ---- Agent 3: Writer ----
  setAgent('writer', 'active');
  log('lg-agent', '▶ WriterAgent（逐章流式生成）');
  const chapters = [];
  let wordCount = 0;
  for (let i = 0; i < nChapters; i++) {
    const paras = [];
    const div = log('lg-text', '');
    const head = `\n── ${titles[i]} ` + '─'.repeat(Math.max(4, 26 - titles[i].length)) + '\n';
    div.textContent = head;
    for (let p = 0; p < 4; p++) {
      const para = renderParagraph(el) + '（Demo 模拟正文）';
      paras.push(para);
      await typeInto(div, '　　' + para.slice(0, 64) + '……\n', 10);
      wordCount += para.length;
    }
    chapters.push({ n: i + 1, title: titles[i], content: paras.join('\n\n') });
    progress(30 + Math.round(55 * (i + 1) / nChapters));
    log('lg-ok', `✔ ${titles[i]} 完成（本章 ${paras.join('').length} 字）`);
  }
  setAgent('writer', 'done'); progress(88);

  // ---- Agent 4: Titler ----
  setAgent('titler', 'active');
  await sleep(400);
  log('lg-agent', '▶ TitlerAgent（标题生成）');
  const title = genTitle(seed);
  const tDiv = log('lg-text', '');
  await typeInto(tDiv, `  候选：${genTitle(seed)} ／ ${title}`);
  log('lg-ok', `✔ 最终书名：${title}`);
  setAgent('titler', 'done'); // progress 100
  progress(100);

  // ---- 保存记录 --------------------
  const record = {
    id: 'rec_' + Date.now(),
    title, seed, channel, genres, style,
    chapters, wordCount,
    createdAt: new Date().toISOString(),
    source: 'demo',
  };
  Store.save(record);
  st.className = 'status-pill done'; st.textContent = '✔ 已完成';
  log('lg-ok', `[系统] 记录已写入 localStorage（key=${LS_RECORDS}），可在「我的作品」查看/导出。`);

  $('#doneTitle').textContent = `${title} 创作完成！`;
  $('#doneSummary').textContent = `${nChapters} 章 · ${wordCount.toLocaleString()} 字 · 已保存到浏览器本地`;
  $('#doneModal').hidden = false;
  $('#btnDoneRead').onclick = () => { $('#doneModal').hidden = true; go('history'); openDetail(record.id); };
  $('#btnDoneHistory').onclick = () => { $('#doneModal').hidden = true; go('history'); };

  btn.disabled = false; btn.textContent = '🚀 开始生成';
  generating = false;
}
$('#btnGenerate').onclick = generate;

/* ---------------- 对话创作（模拟） ---------------- */
const CHAT_FLOW = [
  { ai: '你好！我是创作助手 🤖 用一句话告诉我你想写什么故事？', board: null },
  { ai: '好线索！我把它拆成了六维要素 ✅\n人物 / 时间 / 地点 / 起因 / 发展 / 结局 已填入右侧看板。\n接下来想走「爽文快节奏」还是「文青慢热」？', board: 'elements' },
  { ai: '收到！大纲已经排好：起承转合五段式，第一章节奏前置、第三章埋反转。\n确认配置后，我可以直接开始生成 ✍️', board: 'outline' },
  { ai: '已跳转到「创作工坊」，点击「开始生成」即可看到四智能体的实时输出 🚀', board: 'ready' },
];
let chatStep = 0;

function addBubble(who, text, tag) {
  const b = document.createElement('div');
  b.className = 'bubble ' + who;
  b.innerHTML = (tag ? `<span class="b-tag">${tag}</span>` : '') + text.replace(/\n/g, '<br>');
  $('#chatBox').appendChild(b);
  $('#chatBox').scrollTop = 1e9;
}

function renderBoard(step) {
  const el = extractElements($('#seed').value || SEED_CHIPS[0]);
  const rows = [['种子句', $('#seed').value || '（未填写）']];
  if (step >= 1) rows.push(...Object.entries(el));
  if (step >= 2) rows.push(['大纲', '5 章 · 起承转合'], ['节奏', '快节奏 · 强钩子']);
  if (step >= 3) rows.push(['状态', '待生成']);
  $('#chatBoard').innerHTML = rows.map(([k, v]) => `<div class="board-item"><span>${k}</span><b>${v}</b></div>`).join('');
}

function chatReset() {
  chatStep = 0;
  $('#chatBox').innerHTML = '';
  $('#chatBoard').innerHTML = '<div class="board-item pending"><span>等待对话开始…</span></div>';
  addBubble('ai', CHAT_FLOW[0].ai, '创作助手');
}
function chatNext() {
  chatStep = Math.min(chatStep + 1, CHAT_FLOW.length - 1);
  const step = CHAT_FLOW[chatStep];
  addBubble('ai', step.ai, '创作助手');
  if (step.board === 'elements') renderBoard(1);
  if (step.board === 'outline') renderBoard(2);
  if (step.board === 'ready') { renderBoard(3); setTimeout(() => go('create'), 900); }
}
function chatSend() {
  const v = $('#chatText').value.trim();
  if (!v) return;
  addBubble('me', v, '我');
  $('#chatText').value = '';
  if (chatStep === 0 && v.length >= 4) { $('#seed').value = v; }
  setTimeout(chatNext, 500);
}
$('#chatSend').onclick = chatSend;
$('#chatText').addEventListener('keydown', e => { if (e.key === 'Enter') chatSend(); });

/* ---------------- 历史 / 详情 ---------------- */
function fmtDate(iso) { return new Date(iso).toLocaleString('zh-CN', { hour12: false }); }

function renderHistory() {
  const list = Store.records();
  $('#histEmpty').style.display = list.length ? 'none' : 'block';
  $('#histSummary').textContent = list.length
    ? `共 ${list.length} 部作品 · ${list.reduce((s, r) => s + r.wordCount, 0).toLocaleString()} 字 · 数据源：localStorage`
    : '';
  $('#histList').innerHTML = list.map(r => `
    <div class="hist-card">
      <h3>${r.title}</h3>
      <div class="h-seed">🌱 ${r.seed}</div>
      <div class="h-meta">
        <span class="tag red">${r.channel}</span>
        ${r.genres.map(g => `<span class="tag">${g}</span>`).join('')}
        <span class="tag">${r.chapters.length} 章</span>
        <span class="tag">${r.wordCount.toLocaleString()} 字</span>
        <span class="tag">${fmtDate(r.createdAt)}</span>
      </div>
      <div class="h-btns">
        <button class="btn-primary sm" data-act="read" data-id="${r.id}">阅读</button>
        <button class="btn-ghost sm" data-act="txt" data-id="${r.id}">导出</button>
        <button class="btn-ghost sm danger" data-act="del" data-id="${r.id}">删除</button>
      </div>
    </div>`).join('');
}

$('#histList').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;
  if (act === 'read') openDetail(id);
  if (act === 'txt') exportTxt(id);
  if (act === 'del') { if (confirm('确认删除该作品？')) { Store.remove(id); toast('已删除'); renderHistory(); } }
});

let currentRecord = null;
function openDetail(id) {
  const r = Store.records().find(x => x.id === id);
  if (!r) return;
  currentRecord = r;
  $('#detailTitle').textContent = r.title;
  $('#detailMeta').textContent = `🌱 ${r.seed} ｜ ${r.channel} · ${r.genres.join('/')} · ${r.style} ｜ ${r.chapters.length} 章 ${r.wordCount.toLocaleString()} 字 ｜ ${fmtDate(r.createdAt)}`;
  $('#detailBody').innerHTML = r.chapters.map(c =>
    `<h2>${c.title}</h2>` + c.content.split('\n\n').map(p => `<p>${p}</p>`).join('')).join('');
  go('detail');
}
$('#btnBackHistory').onclick = () => go('history');

function download(name, text, mime = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}

function novelText(r) {
  return `${r.title}\n——由 番茄小说生成器 Demo 生成 · ${fmtDate(r.createdAt)}\n\n` +
    r.chapters.map(c => `\n${c.title}\n\n${c.content}`).join('\n');
}
function novelMd(r) {
  return `# ${r.title}\n\n> 🌱 种子句：${r.seed}\n> ${r.channel} · ${r.genres.join('/')} · ${r.style} · ${fmtDate(r.createdAt)}\n\n` +
    r.chapters.map(c => `## ${c.title}\n\n${c.content.split('\n\n').join('\n\n')}`).join('\n\n');
}

$('#btnExportTxt').onclick = () => { if (currentRecord) { download(currentRecord.title.replace(/[《》/]/g, '') + '.txt', novelText(currentRecord)); toast('TXT 已导出'); } };
$('#btnExportMd').onclick = () => { if (currentRecord) { download(currentRecord.title.replace(/[《》/]/g, '') + '.md', novelMd(currentRecord), 'text/markdown'); toast('Markdown 已导出'); } };
$('#btnCopyAll').onclick = async () => { if (currentRecord) { await navigator.clipboard.writeText(novelText(currentRecord)); toast('全文已复制'); } };
$('#btnExportAll').onclick = () => {
  const list = Store.records();
  if (!list.length) { toast('暂无记录'); return; }
  download('tomato-novel-records.json', JSON.stringify(list, null, 2), 'application/json');
  toast(`已导出 ${list.length} 条记录（数据记录导出）`);
};
$('#btnClearAll').onclick = () => { if (confirm('确认清空全部本地记录？此操作不可恢复')) { Store.clear(); renderHistory(); toast('已清空'); } };

/* ---------------- 提示词模板 ---------------- */
$('#promptGrid').innerHTML = PROMPTS.map((p, i) => `
  <div class="prompt-card">
    <span class="p-cat">${p.cat}</span>
    <p>${p.text}</p>
    <button class="btn-primary sm" data-i="${i}" style="width:auto">使用此模板 →</button>
  </div>`).join('');
$('#promptGrid').addEventListener('click', e => {
  const btn = e.target.closest('button[data-i]');
  if (!btn) return;
  $('#seed').value = PROMPTS[+btn.dataset.i].text;
  go('create');
  toast('模板已填入创作工坊');
});

/* ---------------- 模型配置 ---------------- */
(function initCfg() {
  const c = Store.config();
  $('#cfgProvider').value = c.provider || $('#cfgProvider').value;
  $('#cfgUrl').value = c.url || 'https://opencode.ai/zen/v1';
  $('#cfgModel').value = c.model || 'mimo-v2.5-free';
  if (c.keyMasked) $('#cfgKey').placeholder = c.keyMasked + '（已保存于本机）';
})();
$('#btnSaveCfg').onclick = () => {
  const key = $('#cfgKey').value.trim();
  Store.saveConfig({
    provider: $('#cfgProvider').value,
    url: $('#cfgUrl').value.trim(),
    model: $('#cfgModel').value.trim(),
    keyMasked: key ? 'sk-' + '•'.repeat(Math.max(6, key.length - 3)) + key.slice(-3) : Store.config().keyMasked,
    savedAt: new Date().toISOString(),
  });
  toast('配置已保存到 localStorage（不会上传）');
};

/* ---------------- 启动 ---------------- */
refreshStorageInfo();
chatReset();
go((location.hash || '#create').slice(1) || 'create');
