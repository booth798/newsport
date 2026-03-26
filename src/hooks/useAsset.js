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

  const normalizeOptions = (value = {}) =>
    typeof value === 'string' ? { customSiteKey: value } : value;

  // 资源解析顺序：
  // 1. 当前站点的模板图
  // 2. 公共图
  // 3. public 目录里的兜底资源
  const resolveAssetContext = (options = {}) => {
    const normalizedOptions = normalizeOptions(options);
    const targetSiteKey = normalizedOptions.customSiteKey || siteKey.value;
    const targetSite = getSiteConfig(targetSiteKey);

    return {
      normalizedOptions,
      targetSite,
    };
  };

  const getCommonImage = (name, options = {}) => {
    const { targetSite } = resolveAssetContext(options);

    return targetSite.images.common[name] || getFallbackAsset('images/common', name);
  };

  const getTemplateImage = (name, options = {}) => {
    const { targetSite } = resolveAssetContext(options);

    return (
      targetSite.images.template[name] ||
      getFallbackAsset(`images/templates/${targetSite.templateKey}`, name)
    );
  };

  const getImage = (name, options = {}) => {
    const {
      scope = 'auto',
      fallbackToCommon = true,
    } = normalizeOptions(options);

    if (scope === 'common') {
      return getCommonImage(name, options);
    }

    if (scope === 'template') {
      return getTemplateImage(name, options);
    }

    const { targetSite } = resolveAssetContext(options);

    return (
      targetSite.images.template[name] ||
      (fallbackToCommon ? targetSite.images.common[name] : '') ||
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

