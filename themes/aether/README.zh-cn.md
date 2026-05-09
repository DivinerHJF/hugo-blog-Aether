# Aether 主题说明

Aether 是本站自用的 Hugo 主题，当前用于 [philohao.com](https://philohao.com/)。

## 来源与致谢

本主题基于 [DoIt](https://github.com/HEIGE-PCloud/DoIt) 改造，并保留 DoIt 及其上游项目的版权与许可证声明。感谢 DoIt、LoveIt 等上游主题提供的设计与功能基础。

## 维护方式

Aether 随主仓库 [DivinerHJF/hugo-blog-Aether](https://github.com/DivinerHJF/hugo-blog-Aether) 一起维护，不再作为独立主题或 Git submodule 对外安装。

如需查看本站配置，请参考主仓库中的 `config.toml` 与相关内容文件。本主题的改动以满足本站展示和维护需求为主，不保证对其他站点的通用兼容性。

## 静态库裁剪说明

主题目录中已移除当前内容未引用的 Mermaid、ECharts、Mapbox GL 本地短代码库：

- `assets/lib/mermaid/`；
- `assets/lib/echarts/`；
- `assets/lib/mapbox-gl/`。

短代码模板和初始化逻辑仍保留，便于未来按需恢复；但重新使用 `{{< mermaid >}}`、`{{< echarts >}}`、`{{< mapbox >}}` 前，需要先配置 CDN 或恢复对应本地资源，并在主仓库根目录运行 `python3 scripts/audit-theme-libs.py` 与 Hugo 构建复核。
评论功能当前随本站配置使用 Giscus。Gitalk、Valine、Waline、Twikoo、Vssue 的本地静态库不再随主题维护；若未来重新启用这些历史评论 provider，请先恢复对应 `themes/aether/assets/lib/<provider>/` 资源，或在配置中改用可用的 CDN 地址。
