import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import {
  getFallbackAsset,
  getSiteConfig,
  resolvePublicAsset,
} from '@/config/site';
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

  // 公共图片固定优先从 common 目录取，找不到再去 public 兜底。
  const getCommonImage = (name, options = {}) => {
    const { targetSite } = resolveAssetContext(options);

    return targetSite.images.common[name] || getFallbackAsset('images/common', name);
  };

  // 模板图片固定优先从当前站点模板目录取，找不到再走兜底路径。
  const getTemplateImage = (name, options = {}) => {
    const { targetSite } = resolveAssetContext(options);

    return (
      targetSite.images.template[name] ||
      getFallbackAsset(`images/templates/${targetSite.templateKey}`, name)
    );
  };

  // getImage 是“自动判断”的统一入口：
  // 1. 如果显式指定 scope=common，就只拿公共图
  // 2. 如果显式指定 scope=template，就只拿模板图
  // 3. 默认 auto 模式时，先尝试公共图，再尝试模板图
  // 4. 两者都没有时，最后拼接模板目录兜底地址
  const getImage = (name, options = {}) => {
    const {
      scope = 'auto',
      fallbackToTemplate = true,
    } = normalizeOptions(options);

    if (scope === 'common') {
      return getCommonImage(name, options);
    }

    if (scope === 'template') {
      return getTemplateImage(name, options);
    }

    const { targetSite } = resolveAssetContext(options);

    return (
      targetSite.images.common[name] ||
      (fallbackToTemplate ? targetSite.images.template[name] : '') ||
      resolvePublicAsset(`images/templates/${targetSite.templateKey}/${name}`)
    );
  };

  return {
    currentSite,
    getImage,
    getCommonImage,
    getTemplateImage,
    resolvePublicAsset,
  };
}
