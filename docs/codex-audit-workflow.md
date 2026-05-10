# Codex 仓库审查与修复任务书

适用仓库：`DivinerHJF/hugo-blog-Aether`。本文用于把后续 Codex 修复拆成可审查、可回滚、可独立验证的小任务。

## 0. 执行原则

1. **适合采用“先稳定构建 → 再分模块审查 → 每次只改一类问题 → 每步都能回滚”的方式。** 当前仓库是 Hugo 站点、内容、主题源码、静态资源和 Vercel 配置放在同一仓库的结构；任一改动都可能同时影响生成页面、RSS、搜索索引、主题资源和部署结果，因此不建议一次性大改。
2. **不要按“看到哪里改哪里”的方式审查。** 每次只进入一个模块；发现其它模块问题时，先记录到本文件或临时审计记录，不在当前提交里顺手修改。
3. **每个模块固定流程：** 检查 → 记录问题 → 修改 → 本地构建 → 本地预览 → 提交 commit → 再进入下一模块。
4. **每个 commit 只解决一类问题。** 避免 `fix all`、`update site` 这类无法回滚的提交信息。
5. **主题资源不要盲删。** 先运行 `scripts/audit-theme-libs.py`，确认资源是否由配置、短代码、评论、搜索、分享或数学公式触发；删除资源后必须重新构建并抽查页面。
6. **不要重新打开缺资源的功能。** 当前关闭或已移除本地资源的功能，只有在同步恢复资源或配置 CDN 后才能启用。
7. **域名、SEO 与部署配置必须成组检查。** `baseURL`、SEO 图片、作者链接、Markdown 原文链接、robots、sitemap、Vercel 域名/预览行为要保持一致。
8. **内容类修改要谨慎。** 文章正文、分类、标签、日期、摘要、图片链接应保留原意；批量规范化前先输出变更清单。

## 1. 仓库现状速览

- Hugo 站点根配置位于 `config.toml`，主题作为普通目录放在 `themes/aether/`，不依赖 Git submodule。
- Vercel 使用仓库根目录的 `vercel.json` 固定 Hugo 构建命令、输出目录和 Hugo 版本。
- 内容主要位于 `content/posts/<year>/` 与 `content/pages/`，书影音数据位于 `data/`。
- 主题源码、布局、短代码、静态库分别位于 `themes/aether/layouts/`、`themes/aether/assets/`、`themes/aether/static/`。
- 当前维护脚本 `scripts/audit-theme-libs.py` 可用于审计主题静态库依赖。

## 2. 每一步通用检查清单

每个模块开始前：

```bash
git status --short
hugo version
```

每个模块修改后至少运行：

```bash
hugo --gc --minify
```

如涉及可见页面、主题、资源、SEO、搜索、评论或部署行为，还要运行本地预览：

```bash
hugo server -D --disableFastRender --bind 127.0.0.1 --port 1313
```

本地预览抽查至少包括：

- 首页：`/`
- 归档页：`/posts/`
- 任意一篇普通文章
- 任意一篇包含短代码或数学公式的文章（如本次改动相关）
- 分类页：`/categories/`
- 标签页：`/tags/`
- RSS：`/index.xml`
- Sitemap：`/sitemap.xml`
- 搜索索引：`/index.json`
- Markdown 原文链接（若 `params.page.linkToMarkdown = true` 仍启用）

每个模块结束前：

```bash
git diff --check
git status --short
git add <本模块相关文件>
git commit -m "<type>: <scope and intent>"
```

## 3. 推荐总顺序

### 第一阶段：必须稳定

1. 本地构建必须通过。
2. Vercel 构建必须通过。
3. 首页和文章页无 404。
4. Chrome Console 无红色错误。
5. 评论、搜索、RSS 基本可用。

### 第二阶段：配置一致性

1. 统一 `philohao.com` / `www.philohao.com`。
2. 清理旧域名、`localhost`、不必要的 `http://` 链接。
3. 检查 SEO 图片。
4. 检查 `sitemap.xml` / `robots.txt`。
5. 检查 Markdown 原文输出。

### 第三阶段：主题和资源瘦身

1. 运行 `python3 scripts/audit-theme-libs.py`。
2. 确认哪些库真的被使用。
3. 删除未使用资源。
4. 不要重新打开缺资源的功能。
5. 重新构建并抽查短代码页面。

### 第四阶段：内容质量

1. front matter 统一。
2. 分类标签统一。
3. 图片链接检查。
4. 旧文章 description 补齐。
5. 归档页、分类页、标签页检查。

### 第五阶段：性能和体验

