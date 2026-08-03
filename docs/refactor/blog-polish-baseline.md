# 博客统一打磨基线

日期：2026-08-03

基准提交：`ecfd9313c2a5d8d9fd4d23fd628123d364b4b036`（`origin/main`）

阶段：A（审计与基线）

## 1. 范围与不变量

本阶段只记录当前事实，不改变视觉、内容、模板行为或发布流程。后续阶段必须继续保持以下不变量：

- Hugo 仍是静态站点生成器，Vercel 仍负责部署；
- `content/` 目录、既有页面 URL、Front Matter 约定保持不变；
- `.pages.yml`、Pages CMS 与 R2 图床写作流程保持不变；
- Light、Dark、Black 三主题保持可用；
- PJAX、搜索、标签筛选、评论、RSS、Markdown 输出保持可用；
- 足迹旅行相册、手机 Scroll Snap 与 PhotoSwipe 保持可用；
- 不引入大型前端框架或动画库。

## 2. 审计方法与证据

本基线同时检查源码、构建产物和线上运行态，避免只凭文件名推断行为。

- 源码：`origin/main` 的 Hugo 模板、SCSS、JavaScript、站点配置、CMS 配置和文档；
- 构建：本机执行 `hugo --gc --minify` 与 `python scripts/audit-theme-libs.py --check-simple-icons`；
- 运行态：在 `https://www.philohao.com/` 上检查核心页面，桌面视口为 `1920 × 945`，移动视口为 `390 × 844`；
- 主题：在长文章页实际切换 Light、Dark、Black 并读取计算样式；
- 统计：使用 `rg`、PowerShell 和 Git 读取行数、引用、监听器与跟踪文件。

本机工具链为 Hugo `0.120.4 extended`、Node `22.18.0`、npm `10.9.3`、Python `3.13.14`。Vercel 在 `vercel.json` 中固定 Hugo `0.123.7`，因此本地与线上基准目前存在版本差异。

## 3. 核心页面矩阵

| 页面 | 路径 | 主要模板 | 当前视觉/行为入口 |
| --- | --- | --- | --- |
| 首页 | `/` | `themes/aether/layouts/index.html`、`partials/home/profile.html` | `_page/_home.scss` |
| 文章归档 | `/posts/` | `_default/section.html` | `_page/_archive.scss` |
| 长文章 | `/2025/07/20250705/` | `posts/single.html` | `_page/_single.scss`、`_partial/_single/*` |
| 普通独立页 | `/pages/about/` | `pages/single.html` | `_page/_single.scss` |
| 标签入口 | `/tags/` | `taxonomy/terms.html` 的 tags 分支 | `_partial/_archive/_tags.scss` |
| 分类入口 | `/categories/` | `taxonomy/terms.html` 的 categories 分支 | `_partial/_archive/_terms.scss` |
| 系列入口 | `/series/` | `taxonomy/terms.html` 的 series 分支 | `_partial/_archive/_terms.scss` |
| taxonomy 列表 | `/tags/<term>/` 等 | `taxonomy/list.html` | `_page/_taxonomy.scss`、归档样式 |
| 足迹入口 | `/pages/footprint/` | `layouts/pages/footprint-index.html` | `_custom.scss` 的 footprint 区域 |
| 足迹旅行 | `/pages/footprint/2025/travel/` | `layouts/pages/footprint-year.html` | footprint + travel gallery 样式与 JS |
| 足迹书影游 | `/pages/footprint/2025/reading/` | `footprint-year.html`、`partials/mentalfood/year.html` | `_custom.scss` 的 mentalfood 区域 |
| 足迹海报墙 | `/pages/footprint/2025/poster/` | `layouts/pages/footprint-year.html` | footprint + 正文图片规则 |
| 404 | 任意不存在路径 | `themes/aether/layouts/404.html` | `_page/_404.scss` |

运行态结果：上述线上样本均正常返回并形成预期页面骨架；桌面样本和 390px 样本均未发现 `documentElement` 横向溢出。旅行样本页初始化 7 组相册，阅读和海报页未误初始化相册。首页、归档、标签、分类、系列、足迹入口、旅行、阅读与长文章在 390px 下均正确切换到移动头部。

