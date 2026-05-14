# MySport Web

基于 `Vue 3 + Vite + JavaScript` 的前端项目，保留项目运行所需的基础能力：

- `vue-router`
- `pinia`
- `vue-i18n`
- `SCSS`
- `normalize.css + reset`
- `postcss-pxtorem + autoprefixer`
- `@ -> src` alias

## 启动

```bash
npm install
npm run dev
```

构建与预览：

```bash
npm run build
npm run preview
```

## 目录结构

```text
.
├── src
│   ├── assets
│   │   └── images
│   │       └── common
│   ├── components
│   ├── config
│   │   └── site.js
│   ├── i18n
│   ├── router
│   ├── store
│   ├── styles
│   │   └── tokens.scss
│   ├── utils
│   ├── views
│   ├── App.vue
│   └── main.js
├── docs
├── jsconfig.json
├── postcss.config.cjs
└── vite.config.js
```

## 基础配置

项目只保留一份站点配置，位于 `src/config/site.js`：

- `siteName`：页面标题使用的站点名称
- `apiBaseUrl`：请求封装默认拼接的 API 地址
- `brandColor`：站点品牌色

语言默认值位于 `src/store/modules/app.js`。

## 响应式规则

项目只区分两套端：

- `<= 750px`：移动端
- `> 750px`：Web 端

实现方式：

- 开发时样式直接写设计稿 `px`
- 构建时通过 `postcss-pxtorem` 自动转换成 `rem`
- 小屏设备会在 `375` 以下按屏宽缩小
- Web 端固定根字号，通过断点切换布局、间距和栅格

样式里优先使用这两个 mixin：

- `@include mobile-only`
- `@include web-only`

对应文件：

- `src/styles/variables.scss`：响应式阈值和设计稿基准
- `src/styles/mixins.scss`：移动端 / Web 端样式 mixin

## 资源与样式

图片统一放在 `src/assets/images/common`，组件按需直接 import。

基础设计变量位于 `src/styles/tokens.scss`，全局样式入口位于 `src/styles/global.scss`。

## 关键文件

- `src/config/site.js`：站点基础配置
- `src/store/modules/app.js`：语言和视口状态
- `src/styles/tokens.scss`：基础设计变量
- `src/utils/request.js`：基础请求方法

## 请求封装

基础请求位于 `src/utils/request.js`，会使用 `src/config/site.js` 中的 `apiBaseUrl` 拼接业务请求地址。如果传入完整 URL，则直接使用该 URL。
