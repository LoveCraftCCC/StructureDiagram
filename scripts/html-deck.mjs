/**
 * html-deck.mjs — deck-craft 的主生成器：受约束版式的 HTML 幻灯片（单文件、零依赖、可打印）。
 *
 * 纪律与 pptx 版一致：Agent 不做自由排版；版面几何全部由 TOKENS/GEO 推导（in×96=px）；
 * 标题先量测后落位；构建时静态 lint；交付前必须渲染目检。
 * 叙事/关系图（架构/流程/时序）优先用 archify（交互 HTML），本库管叙事展示页。
 */

/* ---------------- 设计 token（与 pptx 版同源，px 化） ---------------- */
export const T = {
  W: 1280, H: 720,
  color: {
    ink: '#14181F', ink2: '#4B5563', ink3: '#9AA1AB',
    rule: '#E3E6EA', panel: '#F4F5F7',
    primary: '#16324F', accent: '#B4531F',
    good: '#2F6F4F', bad: '#A63D2A', bg: '#FFFFFF',
    onDark: '#FFFFFF', onDark2: '#C7D2DE',
  },
  series: ['#16324F', '#B4531F', '#64748B', '#8C7A4B', '#2F6F6B', '#7A5C78'],
  font: `"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif`,
  type: { cover: 44, section: 38, titleMax: 31, titleMin: 22, body: 19, small: 15, tiny: 12, kpi: 50 },
};

/* 版面几何（px） */
export const G = {
  mx: 60, cw: 1280 - 120,
  titleY: 44, titleH: 80, ruleY: 134, bodyY: 152, footY: 678,
  get bodyH() { return this.footY - 12 - this.bodyY; },
};

