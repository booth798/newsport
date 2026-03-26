import { APP_SETTINGS } from '@/config/app';

// 皮肤只负责主题，不关心站点差异。
// 所有站点共用同一套皮肤配置，后续新增皮肤时只维护这一份即可。
const DEFAULT_THEME_TOKENS = {
  'theme-primary': '#0b6bcb',
  'theme-primary-dark': '#084f97',
  'theme-accent': '#ff6b35',
  'theme-text': '#10213a',
  'theme-text-secondary': '#60708d',
  'theme-border': 'rgba(16, 33, 58, 0.08)',
  'theme-surface': 'rgba(255, 255, 255, 0.88)',
  'theme-surface-strong': 'rgba(255, 255, 255, 0.72)',
  'theme-page-base': '#dfeaff',
  'theme-bg-start': '#f8fbff',
  'theme-bg-mid': '#eef5ff',
  'theme-bg-end': '#f5f9ff',
  'theme-glow-primary': 'rgba(11, 107, 203, 0.24)',
  'theme-glow-accent': 'rgba(255, 107, 53, 0.18)',
  'theme-grid-line': 'rgba(255, 255, 255, 0.45)',
  'theme-selection': 'rgba(11, 107, 203, 0.75)',
  'theme-tag-text': '#084f97',
  'theme-tag-bg': 'rgba(11, 107, 203, 0.08)',
  'theme-primary-soft': 'rgba(11, 107, 203, 0.1)',
  'theme-accent-soft': 'rgba(255, 107, 53, 0.12)',
  'theme-hero-panel': 'rgba(255, 255, 255, 0.6)',
  'theme-primary-shadow': '0 14px 30px rgba(11, 107, 203, 0.24)',
  'theme-header-shadow': '0 16px 40px rgba(16, 33, 58, 0.08)',
  'theme-card-shadow': '0 18px 60px rgba(16, 33, 58, 0.12)',
  'theme-code-bg': '#081629',
  'theme-code-text': '#d9f3ff',
};

const createThemeTokens = (overrides = {}) => ({
  ...DEFAULT_THEME_TOKENS,
  ...overrides,
});

export const SHARED_SKINS = {
  classic: {
    key: 'classic',
    label: 'Classic Blue',
    colorScheme: 'light',
    themeColor: '#0b6bcb',
    tokens: createThemeTokens(),
  },
  midnight: {
    key: 'midnight',
    label: 'Midnight Pulse',
    colorScheme: 'dark',
    themeColor: '#59c8ff',
    tokens: createThemeTokens({
      'theme-primary': '#2b8cff',
      'theme-primary-dark': '#0c4db3',
      'theme-accent': '#59c8ff',
      'theme-text': '#eaf4ff',
      'theme-text-secondary': '#8fb3d9',
      'theme-border': 'rgba(115, 164, 219, 0.16)',
      'theme-surface': 'rgba(7, 21, 38, 0.82)',
      'theme-surface-strong': 'rgba(10, 26, 46, 0.9)',
      'theme-page-base': '#061321',
      'theme-bg-start': '#07192d',
      'theme-bg-mid': '#091e36',
      'theme-bg-end': '#05111f',
      'theme-glow-primary': 'rgba(43, 140, 255, 0.24)',
      'theme-glow-accent': 'rgba(89, 200, 255, 0.18)',
      'theme-grid-line': 'rgba(124, 180, 255, 0.08)',
      'theme-selection': 'rgba(43, 140, 255, 0.78)',
      'theme-tag-text': '#b7e6ff',
      'theme-tag-bg': 'rgba(89, 200, 255, 0.12)',
      'theme-primary-soft': 'rgba(43, 140, 255, 0.14)',
      'theme-accent-soft': 'rgba(89, 200, 255, 0.14)',
      'theme-hero-panel': 'rgba(8, 24, 42, 0.9)',
      'theme-primary-shadow': '0 14px 30px rgba(43, 140, 255, 0.26)',
      'theme-header-shadow': '0 16px 40px rgba(0, 0, 0, 0.32)',
      'theme-card-shadow': '0 18px 60px rgba(0, 0, 0, 0.35)',
      'theme-code-bg': '#04101d',
      'theme-code-text': '#bfe9ff',
    }),
  },
};

export const getSkinConfig = (skinKey = APP_SETTINGS.defaultSkinKey) => {
  const skin =
    SHARED_SKINS[skinKey] ||
    SHARED_SKINS[APP_SETTINGS.defaultSkinKey] ||
    SHARED_SKINS.classic;

  return {
    ...skin,
    tokens: skin.tokens || createThemeTokens(),
  };
};

export const getSkinOptions = () =>
  Object.values(SHARED_SKINS).map((item) => ({
    key: item.key,
    label: item.label,
    colorScheme: item.colorScheme,
    themeColor: item.themeColor,
  }));

export const isValidSkin = (skinKey) => Boolean(SHARED_SKINS[skinKey]);