1. 图片尺寸。
2. 字体加载。
3. JS 体积。
4. CSS 体积。
5. PWA 和 Service Worker。

## 4. 十个独立模块任务

### 模块 1：构建基线

**目标：** 建立后续所有修改的基准，确保 Hugo 本地构建、核心输出文件和预览流程稳定。

**检查：**

```bash
git status --short
hugo version
hugo --gc --minify
find public -maxdepth 2 -type f \( -name 'index.html' -o -name 'index.xml' -o -name 'sitemap.xml' -o -name 'robots.txt' -o -name 'index.json' \) -print | sort
```

**记录问题：**

- Hugo 版本是否与 Vercel 固定版本一致。
- 是否有 warning、deprecated warning、render hook warning、missing template、broken shortcode。
- `public/index.html`、`public/index.xml`、`public/sitemap.xml`、`public/robots.txt`、`public/index.json` 是否生成。

**修改限制：**

- 只修复阻断构建的问题。
- 不做主题重构、不删资源、不改内容风格。

**验收：**

- `hugo --gc --minify` 退出码为 0。
- 首页、文章页、RSS、Sitemap、搜索索引均生成。

**建议 commit：**

```bash
git commit -m "chore: record Hugo build baseline"
```

### 模块 2：仓库结构

**目标：** 明确内容、主题、数据、静态文件、脚本、部署配置的边界，减少后续维护误操作。

**检查：**

```bash
find . -maxdepth 3 -type f \( -name '.gitmodules' -o -name 'README.md' -o -name 'config.toml' -o -name 'vercel.json' \) -print | sort
find content -maxdepth 3 -type f | sort
find themes/aether -maxdepth 3 -type f | sort | sed -n '1,160p'
```

**记录问题：**

- 是否存在过时的 submodule 说明或 `.gitmodules`。
- README 是否准确描述当前目录结构。
- `themes/aether/` 是否被当作本站自用主题，而不是独立主题发布目录。
- 脚本、数据文档是否有维护入口。

**修改限制：**

- 只改文档、目录说明、维护说明。
- 不移动文章、不改主题逻辑、不删资源。

**验收：**

- README 与实际目录一致。
- 新维护者能区分根站点、主题源码、静态资源和数据文件。

**建议 commit：**

```bash
git commit -m "docs: document repository audit workflow"
```

### 模块 3：Hugo 配置

**目标：** 统一站点核心配置，避免 base URL、作者链接、SEO 图片、搜索、评论、PWA、Markdown 原文输出之间互相冲突。

**检查：**

```bash
rg -n "philohao|www\.philohao|localhost|127\.0\.0\.1|http://|baseURL|images|thumbnailUrl|linkToMarkdown|enablePWA|giscus" config.toml README.md content themes/aether vercel.json
hugo --gc --minify
```

**记录问题：**

- `baseURL` 与 SEO 绝对 URL 是否统一。
- 是否混用 `philohao.com` 与 `www.philohao.com`。
- 是否仍有旧域名、localhost、非必要 `http://` 链接。
- `params.page.linkToMarkdown` 打开时，主题是否生成可访问的 Markdown 原文。
- PWA 与 manifest 图标路径是否一致。

**修改限制：**

- 只改配置一致性问题。
- 不处理文章 front matter 质量、不删主题资源。

**验收：**

- 构建通过。
- `public/sitemap.xml`、`public/robots.txt`、首页 SEO meta、文章页 canonical 与目标域名一致。

**建议 commit：**

```bash
git commit -m "fix: align Hugo site URLs and SEO settings"
```

### 模块 4：内容与 front matter

**目标：** 统一文章元数据、分类标签、描述、草稿状态和资源链接。

**检查：**

```bash
python3 - <<'PY'
from pathlib import Path
for path in sorted(Path('content').rglob('*.md')):
    text = path.read_text(encoding='utf-8')
    print(f'--- {path}')
    print('\n'.join(text.splitlines()[:20]))
PY
rg -n "draft: true|categories:|tags:|description:|featuredImage|images:|http://|localhost|127\.0\.0\.1" content
```

**记录问题：**

- 哪些文章缺少 `description`、`categories`、`tags`、`date` 或标题。
- 分类/标签是否存在同义词、大小写不统一或中英文混用。
- 图片链接是否失效、是否仍用 `http://`。
- 未来日期文章是否符合预期。

**修改限制：**

- 不重写正文原意。
- 每次只处理一种内容问题，例如只补 description，或只统一标签。
- 批量改动前先输出清单，避免无意改坏文章。

**验收：**

- 构建通过。
- 归档页、分类页、标签页、RSS 摘要正常。

**建议 commit：**

```bash
git commit -m "fix: normalize post front matter"
```

