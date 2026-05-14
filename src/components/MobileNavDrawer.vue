<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import logoUrl from '@/assets/images/common/logo_nav.svg';
import chevronUp from '@/assets/images/common/icon_drawer_section_chevron_up.svg';
import chevronDown from '@/assets/images/common/icon_drawer_section_chevron_down.svg';
import bgScoreUrl from '@/assets/images/events/bg_score.svg?url';
import iconTradeSuccess from '@/assets/images/common/icon_trade_success.svg';
import iconWithdraw from '@/assets/images/common/icon_withdraw.svg';
import iconInvesting from '@/assets/images/common/icon_investing.svg';
import iconAbout from '@/assets/images/common/icon_about.svg';
import iconContact from '@/assets/images/menu/icon_my_contact_support.svg';

import { openCustomerService } from '@/utils/customerService';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  /** 与 Header `navMenus` 同结构 */
  menus: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const route = useRoute();

const sections = [
  { menuKey: 'market', titleKey: '市场' },
  { menuKey: 'trade', titleKey: '交易账务' },
  { menuKey: 'member', titleKey: '会员服务' },
  { menuKey: 'myBenefit', titleKey: '我的权益' },
];

const quickLinks = [
  { labelKey: '充值', to: '/finance/deposit', icon: iconTradeSuccess },
  { labelKey: '提额', to: '/finance/withdraw', icon: iconWithdraw },
  { labelKey: '会员互转', to: '/profile', icon: iconInvesting },
  { labelKey: '共赢伙伴', to: '/', icon: iconAbout },
];

const sectionOpen = ref({
  market: true,
  trade: true,
  member: true,
  myBenefit: true,
});

const toggleSection = (menuKey) => {
  sectionOpen.value[menuKey] = !sectionOpen.value[menuKey];
};

const close = () => {
  emit('update:modelValue', false);
};

const lockScroll = (locked) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = locked ? 'hidden' : '';
};

watch(
  () => props.modelValue,
  (open) => {
    lockScroll(open);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  lockScroll(false);
});

const isSubmenuLinkActive = (sub) => {
  const to = sub.to;
  if (typeof to === 'object' && to != null && 'path' in to) {
    const hash = to.hash ?? '';
    return route.path === to.path && (route.hash || '') === hash;
  }
  if (to === '/market') return route.name === 'market' || route.name === 'market-detail';
  if (to === '/finance/deposit') return route.name === 'finance-deposit';
  if (to === '/finance/records') return route.name === 'finance-records';
  if (to === '/profile') return route.name === 'profile-home';
  if (to === '/profile/info') return route.name === 'profile-info';
  if (to === '/profile/security') return route.name === 'profile-security';
  if (to === '/') return false;
  return false;
};

const onContact = () => {
  openCustomerService();
  close();
};
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mobile-nav-drawer">
      <div class="mobile-nav-drawer__backdrop" @click="close" />
      <aside
        class="mobile-nav-drawer__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="t('菜单')"
        @click.stop
      >
        <div class="mobile-nav-drawer__arena">
          <div class="mobile-nav-drawer__scroll">
            <div class="mobile-nav-drawer__hero">
              <img class="mobile-nav-drawer__hero-bg" :src="bgScoreUrl" alt="" aria-hidden="true" />
              <div class="mobile-nav-drawer__logo-wrap">
                <img class="mobile-nav-drawer__logo" :src="logoUrl" alt="UNIBET" />
              </div>
            </div>

            <div class="mobile-nav-drawer__main">
            <div class="mobile-nav-drawer__quick">
              <RouterLink
                v-for="item in quickLinks"
                :key="item.labelKey"
                :to="item.to"
                custom
                v-slot="{ href, navigate }"
              >
                <a
                  :href="href"
                  class="mobile-nav-drawer__quick-tile"
                  @click="
                    (e) => {
                      navigate(e);
                      close();
                    }
                  "
                >
                  <img class="mobile-nav-drawer__quick-icon" :src="item.icon" alt="" />
                  <span class="mobile-nav-drawer__quick-label">{{ t(item.labelKey) }}</span>
                </a>
              </RouterLink>
            </div>

            <div
              v-for="sec in sections"
              :key="sec.menuKey"
              class="mobile-nav-drawer__section"
            >
              <button
                type="button"
                class="mobile-nav-drawer__section-head"
                :aria-expanded="sectionOpen[sec.menuKey]"
                @click="toggleSection(sec.menuKey)"
              >
                <span class="mobile-nav-drawer__section-title">{{ t(sec.titleKey) }}</span>
                <img
                  class="mobile-nav-drawer__section-chevron"
                  :src="sectionOpen[sec.menuKey] ? chevronUp : chevronDown"
                  alt=""
                />
              </button>
              <div v-show="sectionOpen[sec.menuKey]" class="mobile-nav-drawer__section-body">
                <div class="mobile-nav-drawer__link-grid">
                  <RouterLink
                    v-for="sub in menus[sec.menuKey]"
                    :key="sub.labelKey"
                    :to="sub.to"
                    custom
                    v-slot="{ href, navigate }"
                  >
                    <a
                      :href="href"
                      class="mobile-nav-drawer__link-tile"
                      :class="{ 'is-active': isSubmenuLinkActive(sub) }"
                      @click="
                        (e) => {
                          navigate(e);
                          close();
                        }
                      "
                    >
                      <img class="mobile-nav-drawer__link-icon" :src="sub.icon" alt="" />
                      <span class="mobile-nav-drawer__link-label">{{ t(sub.labelKey) }}</span>
                    </a>
                  </RouterLink>
                </div>
              </div>
            </div>

            <button type="button" class="mobile-nav-drawer__contact" @click="onContact">
              <img class="mobile-nav-drawer__contact-icon" :src="iconContact" alt="" />
              <span>{{ t('联络客服') }}</span>
            </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

