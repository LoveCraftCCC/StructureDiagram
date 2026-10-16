# deck-craft

给编码 Agent（Codex / Claude Code / OpenCode / OpenClaw）用的 **HTML 展示材料技能**：
让 Agent 做的 HTML 材料有审美、有空间秩序、能画复杂结构图。类 PPTX 排版，产物是 HTML（不是 PPTX）。

解决三个问题：

1. **审美失控**——受约束版式：12 种固定版面（cover / agenda / chart / kpi / matrix / waterfall / timeline / …），
   全部几何由 token 推导，Agent 只填内容不摆坐标；角色制配色（每页 ≤2 彩色）。
2. **文字溢出**——CJK 感知文本量测（中文=1em、拉丁≈0.52em），标题落位前先算，装不下报 error 而非硬塞。
3. **复杂结构图**——内置 archify 玩法手册（`references/structure-diagrams.md`）：
   架构/流程/时序/ER 等 10 类关系图走 archify 的 typed JSON → 四道校验闸门 → 交互 HTML，
   附"为什么 Agent 不会用 archify"（它是 skill 不是 MCP，必须装 + 必须读 SKILL.md）与一次到位的 finalize 纪律。

另有**渲染-目检闭环**：Chrome headless 渲染 PNG，按清单逐页过检，没看过图不算交付。

叙事规范源自已核实的方法论：Minto 金字塔原理、MBB 行动标题/MECE/幽灵稿、
Alley 的 Assertion-Evidence、Mayer 多媒体学习原则、Knaflic 与 Cleveland-McGill 数据可视化研究。

## 安装

```bash
git clone <your-repo> deck-craft
```

零 npm 依赖（Node ≥18）。要画结构图另装 archify：`npx skills add tt-a1i/archify -g`。

## 快速验证

```bash
node examples/demo-html.mjs                               # 11 页样张 → examples/out/demo.html
node scripts/render-check-html.mjs examples/out/demo.html # 渲染 PNG → examples/out/renders-html/
```

## 用法（Agent 视角）

```js
import { Deck } from './scripts/html-deck.mjs';
const d = new Deck();
d.cover({ title: '智能客服系统 Q3 运营复盘', subtitle: '降本已达标，提效瓶颈在复杂工单流转', meta: '运营分析组 · 2026-10' });
d.chart({ title: '单位会话成本逐月下降，9 月已低于目标线', kind: 'line', axisMin: 1.8, axisMax: 2.5,
          data: { labels: ['7月','8月','9月'], series: [{ name: '成本', values: [2.41, 2.15, 1.97] }] },
          source: '客服平台成本报表' });
d.build('out/deck.html', { title: 'Q3 复盘' });
```

完整示例 `examples/demo-html.mjs`；工作流纪律见 `SKILL.md`；设计 token 见
`references/design-system.md`；叙事与验证清单见 `references/`；结构图见 `references/structure-diagrams.md`。

## 依赖

- 展示页：Node ≥18，零依赖
- 渲染检查（强烈建议）：Chrome/Chromium + poppler-utils
- 结构图：archify（独立安装，见手册）

## 限制（诚实声明）

- 16:9 静态版式，无动画
- 折线图无原生参考线（目标线用副标题注明，或加常数系列）
- 不编辑已有文件（从零生成）
- 视觉质检委托视觉模型执行；不替代真人终审

## 复杂结构图验收

`examples/structure-diagrams/` 放了两份实际通过 Archify 3.1.0 四道闸门的候选：架构图与 schema v2 长流程图。长流程不要停留在“能生成 HTML”，必须以 `finalize` 的 `validate → deliver → check → browser-check` 全通过为准；v1 的绝对路由控制不要机械迁移到 v2。
