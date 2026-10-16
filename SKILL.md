---
name: deck-craft
description: >-
  Make coding agents produce aesthetic HTML presentation materials: constrained
  slide-formatted layouts (类PPTX 排版, 1280×720), CJK-aware text fitting, and a
  render-and-critique verification loop; plus a bundled archify playbook for
  complex structure diagrams (architecture/flow/sequence/ER). Use when the user
  asks for HTML 展示材料/汇报页/幻灯片/复盘/评审 pages or complex relationship
  diagrams. Output is self-contained HTML; not for editing existing files.
license: MIT
metadata:
  version: "0.3.0"
  author: bishop + raphael
---

# deck-craft

让 Agent 产出**有审美的 HTML 展示材料**。两条能力：

1. **叙事展示页**（本库）：类 PPTX 排版（1280×720 幻灯片式单文件 HTML，零依赖、可打印）
2. **复杂结构图**（archify）：架构/流程/时序/ER 等关系图 → 读 `references/structure-diagrams.md`

核心纪律：Agent 不做自由排版——版面由版式库与 token 决定，标题先量测后落位，
**交付前必须渲染成图目检**（没看过渲染图的稿子不算完成）。

## 前置（一次性）

```bash
node examples/demo-html.mjs                               # 生成 examples/out/demo.html
node scripts/render-check-html.mjs examples/out/demo.html # 渲染 PNG → examples/out/renders-html/
```

HTML 路线零依赖（只需 Node ≥18）。渲染检查需 Chrome/Chromium + poppler-utils。
要画结构图再装 archify：`npx skills add tt-a1i/archify -g`（见 structure-diagrams.md）。

## 工作流（严格按序）

### 0. 分流

| 内容 | 工具 |
|---|---|
| 结论/指标/图表/计划/复盘等叙事页 | **deck-craft 版式库**（下文） |
| 架构/流程/时序/数据流/ER/状态机等关系图 | **archify**（`references/structure-diagrams.md`） |

产物都是自包含 HTML：deck 讲结论，diagram 讲结构，拼成同一批材料。
不要用 deck-craft 硬画关系图，也不要用 archify 排版汇报页。

### 1. 幽灵稿先行 —— 禁止先写代码

读 `references/narrative.md`。先输出纯标题大纲（每页一行行动标题），
自查：标题连读 = 一篇通顺的论证。需求含糊（受众/结论/数据口径）→ 先问，不要猜。

### 2. 选版式

读 `references/design-system.md` 的版式清单。默认优先 chart/kpi/matrix/table/waterfall/timeline，
`bullets` 是最后手段。数字必须真实有出处；没数据就别编，改用定性版式。

### 3. 写构建脚本

```js
import { Deck } from '<skill-dir>/scripts/html-deck.mjs';
const d = new Deck();
d.cover({ title: '…', subtitle: '…', meta: '…' });
d.chart({ title: '结论句式标题', kind: 'line', axisMin: 1.8, axisMax: 2.5,
          data: { labels: [...], series: [...] }, source: '…' });
d.build('out/deck.html', { title: '…' });
```

坐标/字号/颜色全部交给版式库；调用侧禁止写 px 与裸色值。

### 4. 构建 + 静态 lint

`node build.mjs` → `errors` 必须为 0（主题式标题、bullets>5、数据页缺出处、标题溢出都是 error）。

### 5. 渲染目检

```bash
node <skill-dir>/scripts/render-check-html.mjs out/deck.html out/renders
```

逐页看 PNG，按 `references/critique.md` 过检（结构/空间/层级/数据/中文细节）；
任何一条不过 → 修 → 重渲 → 重查。

### 6. 交付

- HTML + 渲染 PNG 一起给；结构图按 structure-diagrams.md 单独交付并链接
- 一句话说明叙事主线
- 声明验证状态：lint 结果 + 是否完成目检

## 环境降级

| 缺什么 | 做法 |
|---|---|
| 无 Chrome/Chromium | 跳过渲染目检；lint 必须 0 error；向用户声明"未经目检" |
| 无 poppler | 同上（给 HTML 本体） |
| 无 archify（画不了结构图） | 明确告知阻塞，不要用画矩形凑数 |

## 硬规则（违反 = 返工）

1. 先幽灵稿，后代码
2. 每页一个结论式标题（行动标题），不写"概览/背景/分析"
3. 版式库管所有几何；调用侧不摆坐标
4. 数据必有出处；不编数字
5. 每页 ≤2 彩色；强调手段只用一种
6. lint 0 error 才交付；渲染图没看不算完
7. 关系图走 archify 纪律（structure-diagrams.md），一次 finalize 到位
