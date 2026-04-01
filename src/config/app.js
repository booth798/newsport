// 这里放不随模板切换而变化的全局默认值。
export const APP_SETTINGS = {
  defaultSiteKey: 'default',
  defaultSkinKey: 'classic',
  defaultLocale: 'zh-CN',
};

// 这里的运行时站点标识只负责“选择使用哪一份 JS 站点配置”。
// 也就是说，真正的站点名称、API 地址、图片映射依然维护在 site.js 里，
// package.json 里的 dev/build:xxx 脚本只是把当前要使用的站点 key 传进来。
export const RUNTIME_SITE_KEY = import.meta.env.VITE_SITE_KEY || '';

// 主题类名会直接挂到 html 标签上，用来切换对应的 SCSS 变量表。
export const THEME_CLASSNAMES = ['classic', 'midnight'];
