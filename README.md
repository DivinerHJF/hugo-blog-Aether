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
| 评论系统 | `[params.page.comment]` 与 `[params.page.comment.giscus]` | 当前只启用 Giscus；Gitalk / Valine / Waline / Twikoo / Vssue 的本地资源已删除，重新启用前需恢复资源或配置 CDN |
| 搜索 | `[params.search]` 与 `[params.search.fuse]` | 当前使用本地 Fuse 搜索，`outputs.home` 中的 `JSON` 不要删除 |
| TypeIt 打字动画 | `[params.typeit]` | 部分月报文章使用 `typeit` 短代码，因此保留全局动画默认值 |
| CDN / 已裁剪可选资源 | `[params.cdn]` | 默认使用仓库内保留的主题资源；Mermaid、ECharts、Mapbox GL 短代码库以及 Twemoji、LightGallery、CookieConsent 本地库已按当前关闭配置移除，重新启用前需配置 CDN 或恢复本地库 |
| 字体栈 | `themes/aether/assets/css/_variables.scss` | 正文字体、标题装饰字体和代码字体均使用系统字体栈；不再加载外部中文字体 CDN，也不提交字体二进制文件 |
| Markdown 原文链接 | `[params.page]` 与 `[outputs]` | `linkToMarkdown = true` 依赖 `page = ["HTML", "MarkDown"]` |

### 主题静态库裁剪

当前 `content/` 中没有 `{{< mermaid >}}`、`{{< echarts >}}`、`{{< mapbox >}}`，因此已删除对应的本地重型短代码库目录：

- `themes/aether/assets/lib/mermaid/`；
- `themes/aether/assets/lib/echarts/`；
- `themes/aether/assets/lib/mapbox-gl/`。

此外，以下页面级可选功能在 `config.toml` 中保持关闭，也已删除对应本地资源：

- `params.page.twemoji = false`：删除 `themes/aether/assets/lib/twemoji/`；
- `params.page.lightgallery = false`：删除 `themes/aether/assets/lib/lightgallery/` 以及仅供 LightGallery 使用的 `themes/aether/static/lib/fonts/`；
- `params.cookieconsent.enable = false`：删除 `themes/aether/assets/lib/cookieconsent/`。

Simple Icons 也按当前配置裁剪：`[params.social]` 只启用 Email、GitHub、Mastodon、RSS、Telegram，`[params.page.share]` 只启用 Twitter、Weibo、Wechat、CopyLink，因此不会触发 `Line`、`Instapaper`、`Myspace`、`Baidu` 或任何 `icon.Simpleicons` 社交图标，完整 `themes/aether/assets/lib/simple-icons/` 不再提交。后续若重新启用依赖 Simple Icons 的分享/社交项，不要直接提交完整上游仓库；请先准备一个 simple-icons 的 `icons/` 来源目录，再运行：

```bash
python3 scripts/audit-theme-libs.py --sync-simple-icons --simple-icons-source /path/to/simple-icons/icons --check-simple-icons
```

日常审计或 CI 可运行以下命令，确保已提交的 Simple Icons 集合仍然等于 `config.toml` 实际需要的最小集合：

```bash
python3 scripts/audit-theme-libs.py --check-simple-icons
```

后续新增或恢复这些短代码、页面功能、Simple Icons 社交/分享项或 Cookie 横幅前，请先运行 `python3 scripts/audit-theme-libs.py` 检查触发来源，并在 `[params.cdn]` 配置可用 CDN，或把对应本地资源恢复到 `themes/aether/assets/lib/`（LightGallery 还需恢复 `themes/aether/static/lib/fonts/`）。`themes/aether/layouts/partials/heatmap.html` 的 ECharts 热力图使用外部 CDN，不依赖已删除的本地 `echarts` 目录。

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

仓库根目录的 `vercel.json` 会固定 Vercel 的 Hugo 构建设置，并应与 Vercel 项目后台保持一致：

- Framework Preset：`Hugo`（`vercel.json` 中对应 `"framework": "hugo"`）；
- Build Command：`hugo --gc --minify`；
- Output Directory：`public`；
- Hugo 版本：`HUGO_VERSION = 0.123.7`，与本地 `hugo version` 显示的 `v0.123.7` 基线一致。

