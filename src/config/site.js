import { APP_SETTINGS } from '@/config/app';

const DEFAULT_SITE_KEY = APP_SETTINGS.defaultSiteKey;
const withLeadingSlash = (value) => `/${String(value).replace(/^\/+/, '')}`;

// 把 public 目录下的相对路径转成可直接在页面里使用的资源地址。
export const resolvePublicAsset = (value = '') => {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedValue = String(value).replace(/^\/+/, '');

  return `${normalizedBase}${normalizedValue}`.replace(/\/{2,}/g, '/');
};

const COMMON_IMAGE_MAP = {
  logo: resolvePublicAsset('images/common/logo.svg'),
  poster: resolvePublicAsset('images/common/poster.svg'),
};

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
  arena: {
    key: 'arena',
    templateKey: 'arena',
    siteName: 'MySport Arena',
    apiBaseUrl: 'https://arena-api.example.com',
    brandColor: '#ff6b35',
    templateImages: {
      hero: 'hero.svg',
    },
  },
};

// 把站点配置里的模板图片文件名，统一补成完整 public 路径。
const buildTemplateImages = (templateKey, templateImages = {}) =>
  Object.fromEntries(
    Object.entries(templateImages).map(([name, fileName]) => [
      name,
      resolvePublicAsset(`images/templates/${templateKey}/${fileName}`),
    ]),
  );

// 站点层只负责站点信息和站点图片，不再承载皮肤配置。
export const getSiteConfig = (siteKey = DEFAULT_SITE_KEY) => {
  const preset = SITE_PRESETS[siteKey] || SITE_PRESETS.default;

  return {
    ...preset,
    images: {
      common: COMMON_IMAGE_MAP,
      template: buildTemplateImages(preset.templateKey, preset.templateImages),
    },
  };
};

// 当配置里没有显式声明某张图时，按约定目录拼出一个兜底地址。
export const getFallbackAsset = (segment, fileName) =>
  resolvePublicAsset(withLeadingSlash(`${segment}/${fileName}`));
