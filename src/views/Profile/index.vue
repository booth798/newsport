<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';
import { useToast } from '@/hooks/useToast';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const toast = useToast();
const { isLoggedIn, loggedInUserId } = storeToRefs(appStore);

const showLogoutConfirm = ref(false);

const isProfileHome = computed(() => route.name === 'profile-home');
const hideSidebarOnHome = computed(() => isProfileHome.value);

const displayName = computed(() => loggedInUserId.value || 'User_888');
const displayId = computed(() => loggedInUserId.value ? `ID: ${loggedInUserId.value}` : 'ID: 10086');
const displayInitial = computed(() => (displayName.value.charAt(0) || 'U').toUpperCase());

const menuItems = [
  { label: '个人资料', to: '/profile/info', icon: 'user' },
  { label: '消息中心', to: '/profile/messages', icon: 'message' },
  { label: '实名认证', to: '/profile/verify', icon: 'verify' },
  { label: '安全设置', to: '/profile/security', icon: 'security' },
  { label: '绑定信息', to: '/profile/bank-card', icon: 'card' },
];

const activeMenu = computed(() => route.path);

function handleLogout() {
  showLogoutConfirm.value = true;
}

function confirmLogout() {
  showLogoutConfirm.value = false;
  appStore.clearWebLogin();
  toast.success(t('操作成功'));
  router.push('/');
}

function cancelLogout() {
  showLogoutConfirm.value = false;
}
</script>

<template>
  <div class="profile-layout" :class="{ 'profile-layout--home': hideSidebarOnHome }">
    <div class="profile-layout__inner">
      <aside v-if="!hideSidebarOnHome" class="profile-sidebar">
        <div class="profile-sidebar__user card-default">
          <div class="user-avatar">
            <div class="user-avatar__placeholder">{{ displayInitial }}</div>
          </div>
          <div class="user-info">
            <div class="user-name">{{ displayName }}</div>
            <div class="user-id">{{ displayId }}</div>
          </div>
        </div>

        <nav class="profile-nav">
          <RouterLink
            v-for="item in menuItems"
            :key="item.to"
            :to="item.to"
            class="profile-nav__item"
            :class="{ active: activeMenu.startsWith(item.to) }"
          >
            {{ t(item.label) }}
          </RouterLink>
          <button class="profile-nav__item profile-nav__logout" @click="handleLogout">
            {{ t('退出登录') }}
          </button>
        </nav>
      </aside>

      <main
        class="profile-content"
        :class="{
          'card-default': !hideSidebarOnHome,
          'profile-content--home': hideSidebarOnHome,
        }"
      >
        <RouterView />
      </main>

      <Teleport to="body">
        <Transition name="confirm-fade">
          <div v-if="showLogoutConfirm" class="logout-overlay" @click.self="cancelLogout">
            <div class="logout-dialog card-default" role="alertdialog" aria-modal="true">
              <button type="button" class="logout-dialog__close" :aria-label="t('关闭')" @click="cancelLogout">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </button>
              <p class="logout-dialog__text">{{ t('确定退出登录吗') }}</p>
              <div class="logout-dialog__actions">
                <button type="button" class="btn logout-dialog__cancel" @click="cancelLogout">{{ t('取消') }}</button>
                <button type="button" class="btn btn--primary logout-dialog__confirm" @click="confirmLogout">{{ t('确定') }}</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-layout {
  @include container;
  padding-top: $spacing-xl;
  padding-bottom: $spacing-4xl;

  &--home {
    @include web-main-column-max;
    box-sizing: border-box;

    @include web-only {
      padding-top: 16px;
      padding-bottom: 60px;
      background: #e3ecfb;
    }

    @include mobile-only {
      padding-top: 8px;
      padding-bottom: calc($mobile-tab-bar-offset + $spacing-3xl);
      background: #e3ecfb;
    }

    .profile-layout__inner {
      display: block;
      max-width: none;
      width: 100%;
      margin: 0;
    }
  }

  &__inner {
    display: flex;
    gap: $spacing-xl;

    @include web-only {
      max-width: $web-content-max;
      margin: 0 auto;
    }

    @include mobile-only {
      flex-direction: column;
    }
  }
}

.profile-sidebar {
  @include web-only {
    width: 280px;
    flex-shrink: 0;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-xl;
    border-radius: $radius-lg;
    margin-bottom: $spacing-lg;
  }
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;

  &__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--theme-primary), #5696f5);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-xl;
    font-weight: 700;
  }
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: $font-size-base;
  font-weight: 600;
  color: var(--theme-text);
  margin-bottom: 4px;
}

.user-id {
  font-size: $font-size-sm;
  color: var(--theme-text-1);
}

.profile-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--auxiliary-1);
  border-radius: $radius-lg;
  padding: $spacing-sm;
  box-shadow: 0 3px 8px rgba(21, 58, 119, 0.1);

  @include mobile-only {
    flex-direction: row;
    overflow-x: auto;
    gap: $spacing-sm;
  }

  &__item {
    display: flex;
    align-items: center;
    padding: 14px $spacing-lg;
    border-radius: $radius-md;
    font-size: $font-size-md;
    color: var(--theme-text);
    transition: all 0.2s;
    cursor: pointer;
    white-space: nowrap;

    &:hover,
    &.active {
      background: rgba(28, 123, 255, 0.08);
      color: var(--theme-primary);
    }
  }

  &__logout {
    color: var(--auxiliary-2);
    border: none;
    background: none;
    text-align: left;
    font: inherit;

    &:hover {
      background: rgba(255, 45, 45, 0.06);
      color: var(--auxiliary-2);
    }
  }
}

.profile-content {
  flex: 1;
  min-width: 0;
  border-radius: $radius-lg;
  padding: $spacing-3xl;

  @include mobile-only {
    padding: $spacing-lg;
  }

  &--home {
    padding: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    border: none;

    @include web-only {
      width: 800px;
      max-width: 100%;
      margin: 0 auto;
    }
  }
}

.logout-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(11, 52, 98, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.logout-dialog {
  position: relative;
  width: min(360px, calc(100vw - 48px));
  padding: 32px 24px 24px;
  border-radius: $radius-lg;
  text-align: center;

  &__close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: rgba(11, 52, 98, 0.35);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.2s ease,
      color 0.2s ease;

    &:hover {
      background: rgba(11, 52, 98, 0.06);
      color: rgba(11, 52, 98, 0.6);
    }

    &:focus-visible {
      outline: 2px solid var(--theme-primary);
      outline-offset: 2px;
    }
  }

  &__text {
    font-size: $font-size-base;
    font-weight: 500;
    color: var(--theme-text);
    margin: 0 0 24px;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
  }

  &__cancel,
  &__confirm {
    flex: 1;
    height: 44px;
  }

  &__cancel {
    border: 1.5px solid var(--theme-divider);
    background: #fff;
    color: var(--theme-text);
    transition:
      border-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }
  }
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>
