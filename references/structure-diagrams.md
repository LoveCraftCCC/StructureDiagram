# 复杂结构图：Archify 使用纪律

**为什么很多 Agent "不会用" archify：它是一个 skill，不是 MCP。**
能力在 `SKILL.md` 里——Agent 没安装、或装了不读，就只能瞎猜命令。
本文件把已验证的用法固化成流程，Agent 按此执行即可。

以下内容源自对 tt-a1i/archify v3.1.0 的实跑验证（本机 doctor 全绿、demo 与
visual-check 通过），非转述博客。

---

## 0. 安装（一次性）

```bash
npx skills add tt-a1i/archify -g        # Codex / Claude Code / Cursor / OpenCode 通用
```

装完后**先读该 skill 的 SKILL.md 再动手**（这是"会不会用"的分水岭）。
OpenClaw 环境：`openclaw skills install skills-sh:tt-a1i/archify/archify`。

## 1. 分流：什么时候用 archify，什么时候用 deck-craft 版式

| 要画的东西 | 工具 |
|---|---|
| 系统架构、调用链、流程、状态机、ER、类图、数据流、时间线 | **archify** |
| 结论页、指标页、对比页、计划页等叙事展示页 | **deck-craft**（本技能） |

产物都是自包含 HTML，可拼进同一批材料（deck 讲结论，diagram 讲结构）。
不要用 deck-craft 硬画关系图，也不要用 archify 排版汇报页。

## 2. 十种图型路由

`architecture` 组件/服务/边界 · `workflow` 流程/审批/CI · `sequence` 调用时序 ·
`dataflow` 管道/血缘 · `lifecycle` 状态/重试 · `erd` 表结构 · `class` 类型契约 ·
`tree` 单父层级 · `timeline` 事件时刻 · `waterfall` 耗时分解。

拿不准就问 CLI（零依赖、支持中文）：

```bash
node bin/archify.mjs guide "展示一次带 Redis 缓存穿透的 API 请求" --lang zh --json
```

## 3. 长流程与复杂结构图的版本纪律

### 架构图

架构图可以直接用 `architecture`，但要先定抽象层级：主路径、必要分支、外部依赖、边界；细节放 cards，不要用更多连线堆满画布。

### 长流程图

新建 workflow 优先使用 `schema_version: 2`。v2 使用逻辑列和 measured layout，适合长流程、多个 lane、失败分支和回滚路径。

从 v1 迁移时不要机械保留旧版绝对几何控制：`route`、`fromSide`、`toSide`、`via`、`labelAt`、`channelX`、`channelY` 可能与 v2 的 lane/phase/group 标签净空冲突。正确做法是：

1. 先迁移或建立 v2 candidate；
2. 保留节点、边、lane、phase、group 和语义标签；
3. 清掉无法证明仍适用的旧绝对路由控制；
4. 让 v2 solver 重新布局；
5. 完整重跑 `finalize`，看 receipt 是否四道闸门全通过。

如果 deliver 报 `composition/viewport-height`，不要反复重跑同一 JSON。检查是否是 v1 固定 720 宽导致长流程竖向溢出；优先转 v2 并省略 `meta.viewBox`，让 intrinsic measured bounds 接管。

已验证样例见 `examples/structure-diagrams/`。

## 3. 工作目录约定（archify 自己的规矩，必须守）

每个新图一个独立目录，互不覆盖：

```
.archify/<type>-<slug>-<YYYYMMDD-HHMMSS>/
  ├── candidate.json     # typed 源（IR）
  └── <slug>.html        # meta.output 指向这个相对路径
```

修复重跑复用同一目录；新请求开新目录。

## 4. 一次到位的生成流程

1. **先选型**（路由表或 guide），读对应 schema 与示例（示例教形状，不教事实）。
2. **直接写完整 candidate.json**：新 ID、新措辞、新布局；不要在对话里先写坐标计划。
   - 架构图：先定抽象层级与连通摆放，再考虑坐标；主线 + 必要分支；细节进卡片而不是加边。
   - `meta.quality_profile = "showcase"`；约 ≥8 表/50 字段的 ERD 首轮用 `standard`。
   - 图标/措辞自拟，**事实不许编**：缺日期、金额、规则就问用户。
3. **一条命令交付（不要分步跑）**：

```bash
node bin/archify.mjs finalize <type> candidate.json <slug>.html --quality showcase --json
```

代码仓库背书时加 `--repo-root <path>`。finalize 一次跑完四道闸门：
validate（schema/布局）→ deliver → check（严格）→ browser-check（真实浏览器）。

4. **非零退出码永远不是成功**。读 receipt（稳定规则码 + 证据 + 支持的修复手段），
   只改出问题的连通邻域，然后**完整重跑 finalize**。
   已到 browser-check 的输出目录归该次运行所有，后续重跑要 `--out-dir <folder>/review-<n>`。

## 5. Mermaid 输入

读 Mermaid 提取拓扑与语义后**重新起稿** Archify JSON，不机械翻译样式：
flowchart→workflow（组件图→architecture）、sequenceDiagram→sequence、
stateDiagram→lifecycle、erDiagram→erd、classDiagram→class。

## 6. 交付口径

- 汇报里用可点击链接给 HTML，配一句关键结论（图自己会说话，别复述图面）
- 声明：抽象层级、刻意省略的部分、示意值 vs 实测值、修复中删改的内容
- 视觉验收同样走本技能 `references/critique.md` 的清单（空间/层级/重叠）
- 无 Chrome 环境时 browser-check 不可用 → 声明"未经浏览器验证"再交

## 7. 常见坑（实跑验证过的）

- 输出路径安全：finalize 会拒绝写到工作目录之外
- 更新检查：receipt 带 `update` 字段，提醒最多保留一行，不要自作主张升级
- 主题：viewer 右上可切深浅色；深色分享时确认对比度
- archify 产物是独立 HTML 文件，**不要**试图塞进 deck 页面内嵌渲染