## 4. 样式入口与组织现状

主样式入口为 `themes/aether/assets/css/style.scss`：

```text
style.scss
├── _variables.scss
├── _override.scss
├── _mixin/index.scss
├── _core/base.scss
│   └── mask / icon / details / fixed-button / cookieconsent
├── _core/layout.scss
├── _page/index.scss
│   └── single / special / archive / home / 404 / taxonomy
├── _partial/header.scss
├── _partial/footer.scss
├── _partial/pagination.scss
├── _core/media.scss
└── _custom.scss
```

`animate.scss` 不在上述主入口内，而是由 `layouts/partials/head/link.html` 单独编译为延迟加载的 `animate.min.css`。页面级动态 CSS、shortcode CSS 与第三方库 CSS 还会经 `layouts/partials/assets.html` 注入，因此主 SCSS 的源码顺序不是所有页面的完整级联顺序。

当前共有 42 个 SCSS 文件、约 5,084 行。几个主要集中点：

- `_variables.scss`：458 行，包含全局与组件级 SCSS 变量，以及三套代码高亮映射；
- `_custom.scss`：631 行，同时容纳旧 `.media`、书影游、足迹表格、旅行相册和主题覆盖；
- `_partial/_archive/_tags.scss`：499 行，标签页拥有独立的局部变量、Hero、统计卡、筛选和标签卡设计；
- `_partial/_header.scss`：541 行；
- `_partial/_single/_code.scss`：573 行；
- `_page/_single.scss`：418 行。

`_custom.scss` 当前可以按源码位置辨认出三代规则：

1. 约第 30–104 行：旧 `.media` float/百分比布局；
2. 约第 105–273 行：书影游 Flex/Grid 覆盖；
3. 约第 274–631 行：足迹年度、旅行相册及 Dark/Black 覆盖。

这说明文件并非单一职责，后续清理必须先证明后写规则已经完整替代旧规则，不能直接按“看起来重复”删除。

## 5. 主题与色彩来源

当前主题以 SCSS 三元变量为主，而不是语义 CSS Token。典型来源位于 `_variables.scss`：

| 设计角色 | 当前代表值 | 现状 |
| --- | --- | --- |
| 纸色 | `#f7f7f5` | 已用于 Light 全局背景 |
| 墨色 | `#161209` | 已用于 Light 正文与主要链接 |
| 旧金 | `#c9af72` | 主要用于 Header 激活态，尚未成为统一身份色 |
| 湖蓝 | `#2d96bd` | 用于全局 Hover、分页和标签局部系统 |
| 批注玫瑰 | `#ef3982` | 仍是文章链接 Hover 主色，角色尚未降级 |

线上计算样式证明三个主题确实不同：

| 主题 | Body 背景 | 正文颜色 |
| --- | --- | --- |
| Light | `rgb(247, 247, 245)` | `rgb(22, 18, 9)` |
| Dark | `rgb(41, 42, 45)` | `rgb(169, 169, 179)` |
| Black | `rgb(0, 0, 0)` | `rgb(217, 217, 217)` |

但 Dark 与 Black 的多个组件值仍然相同，例如表格、代码块、边框和部分 Hover；标签页又在 `_tags.scss` 内声明 `--tag-*` 局部变量，并把 Dark/Black 合并覆盖。这些都是阶段 B、G 需要收敛的双重来源。

主题状态还存在一个已复核的不一致：用户在主题下拉框中选择 Auto 且系统为浅色时，`theme.js` 把 `body[theme]` 写成 `white`，但初始化逻辑只把 `light` 识别为浅色，CSS 也没有 `white` 专属主题。这会导致下一次 PJAX 初始化把浅色页面的第三方组件状态误判为 Dark。阶段 B 可以统一主题值，阶段 H 需移除重复状态推断。

## 6. 圆角、阴影与硬编码

目前没有统一的圆角、阴影、间距和动效 Token。全局图片阴影在 `_core/_base.scss` 中定义，足迹相册复用该阴影；标签 Hero、统计卡、标签卡、书影游卡片和 Footer 则各自声明边框、圆角或阴影。