/* ---------------- CJK 感知文本量测（px） ---------------- */
const CJK_RE = /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;
function emWidth(ch) {
  if (CJK_RE.test(ch)) return 1.0;
  if (/[A-Z]/.test(ch)) return 0.66;
  if (/[a-z]/.test(ch)) return 0.52;
  if (/[0-9]/.test(ch)) return 0.56;
  if (ch === ' ') return 0.28;
  if (/[，。、；：！？“”（）【】·—….,;:!?'"()\-\/]/.test(ch)) return 0.34;
  return 0.58;
}
const cjkLen = (s) => [...String(s ?? '')].reduce((a, c) => a + emWidth(c), 0);
function wrapLines(text, boxW, px) {
  const budget = boxW / px;
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    const tokens = [];
    let buf = '';
    for (const ch of para) {
      if (CJK_RE.test(ch)) { if (buf) { tokens.push(buf); buf = ''; } tokens.push(ch); }
      else if (ch === ' ') { if (buf) { tokens.push(buf); buf = ''; } tokens.push(' '); }
      else buf += ch;
    }
    if (buf) tokens.push(buf);
    let line = '', w = 0;
    for (const t of tokens) {
      const tw = emLen(t);
      if (line.trim() && w + tw > budget) { out.push(line.trimEnd()); line = (t === ' ' ? '' : t); w = (t === ' ' ? 0 : tw); }
      else if (!(t === ' ' && !line)) { line += t; w += tw; }
    }
    out.push(line.trimEnd());
  }
  return out.filter((l, i, a) => l !== '' || a.length === 1);
}
const emLen = (s) => [...String(s)].reduce((a, c) => a + emWidth(c), 0);
export function fitSize(text, boxW, boxH, { max = T.type.titleMax, min = T.type.titleMin, ls = 1.28, slack = 0.96 } = {}) {
  for (let px = max; px >= min; px -= 1) {
    const lines = wrapLines(text, boxW * slack, px);
    if (lines.length * px * ls <= boxH * slack) return { size: px, lines: lines.length, overflow: false };
  }
  return { size: min, lines: wrapLines(text, boxW * slack, min).length, overflow: true };
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------- Deck（HTML） ---------------- */
export class Deck {
  constructor(opts = {}) {
    this.slides = [];
    this.issues = [];
    this.meta = [];
    this.n = 0;
  }

  _slide(kind, inner, { bg = T.color.bg, footer = true, source, style = '' } = {}) {
    this.n += 1;
    this.meta.push({ no: this.n, kind, source });
    const f = footer ? `<footer><span class="src">${source ? '资料来源：' + esc(source) : ''}</span><span class="pg">${String(this.n).padStart(2, '0')}</span></footer>` : '';
    this.slides.push(`<section class="slide kind-${kind}" id="s${this.n}" style="background:${bg};${style}">${inner}${f}</section>`);
    return this;
  }

  _titleHTML(title) {
    const f = fitSize(title, G.cw, G.titleH);
    if (f.overflow) this.issues.push({ level: 'error', slide: this.n, rule: 'title-overflow', msg: `标题装不下（约需 ${f.lines} 行）：${title}` });
    return `<div class="title-zone"><h1 style="font-size:${f.size}px">${esc(title)}</h1><div class="rule"><span class="rule-accent"></span><span class="rule-line"></span></div></div>`;
  }

  _subHTML(subtitle) {
    return subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : '';
  }

  /* --- 封面 --- */
  cover({ title, subtitle, meta }) {
    const f = fitSize(title, G.cw * 0.86, 165, { max: T.type.cover, min: 30 });
    return this._slide('cover', `
      <div class="cover-bar"></div>
      <h1 class="cover-title" style="font-size:${f.size}px">${esc(title)}</h1>
      ${subtitle ? `<div class="cover-sub">${esc(subtitle)}</div>` : ''}
      ${meta ? `<div class="cover-meta">${esc(meta)}</div>` : ''}`,
      { bg: T.color.primary, footer: false });
  }

  /* --- 议程 --- */
  agenda({ title = '议程', items }) {
    const twoCol = items.length >= 5;
    const rowH = Math.min(98, G.bodyH / items.length);
    const li = items.map((it, i) => `<li style="height:${rowH}px"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="tx" style="font-size:${rowH > 74 ? 21 : 19}px">${esc(it)}</span></li>`).join('');
    return this._slide('agenda', `${this._titleHTML(title)}<ol class="agenda ${twoCol ? 'two' : ''}">${li}</ol>`, { source: '' });
  }

  /* --- 分节页 --- */
  section({ index, title, caption }) {
    return this._slide('section', `
      <div class="sec-index">${esc(index)}</div>
      <h1 class="sec-title">${esc(title)}</h1>
      ${caption ? `<div class="sec-cap">${esc(caption)}</div>` : ''}`,
      { bg: T.color.primary, footer: false });
  }

  /* --- 论点列表（最后手段） --- */
  bullets({ title, subtitle, items, source }) {
    if (items.length > 5) this.issues.push({ level: 'error', slide: this.n + 1, rule: 'too-many-bullets', msg: `bullets 超过 5 条（${items.length} 条）——拆页` });
    items.forEach((it, i) => {
      const raw = typeof it === 'string' ? { t: it } : it;
      const text = raw.h ? `${raw.h}　${raw.t ?? ''}` : (raw.t ?? '');
      if (cjkLen(text) > 50) this.issues.push({ level: 'warn', slide: this.n + 1, rule: 'long-line', msg: `第 ${i + 1} 条过长（≈${Math.round(cjkLen(text))} 字宽 > 50）` });
    });
    const areaH = G.bodyH - (subtitle ? 40 : 0);
    const rowH = Math.min(areaH / items.length, 96);
    const off = Math.max(0, (areaH - rowH * items.length) / 2);
    const fs = items.length <= 4 ? T.type.body + 2 : T.type.body;
    const li = items.map((it) => {
      const raw = typeof it === 'string' ? { t: it } : it;
      return `<li style="height:${rowH}px"><span class="dash">—</span><span class="tx" style="font-size:${fs}px">${raw.h ? `<b>${esc(raw.h)}</b>　<span class="tx2">${esc(raw.t ?? '')}</span>` : `<span class="tx2">${esc(raw.t ?? '')}</span>`}</span></li>`;
    }).join('');
    return this._slide('bullets', `${this._titleHTML(title)}${this._subHTML(subtitle)}<ul class="bullets" style="top:${G.bodyY + (subtitle ? 40 : 0) + off}px">${li}</ul>`, { source });
  }

  /* --- 多栏对照 --- */
  columns({ title, subtitle, columns, source }) {
    if (columns.length > 3) this.issues.push({ level: 'error', slide: this.n + 1, rule: 'too-many-columns', msg: '栏数 > 3，拆页' });
    const cards = columns.slice(0, 3).map((c) => {
      const items = c.items ?? [];
      return `<div class="col-card"><div class="col-head">${esc(c.head)}</div><ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    }).join('');
    return this._slide('columns', `${this._titleHTML(title)}${this._subHTML(subtitle)}<div class="cols">${cards}</div>`, { source });
  }

  /* --- 图表（SVG/纯 CSS 手绘，零依赖） --- */
  chart({ title, subtitle, kind = 'bar', data, note, source, axisMin, axisMax }) {
    if (!source) this.issues.push({ level: 'error', slide: this.n + 1, rule: 'missing-source', msg: '数据页必须给出来处（source）' });
    if ((data.series ?? []).length > 5) this.issues.push({ level: 'error', slide: this.n + 1, rule: 'too-many-series', msg: `系列数 ${data.series.length} > 5` });
    const top = G.bodyY + (subtitle ? 40 : 0) + 6;
    const bottom = G.footY - 34 - (note ? 26 : 0);
    let plot = '';
    if (kind === 'line') plot = `<div style="padding-top:${top - G.bodyY}px">${lineSVG(data, { top, bottom, axisMin, axisMax })}</div>`;
    else if (kind === 'hbar') plot = hbarHTML(data, { top, bottom });
    else plot = vbarHTML(data, { top, bottom });
    return this._slide('chart', `${this._titleHTML(title)}${this._subHTML(subtitle)}<div class="chart">${plot}</div>${note ? `<div class="note">${esc(note)}</div>` : ''}`, { source });
  }

  /* --- KPI 行 --- */
  kpi({ title, subtitle, items, source }) {
    const n = items.length;
    if (n < 2 || n > 4) this.issues.push({ level: 'error', slide: this.n + 1, rule: 'kpi-count', msg: `KPI 数量应为 2–4，当前 ${n}` });
    const cards = items.map((it) => {
      const good = it.tone !== 'bad';
      const arrow = it.dir === 'down' ? '▼' : '▲';
      return `<div class="kpi-card"><div class="kpi-v">${esc(it.value)}</div><div class="kpi-l">${esc(it.label)}</div>${it.delta ? `<div class="kpi-d" style="color:${good ? T.color.good : T.color.bad}">${arrow} ${esc(it.delta)}</div>` : ''}</div>`;
    }).join('');
    return this._slide('kpi', `${this._titleHTML(title)}${this._subHTML(subtitle)}<div class="kpis">${cards}</div>`, { source });
  }

  /* --- 2×2 矩阵 --- */
  matrix({ title, subtitle, xLeft, xRight, yTop, yBottom, cells, source }) {
    const cellHTML = (c, i) => `<div class="q ${i === 0 ? 'q-hl' : ''}"><div class="q-head">${esc(c.head)}</div><ul>${(c.items ?? []).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    return this._slide('matrix', `${this._titleHTML(title)}${this._subHTML(subtitle)}
      <div class="matrix">
        <div class="axis-y"><span>${esc(yTop ?? '')}</span><span>${esc(yBottom ?? '')}</span></div>
        <div class="qgrid">${cells.slice(0, 4).map(cellHTML).join('')}</div>
        <div class="axis-x"><span>${esc(xLeft ?? '')}</span><span>${esc(xRight ?? '')}</span></div>
      </div>`, { source });
  }

  /* --- 表格 --- */
  table({ title, subtitle, head, rows, source, aligns = [] }) {
    const th = head.map((h, j) => `<th style="text-align:${aligns[j] ?? 'left'}">${esc(h)}</th>`).join('');
    const tr = rows.map((r, i) => `<tr class="${i === 0 ? 'first' : ''}">${r.map((c, j) => `<td style="text-align:${aligns[j] ?? 'left'}">${esc(c)}</td>`).join('')}</tr>`).join('');
    if (rows.length > 10) this.issues.push({ level: 'warn', slide: this.n + 1, rule: 'big-table', msg: `表格 ${rows.length} 行，考虑拆页` });
    return this._slide('table', `${this._titleHTML(title)}${this._subHTML(subtitle)}<table class="tbl"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`, { source });
  }

  /* --- 时间轴 --- */
  timeline({ title, subtitle, events, source }) {
    if (events.length > 6) this.issues.push({ level: 'error', slide: this.n + 1, rule: 'timeline-crowded', msg: '时间轴节点 > 6，拆两页' });
    const axisY = G.bodyY + (subtitle ? 40 : 0) + (G.bodyH - (subtitle ? 40 : 0)) / 2;
    const step = G.cw / events.length;
    const nodes = events.slice(0, 6).map((e, i) => {
      const cx = G.mx + step * i + step / 2;
      const above = i % 2 === 0;
      const dot = `<span class="tl-dot${i === events.length - 1 ? ' last' : ''}" style="left:${cx - 7}px;top:${axisY - 7}px"></span>`;
      const box = above
        ? `<div class="tl-node above" style="left:${cx - (step - 30) / 2}px;top:${axisY - 170}px;width:${step - 30}px;height:140px"><div class="tl-what">${esc(e.what)}</div><div class="tl-when">${esc(e.when)}</div></div>`
        : `<div class="tl-node below" style="left:${cx - (step - 30) / 2}px;top:${axisY + 24}px;width:${step - 30}px;height:140px"><div class="tl-when">${esc(e.when)}</div><div class="tl-what">${esc(e.what)}</div></div>`;
      return dot + box;
    }).join('');
    return this._slide('timeline', `${this._titleHTML(title)}${this._subHTML(subtitle)}<div class="tl"><div class="tl-axis" style="top:${axisY}px"></div>${nodes}</div>`, { source });
  }

  /* --- 瀑布图 --- */
  waterfall({ title, subtitle, start, items, end, unit = '', source }) {
    if (!source) this.issues.push({ level: 'error', slide: this.n + 1, rule: 'missing-source', msg: '数据页必须给出来处（source）' });
    let cum = start;
    const bars = [{ label: '期初', v: start, kind: 'total' }];
    for (const it of items) { bars.push({ label: it.label, v: it.delta, kind: it.delta >= 0 ? 'up' : 'down', from: cum }); cum += it.delta; }
    if (end !== undefined && Math.abs(end - cum) > 1e-9) this.issues.push({ level: 'warn', slide: this.n + 1, rule: 'waterfall-unbalanced', msg: `期末 ${end} 与累计 ${cum.toFixed(2)} 不一致` });
    bars.push({ label: '期末', v: cum, kind: 'total' });

    const top = G.bodyY + (subtitle ? 40 : 0) + 28;
    const bottom = G.footY - 60;
    const plotH = bottom - top, plotW = G.cw, slot = plotW / bars.length, bw = slot * 0.58;
    let rawMax = start, rawMin = 0;
    for (const b of bars) {
      if (b.kind === 'total') { rawMax = Math.max(rawMax, b.v); rawMin = Math.min(rawMin, b.v); }
      else { rawMax = Math.max(rawMax, b.from, b.from + b.v); rawMin = Math.min(rawMin, b.from, b.from + b.v); }
    }
    const vmax = rawMax + (rawMax - rawMin) * 0.12, vmin = rawMin;
    const yv = (v) => bottom - plotH * (v - vmin) / (vmax - vmin);
    const zeroY = yv(Math.max(vmin, 0));
    const parts = [`<div class="wf-axis" style="top:${zeroY}px"></div>`];
    bars.forEach((b, i) => {
      const cx = G.mx + slot * (i + 0.5);
      const t = b.kind === 'total' ? yv(b.v) : yv(Math.max(b.from, b.from + b.v));
      const bt = b.kind === 'total' ? zeroY : yv(Math.min(b.from, b.from + b.v));
      const h = Math.max(bt - t, 3);
      const color = b.kind === 'total' ? T.color.primary : b.kind === 'up' ? T.color.good : T.color.bad;
      const label = (b.kind === 'total' ? '' : b.v >= 0 ? '+' : '') + (Math.round(b.v * 100) / 100) + unit;
      parts.push(`<div class="wf-bar" style="left:${cx - bw / 2}px;top:${t}px;width:${bw}px;height:${h}px;background:${color}"></div>`);
      parts.push(`<div class="wf-val" style="left:${cx - slot / 2 + 4}px;top:${Math.max(t - 27, top + 2)}px;width:${slot - 8}px">${label}</div>`);
      parts.push(`<div class="wf-cat" style="left:${cx - slot / 2 + 5}px;top:${bottom + 6}px;width:${slot - 10}px">${esc(b.label)}</div>`);
    });
    return this._slide('waterfall', `${this._titleHTML(title)}${this._subHTML(subtitle)}<div class="wf">${parts.join('')}</div>`, { source });
  }

  /* --- 下一步 --- */
  closing({ title = '下一步', items, contact }) {
    const rowH = G.bodyH / Math.min(items.length, 4);
    const li = items.slice(0, 4).map((it, i) => `<li style="height:${rowH}px"><span class="no">${i + 1}</span><span class="what">${esc(it.what)}</span><span class="who">${esc(it.who ?? '')}</span><span class="when">${esc(it.when ?? '')}</span></li>`).join('');
    return this._slide('closing', `${this._titleHTML(title)}<ul class="closing">${li}</ul>${contact ? `<div class="contact">${esc(contact)}</div>` : ''}`, { source: '' });
  }

  /* --- lint（结构规则，与 pptx 版同源） --- */
  lint() {
    const topicRe = /^(概览|简介|背景|介绍|分析|总结|现状|overview|introduction|background|summary|agenda|目录)\s*$/i;
    for (const m of this.meta) {
      if (['cover', 'agenda', 'section', 'closing'].includes(m.kind)) continue;
      if (topicRe.test(String(m.title ?? '').trim())) this.issues.push({ level: 'error', slide: m.no, rule: 'topic-title', msg: `主题式标题：${m.title} —— 改写成结论句` });
      if (m.title && cjkLen(m.title) < 10) this.issues.push({ level: 'warn', slide: m.no, rule: 'thin-title', msg: `标题过短，大概率不是行动标题：${m.title}` });
      if ((m.kind === 'chart' || m.kind === 'waterfall') && !m.source) this.issues.push({ level: 'error', slide: m.no, rule: 'missing-source', msg: '数据页必须给出来处' });
    }
    return this.issues;
  }

  /* --- 生成单文件 HTML --- */
  build(file, { title = 'Deck' } = {}) {
    const issues = this.lint();
    const errs = issues.filter((i) => i.level === 'error');
    const warns = issues.filter((i) => i.level === 'warn');
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
${CSS}
</style>
</head>
<body>
<main class="deck">${this.slides.join('\n')}</main>
</body>
</html>`;
    const fs = await_import_fs();
    fs.mkdirSync(dirname_(file), { recursive: true });
    fs.writeFileSync(file, html);
    const receipt = { file: file, slides: this.n, errors: errs, warnings: warns, emitted: file };
    try { fs.writeFileSync(file.replace(/\.html$/i, '') + '.lint.json', JSON.stringify(receipt, null, 2)); } catch {}
    console.log(`deck-craft(html): ${this.n} 页 → ${file}`);
    console.log(`  errors: ${errs.length}  warnings: ${warns.length}  (明细见 .lint.json)`);
    for (const e of errs) console.log(`  [error] p${e.slide} ${e.rule}: ${e.msg}`);
    return receipt;
  }
}

/* 让 build 保持同步写法：惰性取 fs/path */
import * as _fs from 'node:fs';
import * as _path from 'node:path';
function await_import_fs() { return _fs; }
function dirname_(f) { return _path.dirname(_path.resolve(f)); }

/* ---------------- 图表绘制 ---------------- */
function lineSVG(data, { top, bottom, axisMin, axisMax }) {
  const W = G.cw, padL = 56, padR = 26, padT = 14;
  const H = bottom - top - padT;
  const plotL = padL, plotR = W - padR, plotW = plotR - plotL;
  const n = data.labels.length;
  const sers = data.series;
  const all = sers.flatMap((s) => s.values);
  let vmin = typeof axisMin === 'number' ? axisMin : Math.min(...all);
  let vmax = typeof axisMax === 'number' ? axisMax : Math.max(...all);
  if (typeof axisMin !== 'number') vmin -= (vmax - vmin) * 0.15;
  if (typeof axisMax !== 'number') vmax += (vmax - vmin) * 0.15;
  if (vmax === vmin) vmax = vmin + 1;
  const y = (v) => padT + H - H * (v - vmin) / (vmax - vmin);
  const x = (i) => plotL + (n === 1 ? plotW / 2 : plotW * i / (n - 1));
  const ticks = 4;
  let grid = '';
  for (let k = 0; k <= ticks; k++) {
    const v = vmin + (vmax - vmin) * k / ticks;
    const gy = Math.round(y(v)) + 0.5;
    grid += `<line x1="${plotL}" y1="${gy}" x2="${plotR}" y2="${gy}" stroke="${T.color.rule}" stroke-width="1"/><text x="${plotL - 8}" y="${gy + 4}" text-anchor="end" class="ax-t">${fmtNum(v)}</text>`;
  }
  let body = '';
  sers.forEach((s, si) => {
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    body += `<polyline points="${pts}" fill="none" stroke="${T.series[si % T.series.length]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s.values.forEach((v, i) => {
      body += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" fill="#fff" stroke="${T.series[si % T.series.length]}" stroke-width="2"/>`;
      if (sers.length === 1 || n <= 6) {
        const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
        const dx = i === 0 ? 9 : i === n - 1 ? -9 : 0;
        body += `<text x="${(x(i) + dx).toFixed(1)}" y="${(y(v) - 10).toFixed(1)}" text-anchor="${anchor}" class="dl">${fmtNum(v)}</text>`;
      }
    });
  });
  const cat = data.labels.map((l, i) => `<text x="${x(i).toFixed(1)}" y="${padT + H + 20}" text-anchor="middle" class="ax-t">${esc(l)}</text>`).join('');
  const legend = sers.length > 1 ? `<div class="legend">${sers.map((s, i) => `<span><i style="background:${T.series[i % T.series.length]}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<svg width="${W}" height="${padT + H + 30}" viewBox="0 0 ${W} ${padT + H + 30}" style="overflow:visible">${grid}${body}${cat}</svg>${legend}`;
}

function vbarHTML(data, { top, bottom }) {
  const n = data.labels.length;
  const sers = data.series;
  const all = sers.flatMap((s) => s.values);
  const vmax = Math.max(...all) * 1.15 || 1;
  const H = bottom - top - 24;
  const cols = data.labels.map((l, i) => {
    const bars = sers.map((s, si) => `<div class="vb" style="height:${Math.max((s.values[i] / vmax) * H, 2)}px;background:${T.series[si % T.series.length]}"></div>`).join('');
    const val = sers.length === 1 && n <= 8 ? `<div class="vb-val">${fmtNum(sers[0].values[i])}</div>` : '';
    return `<div class="vb-col">${val}<div class="vb-bars">${bars}</div><div class="vb-cat">${esc(l)}</div></div>`;
  }).join('');
  const legend = sers.length > 1 ? `<div class="legend">${sers.map((s, i) => `<span><i style="background:${T.series[i % T.series.length]}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<div class="vchart" style="padding-top:${top - G.bodyY}px">${cols}</div>${legend}`;
}

function hbarHTML(data, { top, bottom }) {
  const sers = data.series;
  const all = sers.flatMap((s) => s.values);
  const vmax = Math.max(...all) * 1.15 || 1;
  const H = bottom - top;
  const rows = data.labels.map((l, i) => {
    const v = sers[0].values[i];
    return `<div class="hb-row"><div class="hb-cat">${esc(l)}</div><div class="hb-track"><div class="hb-bar" style="width:${Math.max((v / vmax) * 100, 1)}%;background:${T.series[0]}"></div></div><div class="hb-val">${fmtNum(v)}</div></div>`;
  }).join('');
  return `<div class="hchart" style="padding-top:${top - G.bodyY}px">${rows}</div>`;
}

const fmtNum = (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.round(v * 100) / 100);

/* ---------------- CSS（token 化，与 design-system.md 对应） ---------------- */
const CSS = `
:root{--ink:${T.color.ink};--ink2:${T.color.ink2};--ink3:${T.color.ink3};--rule:${T.color.rule};--panel:${T.color.panel};--primary:${T.color.primary};--accent:${T.color.accent};--good:${T.color.good};--bad:${T.color.bad}}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#26292f;font-family:${T.font};color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.deck{width:${T.W}px;margin:0 auto}
.slide{position:relative;width:${T.W}px;height:${T.H}px;background:#fff;overflow:hidden;margin:28px auto;box-shadow:0 2px 18px rgba(0,0,0,.35)}
@page{size:${T.W}px ${T.H}px;margin:0}
@media print{body{background:#fff}.deck{width:auto}.slide{margin:0;box-shadow:none;page-break-after:always;break-after:page}.slide:last-child{page-break-after:auto}}
.title-zone{position:absolute;left:${G.mx}px;top:${G.titleY}px;width:${G.cw}px;height:${G.titleH}px}
.title-zone h1{font-size:${T.type.titleMax}px;line-height:1.16;font-weight:700;color:var(--primary);display:flex;align-items:center;height:100%}
.rule{position:absolute;left:0;top:${G.ruleY - G.titleY}px;width:100%;height:6px;display:flex;align-items:center}
.rule-accent{width:52px;height:4px;background:var(--accent)}
.rule-line{flex:1;height:1px;background:var(--rule);margin-left:12px}
.subtitle{position:absolute;left:${G.mx}px;top:${G.ruleY + 8}px;width:${G.cw}px;font-size:${T.type.small}px;color:var(--ink2)}
footer{position:absolute;left:${G.mx}px;right:${G.mx}px;top:${G.footY}px;height:28px;display:flex;justify-content:space-between;align-items:center;font-size:${T.type.tiny}px;color:var(--ink3)}
/* cover / section */
.cover-bar{position:absolute;left:${G.mx}px;top:220px;width:80px;height:5px;background:var(--accent)}
.cover-title{position:absolute;left:${G.mx}px;top:250px;width:${Math.round(G.cw * 0.86)}px;height:160px;display:flex;align-items:center;font-weight:700;color:${T.color.onDark};line-height:1.2}
.cover-sub{position:absolute;left:${G.mx}px;top:430px;width:${Math.round(G.cw * 0.8)}px;font-size:20px;color:${T.color.onDark2}}
.cover-meta{position:absolute;left:${G.mx}px;bottom:44px;font-size:${T.type.small}px;color:${T.color.onDark2}}
.sec-index{position:absolute;left:${G.mx}px;top:210px;font-size:22px;font-weight:700;color:var(--accent)}
.sec-title{position:absolute;left:${G.mx}px;top:280px;width:${Math.round(G.cw * 0.9)}px;height:120px;display:flex;align-items:center;font-size:${T.type.section}px;font-weight:700;color:${T.color.onDark}}
.sec-cap{position:absolute;left:${G.mx}px;top:430px;width:${Math.round(G.cw * 0.8)}px;font-size:${T.type.small}px;color:${T.color.onDark2};line-height:1.6}
/* agenda */
ol.agenda{position:absolute;left:${G.mx}px;top:${G.bodyY}px;width:${G.cw}px;list-style:none;display:grid;grid-template-columns:1fr;align-content:center;height:${G.bodyH}px}
ol.agenda.two{grid-template-columns:1fr 1fr;column-gap:48px}
ol.agenda li{display:flex;align-items:center;gap:14px}
ol.agenda .no{font-size:17px;font-weight:700;color:var(--accent)}
ol.agenda .tx{font-size:20px;color:var(--ink)}
/* bullets */
ul.bullets{position:absolute;left:${G.mx}px;top:${G.bodyY}px;width:${G.cw}px;height:${G.bodyH}px;list-style:none}
ul.bullets li{display:flex;align-items:center;gap:10px}
ul.bullets .dash{color:var(--accent);font-size:${T.type.body}px}
ul.bullets .tx b{color:var(--ink);font-size:inherit}
ul.bullets .tx{font-size:${T.type.body}px}
ul.bullets .tx2{color:var(--ink2)}
/* columns */
.cols{position:absolute;left:${G.mx}px;top:${G.bodyY}px;width:${G.cw}px;height:${G.bodyH}px;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:28px;align-items:center}
.col-card{background:var(--panel);padding:26px 24px 22px;border-top:4px solid var(--primary)}
.col-head{font-size:20px;font-weight:700;color:var(--primary);margin-bottom:14px}
.col-card ul{list-style:none}
.col-card li{font-size:${T.type.body}px;color:var(--ink2);padding:10px 0 10px 16px;position:relative;line-height:1.45}
.col-card li::before{content:"·";position:absolute;left:0;color:var(--ink3)}
/* chart */
.chart{position:absolute;left:${G.mx}px;top:${G.bodyY}px;width:${G.cw}px;overflow:visible}
.ax-t{font-size:${T.type.tiny + 1}px;fill:var(--ink3);font-family:${T.font}}
.dl{font-size:${T.type.small}px;fill:var(--ink2);font-weight:600;font-family:${T.font}}
.legend{display:flex;gap:20px;justify-content:center;font-size:${T.type.small}px;color:var(--ink2);margin-top:6px}
.legend i{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
.vchart{display:flex;justify-content:space-between;align-items:flex-end;height:100%}
.vb-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;flex:1}
.vb-bars{display:flex;align-items:flex-end;gap:6px}
.vb{width:34px;border-radius:2px 2px 0 0}
.vb-val{font-size:${T.type.small}px;color:var(--ink2);font-weight:600;margin-bottom:4px}
.vb-cat{font-size:${T.type.small}px;color:var(--ink2);margin-top:8px}
.hchart{display:flex;flex-direction:column;justify-content:center;gap:16px}
.hb-row{display:flex;align-items:center;gap:12px}
.hb-cat{width:120px;text-align:right;font-size:${T.type.small}px;color:var(--ink2)}
.hb-track{flex:1;background:var(--panel);border-radius:2px}
.hb-bar{height:26px;border-radius:2px}
.hb-val{width:64px;font-size:${T.type.small}px;color:var(--ink2);font-weight:600}
.note{position:absolute;left:${G.mx}px;bottom:44px;width:${G.cw}px;font-size:${T.type.tiny + 1}px;color:var(--ink3);font-style:italic}
/* kpi */
.kpis{position:absolute;left:${G.mx}px;top:${G.bodyY}px;width:${G.cw}px;height:${G.bodyH}px;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:26px;align-content:center;align-items:center}
.kpi-card{background:var(--panel);border-top:4px solid var(--primary);padding:36px 18px 30px;text-align:center;min-height:300px;display:flex;flex-direction:column;justify-content:center}
.kpi-v{font-size:${T.type.kpi}px;font-weight:700;color:var(--primary);line-height:1.1}
.kpi-l{font-size:${T.type.body}px;color:var(--ink);margin-top:22px}
.kpi-d{font-size:${T.type.small}px;margin-top:12px;font-weight:600}
/* matrix */
.matrix{position:absolute;left:${G.mx}px;top:${G.bodyY}px;width:${G.cw}px;height:${G.bodyH}px;display:grid;grid-template-columns:52px 1fr;grid-template-rows:1fr 34px;gap:10px}
.axis-y{display:grid;grid-template-rows:1fr 1fr}
.axis-y span{display:flex;align-items:center;justify-content:flex-end;padding-right:10px;font-size:${T.type.tiny + 1}px;color:var(--ink3)}
.qgrid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:14px}
.q{border:1px solid var(--rule);padding:16px 18px}
.q-head{font-size:${T.type.body}px;font-weight:700;color:var(--primary);margin-bottom:8px}
.q ul{list-style:none}
.q li{font-size:${T.type.small + 1}px;color:var(--ink2);padding:6px 0 6px 14px;position:relative;line-height:1.4}
.q li::before{content:"·";position:absolute;left:0;color:var(--ink3)}
.axis-x{grid-column:2;display:flex;justify-content:space-between;font-size:${T.type.tiny + 1}px;color:var(--ink3);align-items:center}
/* table */
.tbl{position:absolute;left:${G.mx}px;top:50%;transform:translateY(-50%);width:${G.cw}px;border-collapse:collapse}
.tbl th{background:var(--panel);color:var(--primary);font-size:16px;font-weight:700;padding:20px 14px;border-bottom:2px solid var(--rule)}
.tbl td{font-size:16px;color:var(--ink2);padding:19px 14px;border-bottom:1px solid var(--rule)}
.tbl tr.first td{color:var(--ink);font-weight:600}
/* timeline */
.tl{position:absolute;inset:0}
.tl-axis{position:absolute;left:${G.mx}px;width:${G.cw}px;height:2px;background:var(--rule)}
.tl-dot{position:absolute;width:14px;height:14px;border-radius:50%;background:var(--primary);border:3px solid #fff;box-shadow:0 0 0 1px var(--rule)}
.tl-dot.last{background:var(--accent)}
.tl-node{position:absolute;display:flex;flex-direction:column;justify-content:flex-end;text-align:center}
.tl-node.below{justify-content:flex-start}
.tl-node.above .tl-what{order:1}.tl-node.above .tl-when{order:2}
.tl-when{font-size:${T.type.small}px;font-weight:700;color:var(--ink);margin:4px 0}
.tl-what{font-size:${T.type.small}px;color:var(--ink2);line-height:1.4;margin:4px 0}
/* waterfall */
.wf{position:absolute;inset:0}
.wf-axis{position:absolute;left:${G.mx}px;width:${G.cw}px;height:1.5px;background:var(--rule)}
.wf-bar{position:absolute}
.wf-val{position:absolute;height:24px;font-size:${T.type.small}px;font-weight:700;color:var(--ink);text-align:center;display:flex;align-items:flex-end;justify-content:center}
.wf-cat{position:absolute;height:38px;font-size:${T.type.small - 1}px;color:var(--ink2);text-align:center;line-height:1.3}
/* closing */
ul.closing{position:absolute;left:${G.mx}px;top:${G.bodyY}px;width:${G.cw}px;height:${G.bodyH}px;list-style:none}
ul.closing li{display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--rule);padding:0 4px}
ul.closing li:last-child{border-bottom:none}
ul.closing .no{font-size:22px;font-weight:700;color:var(--accent);width:30px}
ul.closing .what{flex:1.4;font-size:20px;font-weight:700;color:var(--ink)}
ul.closing .who{flex:.7;font-size:${T.type.small}px;color:var(--ink2)}
ul.closing .when{flex:.3;font-size:${T.type.small}px;color:var(--ink2);text-align:right}
.contact{position:absolute;left:${G.mx}px;bottom:44px;font-size:${T.type.tiny}px;color:var(--ink3)}
`;
