# 书影游数据维护

书影游已合并到足迹页，不再维护独立的 `content/pages/mentalfood.md` 页面，也不再在顶部导航展示「阅览」。当前入口为：

- 足迹首页：`/pages/footprint/`
- 年度书影游页：`/pages/footprint/<year>/reading/`
- 旧链接兼容：`/pages/mentalfood/` 由 `content/pages/footprint/2025/reading.md` 的 `aliases` 跳转到 2025 书影游页。

## 当前文件分工

- `content/pages/footprint/<year>/reading.md`：年度书影游页面，负责 front matter、简短说明和 URL 生成。
- `layouts/pages/footprint-year.html`：足迹年度页模板；当 `category = "reading"` 时调用书影游 partial。
- `layouts/partials/mentalfood/year.html`：按年份筛选并渲染书刊、影剧和摘录。
- `themes/aether/layouts/partials/mentalfood/media-list.html`：渲染书刊/影剧卡片列表。
- `themes/aether/layouts/partials/mentalfood/link-list.html`：渲染摘录链接列表。
- `data/books.yaml`：书刊条目。
- `data/movies.yaml`：影剧条目。
- `data/mental_links.yaml`：文章、视频、播客、RSS 等链接型摘录。
- `data/footprint.yaml`：声明 `reading` 分类有哪些年份，并提供足迹导航所需的年份数据。

> 备注：主题中仍保留 `mentalfood` shortcode 与相关 CSS，作为历史兼容能力；当前内容维护应优先走足迹 `reading` 分类，不要新增独立 mentalfood 页面。

## 新增书刊或影剧

建议优先填写这些字段：

```yaml
- title: "作品名"
  coverurl: "https://example.com/cover.jpg" # 可空；为空时页面会显示占位封面
  link: "https://example.com/item"        # 可空；为空时标题不加链接
  author: "作者 / 导演"
  type: "25-09"                           # 两位年份-月份，用于自动归档和统计
  starscore: "★★★★"
  greystar: "☆"
  intro: "一句短评"
```

`type` 的前两位决定条目渲染到哪个年度页。例如：

- `25-09` 渲染到 `/pages/footprint/2025/reading/`；
- `24-03` 渲染到 `/pages/footprint/2024/reading/`。

## 新增摘录链接

```yaml
- type: "25-09"
  category: "自媒体摘录"
  title: "标题"
  url: "https://example.com"
  source: "来源或作者"
```

摘录会先按年度筛选，再按 `category` 分组展示。

## 新增一个年份

如果要新增 2026 年书影游：

1. 新建 `content/pages/footprint/2026/reading.md`，示例 front matter：

   ```toml
   +++
   title = "2026 书影游"
   description = "2026 年读过的书、看过的影剧和收藏的内容摘录。"
   date = "2026-01-01"
   layout = "footprint-year"
   year = 2026
   category = "reading"
   comment = false
   toc = false
   hiddenFromHomePage = true
   hiddenFromSearch = false
   +++
   ```

2. 在 `data/footprint.yaml` 的 `reading:` 下增加：

   ```yaml
   "2026":
     title: "2026 书影游"
     rows: *empty_2025
   ```

3. 在 `data/books.yaml`、`data/movies.yaml` 或 `data/mental_links.yaml` 中新增 `type: "26-xx"` 的条目。

4. 运行构建确认页面生成：

   ```bash
   hugo --gc --minify
   ```

## 注意事项

- 不要把书影游条目批量写回 Markdown 页面；数据文件是主数据源。
- 不要删除 `data/footprint.yaml` 中 `reading` 分类的年份，否则足迹年度页的年份导航无法发现该年。
- 如果移动旧链接，优先使用 Hugo `aliases` 保留兼容跳转。
