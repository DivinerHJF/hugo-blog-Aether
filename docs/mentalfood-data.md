# Mental Food 数据维护

`content/pages/mentalfood.md` 现在只负责调用 `{{< mentalfood >}}`，页面内容主要来自这些数据文件：

- `books.yaml`：书刊条目。
- `movies.yaml`：影剧条目。
- `mental_links.yaml`：文章、视频、播客、RSS 等链接型摘录。

新增书刊或影剧时，建议优先填写这些字段：

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

新增摘录链接时：

```yaml
- type: "25-09"
  category: "自媒体摘录"
  title: "标题"
  url: "https://example.com"
  source: "来源或作者"
```

页面会自动按 `type` 的年份前缀分组、统计数量，并默认展开最新年份。
