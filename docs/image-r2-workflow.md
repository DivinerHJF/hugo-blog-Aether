# 图片上传与引用规范（Cloudflare R2）

本站已将足迹页图片迁移到 Cloudflare R2，对外统一图片域名为 `https://img.philohao.com/`。以后新增图片、迁移旧图片时，请遵循本文档规范。

## 1. 总原则

- 所有新图片统一上传到 Cloudflare R2。
- 网站源码中统一使用 `https://img.philohao.com/...` 作为图片地址。
- 不要在 Markdown 中引用临时代理地址、Next.js image 优化地址、Google Photos 分享页、Vercel Blob 原始地址。
- 不要再使用 `image.philohao.com`、`photos.philohao.com`、`album.philohao.com/_next/image`、Vercel Blob 原始链接等旧图床地址。
- Markdown 中应直接引用 `img.philohao.com` 下的稳定直链。
- 图片文件名尽量保持英文、数字、短横线、下划线，不使用空格和中文。

## 2. 推荐目录结构

```text
img.philohao.com/
├── me/
├── blog/
│   ├── 2021/
│   ├── 2022/
│   └── 2023/
├── travel/
│   ├── 2024/
│   └── 2025/
├── books/
└── movies/
```

## 3. 足迹页图片规范

足迹页图片按年份和月份归档，推荐路径格式：

```text
travel/YYYY/MM/filename.jpg
```

示例：

```text
https://img.philohao.com/travel/2024/12/photo-v2FlRhyleTmTLwCb.jpg
https://img.philohao.com/travel/2025/06/20250828160946546.jpg
```

对应页面位置：

```text
content/pages/footprint/YYYY/travel.md
```

## 4. 博客正文图片规范

博客正文图片按文章年份归档，推荐路径格式：

```text
blog/YYYY/filename.jpg
```

如果是月记或单篇文章图片，优先按文章年份归档。

示例：

```text
https://img.philohao.com/blog/2023/202306242141200.jpg
```

## 5. 书影音封面规范

后续如果要缓存第三方封面，放在以下目录：

```text
books/
movies/
```

当前如暂未迁移，可保留现状，但新增缓存图应使用 `img.philohao.com`。

## 6. 新增图片流程

1. 先压缩图片。
2. 上传到 R2 对应目录。
3. 复制 `img.philohao.com` 直链。
4. 写入 Markdown。
5. 本地运行 `hugo --gc --minify` 检查。
6. 确认页面图片可正常加载后再提交。

## 7. 迁移旧图片流程

1. 先统计旧 URL。
2. 下载原图。
3. 上传到 R2 对应目录。
4. 保持文件名不变，除非确有必要。
5. 批量替换 Markdown 中旧 URL。
6. 检查没有遗留 `image.philohao.com`、`photos.philohao.com`、`album.philohao.com/_next/image`、`public.blob.vercel-storage.com` 等旧链接。
7. 构建并预览。

## 8. Codex 执行要求

- Codex 以后处理图片时，必须先阅读 `docs/image-r2-workflow.md`。
- 不要直接提交二进制图片到 Git 仓库。
- 不要把 R2 本地同步目录提交到 Git。
- 只修改 Markdown、配置和文档。
- 如果任务涉及图片文件本体，Codex 只生成清单和替换方案，由站点维护者上传到 R2。
