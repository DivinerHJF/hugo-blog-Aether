# Codex 任务文档：重构 Footprint 足迹页为「年度表格 + 原图文流」

## 当前实现状态（2026-05-12）

本任务已经落地，本文前半部分保留为历史设计说明；后续维护请优先参考本节与 `README.md`、`docs/mentalfood-data.md`。

当前结构：

- 足迹入口：`content/pages/footprint/_index.md` → `/pages/footprint/`，页面标题为「行旅与回声」。
- 出游页面：`content/pages/footprint/<year>/travel.md` → `/pages/footprint/<year>/travel/`，Markdown 保留原逐月图文流；上方年度表格来自 `data/footprint.yaml`。
- 书影游页面：`content/pages/footprint/<year>/reading.md` → `/pages/footprint/<year>/reading/`，页面由 Markdown 引言 + `layouts/partials/mentalfood/year.html` 渲染的数据清单组成；数据源是 `data/books.yaml`、`data/movies.yaml`、`data/mental_links.yaml`。
- 海报墙页面：`content/pages/footprint/<year>/poster.md` → `/pages/footprint/<year>/poster/`。
- 年度页模板：`layouts/pages/footprint-year.html`；入口页模板：`layouts/pages/footprint-index.html`。
- 足迹分类和年份导航均依赖 `data/footprint.yaml` 中各分类已有的年份。新增年份时必须同步新增对应 Markdown 页面与 `data/footprint.yaml` 年份节点。
- 独立 `content/pages/mentalfood.md` 已移除；旧 `/pages/mentalfood/` 通过 `content/pages/footprint/2025/reading.md` 的 alias 兼容。


## 任务背景

历史上足迹页曾位于：

```text
content/pages/footprint.md
```

当前已拆分为：

```text
content/pages/footprint/_index.md
content/pages/footprint/<year>/<category>.md
```

现有内容以 Markdown 形式维护，结构大致为：

```text
## 2025 年
- 2025-06：[青甘·自驾大环线](...)
    ![](...)
    ![](...)

## 2024 年
- 2024-12：[长沙·浏阳烟花秀](...)
    ![](...)
```

这个形式有两个优点：

1. 图文流很有个人博客气质，适合沉浸式回忆。
2. 图片按年月展示，维护直观。

但随着年份和图片越来越多，单页会越来越长，未来可能影响观看体验、HTML 体积、DOM 数量和图片加载压力。

本任务目标不是删除原有图文流，而是在其上方新增一个「年度索引层」：顶部可以切换分类和年份；主体上半部分显示类似参考页面的年度表格；表格下方继续保留对应年份、对应分类的原始逐月文字和图片流。

---

## 总体目标

将现有 `/pages/footprint/` 页面升级为：

```text
顶部导航：出游 / 书影游 / 海报墙             2026 | 2025 | 2024 | 2023 | 2022

主体上半部分：
当前年份 + 当前分类的年度表格

主体下半部分：
当前年份 + 当前分类的原始逐月文字 + 图片流
```

例如：

点击 `2026 + 出游` 后：

```text
/pages/footprint/2026/travel/

顶部显示：
2026 出游年度表格

下方显示：
2026 年出游相关的原 Markdown 图文流
```

点击 `2025 + 出游` 后：

```text
/pages/footprint/2025/travel/

顶部显示：
2025 出游年度表格

下方显示：
2025 年出游相关的原 Markdown 图文流
```

---

## 核心设计原则

### 1. 不要替换原图文流

原本的图片展示方式要保留。

本次重构只是新增：

```text
顶部分类 / 年份导航
年度表格
```

原来的：

```text
逐月文字
图片流
相册链接
```

仍然要存在，只是拆分到对应年份页面中。

### 2. 不要把所有年份都塞进一个页面

不要实现为：

```text
一个 HTML 里包含所有年份所有图片，然后用 JS display:none 隐藏
```

这样会让 HTML 和 DOM 随年份膨胀。

推荐实现为：

```text
每个 年份 + 分类 一个静态页面
```

即：

```text
/pages/footprint/2026/travel/
/pages/footprint/2025/travel/
/pages/footprint/2024/travel/
```

顶部看起来像 Tab 切换，但实际是普通静态链接跳转。

### 3. 优先使用 Hugo 静态生成能力

不要引入 Vue、React、客户端路由、运行时 JSON 请求、Swiper、Masonry、Lightbox 等重型依赖。

推荐使用：

