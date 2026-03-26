# MySport Web

基于最新 `Vue 3 + Vite + JavaScript` 的多站点生产基础模板，已集成：

- `vue-router`
- `pinia`
- `vue-i18n` 中英文切换
- `SCSS`
- `normalize.css + reset`
- `postcss-pxtorem + autoprefixer + lib-flexible`
- `@ -> src` alias
- 多站点站点名 / API / 模板图片 / 公共图片配置
- 运行时换肤能力，支持主题色和 CSS 变量联动切换
- 获取公共图片或模板图片的 `useAsset` hook

## 版本基线

当前初始化时确认的 npm 最新版本：

- `vue`: `3.5.30`
- `vite`: `8.0.1`
- `vue-router`: `5.0.4`
- `pinia`: `3.0.4`
- `vue-i18n`: `11.3.0`

## 启动

```bash
npm install
npm run dev
```

构建生产包：

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
│   ├── config
│   │   ├── app.js
│   │   ├── skin.js
│   │   └── site.js
│   ├── components
│   ├── hooks
│   ├── i18n
│   ├── router
│   ├── store
│   ├── styles
│   ├── utils
│   ├── views
│   ├── App.vue
│   └── main.js
├── jsconfig.json
├── postcss.config.cjs
└── vite.config.js
```

## 多站点说明

项目不再依赖 `.env`。默认站点、默认皮肤、默认语言、请求超时、站点预览开关统一写在 `src/config/app.js`，站点配置写在 `src/config/site.js`，全局共享皮肤库写在 `src/config/skin.js`。

当前内置了两个示例站点：

- `default`
- `arena`

每个站点可独立配置：

- 站点编码
- 模板编码
- 站点名称
- API 地址
- 站点品牌色
- 模板图片映射

每套皮肤在 `src/config/skin.js` 中统一配置，可独立定义：

- 颜色方案，例如 `light / dark`
- 主题 token，例如主色、文字色、背景色、阴影

如果后续增加新模板，直接在 `src/config/site.js` 里继续追加站点对象即可，例如：

```js
export const SITE_PRESETS = {
  default: {
    key: 'default',
    templateKey: 'default',
    siteName: 'MySport Base',
    apiBaseUrl: 'https://api.example.com',
    brandColor: '#0b6bcb',
    templateImages: {
      hero: 'hero.svg',
    },
  },
};
```

## 图片资源管理

公共图片目录：

```text
public/images/common
```

模板图片目录：

```text
public/images/templates/<templateKey>
```

在组件中使用：

```js
import { useAsset } from '@/hooks/useAsset';
import { useTheme } from '@/hooks/useTheme';

const { getCommonImage, getTemplateImage, getImage } = useAsset();
const { currentSkin } = useTheme();

const logo = getCommonImage('logo');
const hero = getTemplateImage('hero');
const poster = getImage('poster', { scope: 'common' });

console.log(currentSkin.value.tokens);
```

资源解析顺序：

- 当前站点模板图
- 公共图
- `public` 目录兜底资源

## 移动端适配方案

当前采用：

- `lib-flexible`
- `postcss-pxtorem`
- `autoprefixer`

说明：

- 设计稿可按 `375` 宽基准处理
- `px` 会自动转换为 `rem`
- 断点布局仍然保留，兼容 PC 与移动端场景

## 国际化

语言包位置：

- `src/i18n/locales/zh-CN.js`
- `src/i18n/locales/en-US.js`

默认语言读取：

- `localStorage`
- `src/config/app.js`

## 换肤流程

关键文件：

- `src/config/site.js`：站点配置和站点图片
- `src/config/skin.js`：全局共享皮肤库
- `src/store/modules/app.js`：当前站点、当前皮肤状态
- `src/hooks/useTheme.js`：把皮肤 token 注入到 CSS 变量
- `src/hooks/useAsset.js`：按站点优先级解析图片资源

切换流程：

1. 切换站点或皮肤后，Pinia 中的 `siteKey / skinKey` 更新
2. `useTheme` 监听状态变化并把 token 写到 `document.documentElement`
3. 页面样式通过 `var(--theme-*)` 自动响应
4. `useAsset` 按当前站点读取模板图，再回退到公共图

## 请求封装

基础请求工具位于：

```text
src/utils/request.js
```

会根据当前站点自动拼接 `src/config/site.js` 中对应的 API Base URL，便于后续继续扩展鉴权、拦截器、错误处理和 token 管理。