/* 稿：白底 + 纵向渐变叠层 + 0.8px 白边 + 投影 */
@mixin drawer-chip-surface {
  box-sizing: border-box;
  background:
    linear-gradient(180deg, rgba(104, 136, 186, 0) 0%, rgba(104, 136, 186, 0.15) 100%),
    #ffffff;
  border: 0.8px solid #ffffff;
  box-shadow: 0 2px 6px 0 rgba(21, 58, 119, 0.1);
}

.mobile-nav-drawer {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: flex-end;
  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(11, 52, 98, 0.38);
    animation: mobile-nav-drawer-backdrop-in 0.22s ease forwards;
  }

  &__panel {
    position: relative;
    height: 100%;
    width: min(100vw, 400px);
    max-width: 100%;
    box-sizing: border-box;
    box-shadow: -6px 0 24px rgba(21, 58, 119, 0.12);
    animation: mobile-nav-drawer-panel-in 0.28s ease forwards;
  }

  &__arena {
    position: relative;
    height: 100%;
    overflow: hidden;
    background: linear-gradient(180deg, #f3f8ff 0%, #e8f2ff 100%);
  }

  &__scroll {
    position: relative;
    z-index: 1;
    height: 100%;
    overflow-y: auto;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
    box-sizing: border-box;
  }

  /* 顶区：与热门赛事卡赛场相同的格网底（仅头部一条，不铺满整抽屉） */
  &__hero {
    position: relative;
    padding: 10px 12px 12px;
    margin-bottom: 10px;
    overflow: hidden;
  }

  &__hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    pointer-events: none;
    opacity: 0.88;
  }

  &__logo-wrap {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
  }

  &__logo {
    width: 92px;
    height: 32px;
    object-fit: contain;
    display: block;
  }

  &__main {
    padding: 0 12px;
    box-sizing: border-box;
  }

  &__quick {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
    justify-items: center;
  }

  &__quick-tile {
    @include drawer-chip-surface;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    box-sizing: border-box;
    width: 100%;
    max-width: 120px;
    height: 40px;
    padding: 0 8px;
    border-radius: 12px;
    text-decoration: none;
    color: var(--theme-text);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.15;
    text-align: left;
  }

  &__quick-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
    display: block;
  }

  &__quick-label {
    flex: 1;
    min-width: 0;
    display: block;
    line-height: 1.2;
    overflow-wrap: break-word;
  }

  &__section {
    margin-bottom: 8px;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 4px 2px 6px;
    margin: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-family: $font-family-base;
    font-size: 15px;
    font-weight: 600;
    color: var(--theme-primary);
  }

  &__section-chevron {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: block;
  }

  &__section-body {
    padding-top: 0;
  }

  &__link-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    justify-items: center;
  }

  &__link-tile {
    @include drawer-chip-surface;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    box-sizing: border-box;
    width: 100%;
    max-width: 120px;
    height: 40px;
    padding: 0 8px;
    border-radius: 12px;
    text-decoration: none;
    color: var(--theme-text);
    font-size: 13px;
    font-weight: 400;
    line-height: 1.15;

    &.is-active {
      border-color: rgba(28, 123, 255, 0.55);
      color: var(--theme-primary);
      box-shadow: 0 2px 6px 0 rgba(21, 58, 119, 0.1);
    }
  }

  &__link-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
    display: block;
  }

  &__link-label {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__contact {
    @include drawer-chip-surface;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-sizing: border-box;
    width: 100%;
    max-width: 248px;
    height: 40px;
    margin: 6px auto 0;
    padding: 0 12px;
    border-radius: 12px;
    cursor: pointer;
    font-family: $font-family-base;
    font-size: 14px;
    font-weight: 500;
    color: var(--theme-text);
  }

  &__contact-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }
}

@keyframes mobile-nav-drawer-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes mobile-nav-drawer-panel-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style>