```text
Hugo template + data/footprint.yaml + Markdown 内容页 + CSS
```

### 4. 性能优先

必须避免引入额外前端框架。

图片继续使用主题现有 Markdown 图片渲染逻辑和 lazyload 机制。

避免一次性渲染非当前年份的图文流。

### 5. 保持网站原有气质

风格关键词：

```text
个人博客
年度卷宗
旅行手账
轻量时间轴
纸面表格
克制、清爽、不花哨
```

---

## 推荐文件结构

请 Codex 先检查当前仓库实际结构，再按 Hugo lookup order 选择最合适路径。

建议目标结构如下：

```text
content/
  pages/
    footprint/
      _index.md
      2026/
        travel.md
        reading.md
        poster.md
      2025/
        travel.md
      2024/
        travel.md
      2023/
        travel.md

data/
  footprint.yaml

layouts/
  _default/
    footprint-year.html

assets/
  css/
    _custom/
      _footprint.scss
```

如果当前主题不使用上述 SCSS 路径，请沿用主题现有自定义 CSS / SCSS 约定，不要硬套。

---

## 内容拆分要求

### 当前页面内容

当前：

```text
content/pages/footprint.md
```

包含多个年份和图片。

需要拆分为：

```text
content/pages/footprint/2025/travel.md
content/pages/footprint/2024/travel.md
content/pages/footprint/2023/travel.md
```

原则：

1. 每个年份单独一个 Markdown 页面。
2. 每个页面只放该年份的图文流。
3. 原 Markdown 图片、链接、标题层级尽量保持不变。
4. 不要压缩、替换、删除原图片链接。
5. 不要将所有图片迁移到 YAML 数据文件。

---

## 年度表格数据结构

新增：

```text
data/footprint.yaml
```

表格数据只负责年度概览，不负责完整图片流。

建议结构：

```yaml
travel:
  "2026":
    title: "2026 出游"
    rows:
      - month: "Jan."
        events:
          - city: "南京"
            activity: "《世说新语：阒若惊鸿》"
          - city: "上海"
            activity: "《JOJ 与他的朋友们》、浦东美术馆《图案的奇迹》"
          - city: "杭州"
            activity: "杭州西湖博物馆《对话：虎贝》、《道林格雷的画像》"
          - city: "上海"
            activity: "固定队聚会"
      - month: "Feb."
        events: []
      - month: "Mar."
        events:
          - city: "南京"
            activity: "《昆剧经典折子戏》x2"
      - month: "Apr."
        events: []
      - month: "May."
        events: []
      - month: "Jun."
        events: []
      - month: "Jul."
        events: []
      - month: "Aug."
        events: []
      - month: "Sep."
        events: []
      - month: "Oct."
        events: []
      - month: "Nov."
        events: []
      - month: "Dec."
        events: []

  "2025":
    title: "2025 出游"
    rows:
      - month: "Jan."
        events:
          - city: "香港"
            activity: "钓鱼翁徒步"
      - month: "Feb."
        events:
          - city: "厦门"
            activity: "小队两日游"
      - month: "Mar."
        events:
          - city: "云南"
            activity: "昆明大理游"

reading:
  "2026":
    title: "2026 书影游"
    rows:
      - month: "Jan."
        events: []

poster:
  "2026":
    title: "2026 海报墙"
    rows:
      - month: "Jan."
        events: []
```

说明：

1. `travel` 对应「出游」。
2. `reading` 对应「书影游」。
3. `poster` 对应「海报墙」。
4. 先重点完成 `travel`。
5. `reading` 和 `poster` 可以先建立空数据或占位页面，避免导航死链。

---

## Markdown 页面 front matter 建议

每个年份页面使用同一个布局。

示例：

```toml
+++
title = "2025 出游"
description = "2025 年出游记录、相册和照片流。"
date = "2025-01-01"
layout = "footprint-year"
year = 2025
category = "travel"
comment = false
toc = false
+++
```

下方继续放该年份原有图文流：

```markdown
## 2025 年

- 2025-06：[青甘·自驾大环线](https://photos.app.goo.gl/xxx)

    ![](https://photos.philohao.com/picimpact/xxx.jpg)
    ![](https://photos.philohao.com/picimpact/xxx.jpg)
```

---

## 模板实现要求

新增或覆盖模板：

```text
layouts/_default/footprint-year.html
```

如果当前 Hugo 主题 lookup order 需要放在其他路径，请 Codex 自行判断。