### 模块 5：主题源码

**目标：** 审查 Hugo 模板、partials、shortcodes、render hooks 与主题参数之间的兼容性。

**检查：**

```bash
rg -n "\.Site\.Params|\.Param|partial |shortcode|resources\.Get|linkToMarkdown|giscus|search|rss|sitemap" themes/aether/layouts themes/aether/assets
hugo --gc --minify
```

**记录问题：**

- 模板是否读取不存在或已废弃的参数。
- 短代码是否依赖已删除的本地库。
- render hook 是否生成不可访问链接。
- 评论、搜索、分享、RSS 是否在主题层面有条件判断。

**修改限制：**

- 不做大规模重构。
- 一个提交只修一个主题行为，例如只修评论加载，或只修 Markdown 链接。
- 修改主题后必须抽查相关页面和浏览器控制台。

**验收：**

- 构建通过。
- 涉及的主题功能在本地预览可用。
- Chrome Console 无新增红色错误。

**建议 commit：**

```bash
git commit -m "fix: guard Aether theme feature loading"
```

### 模块 6：静态资源与第三方库

**目标：** 确认当前保留的第三方库确实被使用，删除未使用资源前有审计证据。

**检查：**

```bash
python3 scripts/audit-theme-libs.py --check-simple-icons
find themes/aether/assets/lib themes/aether/static/lib -maxdepth 2 -type f | sort
rg -n "aplayer|meting|typeit|katex|fontawesome|twemoji|lightgallery|cookieconsent|mermaid|echarts|mapbox|simple-icons" config.toml content themes/aether/layouts themes/aether/assets
```

**记录问题：**

- 哪些库存在但未触发。
- 哪些库不存在但配置或内容仍触发。
- 保留库的触发来源：短代码、数学公式、搜索、评论、分享、社交图标。

**修改限制：**

- 先审计，后删除。
- 不在同一提交里既删除资源又开启新功能。
- 删除后要重新运行审计脚本和 Hugo 构建。

**验收：**

- `python3 scripts/audit-theme-libs.py --check-simple-icons` 通过。
- `hugo --gc --minify` 通过。
- 受影响短代码页面无 404、无 console error。

**建议 commit：**

```bash
git commit -m "chore: audit Aether theme libraries"
git commit -m "fix: remove unused theme assets"
```

### 模块 7：SEO / RSS / Sitemap / 搜索

**目标：** 确保搜索引擎、订阅器和站内搜索都能消费正确 URL、标题、摘要、图片与正文。

**检查：**

```bash
hugo --gc --minify
python3 - <<'PY'
from pathlib import Path
for file in ['public/index.html', 'public/index.xml', 'public/sitemap.xml', 'public/robots.txt', 'public/index.json']:
    p = Path(file)
    print(f'--- {file}: {p.exists()} {p.stat().st_size if p.exists() else 0}')
    if p.exists():
        print(p.read_text(encoding='utf-8', errors='ignore')[:1000])
PY
rg -n "canonical|og:image|twitter:image|application/ld\+json|index\.json|sitemap|robots" public themes/aether/layouts
```

**记录问题：**

- canonical、Open Graph、Twitter Card、JSON-LD 是否一致。
- RSS 是否包含预期数量、标题和链接。
- Sitemap 是否包含首页、文章页、分类标签页。
- 搜索索引是否包含文章内容，是否排除隐藏页面。

**修改限制：**

- SEO 模板问题与内容元数据问题分开提交。
- 不为了 SEO 一次性重写大量正文。

**验收：**

- `public/index.xml`、`public/sitemap.xml`、`public/robots.txt`、`public/index.json` 正常生成。
- 首页和文章页 meta 标签无明显错域名或错图。

**建议 commit：**

```bash
git commit -m "fix: align SEO feeds and search output"
```

### 模块 8：性能与浏览器控制台

**目标：** 把肉眼可见的页面问题、静态资源 404、console error、过大资源和阻塞加载分开处理。

**检查：**

```bash
hugo --gc --minify
find public -type f \( -name '*.js' -o -name '*.css' -o -name '*.woff2' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.svg' \) -printf '%s %p\n' | sort -nr | sed -n '1,80p'
```

本地浏览器手动检查：

- 首页、文章页、归档页、分类页、标签页。
- Network 面板是否有 404、blocked、mixed content。
- Console 面板是否有红色错误。
- Lighthouse 或 PageSpeed 只作为参考，不要为分数牺牲功能。

**记录问题：**

- 最大 JS、CSS、字体、图片文件。
- 首屏是否加载不必要的短代码库。
- Service Worker 是否缓存旧资源导致预览误判。

