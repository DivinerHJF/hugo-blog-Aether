# 灿若星河 · Hugo 个人网站

这是 [philohao.com](https://philohao.com/) 的 Hugo 源码仓库，当前使用 `aether` 主题，内容以中文为主，主要记录：

- **生活与月报**：碎碎念、阶段复盘、个人观察；
- **技术折腾**：Hugo 建站、样式改造、工具实践；
- **读看听**：书籍、电影/剧集、自媒体摘录与年度记录；
- **万里路**：旅行、徒步、城市与照片记录。

## 目录结构

```text
.
├── archetypes/              # hugo new 生成文章时使用的模板
├── config.toml              # Hugo 与主题主配置，已按当前站点用途写中文注释
├── content/
│   ├── pages/               # 独立页面：足迹、阅览、关于
│   └── posts/<year>/        # 按年份存放的文章与月报
├── data/
│   ├── books.yaml           # 阅览页的书籍数据
│   └── movies.yaml          # 阅览页的影剧数据
├── static/images/me/        # favicon、logo、头像、二维码等个人静态资源
└── themes/aether/           # Aether 主题源码，作为普通目录随主仓库维护
```

## 内容维护约定

### 新建文章

推荐使用 Hugo archetype 生成基础 front matter：

```bash
hugo new content/posts/2026/20260509.md
```

生成后重点检查这些字段：

- `title`：文章标题；
- `date`：发布时间；
- `description`：用于 SEO、分享卡片和搜索摘要；
- `categories`：建议从 `碎碎念`、`爱折腾`、`读看听`、`万里路` 中选择；
- `series`：同主题合集，不需要时保持 `[]`；
- `tags`：建议 2-5 个；
- `comment`、`toc`、`math`：按单篇文章需要覆盖全站默认值。

### 独立页面

- `content/pages/footprint.md`：足迹和旅行照片；
- `content/pages/mentalfood.md`：书影音游入口，正文通过短代码读取 `data/` 数据；
- `content/pages/about.md`：个人介绍与站点说明。

### 书影音数据

`data/books.yaml` 与 `data/movies.yaml` 是“阅览”页的数据源。新增条目时建议保持同一年份分组和既有字段风格，避免把大量数据重新写回 Markdown 页面。

## 配置维护说明

主要配置都在 `config.toml`，已按“当前实际使用 + 后续常改”整理。常见修改位置如下：

| 修改目标 | 配置位置 | 说明 |
| --- | --- | --- |
| 站点标题、描述、关键词 | `[params]` | 影响首页、SEO 和分享摘要 |
| 顶部导航 | `[[menu.main]]` | 对应归档、足迹、阅览、关于 |
| 首页头像与副标题 | `[params.home.profile]` | 头像资源位于 `static/images/me/` |
| 社交链接 | `[params.social]` | 目前只保留 Email、GitHub、Mastodon、RSS、Telegram |
| 评论系统 | `[params.page.comment.giscus]` | 当前使用 Giscus；仓库或 Discussions 分类变化时需同步 ID |
| 搜索 | `[params.search]` 与 `[params.search.fuse]` | 当前使用本地 Fuse 搜索，`outputs.home` 中的 `JSON` 不要删除 |
| TypeIt 打字动画 | `[params.typeit]` | 部分月报文章使用 `typeit` 短代码，因此保留全局动画默认值 |
| Markdown 原文链接 | `[params.page]` 与 `[outputs]` | `linkToMarkdown = true` 依赖 `page = ["HTML", "MarkDown"]` |

## 本地预览

主题已经直接纳入主仓库，首次拉取后无需再执行 `git submodule update --init --recursive`。

启动本地服务：

```bash
hugo server -D
```

生成静态文件：

```bash
hugo --gc --minify
```

## Vercel 部署说明

仓库根目录的 `vercel.json` 会固定 Vercel 的 Hugo 构建设置：

- Framework Preset：`hugo`；
- Build Command：`hugo --gc --minify`；
- Output Directory：`public`；
- Hugo 版本：`HUGO_VERSION = 0.123.7`。

如果 Vercel 项目后台手动开启了 Build Command / Output Directory 的 Override，建议改回与 `vercel.json` 一致，或直接关闭 Override 让仓库配置生效。截图里的 `Command "hugo --gc" exited with 1` 只说明 Hugo 构建失败；真正原因需要展开 Vercel Build Logs 查看具体错误。迁移主题为普通目录后，不需要再在 Vercel 命令里加 `git submodule update --init --recursive`。

## 主题维护说明

- `themes/aether/` 是本站自用主题源码，已经从 Git submodule 迁移为普通目录；主题、内容与配置可以在同一个提交里一起修改和回滚。
- 不再维护 `.gitmodules`，部署平台 clone 主仓库后即可拿到主题文件。
- 只有修改主题 JS 源码时，才需要进入 `themes/aether/` 执行 npm 构建。
- 如果后续需要把主题重新发布为独立项目，再从 `themes/aether/` 拆分出去即可。

## 维护提醒

- 文章图片优先使用稳定的图床链接；个人站点图标、Logo、头像放在 `static/images/me/`。
- `config.toml` 中的中文注释是后续改配置的参考，删除配置前先确认主题是否仍依赖该项。
- `enableGitInfo = true` 会依赖 Git 历史计算更新时间；如果在无 Git 环境部署，需要确认构建平台是否保留 `.git` 信息。
- 站点目前以中文内容为主，保留 `hasCJKLanguage = true`。