已确认的结构性问题：

- 存在多档无语义圆角，组件无法表达“小元素 / 普通卡片 / 重点容器 / 胶囊”的层级；
- 标签页维护 `--tag-accent`、`--tag-card-bg`、`--tag-shadow` 等局部设计系统；
- `_custom.scss` 在 Light、Dark、Black 下直接写组件颜色，扩大主题重复；
- 全局正文链接、图片、表格规则会影响运行时动态包裹的相册元素，PR #91 的虚线边框问题即是这一风险的实例；
- 媒体查询和主题块散落在文件尾部，后写覆盖关系比组件语义更重要。

只读复核还确认了几处可验证的历史负担：

- `_page/_taxonomy.scss` 的全局 blockquote 与 `_page/_single.scss` 内规则重复；
- `_partial/_archive/_tags.scss` 后半段重复声明 Black 颜色与 900/560px 媒体查询；
- `_partial/_header.scss` 的 `.search-footer` Dark/Black 块缺少 ancestor `&`，当前会编译成无法命中预期结构的后代选择器；
- `_partial/_pagination.scss` 使用 `&:before .active` / `&:after .active`，伪元素不可能拥有后代，属于疑似失效规则；
- Black 表格和 Gist 背景引用了对应的 Dark 变量；当前两套值相同，所以错误被视觉结果掩盖。

阶段 B 应先建立语义 Token 与兼容映射；阶段 C 再拆文件和删除被完全覆盖的规则。两步不得倒置。

## 7. 动效基线

`animate.scss` 只保留了本站实际引用的 `animate__animated`、`animate__faster`、`animate__pulse` 与 `animate__flipInX`，但页面语义仍不统一：

- 文章标题：`animate__flipInX`；
- 归档、taxonomy、普通页面、足迹入口和年度页标题：`animate__pulse animate__faster`；
- 首页标题没有同一套页面进入动作；
- 旅行相册单独支持 `prefers-reduced-motion`；
- 其余卡片 Hover、图片缩放、Header、Footer 和标题动画没有统一的持续时间、缓动与减少动态策略。

线上运行态实际观察到归档、标签、分类、系列与足迹标题的 pulse 类；文章模板源码明确使用 flip 类。这不是未使用代码，而是当前真实行为。

此外，精简后的 `animate.scss` 只提供 pulse 与 flipInX，但 `theme.js` 仍调用 `animate__flash`、`animate__fadeInDown`、`animate__fadeOutUp`、`animate__fadeIn` 和 `animate__fadeOut`。完整 Animate.css 已没有模板引用，因此代码复制反馈、滚动 Header 和固定按钮当前只是增删不存在的动画 class，实际效果与源码意图不一致。

## 8. JavaScript 与 PJAX 生命周期

`themes/aether/src/js/theme.js` 为 1,606 行单文件，包含搜索、菜单、主题、详情、图片查看、足迹相册、代码块、表格、TOC、数学、Mermaid、ECharts、Mapbox、TypeIt、评论、标签筛选和 PJAX 初始化。

静态统计：

- 23 个 `init*` 函数；
- 212 次 `window.*` 引用，涉及 47 个不同全局属性；
- 33 次 `addEventListener`，仅 5 次对应的 `removeEventListener`；
- 旅行相册已经拥有较完整的显式 `destroyFootprintGalleries()`，其观察器、滚动监听、点击监听与 PhotoSwipe 可销毁。

当前生命周期：

```text
首次加载 / pjax:success
        ↓
      init()
        ↓
重建 window.* EventSet
        ↓
依次初始化所有功能

pjax:send
        ↓
执行 pjaxSendEventSet + clickMaskEventSet
        ↓
PJAX 替换 title / main / menu-item / assets / fixed buttons / search dropdown
```

主要风险：

