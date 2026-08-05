# 资源加载

## 三类资源边界

- `static/`：favicon、头像、Logo、二维码等站点固定文件，直接复制到输出目录。
- `themes/aether/assets/`：需要 Hugo 资源管线处理、指纹化或按页面条件加载的主题资源。
- 外部 CDN / R2：第三方运行时脚本或正文图片。配置后必须在工作流文档中留下稳定地址和触发条件。

主题 partial 负责资源注入：`themes/aether/layouts/partials/assets.html` 处理主题脚本与页面相关资源，`themes/aether/layouts/partials/head/link.html` 处理头部样式和 Service Worker 相关资源。

## 当前保留的本地库

当前配置和内容实际触发的库包括本地 Fuse 搜索、KaTeX、APlayer/Meting、TypeIt、FontAwesome，以及足迹相册使用的 PhotoSwipe 5.4.4。搜索索引由 Hugo 生成，Fuse 在 Worker 中加载；PhotoSwipe 的版本记录在 `themes/aether/assets/lib/VERSION`，主题构建前会校验它没有漂移。

Simple Icons、Twemoji、LightGallery、CookieConsent、Mermaid、ECharts、Mapbox，以及历史评论 provider 的本地目录不属于当前加载链路。重新启用前必须恢复资源或配置 CDN，并运行：

```bash
python3 scripts/audit-theme-libs.py --check-simple-icons
```

完整审计证据保存在 [主题库审计记录](../archive/audits/theme-libs-audit-2026-05-10.md)。

## 图片

文章和足迹图片优先使用 `https://img.philohao.com/` 的 R2 直链；站点固定图片才放入 `static/images/me/`。上传、命名和迁移规则见[图片与 R2 工作流](../workflows/images.md)。
