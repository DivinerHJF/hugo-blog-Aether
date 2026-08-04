# 维护文档

这里保存仍然指导站点维护的架构说明和工作流。历史 Codex 任务、审计记录和一次性迁移报告统一放在归档目录，不作为日常入口。

## 当前文档

### 架构

- [主题架构](architecture/theme.md)：Hugo 模板、SCSS、JavaScript 模块和主题生命周期。
- [内容模型](architecture/content-model.md)：文章、足迹和书影游数据的来源与关联。
- [资源加载](architecture/asset-loading.md)：主题资源、第三方库、CDN 和静态资源的加载边界。

### 工作流

- [写作与内容发布](workflows/writing.md)：Pages CMS、文章、足迹数据和发布流程。
- [图片与 R2](workflows/images.md)：图片上传、引用、迁移和检查规范。
- [构建与部署](workflows/deployment.md)：Node、npm、Hugo、主题编译和 Vercel 配置。

## 归档

- [Codex 任务](archive/codex-tasks/)：已经完成的重构任务和审查流程，仅用于追溯决策。
- [审计记录](archive/audits/)：历史构建、路由、主题库和站点打磨基线。

## 报告规则

一次性迁移报告位于 [`reports/archive/2026-image-migration/`](../reports/archive/2026-image-migration/)。只保留迁移完成后的最终报告；dry-run、扫描清单等可以从脚本重新生成的中间产物不提交。

维护原则：当前仍指导维护的内容进入 `architecture/` 或 `workflows/`；完成的任务进入 `archive/`；报告不能替代源码和配置，也不应成为新的维护入口。
