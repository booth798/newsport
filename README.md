# MySport Web

基于 `Vue 3 + Vite + JavaScript` 的多站点基础模板，当前已简化为更偏生产使用的版本，内置：

- `vue-router`
- `pinia`
- `vue-i18n`
- `SCSS`
- `normalize.css + reset`
- `postcss-pxtorem + autoprefixer`
- `@ -> src` alias
- 多站点站点名 / API / 模板图片 / 公共图片配置
- 基于 SCSS 主题类名的换肤能力

## 启动

```bash
npm install
npm run dev
```

按模板启动：

```bash
npm run dev:default
npm run dev:arena
```

构建：

```bash
npm run build
npm run preview
```

按模板打包：

```bash
npm run build:default
npm run build:arena
```

说明：

- `dev:xxx` 和 `build:xxx` 只是把当前模板的站点 key 传给项目
- 站点名称、API、图片等业务配置仍然统一写在 `src/config/site.js`
- `build:default` 会输出到 `dist/default`
- `build:arena` 会输出到 `dist/arena`

## 目录结构

```text
.
├── src
│   ├── assets
│   │   └── images
│   │       ├── common
│   │       └── templates
│   ├── components
│   ├── config
│   │   ├── app.js
│   │   └── site.js
│   ├── hooks
│   ├── i18n
│   ├── router
│   ├── store
│   ├── styles
│   │   └── themes
│   ├── utils
│   ├── views
│   ├── App.vue
│   └── main.js
├── jsconfig.json
├── postcss.config.cjs
└── vite.config.js
```

## 多站点配置

项目不依赖 `.env`。默认站点、默认主题、默认语言统一写在 `src/config/app.js`，站点配置统一写在 `src/config/site.js`。

示例站点：

- `default`
- `arena`

每个站点可配置：

- 站点编码
- 模板编码
- 站点名称
- API 地址
- 站点品牌色
- 模板图片映射

## 响应式规则

项目现在只保留两套端：

- `<= 750px`：移动端
- `> 750px`：Web 端

实现方式：

- 开发时样式直接写设计稿 `px`
- 构建时通过 `postcss-pxtorem` 自动转换成 `rem`
- 小屏设备会在 `375` 以下按屏宽缩小，避免内容过挤
- Web 端不做整站同比放大，而是固定根字号，通过断点切换布局、间距和栅格

样式里优先使用这两个 mixin：

- `@include mobile-only`
- `@include web-only`

对应文件：

- `src/styles/variables.scss`：响应式阈值和设计稿基准
- `src/styles/mixins.scss`：移动端 / Web 端样式 mixin

## 图片资源

公共图片目录：

```text
src/assets/images/common
```

模板图片目录：

```text
src/assets/images/templates/<templateKey>
```

默认约定：

- 公共图和模板图会自动按目录扫描
- 只要文件真实存在，就可以直接按“文件名”或“不带扩展名的名字”获取
- 例如 `src/assets/images/templates/default/logo.png` 可以直接通过 `getTemplateImage('logo')` 或 `getTemplateImage('logo.png')` 获取
- 只有当你想用自定义别名时，才需要在 `src/config/site.js` 里额外声明映射

在组件里使用：

```js
import { useAsset } from '@/hooks/useAsset';

const { getCommonImage, getTemplateImage, getImage } = useAsset();

const logo = getCommonImage('logo');
const hero = getTemplateImage('hero');
const templateLogo = getTemplateImage('logo');
const poster = getImage('poster');
```

`getImage` 默认优先级：

1. 公共图片
2. 当前站点模板图片
3. 调用时传入的 `fallback`

## 为什么改到 src/assets

当前这类图片更推荐放在 `src/assets`，原因是：

- 图片会参与 Vite 构建，产物会自动带 hash，缓存控制更友好
- 图片路径由代码直接引用，构建阶段就能尽早发现路径写错的问题
- 组件、hooks、站点配置都能统一通过模块方式管理，不用再手动拼接 public URL

只有下面这类资源更适合继续放 `public`：

- 必须保留固定访问路径的文件
- 不经过业务代码 import 的静态文件
- 像 `favicon.ico`、`robots.txt`、第三方校验文件这类资源

## 换肤方式

换肤不再通过 JS 里维护大段 token 对象，而是改成了纯 SCSS 主题表：

- [classic.scss](/Users/zenon/Desktop/learn/mysport-web/src/styles/themes/classic.scss)
- [midnight.scss](/Users/zenon/Desktop/learn/mysport-web/src/styles/themes/midnight.scss)

`useTheme` 会把当前主题名作为类名挂到 `html` 上，例如：

- `html.classic`
- `html.midnight`

这样页面里的 `var(--theme-*)` 会自动取到对应主题变量。

## 关键文件

- `src/config/app.js`：全局默认配置
- `src/config/site.js`：站点配置和图片资源映射
- `src/store/modules/app.js`：当前站点、当前主题、当前语言状态
- `src/hooks/useTheme.js`：把主题类名挂到 `html`
- `src/hooks/useAsset.js`：统一读取公共图和模板图
- `src/styles/themes/*.scss`：主题变量表
- `src/utils/request.js`：基础请求方法

## 请求封装

基础请求位于 `src/utils/request.js`，会根据当前站点自动拼接 API Base URL。这里已经移除了超时和额外兜底逻辑，保留最基础、最好理解的一层封装，方便你后续按项目需求继续扩展。
