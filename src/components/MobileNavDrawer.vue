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
  { labelKey: '提领', to: '/finance/withdraw', icon: iconWithdraw },
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
    <Transition name="mobile-nav-drawer-transition">
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
          <img class="mobile-nav-drawer__arena-bg" :src="bgScoreUrl" alt="" aria-hidden="true" />
          <div class="mobile-nav-drawer__scroll">
            <header class="mobile-nav-drawer__header">
              <div class="mobile-nav-drawer__logo-wrap">
                <img class="mobile-nav-drawer__logo" :src="logoUrl" alt="UNIBET" />
               
              </div>
            </header>

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

            <div class="mobile-nav-drawer__footer">
              <button type="button" class="mobile-nav-drawer__contact" @click="onContact">
                <img class="mobile-nav-drawer__contact-icon" :src="iconContact" alt="" />
                <span>{{ t('联络客服') }}</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

$drawer-w: 288px;
$drawer-pad-x: 18px;
$tile-w: 120px;
$tile-h: 40px;
$tile-gap-x: 12px;
$tile-gap-y: 10px;
$tile-radius: 8px;
$divider-gap: 16px;

@mixin drawer-tile-surface {
  box-sizing: border-box;
  width: $tile-w;
  height: $tile-h;
  /* 设计稿：白底 + 自上而下淡蓝叠层（上层须叠在 #fff 之上才可见） */
  background:
    linear-gradient(360deg, rgba(104, 136, 186, 0) 0%, rgba(104, 136, 186, 0.15) 100%),
    linear-gradient(0deg, #ffffff, #ffffff);
  border: 0.8px solid #ffffff;
  box-shadow: 0px 2px 6px 0px #153a771a;
  border-radius: $tile-radius;
}

@mixin drawer-tile-grid {
  display: grid;
  grid-template-columns: $tile-w $tile-w;
  column-gap: $tile-gap-x;
  row-gap: $tile-gap-y;
  justify-content: start;
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
    background: rgba(17, 24, 39, 0.45);
    transition: opacity 0.25s ease;
  }

  &__panel {
    position: relative;
    height: 100%;
    width: min($drawer-w, 100%);
    max-width: 100%;
    box-sizing: border-box;
    flex-shrink: 0;
    border-radius: 16px 0 0 16px;
    overflow: hidden;
    background: #fff;
    box-shadow: -6px 0 24px rgba(21, 58, 119, 0.12);
    transition: transform 0.28s ease;
  }

  &__arena {
    position: relative;
    height: 100%;
    overflow: hidden;
    background-color: #ffffff;
  }

  &__arena-bg {
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

  &__scroll {
    position: relative;
    z-index: 1;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 0 $drawer-pad-x;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
  }

  &__header {
    padding: 16px 0 12px;
    box-sizing: border-box;
  }

  &__logo-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  &__logo {
    width: 100px;
    height: auto;
    max-height: 36px;
    object-fit: contain;
    display: block;
  }

  &__logo-dots {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  &__logo-dots-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  &__logo-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
  }

  &__main {
    padding: 0;
    box-sizing: border-box;
  }

  &__quick {
    @include drawer-tile-grid;
    margin-bottom: 0;
  }

  &__quick-tile {
    @include drawer-tile-surface;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    padding: 0 8px;
    text-decoration: none;
    color: #1f2227;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.15;
    text-align: left;
  }

  &__quick-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    flex-shrink: 0;
    display: block;
  }

  &__quick-label {
    flex: 1;
    min-width: 0;
    display: block;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__section {
    border-top: 1px solid #e8eaef;
    margin-top: $divider-gap;
    padding-top: $divider-gap;
    box-sizing: border-box;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 0 8px;
    margin: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-family: $font-family-base;
  }

  &__section-title {
    font-size: 14px;
    font-weight: 500;
    line-height: 100%;
    letter-spacing: 0;
    color: #1c7bff;
  }

  &__section-chevron {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: block;
    object-fit: contain;
  }

  &__section-body {
    padding-bottom: 0;
  }

  &__link-grid {
    @include drawer-tile-grid;
  }

  &__link-tile {
    @include drawer-tile-surface;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    text-decoration: none;
    color: #1f2227;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.15;

    &.is-active {
      border: 1px solid rgba(28, 123, 255, 0.75);
      color: var(--theme-primary);
      background:
        linear-gradient(360deg, rgba(104, 136, 186, 0) 0%, rgba(104, 136, 186, 0.15) 100%),
        linear-gradient(0deg, #ffffff, #ffffff);
      box-shadow: 0px 2px 6px 0px #153a771a;
    }
  }

  &__link-icon {
    width: 20px;
    height: 20px;
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

  &__footer {
    border-top: 1px solid #e8eaef;
    margin-top: $divider-gap;
    padding-top: $divider-gap;
    padding-bottom: 4px;
    box-sizing: border-box;
    @include drawer-tile-grid;
  }

  &__contact {
    @include drawer-tile-surface;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    padding: 0 8px;
    margin: 0;
    cursor: pointer;
    font-family: $font-family-base;
    font-size: 12px;
    font-weight: 500;
    color: #1f2227;
  }

  &__contact-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }
}

.mobile-nav-drawer-transition-enter-active,
.mobile-nav-drawer-transition-leave-active {
  .mobile-nav-drawer__backdrop {
    transition: opacity 0.25s ease;
  }
  .mobile-nav-drawer__panel {
    transition: transform 0.28s ease;
  }
}

.mobile-nav-drawer-transition-enter-from,
.mobile-nav-drawer-transition-leave-to {
  .mobile-nav-drawer__backdrop {
    opacity: 0;
  }
  .mobile-nav-drawer__panel {
    transform: translateX(100%);
  }
}
</style>
