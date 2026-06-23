# cetendrive.com 产品发布链路分析报告

> 2026-06-21 | 分析范围：后台 Save → 前端渲染 全链路

---

## 一、数据流全景

```
┌─────────────────────────────────────────────────────────────────┐
│  后台 Admin                                                      │
│  admin-products.js:260  saveProduct()                            │
│  admin-products.js:275  buildFrontmatter()  →  YAML frontmatter  │
│  admin-products.js:309  saveToGithub()                           │
│       │                                                          │
│       │  GitHub API PUT                                          │
│       │  → src/content/products/<slug>.md                        │
│       │  → commit to main branch                                 │
│       ▼                                                          │
│  GitHub Actions (.github/workflows/deploy.yml)                   │
│  trigger: push to main                                           │
│       │                                                          │
│       │  npm ci → npm run build (Astro SSG)                      │
│       │  → upload-pages-artifact → deploy-pages                  │
│       ▼                                                          │
│  GitHub Pages CDN (cetendrive.com)                               │
│       │                                                          │
│       ▼                                                          │
│  前端 visitors → 纯静态 HTML (零数据库 / 零 API / 零 localStorage) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、回答 5 个核心问题

### Q1: 后台新增产品后，数据保存在哪里？

**→ GitHub 仓库中的 .md 文件**

```javascript
// admin-products.js:313
var path = 'src/content/products/' + slug + '.md';
```

`saveToGithub()` 通过 GitHub API 将产品写入仓库 `main` 分支。每个产品是独立的 `.md` 文件，YAML frontmatter 包含全部字段。

**不是** localStorage、products.json、products.js 或任何浏览器本地存储。

---

### Q2: 前端产品页面实际读取的是哪里？

**→ GitHub 仓库中的 .md 文件（构建时读取）**

```typescript
// content.config.ts:5
loader: glob({ pattern: '**/*.md', base: './src/content/products' })
```

Astro 构建时扫描 `src/content/products/*.md`，生成静态 HTML。访客看到的是构建产物，不依赖任何运行时数据源。

| 页面 | 数据源 | 过滤条件 |
|------|--------|---------|
| `/products/` 列表页 | `getCollection('products')` | `data.published === true` |
| `/product-category/<cat>/` 分类页 | 同上 | + `data.category === cat.name` |
| `/product/<slug>/` 详情页 | `getStaticPaths()` → 每个 `.md` 一个页面 | `published === true` |

**不是** localStorage、JSON API、JS 数组。

---

### Q3: Publish 按钮现在实际做了什么？

当前只有一个按钮 **💾 Save & Publish**：

```javascript
// admin-products.js:260
function saveProduct() {
  // 1. 验证 4 个必填字段 (title/slug/category/excerpt)
  // 2. buildFrontmatter() → 收集全部表单 + gallery JSON
  // 3. saveToGithub() → base64 → GitHub API PUT
  // 4. toast('Saved! Deploying...', 'success')
}
```

`published: true` 是硬编码（第 305 行），**没有"保存草稿"和"发布"的区分**。

---

### Q4: 如果当前只是 localStorage，请不要说已经发布成功。

✅ **确认不涉及 localStorage。**

- 后台 Overview 从 GitHub API 实时读取产品列表
- 前端从 Astro 构建产物（静态 HTML）读取
- 管理员电脑的 localStorage **与前端访客完全无关**

---

### Q5: 适合 GitHub Pages 的正确发布方案

当前架构**方向正确**：

```
Admin → GitHub API → .md 文件 → Actions 构建 → Pages 部署
```

需要修复的问题：

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | 产品列表卡片不显示真实图片，始终显示 ⚙️ emoji | `products/index.astro:115` `product-category/[category].astro:60` | 前端访客看不到产品图 |
| 2 | `ProductCard.astro` 引用未定义的 `imageAlt` 变量 | `ProductCard.astro:19` | 潜在构建警告 |
| 3 | GitHub Actions 部署有 1-2 分钟延迟 | `.github/workflows/deploy.yml` | 体验问题 |
| 4 | 没有"保存草稿"功能，保存即发布 | `admin-products.js:305` | 缺少草稿态 |

---

## 三、前后端字段对照

| Frontmatter 字段 | 后台来源 | 前端 Schema | 匹配 |
|:--|:--|:--|:--:|
| `title` | `#pTitle` | `z.string()` | ✅ |
| `category` | `#pCat` | `z.enum([8 categories])` | ✅ |
| `subcategory` | `#pSub` | `z.string().optional()` | ✅ |
| `excerpt` | `#pExcerpt` | `z.string()` | ✅ |
| `slug` | `#pSlug` | `z.string().optional()` | ✅ |
| `image` | gallery[0].url | `z.string().optional()` | ✅ |
| `imageAlt` | `#pImgAlt` | `z.string().optional()` | ✅ |
| `gallery` | JSON string | `z.string().optional()` | ✅ |
| `metaTitle` | `#pMetaTitle` | `z.string().optional()` | ✅ |
| `metaDescription` | `#pMetaDesc` | `z.string().optional()` | ✅ |
| `keywords` | `#pKeywords` | `z.string().optional()` | ✅ |
| `order` | `#pOrder` | `z.number().default(0)` | ✅ |
| `published` | 硬编码 `true` | `z.boolean().default(true)` | ✅ |
| `features` | 未保存 | `z.array(z.string()).default([])` | ⚠️ 永远为空 |
| `specs` | 未保存 | `z.array(...).default([])` | ⚠️ 永远为空 |

**结论：** 字段映射完整。但 `features` 和 `specs` 目前不通过 Basic Info 保存（它们在 Detail Page 编辑器中以 HTML 形式写入 body，不作为 frontmatter 保存）。

---

## 四、关键代码位置

| 文件 | 行号 | 功能 |
|:--|:--|:--|
| `public/admin/js/admin-products.js` | 260 | `saveProduct()` — 保存入口 |
| `public/admin/js/admin-products.js` | 275 | `buildFrontmatter()` — 构建 YAML |
| `public/admin/js/admin-products.js` | 309 | `saveToGithub()` — GitHub API 调用 |
| `src/content.config.ts` | 1-46 | 内容集合定义 |
| `src/pages/products/index.astro` | 6 | 读取全部产品 |
| `src/pages/product/[...slug].astro` | 8-14 | 生成详情页 |
| `src/pages/product-category/[category].astro` | 18 | 按分类筛选 |
| `.github/workflows/deploy.yml` | 1-50 | 自动部署流水线 |
