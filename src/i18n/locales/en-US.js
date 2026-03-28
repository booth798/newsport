export default {
  app: {
    subtitle: 'Vue 3 multi-site production starter',
    footer: 'One engineering baseline for desktop and mobile',
  },
  page: {
    home: 'Home',
  },
  common: {
    mobile: 'Mobile',
    desktop: 'Desktop',
    skin: 'Theme',
    language: 'Language',
  },
  home: {
    badge: 'Production-ready starter template',
    title: '{siteName} frontend baseline',
    description:
      'Includes Vue 3, Vite, vue-router, Pinia, vue-i18n, SCSS, rem adaptation, multi-site configuration, SCSS theme switching, and image asset management so feature work can start immediately.',
    metaTemplate: 'Template',
    metaSkin: 'Theme',
    metaApi: 'API Base URL',
    metaDevice: 'Device',
    featuresTitle: 'Core capabilities',
    features: {
      stackTitle: 'Latest stack',
      stackDesc: 'Built with Vue 3.5, Vite 8, Router 5, Pinia 3, and vue-i18n 11.',
      multiSiteTitle: 'Multi-site setup',
      multiSiteDesc: 'Manage site name, API base URL, and site image assets through JS config.',
      responsiveTitle: 'Desktop and mobile ready',
      responsiveDesc: 'Uses lib-flexible and postcss-pxtorem with responsive breakpoints for both wide and small screens.',
      stylesTitle: 'Clean styling system',
      stylesDesc: 'Ships with normalize, reset, SCSS helpers, and shared design tokens for team-friendly scaling.',
      themeTitle: 'SCSS theme switching',
      themeDesc: 'Switch the whole theme by applying `.classic`, `.midnight`, and similar theme classes to html.',
    },
    architectureTitle: 'Recommended folder layout',
    architectureDescription:
      'You can continue splitting API modules, business components, and template pages on top of this baseline.',
  },
};
