import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { getSiteConfig } from '@/config/site';
import { useAppStore } from '@/store/modules/app';

export function useAsset() {
  const appStore = useAppStore();
  const { siteKey } = storeToRefs(appStore);

  const currentSite = computed(() => getSiteConfig(siteKey.value));

  // 这里兼容两种调用方式：
  // 1. 直接传字符串，当成 customSiteKey
  // 2. 传对象，显式指定 scope / customSiteKey 等参数
  const normalizeOptions = (value = {}) =>
    typeof value === 'string' ? { customSiteKey: value } : value;

  // 统一拿到目标站点，避免每个方法都重复写同一段取值逻辑。
  const resolveAssetContext = (options = {}) => {
    const normalizedOptions = normalizeOptions(options);
    const targetSiteKey = normalizedOptions.customSiteKey || siteKey.value;
    const targetSite = getSiteConfig(targetSiteKey);

    return {
      normalizedOptions,
      targetSite,
    };
  };

  // 只读取 common 公共图。
  // 适合 logo、默认海报这类所有站点共用的资源。
  const getCommonImage = (name, options = {}) => {
    const { normalizedOptions, targetSite } = resolveAssetContext(options);

    return targetSite.images.common[name] || normalizedOptions.fallback || '';
  };

  // 只读取当前站点自己的模板图。
  // 默认会先根据模板目录自动按文件名建索引，
  // 所以目录里存在 `logo.png` 时，可以直接用 `getTemplateImage('logo')` 获取。
  // 只有图片名字和业务想用的 key 不一致时，才需要回到 site.js 里补别名配置。
  const getTemplateImage = (name, options = {}) => {
    const { normalizedOptions, targetSite } = resolveAssetContext(options);

    return targetSite.images.template[name] || normalizedOptions.fallback || '';
  };

  // getImage 是“自动判断”的统一入口：
  // 1. 如果显式指定 scope=common，就只拿公共图
  // 2. 如果显式指定 scope=template，就只拿模板图
  // 3. 默认 auto 模式时，先尝试公共图，再尝试模板图
  // 4. 两者都没有时，返回外部传入的 fallback，没传就返回空字符串
  const getImage = (name, options = {}) => {
    const { scope = 'auto', fallback = '' } = normalizeOptions(options);

    if (scope === 'common') {
      return getCommonImage(name, options);
    }

    if (scope === 'template') {
      return getTemplateImage(name, options);
    }

    const { targetSite } = resolveAssetContext(options);

    return targetSite.images.common[name] || targetSite.images.template[name] || fallback;
  };

  return {
    currentSite,
    getImage,
    getCommonImage,
    getTemplateImage,
  };
}