模板应该做三件事：

1. 渲染顶部分类导航。
2. 渲染顶部年份导航。
3. 渲染当前年份 + 当前分类的年度表格。
4. 在表格下方输出当前 Markdown 页面的 `.Content`。

模板伪代码：

```go-html-template
{{ define "content" }}
{{ $year := printf "%v" .Params.year }}
{{ $category := .Params.category | default "travel" }}
{{ $categoryData := index site.Data.footprint $category }}
{{ $data := index $categoryData $year }}

<div class="footprint-page">
  <div class="footprint-topbar">
    <nav class="footprint-categories" aria-label="足迹分类">
      <a class="{{ if eq $category "travel" }}active{{ end }}" href="/pages/footprint/{{ $year }}/travel/">出游</a>
      <a class="{{ if eq $category "reading" }}active{{ end }}" href="/pages/footprint/{{ $year }}/reading/">书影游</a>
      <a class="{{ if eq $category "poster" }}active{{ end }}" href="/pages/footprint/{{ $year }}/poster/">海报墙</a>
    </nav>

    <nav class="footprint-years" aria-label="足迹年份">
      <!-- 根据 data/footprint.yaml 或配置自动生成年份 -->
      <!-- 当前年份添加 active class -->
    </nav>
  </div>

  <section class="footprint-year-card" aria-label="年度概览">
    <table class="footprint-year-table">
      <thead>
        <tr>
          <th>月份</th>
          <th>城市</th>
          <th>活动</th>
        </tr>
      </thead>
      <tbody>
        <!-- 按月份 rows 渲染 -->
        <!-- 有多条 events 时，月份使用 rowspan -->
        <!-- 没有 events 时，输出空白行 -->
      </tbody>
    </table>
  </section>

  <section class="footprint-detail-flow" aria-label="逐月记录">
    <h2 class="footprint-flow-title">逐月记录</h2>
    {{ .Content }}
  </section>
</div>
{{ end }}
```

---

## 年份导航生成规则

推荐优先从 `data/footprint.yaml` 中读取当前分类下有哪些年份，再生成年份导航。

例如当前 category 是 `travel`，则读取：

```text
site.Data.footprint.travel
```

将年份倒序排列：

```text
2026 | 2025 | 2024 | 2023 | 2022
```

当前年份加 `.active`。

如果某个年份不存在当前分类页面，Codex 应该避免生成死链，或先创建占位页面。

---

## 表格样式要求

参考用户提供页面的视觉：

```text
顶部是分类与年份
主体是黑色细边框表格
月份 / 城市 / 活动 三列
月份列较窄
城市列较窄
活动列自适应
整体有一种年度记录表、纸面清单感
```

但不要完全照搬过重背景。

建议保持当前网站干净气质。

CSS 方向：

```css
.footprint-page {
  max-width: 980px;
  margin: 0 auto;
}

.footprint-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin: 1.5rem 0 1rem;
}

.footprint-categories,
.footprint-years {
  display: flex;
  align-items: center;
  gap: .75rem;
  white-space: nowrap;
}

.footprint-categories a,
.footprint-years a {
  text-decoration: none;
  border-bottom: 2px solid transparent;
}

.footprint-categories a.active,
.footprint-years a.active {
  border-bottom-color: currentColor;
}

.footprint-year-card {
  margin: 1rem 0 2rem;
  overflow-x: auto;
}

.footprint-year-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  border: 2px solid currentColor;
  background: rgba(255, 255, 255, .2);
}

.footprint-year-table th,
.footprint-year-table td {
  border: 1px solid currentColor;
  padding: .55rem .8rem;
  vertical-align: top;
}

.footprint-year-table th {
  font-weight: 700;
}

.footprint-year-table td:first-child {
  width: 5.5rem;
  text-align: center;
}

.footprint-year-table td:nth-child(2) {
  width: 6rem;
  text-align: center;
}

.footprint-flow-title {
  margin-top: 2rem;
}
```

移动端要求：

```css
@media (max-width: 720px) {
  .footprint-topbar {
    display: block;
  }

  .footprint-categories,
  .footprint-years {
    overflow-x: auto;
    padding-bottom: .5rem;
  }
}
```

---

## 首页 `/pages/footprint/` 行为

保留原入口：

```text
/pages/footprint/
```

推荐行为：

1. 默认显示最新年份 + 出游。
2. 可以通过 Hugo 模板重定向式链接，或 `_index.md` 页面中提示并链接到最新年份。
3. 更好的体验是让 `/pages/footprint/` 直接渲染最新年份的 `travel` 页面内容。

