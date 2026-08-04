# 写作与内容发布

## 文章

内容仓库是 Hugo 的唯一事实来源。Pages CMS 按 `.pages.yml` 的集合编辑 `content/posts/<year>/` 下的 Markdown 文章；新文章可以先运行：

```bash
hugo new content/posts/2026/20260509.md
```

提交前检查 `title`、`date`、`description`、`categories`、`series`、`tags` 以及单篇文章的 `comment`、`toc`、`math` 覆盖项。分类和系列应沿用已有命名，避免同义词扩散。

## 足迹和书影游

- 足迹入口是 `content/pages/footprint/_index.md`。
- 年度出游、书影游和海报墙页面位于 `content/pages/footprint/<year>/`。
- 书刊、影剧和摘录分别维护在 `data/books.yaml`、`data/movies.yaml`、`data/mental_links.yaml`，通过 `type` 的两位年份前缀渲染到年度书影游页。
- 年度导航和年度表格依赖 `data/footprint.yaml`，新增年份时必须同步数据节点和 Markdown 页面。

详细字段和示例见[内容模型](../architecture/content-model.md)。不要重新创建独立的 `content/pages/mentalfood.md`；旧地址由 alias 兼容。

## 浏览器创作流程

1. 在 Pages CMS 中编辑文章或 YAML 数据。
2. 使用 R2 图片上传器压缩、转 WebP 并上传图片。
3. 将 `img.philohao.com` 的 Markdown 直链粘贴回正文。
4. 保存后由 Git 提交触发 Vercel：安装锁定依赖、编译主题资源、校验 Hugo 版本并构建站点。

图片细则见[图片与 R2 工作流](images.md)，构建细则见[构建与部署](deployment.md)。
