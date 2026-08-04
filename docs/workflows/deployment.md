# 构建与部署

## 固定工具链

- Node：根目录 `.nvmrc` 为 `22.18.0`；Vercel 使用 Node `22.x`。
- npm：主题 `package.json` 声明 `npm@10.9.3`，依赖由 `themes/aether/package-lock.json` 锁定。
- Hugo：根目录 `.hugo-version` 和 `vercel.json` 均为 `0.123.7`。
- PhotoSwipe：`themes/aether/assets/lib/VERSION` 为 `5.4.4`，主题构建会校验版本。

## 本地构建

```bash
npm ci --prefix themes/aether --include=dev --ignore-scripts --no-audit --no-fund
npm run build --prefix themes/aether
node scripts/check-hugo-version.js
hugo --gc --minify
```

主题编译会生成被忽略的 JS 和 source map；它们不是源码，不要手动加入 Git。只启动本地预览时，也要先运行主题 `build`。

## Vercel

根目录 `vercel.json` 的构建命令与本地顺序一致：

```text
npm --prefix themes/aether ci --include=dev --ignore-scripts --no-audit --no-fund && npm --prefix themes/aether run build && node scripts/check-hugo-version.js && hugo --gc --minify
```

Vercel 项目应使用 Hugo Framework Preset、`public` 输出目录和 Node `22.x`，不要在后台保留与仓库配置冲突的 Build Command 或 Node 版本 Override。Hugo 版本由 `HUGO_VERSION=0.123.7` 固定。

构建失败时优先查看 Vercel Build Logs；不要通过提交生成物来绕过主题编译失败。