可接受简化方案：

```text
/pages/footprint/ 页面显示简短介绍 + 链接到 /pages/footprint/2026/travel/
```

但优先建议直接默认展示最新年份。

---

## 导航兼容要求

当前站点主导航中已有：

```text
足迹 -> /pages/footprint/
```

不要破坏该入口。

如果将 `content/pages/footprint.md` 改为 leaf bundle 或 section，需要确认最终 URL 仍然可访问：

```text
/pages/footprint/
```

---

## SEO / RSS / 搜索要求

1. 不要让拆分页面造成重复标题严重混乱。
2. 每个年份页面应有清晰标题，如 `2025 出游`。
3. 如果不希望年份子页面进入首页文章列表，可使用现有主题支持的隐藏参数，或检查当前主题约定。
4. 不要破坏现有 RSS 输出。
5. 不要破坏站内搜索 JSON 构建。

---

## 性能要求

必须满足：

1. 当前页面只包含当前年份、当前分类的图文流。
2. 不把所有年份图片同时输出到一个 HTML 中。
3. 不新增前端框架。
4. 不新增大型第三方图库、灯箱、瀑布流、地图依赖。
5. 图片仍由主题 Markdown 图片渲染逻辑处理。
6. 如果可能，给新增表格区域避免布局跳动。
7. 移动端表格允许横向滚动，不强行挤压导致文字断裂。

---

## 可选增强，不作为第一阶段必须完成

以下可以后续再做，不要在第一版强行加入：

1. 年度统计：城市数、出游次数、徒步次数。
2. 活动标签：#徒步 #海岛 #朋友 #展览。
3. 封面缩略图列。
4. 月份锚点。
5. 返回顶部按钮。
6. 纸张纹理背景。
7. 轻微 hover 动效。
8. 旧年份默认折叠。

---

## 第一阶段范围

第一阶段只要求完成：

```text
出游 travel
```

覆盖年份：

```text
2025
2024
2023
```

如果当前内容已有 2026，可一起加入；如果没有 2026 内容，可创建 2026 占位页面和数据。

`书影游` 现在已接入 `data/books.yaml`、`data/movies.yaml`、`data/mental_links.yaml`，不再只是占位；`海报墙` 可继续按当前内容进度维护。

---

## 验收标准

Codex 完成后，应满足以下标准：

### 页面结构

- [ ] `/pages/footprint/` 仍可访问。
- [ ] `/pages/footprint/2025/travel/` 可访问。
- [ ] `/pages/footprint/2024/travel/` 可访问。
- [ ] 页面顶部有分类导航：`出游 / 书影游 / 海报墙`。
- [ ] 页面顶部有年份导航：如 `2026 | 2025 | 2024 | 2023 | 2022`。
- [ ] 当前分类和当前年份有明显 active 下划线。

### 年度表格

- [ ] 当前页面上半部分显示年度表格。
- [ ] 表格列为：`月份 / 城市 / 活动`。
- [ ] 同一个月多条记录时，月份单元格合并或视觉上不重复过多。
- [ ] 空月份保留空白行。
- [ ] 表格移动端可横向滚动。

### 原图文流

- [ ] 表格下方保留原逐月文字和图片流。
- [ ] 原相册链接保留。
- [ ] 原图片链接保留。
- [ ] 原 Markdown 内容不要被改写成难维护的大段 HTML。

### 性能

- [ ] 当前年份页面不包含其他年份的完整图文流。
- [ ] 没有新增 Vue/React/Swiper/Masonry/Lightbox 等前端依赖。
- [ ] Hugo build 成功。
- [ ] 页面没有明显控制台错误。

### 构建

- [ ] 运行 `hugo` 成功。
- [ ] 如仓库有 lint/test/audit 脚本，按现有文档运行。
- [ ] 提交信息清楚说明本次改动。

---

## 后续维护步骤

### 新增出游年份

1. 新建 `content/pages/footprint/<year>/travel.md`。
2. 在 front matter 中设置 `layout = "footprint-year"`、`year = <year>`、`category = "travel"`。
3. 在 `data/footprint.yaml` 的 `travel:` 下新增同一年份的 `title` 与月份 `rows`。
4. 将逐月文字、图片和相册链接写在该年度 Markdown 页面正文中。
5. 运行 `hugo --gc --minify`，抽查 `/pages/footprint/<year>/travel/`。