1. `init()` 每次 PJAX 成功都会重建全局 Set，但各功能没有统一的 `init → destroy` 接口；
2. `onScroll()` 每次初始化都会新增一个 `document` 的 `pjax:send` 监听器；
3. `onResize()` 使用匿名函数新增全局 resize 监听，没有成对销毁；
4. `onClickMask()` 每次初始化直接给固定 `#mask` 节点增加监听；
5. 标签筛选依赖被替换 DOM 自然回收，没有显式生命周期；
6. 评论、ECharts、Mapbox 等功能各自写入多个 `window._*` 状态；
7. `safeInit()` 能隔离单个功能异常，但不能证明重复监听或残留观察器不存在。

阶段 H 必须先由主代理确定唯一生命周期接口，再拆分标签与足迹模块，不能边拆边发明两套接口。

## 9. 页面配置恢复

`layouts/partials/assets.html` 把当前页配置输出为：

```html
<script>window.config={...};</script>
```

PJAX 后，`restorePjaxPageConfig()` 扫描 `.pjax-assets script`，截取 `window.config=` 后的字符串，先尝试 `JSON.parse()`，失败时使用：

```js
Function(`return (${json});`)()
```

当前 Hugo 输出由 `jsonify` 生成，已经具备纯 JSON 数据来源；动态执行回退没有继续存在的必要。阶段 I 应将配置改为 `type="application/json"` 的独立节点并只允许 `JSON.parse()`，同时验证搜索、评论、数学、代码、TypeIt 与足迹条件资源。

## 10. 模板基线

文章模板 `posts/single.html` 为 166 行，结构顺序已经是：标题、元信息、封面、TOC、正文、Footer、评论。但仍有以下历史负担：

- 通过内联 `<script>` 设置 `main[pageStyle]` 与 `main[autoTOC]`；
- 作者、字数、阅读时间和旧评论访问量保留为大块 HTML 注释；
- Footer partial 为 96 行，把更新时间/Git、Markdown、分享、taxonomy、返回/主页与上一篇/下一篇放在同一层级；
- `taxonomy/terms.html` 为 212 行，同时承载 categories、series、tags 三种差异较大的页面；
- 分享 partial 含多项未启用 provider 与内联交互代码。

阶段 F 先改造“继续漫游”的信息层级；阶段 J 再清理模板结构，避免视觉改造和历史删除混在同一提交。

## 11. 源码与构建产物策略

当前事实更接近“提交生成物”方案：

- 源码：`themes/aether/src/js/theme.js`、`src/js/sw.js`；
- 生成物：`assets/js/theme.min.js`、source map、`assets/sw.min.js`、source map，均被 Git 跟踪；
- `themes/aether/package.json` 只有 `npm run babel`，没有统一的 `build` 或校验命令；
- `package-lock.json` 已提交，但 Node 版本没有在仓库中固定；
- Vercel 只执行 `hugo --gc --minify`，不会运行 `npm ci` 或 Babel；
- 仓库没有 `.github` CI 工作流检查生成物是否与源码同步；
- `themes/aether/resources/_gen/` 中还跟踪了 Hugo 资源缓存；相关生成物合计 18 个跟踪文件。

因此当前发布依赖维护者记得先生成并提交前端产物。阶段 K 必须在两种策略中明确选择；在选择前，不应删除生成物或擅自改变 Vercel 命令。

## 12. 构建基线

本机 `hugo --gc --minify` 成功，摘要如下：

- Pages：263；
- Static files：88；
- Aliases：63；
- fatal error：0；
- warning：2 条，均为顶层 `author` 配置已弃用，建议迁移到 `params.author.*`。

已确认生成：主页、归档、标签、分类、系列、关于、足迹入口、旅行、阅读、海报墙、RSS 三个入口、JSON 搜索索引、sitemap 与 robots。主题静态库审计通过，当前不需要 Simple Icons。

本阶段不能把一次本地成功等同于 Vercel 已验证：本机 Hugo `0.120.4` 低于 Vercel 固定的 `0.123.7`。后续每阶段至少继续执行本地构建；涉及构建链路的阶段 K 需要使用与 Vercel一致的版本复验。

## 13. 文档与仓库现状

根 README 已能说明站点内容模型、Pages CMS、R2、足迹数据和 Vercel 部署，是当前有效维护入口。现有文档与报告仍平铺：

