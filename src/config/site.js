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

// 把文件路径统一提取成“文件名”和“不带扩展名的名字”。
// 这样目录里放了 `logo.png` 之后，既可以用 `logo` 获取，也可以用 `logo.png` 获取。
const getAssetNamePair = (relativePath = '') => {
  const fileName = String(relativePath).split('/').pop() || '';
  const baseName = fileName.replace(/\.[^.]+$/, '');

  return {
    fileName,
    baseName,
  };
};

// 按目录把图片整理成一份可直接读取的映射表。
// 例如 `templates/default/logo.png` 会生成：
// 1. `logo` -> 实际图片地址
// 2. `logo.png` -> 实际图片地址
// 这样调用方不需要再提前去 site.js 里为每张图单独声明一遍。
const buildDirectoryImageMap = (directory = '') => {
  const normalizedDirectory = String(directory).replace(/^\/+|\/+$/g, '');
  const directoryPrefix = `${normalizedDirectory}/`;

  return Object.entries(ASSET_URL_MAP).reduce((result, [relativePath, assetUrl]) => {
    if (!relativePath.startsWith(directoryPrefix)) {
      return result;
    }

    const { fileName, baseName } = getAssetNamePair(relativePath);

    if (baseName && !result[baseName]) {
      result[baseName] = assetUrl;
    }

    if (fileName && !result[fileName]) {
      result[fileName] = assetUrl;
    }

    return result;
  }, {});
};

// 只有当业务想用“别名”访问图片时，才需要在 site.js 里补充映射。
// 例如真实文件名是 `logo-main.png`，但希望通过 `getTemplateImage('logo')` 来拿时，
// 才需要在模板配置里显式写一条 `logo: 'logo-main.png'`。
const buildAliasImageMap = (directory = '', images = {}) => {
  const normalizedDirectory = String(directory).replace(/^\/+|\/+$/g, '');

  return Object.fromEntries(
    Object.entries(images)
      .map(([name, fileName]) => [name, resolveAssetUrl(`${normalizedDirectory}/${fileName}`)])
      .filter(([, assetUrl]) => assetUrl),
  );
};

const COMMON_IMAGE_MAP = buildDirectoryImageMap('common');

export const SITE_PRESETS = {
  default: {
    key: 'default',
    templateKey: 'default',
    siteName: 'MySport Base',
    apiBaseUrl: 'https://api.example.com',
    brandColor: '#0b6bcb',
  },
  arena: {
    key: 'arena',
    templateKey: 'arena',
    siteName: 'MySport Arena',
    apiBaseUrl: 'https://arena-api.example.com',
    brandColor: '#ff6b35',
  },
};

// 模板图片默认直接读取 `src/assets/images/templates/<templateKey>` 目录。
// 也就是说，只要目录里放了 `logo.png`，就能直接用 `getTemplateImage('logo')` 获取。
// 如果业务确实需要“自定义别名 -> 真实文件名”的映射，再通过 `templateImages` 补充即可。
const buildTemplateImages = (templateKey, templateImages = {}) =>
  ({
    ...buildDirectoryImageMap(`templates/${templateKey}`),
    ...buildAliasImageMap(`templates/${templateKey}`, templateImages),
  });

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