如果 Vercel 项目后台手动开启了 Framework Preset、Build Command、Output Directory 或环境变量的 Override，建议改回与 `vercel.json` 一致，或直接关闭 Override 让仓库配置生效。Vercel 环境变量中的 `HUGO_VERSION` 也应保持为 `0.123.7`，避免线上构建使用不同 Hugo 版本。截图里的 `Command "hugo --gc" exited with 1` 只说明 Hugo 构建失败；真正原因需要展开 Vercel Build Logs 查看具体错误。迁移主题为普通目录后，不需要再在 Vercel 命令里加 `git submodule update --init --recursive`。

### Vercel 后台预览 403 排查

如果站点公网地址（例如 `https://philohao.com/`）可以正常打开，但 Vercel Dashboard 的 Deployment 缩略图或预览框显示 `403: Forbidden`，优先按下面顺序处理：

1. 到 **Project Settings → Deployment Protection** 确认 Production/Preview 是否开启了 Vercel Authentication、Password Protection 或 Trusted IPs。后台缩略图会访问生成的 `*.vercel.app` Deployment URL；如果该 URL 被保护，缩略图可能 403，而绑定的自定义域名仍然正常。
2. 到 **Firewall → Traffic/Events** 查看是否有 DDoS Mitigation、Bot Protection 或自定义规则拦截了 Vercel 的截图/缩略图服务请求。若是系统 DDoS 规则误拦且 Hobby 计划无法添加 System Bypass Rule，需带上 403 页面里的 Request ID 联系 Vercel Support/Abuse 处理。
3. 本仓库在 `vercel.json` 中显式设置了 `Content-Security-Policy: frame-ancestors 'self' https://vercel.com https://*.vercel.com`，允许 Vercel Dashboard iframe 预览本站，同时仍限制其它第三方站点随意嵌入。
4. 修改保护/防火墙设置后，重新部署一次；如果新部署能直接访问但 Dashboard 缩略图仍旧显示旧的 403，通常是缩略图缓存，需要等待刷新或联系 Vercel 重新生成预览图。

## 主题维护说明

- `themes/aether/` 是本站自用主题源码，已经从 Git submodule 迁移为普通目录；主题、内容与配置可以在同一个提交里一起修改和回滚。
- 不再维护 `.gitmodules`，部署平台 clone 主仓库后即可拿到主题文件。
- 只有修改主题 JS 源码时，才需要进入 `themes/aether/` 执行 npm 构建；`themes/aether/package.json` 中不再保留 `--source=exampleSite` 类独立示例站脚本。
- 评论功能目前以 Giscus 为唯一启用方案；`themes/aether/assets/lib/gitalk/`、`valine/`、`waline/`、`twikoo/`、`vssue/` 已删除，除非同步恢复资源或改用 CDN，否则不要打开这些历史评论 provider。
- Twemoji、LightGallery 与 CookieConsent 当前均为关闭状态；对应本地库已删除，重新打开 `params.page.twemoji`、`params.page.lightgallery` 或 `params.cookieconsent.enable` 前需先恢复本地资源或配置 CDN。
- `themes/aether/exampleSite/` 已删除；部署、预览与 README 均以仓库根目录站点为准，不依赖主题示例站。
- 不再把 `themes/aether/` 作为独立 Hugo 主题发布，因此已移除主题商店展示用的 `themes/aether/images/screenshot.png` 与 `themes/aether/images/tn.png`，后续截图请使用本站实际页面。
- 如果后续需要把主题重新发布为独立项目，再从 `themes/aether/` 拆分出去并补齐示例站、主题截图和贡献流程即可。

## 维护提醒

- 文章图片优先使用稳定的图床链接；个人站点图标、Logo、头像放在 `static/images/me/`。
- `config.toml` 中的中文注释是后续改配置的参考，删除配置前先确认主题是否仍依赖该项。
- `enableGitInfo = true` 会依赖 Git 历史计算更新时间；如果在无 Git 环境部署，需要确认构建平台是否保留 `.git` 信息。
- 站点目前以中文内容为主，保留 `hasCJKLanguage = true`。
