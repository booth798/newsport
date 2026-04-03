<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const { t } = useI18n();
const route = useRoute();

const menuItems = [
  { label: '个人资料', to: '/profile/info', icon: 'user' },
  { label: '消息中心', to: '/profile/messages', icon: 'message' },
  { label: '实名认证', to: '/profile/verify', icon: 'verify' },
  { label: '安全设置', to: '/profile/security', icon: 'security' },
  { label: '绑定信息', to: '/profile/bank-card', icon: 'card' },
];

const activeMenu = computed(() => route.path);
</script>

<template>
  <div class="profile-layout">
    <div class="profile-layout__inner">
      <aside class="profile-sidebar">
        <div class="profile-sidebar__user card-default">
          <div class="user-avatar">
            <div class="user-avatar__placeholder">U</div>
          </div>
          <div class="user-info">
            <div class="user-name">User_888</div>
            <div class="user-id">ID: 10086</div>
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
          <button class="profile-nav__item profile-nav__logout">
            {{ t('退出登录') }}
          </button>
        </nav>
      </aside>

      <main class="profile-content card-default">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-layout {
  @include container;
  padding-top: $spacing-xl;
  padding-bottom: $spacing-4xl;

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
}
</style>
