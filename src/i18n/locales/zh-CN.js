export default {
  app: {
    subtitle: 'Vue 3 多站点生产基础模板',
    footer: '面向 PC 与移动端的统一工程基线',
  },
  page: {
    home: '首页',
  },
  common: {
    mobile: '移动端',
    desktop: 'PC 端',
    skin: '主题',
    language: '语言',
  },
  home: {
    badge: '可直接作为生产项目基础模板',
    title: '{siteName} 前端工程基线',
    description:
      '集成 Vue 3、Vite、vue-router、Pinia、vue-i18n、SCSS、rem 适配、多站点配置、主题换肤与图片资源管理，开箱即可继续业务开发。',
    metaTemplate: '当前模板',
    metaSkin: '当前主题',
    metaApi: 'API 地址',
    metaDevice: '当前设备',
    featuresTitle: '基础能力',
    features: {
      stackTitle: '最新技术栈',
      stackDesc: '基于 Vue 3.5、Vite 8、Router 5、Pinia 3 与 vue-i18n 11。',
      multiSiteTitle: '多站点配置',
      multiSiteDesc: '通过 JS 配置管理站点名称、接口地址与站点图片资源。',
      responsiveTitle: 'PC / 移动双端兼容',
      responsiveDesc: '使用 lib-flexible + postcss-pxtorem，配合断点布局同时兼顾大屏与小屏。',
      stylesTitle: '清晰样式体系',
      stylesDesc: '内置 normalize、reset、SCSS 工具集和全局设计变量，便于团队协作扩展。',
      themeTitle: 'SCSS 主题换肤',
      themeDesc: '通过给 html 添加 `.classic`、`.midnight` 这类主题类名来切换整套 CSS 变量。',
    },
    architectureTitle: '推荐目录结构',
    architectureDescription: '后续扩展接口模块、业务组件和模板页面时，可以在这个骨架上直接继续拆分。',
  },
};

