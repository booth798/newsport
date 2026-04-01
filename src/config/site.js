import { APP_SETTINGS } from '@/config/app';

const DEFAULT_SITE_KEY = APP_SETTINGS.defaultSiteKey;
const assetModules = import.meta.glob('/src/assets/images/**/*.{svg,png,jpg,jpeg,webp,avif,gif}', {
  eager: true,
  import: 'default',
});

// Vite 会把 src/assets 中的图片编译成最终可访问地址，这里提前整理成“相对路径 -> 图片地址”映射，
// 后面站点配置只需要写目录约定，不用手动 import 每一张图。
const ASSET_URL_MAP = Object.fromEntries(
  Object.entries(assetModules).map(([filePath, assetUrl]) => [
    filePath.replace('/src/assets/images/', ''),
    assetUrl,
  ]),
);

// 根据 src/assets/images 下的相对路径取图片地址。
// 如果配置写错或文件不存在，这里会返回空字符串，方便上层继续决定是否兜底。
export const resolveAssetUrl = (relativePath = '') =>
  ASSET_URL_MAP[String(relativePath).replace(/^\/+/, '')] || '';

const COMMON_IMAGE_MAP = {
  logo: resolveAssetUrl('common/logo.svg'),
  poster: resolveAssetUrl('common/poster.svg'),
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

// 把站点配置里声明的模板图片文件名，统一转成 src/assets 对应的构建地址。
const buildTemplateImages = (templateKey, templateImages = {}) =>
  Object.fromEntries(
    Object.entries(templateImages).map(([name, fileName]) => [
      name,
      resolveAssetUrl(`templates/${templateKey}/${fileName}`),
    ]),
  );

// 站点层只负责站点信息和站点图片，不再承载皮肤配置。
// 这样后续新增站点时，只需要补充站点信息和当前站点自己的模板图即可。
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