```text
docs/    7 个历史审计/工作流/任务文档
reports/ 6 个图片迁移过程与结果文件
```

其中当前架构说明、已完成 Codex 施工单、一次性审计与可再生成报告尚未分层。阶段 L 应先建立保留/归档判定表，再移动文件并检查链接；不得把“根目录变少”当作删除依据。

## 14. 风险登记与阶段归属

| 优先级 | 风险 | 权威证据 | 后续阶段 |
| --- | --- | --- | --- |
| 高 | PJAX 重复监听和全局状态难以证明可销毁 | `theme.js` 监听/清理统计与 `init()` 流程 | H、M |
| 高 | 页面配置仍允许动态执行字符串 | `restorePjaxPageConfig()` 的 `Function(...)` | I |
| 高 | JS 源码和提交生成物靠人工同步 | package、Vercel、Git 跟踪状态 | K |
| 中 | 色彩、圆角、阴影、动效缺少语义 Token | `_variables.scss`、`_custom.scss`、`_tags.scss` | B、G |
| 中 | `_custom.scss` 同时保存旧规则、模块和主题覆盖 | 文件结构与后写覆盖 | C |
| 中 | 页面标题与 Hover 动效语言不一致 | 模板 class 与线上运行态 | D |
| 中 | JS 调用未加载的动画类，部分反馈/滚动动效静默失效 | `animate.scss` 与 `theme.js` 调用集合 | D、H |
| 中 | Auto 浅色写成 `theme="white"`，PJAX 后会被误判为 Dark | 主题 select handler 与 `init()` | B、H |
| 中 | 标签页形成局部设计孤岛，分类/系列仍像旧模板 | taxonomy 模板与独立 499 行样式 | E |
| 中 | 文章尾部工具信息与继续阅读同层竞争 | `partials/single/footer.html` | F |
| 中 | 文章模板通过脚本改属性并保留历史注释 | `posts/single.html` | J |
| 低 | 本地 Hugo 与 Vercel 固定版本不同 | `hugo version`、`vercel.json` | K、M |
| 低 | 当前维护文档与历史报告未分层 | `docs/`、`reports/` 清单 | L |

## 15. 推荐实施顺序与依赖

保持任务文档定义的 A–M 顺序，并明确以下依赖：

```text
A 基线
  ↓
B Token ─→ C SCSS 清理 ─→ D 动效 ─→ E 索引页
  │                                  ↓
  └──────────────→ G 主题区分       F 文章漫游

H JS 生命周期 ─→ I PJAX 纯 JSON ─→ J 模板清理
                         ↓
                 K 构建策略 ─→ L 文档整理
                                      ↓
                                M 全量视觉回归
```

每个阶段保持独立分支、单一主题提交、构建验证与停止点审查。阶段 B 之前不做全站“顺手换色”；阶段 H 之前不做跨模块 JS 拆分；阶段 K 之前不删除生成物。

## 16. 阶段 A 停止点审查

1. 设计语言：本阶段未改视觉，只建立统一事实来源；通过。
2. 新局部系统：未新增组件变量或视觉规则；通过。
3. 维护成本：只新增一份集中基线，未增加运行时代码；通过。
4. 新抽象：无；通过。
5. 无价值视觉变化：无视觉变化；通过。
6. 内容优先：内容与数据未改；通过。
7. 写作发布流程：`.pages.yml`、R2、Vercel 配置未改；通过。
8. 移动端/Dark/Black：已完成线上基线抽查，不作为后续实现通过的替代证据；通过。
9. 可回滚：阶段 A 仅新增本文件；通过。
10. 是否停止扩大：是。下一提交只应包含本基线，不夹带 Token 或视觉修改。

## 17. 阶段 A 结论

当前网站功能完整、核心页面可构建、三主题和足迹相册可运行，具备渐进式重构基础。主要问题不是单个组件“难看”，而是设计角色、样式覆盖、动效语义、PJAX 生命周期和构建责任分别形成了多套局部规则。

下一阶段应只做阶段 B：由主代理先确定语义 Token、Light/Dark/Black 值和旧 SCSS 变量映射，再以视觉尽量接近当前状态为边界迁移常用值。
