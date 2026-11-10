<script setup>
/**
 * 设置页（对齐 App SettingActivity）
 * H5：自带返回顶栏 + 列表（安全设置/语言/关于我们/退出登录）
 * PC：仍由 Overview 弹窗处理，本页主要服务 H5
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';
import ProfileMobileHeader from '@/views/Profile/components/ProfileMobileHeader.vue';
import ProfileSecurityModal from '@/views/Profile/components/ProfileSecurityModal.vue';
import LanguageSettingModal from '@/views/Profile/components/LanguageSettingModal.vue';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile, locale } = storeToRefs(appStore);
const showSecurityModal = ref(false);
const showLanguageSettingModal = ref(false);

function handleLogout() {
  appStore.openLogoutConfirm();
}
</script>

<template>
  <div class="profile-security" :class="{ 'profile-security--mobile': isMobile }">
    <ProfileMobileHeader v-if="isMobile" :title="t('设置')" />

    <section class="settings-mobile-list" aria-label="settings">
      <button type="button" class="settings-mobile-row" @click="showSecurityModal = true">
        <span>{{ t('安全设置') }}</span>
        <i aria-hidden="true" />
      </button>
      <button type="button" class="settings-mobile-row" @click="showLanguageSettingModal = true">
        <span>{{ t('语言设置') }}</span>
        <span class="settings-mobile-row__value">{{ locale === 'zh-CN' ? t('中文') : t('英文') }}</span>
        <i aria-hidden="true" />
      </button>
      <button type="button" class="settings-mobile-row" @click="router.push('/profile/about')">
        <span>{{ t('关于我们') }}</span>
        <i aria-hidden="true" />
      </button>
      <button type="button" class="settings-mobile-row" @click="handleLogout">
        <span>{{ t('退出登录') }}</span>
        <i aria-hidden="true" />
      </button>
    </section>

    <ProfileSecurityModal v-model="showSecurityModal" />
    <LanguageSettingModal v-model="showLanguageSettingModal" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-security--mobile {
  min-height: 100dvh;
  margin: -18px -8px 0;
  padding: 0 8px 20px;
  box-sizing: border-box;
  background: var(--surface-card);
}

.settings-mobile-list {
  overflow: hidden;
  border-radius: 16px;
  background: #fff;

  @include mobile-only {
    margin-top: 8px;
    min-height: calc(100dvh - 160px);
  }
}

.settings-mobile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: none;
  border-bottom: 1px solid rgba(var(--theme-divider-rgb), 0.42);
  background: transparent;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  i {
    width: 8px;
    height: 8px;
    border-top: 1.5px solid rgba(var(--theme-text-rgb), 0.42);
    border-right: 1.5px solid rgba(var(--theme-text-rgb), 0.42);
    transform: rotate(45deg);
  }
}

.settings-mobile-row__value {
  margin-left: auto;
  margin-right: 16px;
  color: var(--theme-text);
  font-size: 12px;
}
</style>
