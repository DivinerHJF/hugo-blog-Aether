# 主题架构

## 目录职责

站点使用 Hugo，项目级模板和足迹页面覆盖放在根目录，Aether 主题源码位于 `themes/aether/`：

```text
layouts/                         # 项目级模板覆盖，优先于主题模板
themes/aether/layouts/           # 通用主题模板与 partial
themes/aether/assets/css/        # 主 SCSS 与页面/组件样式
themes/aether/src/js/            # JavaScript 源码
themes/aether/scripts/           # 主题 JS 构建与输入校验
themes/aether/assets/lib/        # 当前仍由主题使用的第三方资源
static/                          # 不经 Hugo 资源管线的站点静态文件
```

项目级 `layouts/` 目前主要负责足迹入口和年度页；文章、归档、分类、系列和标签等通用页面继续使用主题模板。

## 样式入口

主入口是 `themes/aether/assets/css/style.scss`。它组合基础层、布局层、页面层、partial 和自定义功能样式。主题颜色、表面、边框、阴影和动效统一在 `themes/aether/assets/css/_tokens.scss` 中以 CSS 变量提供：

- Light 使用纸面背景和半透明卡片；
- Dark 使用有层次的深灰表面与轻微阴影；
- Black 使用近黑背景、清晰边缘和无阴影表面。

组件应优先消费语义变量，不再为 Dark 和 Black 复制整段样式。

颜色和表面只使用 `_tokens.scss` 中的语义变量，例如 `--ink`、`--muted`、`--border`、`--accent` 和 `--interactive`。旧的 `--color-*` 兼容别名已经移除；`npm run check:tokens --prefix themes/aether` 会扫描主题源码并阻止它们重新进入。

## JavaScript 入口与生命周期

主题 JS 从 `themes/aether/src/js/theme.js` 进入，功能模块位于：

- `core/`：配置、事件、生命周期和 PJAX；
- `features/tag-explorer.js`：标签筛选；
- `features/footprint-gallery.js`：足迹相册与 PhotoSwipe。

模块通过统一的初始化/销毁生命周期运行：首次加载和 PJAX 成功后初始化，PJAX 发送前销毁监听器、观察器和相册实例。不要在页面模板中重新绑定这些全局功能。

## 源码与生成物

主题 JS 只维护 `src/js/`、`package.json` 和 `package-lock.json`。`assets/js/theme.min.js`、source map、`assets/sw.min.js` 及 source map 是构建时生成物，由 Vercel 和本地构建重新生成，不提交 Git。完整命令见 [构建与部署](../workflows/deployment.md)。
