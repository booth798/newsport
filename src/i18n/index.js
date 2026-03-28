import { createI18n } from 'vue-i18n';

import enUS from '@/i18n/locales/en-US';
import zhCN from '@/i18n/locales/zh-CN';
import { getCurrentLocale } from '@/store/modules/app';

const i18n = createI18n({
  legacy: false,
  locale: getCurrentLocale(),
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
});

export default i18n;
