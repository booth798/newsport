// 这里放不随模板切换而变化的全局默认值。
export const APP_SETTINGS = {
  defaultSiteKey: 'default',
  defaultSkinKey: 'classic',
  defaultLocale: 'zh-CN',
};

// 主题类名会直接挂到 html 标签上，用来切换对应的 SCSS 变量表。
export const THEME_CLASSNAMES = ['classic', 'midnight'];