**修改限制：**

- 先修 404 和红色错误，再考虑体积优化。
- 图片、字体、JS、CSS、PWA 分开提交。

**验收：**

- 无新增红色 console error。
- 无新增资源 404。
- 构建通过。

**建议 commit：**

```bash
git commit -m "fix: resolve frontend asset loading errors"
```

### 模块 9：安全与隐私

**目标：** 检查第三方脚本、外链、iframe、CSP、评论、统计、Cookie、mixed content 与隐私提示。

**检查：**

```bash
rg -n "script|iframe|analytics|giscus|cookie|http://|target=\"_blank\"|rel=|Content-Security-Policy|unsafe" config.toml content themes/aether/layouts vercel.json
hugo --gc --minify
```

**记录问题：**

- 是否存在 `target="_blank"` 但缺少 `rel="noreferrer"` 或 `noopener` 的外链。
- 是否存在 `http://` mixed content。
- `markup.goldmark.renderer.unsafe = true` 是否仍有必要；若保留，需要记录原因。
- Vercel CSP 是否只解决 iframe 预览，是否误拦本站资源。
- Giscus、统计、Cookie 横幅是否符合当前实际启用状态。

**修改限制：**

- 不在未恢复 CookieConsent 资源前开启 Cookie 横幅。
- 不随意收紧 CSP 到会破坏主题资源的程度。
- 安全修复必须抽查页面功能。

**验收：**

- 构建通过。
- 页面外链、评论、嵌入内容工作正常。
- 无 mixed content 和明显隐私误配置。

**建议 commit：**

```bash
git commit -m "fix: harden external links and privacy settings"
```

### 模块 10：Vercel 部署与预览

**目标：** 确保 Vercel 使用与本地一致的 Hugo 版本、构建命令、输出目录和预览策略。

**检查：**

```bash
cat vercel.json
hugo version
hugo --gc --minify
rg -n "vercel|HUGO_VERSION|buildCommand|outputDirectory|Deployment Protection|403|frame-ancestors" README.md vercel.json
```

Vercel 后台手动检查：

- Framework Preset：Hugo。
- Build Command：`hugo --gc --minify`。
- Output Directory：`public`。
- 环境变量 `HUGO_VERSION` 与本地基线一致。
- 是否开启 Deployment Protection、Password Protection、Trusted IPs、Bot Protection。
- Production 域名与 Preview 域名行为是否符合预期。

**记录问题：**

- 后台 override 是否与 `vercel.json` 冲突。
- Dashboard 预览 403 是部署保护、防火墙还是缓存问题。
- 是否需要保留 `frame-ancestors` 允许 Vercel Dashboard iframe 预览。

**修改限制：**

- 只改部署配置和部署文档。
- 不在部署模块顺手改 Hugo 内容或主题逻辑。

**验收：**

- 本地构建命令与 Vercel 构建命令一致且成功。
- Production 可访问，Preview 行为有明确说明。

**建议 commit：**

```bash
git commit -m "fix: align Vercel build configuration"
```

## 5. 推荐 commit 粒度

可按实际问题调整，但保持“一个 commit 一类问题”：

```bash
git commit -m "chore: add repository audit notes"
git commit -m "fix: align Hugo base URL and SEO image URLs"
git commit -m "fix: clean stale content links"
git commit -m "chore: audit Aether theme libraries"
git commit -m "fix: remove unused theme assets"
git commit -m "fix: align Vercel build configuration"
git commit -m "docs: document Hugo content maintenance workflow"
```

## 6. 回滚策略

1. 优先使用小 commit，出现问题时用 `git revert <commit>` 回滚单一模块。
2. 如果某个模块需要多次尝试，先在同一分支内追加修复 commit；合并前可再决定是否 squash。
3. 资源删除类 commit 必须保留审计输出或在 PR 描述中说明触发依据，便于日后恢复。
4. 配置域名类 commit 必须说明目标规范域名，避免下次审查又改回另一种写法。
5. 内容批量修改前保存问题清单；如果用户不认可某类规范化，可以只 revert 对应 commit。

## 7. Codex 后续任务模板

后续每次给 Codex 下发任务时，可复制以下模板：

```markdown
请只执行《docs/codex-audit-workflow.md》中的模块 X：<模块名>。

要求：
- 先检查并列出问题清单。
- 只修改本模块范围内的一类问题。
- 不顺手修改其它模块问题，只记录。
- 修改后运行 `hugo --gc --minify`。
- 如涉及页面可见变化，启动本地预览并抽查相关页面。
- 提交一个清晰 commit。
- PR 描述中写明检查命令、修复内容、未处理问题与回滚方式。
```
