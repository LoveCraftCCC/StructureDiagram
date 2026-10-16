#!/usr/bin/env node
/**
 * render-check-html.mjs — HTML 幻灯片渲染成 PNG 供目检（Chrome headless → PDF → pdftoppm）。
 * 用法: node scripts/render-check-html.mjs <deck.html> [outdir]
 * 依赖: Chrome/Chromium + poppler-utils；缺哪个明确报错并给出降级说明。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const [input, outArg] = process.argv.slice(2);
if (!input || !existsSync(input)) {
  console.error('用法: node render-check-html.mjs <deck.html> [outdir]');
  process.exit(2);
}

const which = (bin) => { try { return execFileSync('which', [bin]).toString().trim(); } catch { return null; } };

const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!chrome) {
  console.error('render-check: 未找到 Chrome/Chromium。降级规则：静态 lint 必须 0 error，并向用户声明"未经渲染目检"。');
  process.exit(3);
}
if (!which('pdftoppm')) {
  console.error('render-check: 缺 pdftoppm (poppler-utils)。安装: sudo apt install poppler-utils');
  process.exit(3);
}

const abs = path.resolve(input);
const outDir = path.resolve(outArg ?? path.join(path.dirname(abs), 'renders-html'));
mkdirSync(outDir, { recursive: true });
const pdf = path.join(outDir, path.basename(abs).replace(/\.html$/i, '.pdf'));

const url = 'file://' + abs;
const ok = (() => {
  try { execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, url], { stdio: 'ignore' }); return true; }
  catch {
    try { execFileSync(chrome, ['--headless', '--disable-gpu', `--print-to-pdf=${pdf}`, url], { stdio: 'ignore' }); return true; }
    catch { return false; }
  }
})();
if (!ok || !existsSync(pdf)) { console.error('render-check: PDF 生成失败（chrome 返回非零）'); process.exit(5); }

execFileSync('pdftoppm', ['-png', '-r', '96', pdf, path.join(outDir, 'slide')]);
const pngs = readdirSync(outDir).filter((f) => /^slide.*\.png$/.test(f)).sort();
console.log(`render-check: ${pngs.length} 页已渲染 → ${outDir}`);
for (const p of pngs) console.log('  ' + path.join(outDir, p));