### 新增书影游年份

1. 新建 `content/pages/footprint/<year>/reading.md`。
2. 在 front matter 中设置 `layout = "footprint-year"`、`year = <year>`、`category = "reading"`。
3. 在 `data/footprint.yaml` 的 `reading:` 下新增同一年份，使年份导航可以发现它。
4. 在 `data/books.yaml`、`data/movies.yaml`、`data/mental_links.yaml` 中新增对应两位年份前缀的条目，例如 2026 年用 `26-01`。
5. 运行 `hugo --gc --minify`，抽查 `/pages/footprint/<year>/reading/`。

### 新增海报墙年份

1. 新建 `content/pages/footprint/<year>/poster.md`。
2. 在 front matter 中设置 `layout = "footprint-year"`、`year = <year>`、`category = "poster"`。
3. 在 `data/footprint.yaml` 的 `poster:` 下新增同一年份。
4. 按当前内容方式维护页面正文。

---

## 历史任务 Prompt（仅供追溯）

```text
请重构我的 Hugo 博客足迹页，实现“年度表格 + 原图文流”的新结构。

背景：
当前足迹页已拆分到 content/pages/footprint/<year>/<category>.md；历史上原始足迹页曾在 content/pages/footprint.md 中，以 Markdown 形式按年份展示旅行记录和图片。现有图文流的展示效果我希望保留，但希望在每个年份的图文流上方新增一个类似年度索引的表格，并在顶部增加“出游 / 书影游 / 海报墙”和年份切换导航。

目标效果：
访问 /pages/footprint/2025/travel/ 时，页面顶部显示分类导航和年份导航；主体上方显示 2025 出游年度表格，表格列为“月份 / 城市 / 活动”；表格下方继续显示原本 2025 年的逐月文字 + 图片流。

历史任务曾优先实现 travel（出游）分类；当前书影游已迁移到足迹 reading 分类，维护方式见上文。

重要要求：
1. 不要删除原有图文流。
2. 不要把所有年份的图片和内容塞进一个 HTML 中再用 JS 隐藏。
3. 推荐每个“年份 + 分类”使用独立静态页面，例如 /pages/footprint/2025/travel/。
4. 年度表格数据请放到 data/footprint.yaml 中。
5. 原图文流继续放在对应年份的 Markdown 页面中，不要全部搬进 YAML。
6. 不要引入 Vue、React、Swiper、Masonry、Lightbox 等重型依赖。
7. 保持 Hugo 静态生成和主题现有图片 lazyload 机制。
8. 表格移动端可以横向滚动。
9. /pages/footprint/ 入口必须继续可访问，建议默认展示最新年份的出游页面或提供明显入口。
10. 尽量保持网站原本清爽、个人博客、旅行手账式的气质。

建议文件结构：
- data/footprint.yaml
- content/pages/footprint/_index.md
- content/pages/footprint/2025/travel.md
- content/pages/footprint/2024/travel.md
- content/pages/footprint/2023/travel.md
- layouts/_default/footprint-year.html
- 合适的自定义 CSS/SCSS 文件，具体路径请根据当前主题结构判断。

请先检查仓库结构和 Hugo 主题模板 lookup order，再选择最合适的文件路径实现。

验收标准：
- /pages/footprint/ 仍可访问。
- /pages/footprint/2025/travel/、/pages/footprint/2024/travel/、/pages/footprint/2023/travel/ 可访问。
- 页面顶部有“出游 / 书影游 / 海报墙”和年份导航。
- 当前分类和年份有 active 下划线。
- 年度表格正确展示“月份 / 城市 / 活动”。
- 表格下方保留原 Markdown 图文流、图片链接和相册链接。
- 当前页面不包含其他年份的完整图文流。
- 不新增重型前端依赖。
- hugo 构建成功。

完成后请提供：
1. 修改文件列表。
2. 关键实现说明。
3. 构建/测试结果。
4. 如有未完成项或建议后续优化，请列出。
```

---

## 后续优化方向

第一版稳定后，可以继续做：

1. 把 2026 作为默认最新年份。
2. 为 `reading` 和 `poster` 补充真实数据。
3. 给年度表格增加轻量标签。
4. 为每年添加小结，如“本年走过城市数”。
5. 对图片流做“每条旅行 1 张封面 + 原图保留”的轻量改造。
6. 增加视觉细节：纸张底色、细微阴影、年份切换 hover。

