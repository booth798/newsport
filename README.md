# MySport Web

基于 `Vue 3 + Vite + JavaScript` 的多站点基础模板，当前已简化为更偏生产使用的版本，内置：

- `vue-router`
- `pinia`
- `vue-i18n`
- `SCSS`
- `normalize.css + reset`
- `postcss-pxtorem + autoprefixer + lib-flexible`
- `@ -> src` alias
- 多站点站点名 / API / 模板图片 / 公共图片配置
- 基于 SCSS 主题类名的换肤能力

## 启动

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 目录结构

```text
.
├── public
│   └── images
│       ├── common
│       └── templates
├── src
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

## 图片资源

公共图片目录：

```text
public/images/common
```

模板图片目录：

```text
public/images/templates/<templateKey>
```

在组件里使用：

```js
import { useAsset } from '@/hooks/useAsset';

const { getCommonImage, getTemplateImage, getImage } = useAsset();

const logo = getCommonImage('logo');
const hero = getTemplateImage('hero');
const poster = getImage('poster');
```

`getImage` 默认优先级：

1. 公共图片
2. 当前站点模板图片
3. 模板目录兜底路径

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
- `src/config/site.js`：站点配置和图片路径
- `src/store/modules/app.js`：当前站点、当前主题、当前语言状态
- `src/hooks/useTheme.js`：把主题类名挂到 `html`
- `src/hooks/useAsset.js`：统一读取公共图和模板图
- `src/styles/themes/*.scss`：主题变量表
- `src/utils/request.js`：基础请求方法

## 请求封装

基础请求位于 `src/utils/request.js`，会根据当前站点自动拼接 API Base URL。这里已经移除了超时和额外兜底逻辑，保留最基础、最好理解的一层封装，方便你后续按项目需求继续扩展。
