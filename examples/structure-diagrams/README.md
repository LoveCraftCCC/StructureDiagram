# Archify 结构图验收样例

这些 JSON 是用 Archify 3.1.0 实际跑通的结构图候选：

- `rag-pipeline.architecture.json`：系统架构图，`finalize architecture` 四道闸门全通过
- `release-delivery.workflow.v2.json`：长流程图，schema v2，`finalize workflow` 四道闸门全通过

运行方式（在 Archify 仓库或已安装 skill 的工作目录）：

```bash
node bin/archify.mjs finalize architecture examples/structure-diagrams/rag-pipeline.architecture.json out/rag-pipeline.html --quality showcase --json
node bin/archify.mjs finalize workflow examples/structure-diagrams/release-delivery.workflow.v2.json out/release-delivery.html --quality showcase --json
```

不要把 workflow v1 的绝对 `route`、`fromSide`、`toSide`、`via`、`labelAt` 机械复制到 v2；先保留语义，再让 v2 solver 布局和路由。

## 已验证结果

2026-10-16 在 Archify 3.1.0 上实跑：

- 架构图：`finalize` 的 validate/deliver/check/browser-check 全通过；`visual-check` 明暗双主题、两档视口全通过。
- 长流程图：先暴露 v1 固定画布与旧绝对路由问题；转为 schema v2、移除冲突的旧路由控制后，四道闸门全通过；`visual-check` 明暗双主题、两档视口全通过。
- `receipts/` 保存了 finalize、browser-check、visual-check 的机器回执。
