# Aether 主题第三方库审计记录（2026-05-10）

本记录仅整理 `docs/codex-audit-workflow.md` 中“模块 6：静态资源与第三方库”的只读审计结果；未删除文件，未修改配置。

## 执行命令

```bash
python3 scripts/audit-theme-libs.py --check-simple-icons
find themes/aether/assets/lib themes/aether/static/lib -maxdepth 2 -type f | sort
rg -n "aplayer|meting|typeit|katex|fontawesome|twemoji|lightgallery|cookieconsent|mermaid|echarts|mapbox|simple-icons" config.toml content themes/aether/layouts themes/aether/assets
```

其中 `python3 scripts/audit-theme-libs.py --check-simple-icons` 退出码为 0，输出：

```text
required Simple Icons: none
vendored Simple Icons: none
```

## 当前触发状态总览

| 审计项 | 当前是否触发 | 当前资源状态 | 触发来源 / 说明 | 删除风险 |
| --- | --- | --- | --- | --- |
| 搜索库 | 是 | `themes/aether/assets/lib/fuse/fuse.min.js` 存在；`lunr`、`algoliasearch` 目录不存在 | `params.search.enable=true` 且 `params.search.type=fuse`；主题会加载 `lib/autocomplete/autocomplete.min.js` 与 `lib/fuse/fuse.min.js` | 高：Fuse / autocomplete 当前被搜索功能触发 |
| 评论库 | 是（Giscus） | Gitalk / Valine / Waline / Twikoo / Vssue 本地目录不存在；Giscus 通过 `https://giscus.app/client.js` 加载 | `params.page.comment.enable=true` 且 `params.page.comment.giscus.enable=true` | Giscus 高；历史本地评论库当前未触发 |
| KaTeX | 是 | `themes/aether/assets/lib/katex` 与 `themes/aether/static/lib/katex` 存在 | 全站 `params.page.math.enable=false`，但内容扫描到 `$$=68`、公式文章 3 篇、`front matter math=true` 3 篇 | 高：当前被数学公式文章触发 |
| APlayer / Meting | 是 | `themes/aether/assets/lib/aplayer` 与 `themes/aether/assets/lib/meting` 存在 | `music` shortcode 计数为 9 | 高：当前被音乐短代码触发 |
| TypeIt | 是 | `themes/aether/assets/lib/typeit` 存在 | `typeit` shortcode 计数为 8 | 高：当前被 TypeIt 短代码触发 |
| FontAwesome | 是 | `themes/aether/assets/lib/fontawesome-free` 与 `themes/aether/static/lib/webfonts` 存在 | `params.page.fontawesome=true`；分享启用 CopyLink / Twitter / Wechat / Weibo；社交入口启用 Email / GitHub / Mastodon / RSS / Telegram | 高：当前被页面图标、分享与社交入口触发 |
| Simple Icons | 否 | `themes/aether/assets/lib/simple-icons` 目录不存在 | `--check-simple-icons` 显示 required / vendored 均为 none；当前社交与分享配置不需要 Simple Icons slug | 无：目录不存在且当前未触发 |
| Twemoji | 否 | `themes/aether/assets/lib/twemoji` 目录不存在 | `params.page.twemoji=false` | 无：目录不存在且当前未触发 |
| LightGallery | 否 | `themes/aether/assets/lib/lightgallery` 与 `themes/aether/static/lib/fonts` 目录不存在 | `params.page.lightgallery=false` | 无：目录不存在且当前未触发 |
| CookieConsent | 否 | `themes/aether/assets/lib/cookieconsent` 目录不存在 | `params.cookieconsent.enable=false` | 无：目录不存在且当前未触发 |
| Mermaid / ECharts / Mapbox | 否 | `themes/aether/assets/lib/mermaid`、`themes/aether/assets/lib/echarts`、`themes/aether/assets/lib/mapbox-gl` 目录不存在 | `mermaid` / `echarts` / `mapbox` shortcode 计数均为 0 | 无：目录不存在且当前未触发 |

## 审计脚本扫描摘要

- Markdown 短代码统计（2026-05-12 复核）：`music=9`、`typeit=8`、`ref=5`、`relref=1`；独立 `mentalfood` 页面已移除，当前内容不再调用 `{{< mentalfood >}}`。
- 搜索配置：`params.search.enable=true`，`params.search.type=fuse`。
- 页面开关：`params.page.twemoji=false`，`params.page.lightgallery=false`，`params.page.math.enable=false`。
- 数学公式特征：`$$=68`，公式文章 3 篇，`front matter math=true` 3 篇。
- 评论配置：`params.page.comment.*.enable` 中 `giscus=true`。
- CookieConsent：`params.cookieconsent.enable=false`。
- 社交入口：Email、GitHub、Mastodon、RSS、Telegram。
- 分享入口：CopyLink、Twitter、Wechat、Weibo、enable。

## 保留 / 不触发结论

1. 当前明确触发并应保留的库：Fuse / autocomplete、Giscus、KaTeX、APlayer / Meting、TypeIt、FontAwesome / webfonts。
2. 当前未触发且目录不存在的库：Simple Icons、Twemoji、LightGallery、CookieConsent、Mermaid、ECharts、Mapbox，以及历史评论库 Gitalk / Valine / Waline / Twikoo / Vssue 的本地目录。
3. 本次审计未删除任何文件，未修改任何配置；如未来重新启用未触发功能，应先恢复对应本地资源或配置 CDN，并重新运行 `python3 scripts/audit-theme-libs.py --check-simple-icons`。
