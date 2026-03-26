import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { getSkinConfig } from '@/config/skin';
import { useAppStore } from '@/store/modules/app';

const applyThemeTokens = (tokens = {}) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(`--${token}`, value);
  });
};

export function useTheme() {
  const appStore = useAppStore();
  const { siteKey, skinKey } = storeToRefs(appStore);

  const currentSkin = computed(() => getSkinConfig(skinKey.value));

  // 皮肤切换的核心流程：
  // 先根据当前皮肤拿到 token，再一次性写入 CSS 变量，
  // 页面中的颜色、阴影和背景就会同步更新。
  const applyTheme = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    applyThemeTokens(currentSkin.value.tokens);
    root.dataset.site = siteKey.value;
    root.dataset.skin = currentSkin.value.key;
    root.style.colorScheme = currentSkin.value.colorScheme || 'light';
  };

  watch([siteKey, currentSkin], applyTheme, { immediate: true });

  return {
    currentSkin,
    applyTheme,
  };
}
