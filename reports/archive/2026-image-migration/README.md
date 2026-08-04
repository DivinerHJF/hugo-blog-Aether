# 2026 图片迁移归档

本目录保存 2026 年 Cloudflare R2 图片迁移完成后的最终结果，供追溯和人工复核使用，不是日常维护入口。

- `image-migration-report.md`：首次迁移和处理结果；
- `retry-image-download-report.md`：失败图片重试结果；
- `r2-layout-reorganize-report.md`：R2 对象目录整理结果；
- `r2-link-replacement-report.md`：文章链接替换结果；
- `manual-image-actions.md`：需要人工复核或已处理的异常引用。

dry-run 和扫描清单可以由 `scripts/` 中的迁移工具重新生成，因此不作为仓库历史保存。图片引用规范和以后新增图片的操作见 [`docs/workflows/images.md`](../../../docs/workflows/images.md)。
