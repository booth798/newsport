<script setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';

const route = useRoute();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const isProfileHome = computed(() => route.name === 'profile-home');
const isMessagesPage = computed(() => route.name === 'profile-messages');
const isVipBenefitsPage = computed(() => route.name === 'vip-benefits');
const hideSidebarOnHome = computed(() => isProfileHome.value || isMobile.value);

</script>

<template>
  <RouterView v-if="isMessagesPage || isVipBenefitsPage" />
  <div v-else class="profile-layout" :class="{ 'profile-layout--home': hideSidebarOnHome }">
    <div class="profile-layout__inner">
      <main
        class="profile-content"
        :class="{
          // 'card-default': !hideSidebarOnHome,
          'profile-content--home': hideSidebarOnHome,
        }"
      >
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

  &--home {
    @include web-main-column-max;
    box-sizing: border-box;

    @include web-only {
      padding-top: 16px;
      padding-bottom: 60px;
      background: var(--theme-bg);
    }

    @include mobile-only {
      padding-top: 8px;
      padding-bottom: 0;
      background: var(--theme-bg);
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

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;

  &__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-end));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-xl;
    font-weight: 700;
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
</style>
