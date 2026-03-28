import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { APP_SETTINGS, THEME_CLASSNAMES } from '@/config/app';
import { useAppStore } from '@/store/modules/app';

const resolveThemeClass = (skinKey) =>
  THEME_CLASSNAMES.includes(skinKey) ? skinKey : APP_SETTINGS.defaultSkinKey;

export function useTheme() {
  const appStore = useAppStore();
  const { skinKey } = storeToRefs(appStore);

  const currentThemeClass = computed(() => resolveThemeClass(skinKey.value));

  // 主题切换改成了“给 html 添加 class”。
  // SCSS 里会根据 `.classic`、`.midnight` 这些类名自动覆盖 CSS 变量。
  const applyThemeClass = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    root.classList.remove(...THEME_CLASSNAMES);
    root.classList.add(currentThemeClass.value);
    root.dataset.skin = currentThemeClass.value;
  };

  watch(currentThemeClass, applyThemeClass, { immediate: true });

  return {
    currentThemeClass,
    applyThemeClass,
  };
}

