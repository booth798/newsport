<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';
import ProfileSecurityModal from '@/views/Profile/components/ProfileSecurityModal.vue';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);
const showSecurityModal = ref(false);

function handleLogout() {
  appStore.openLogoutConfirm();
}
</script>

<template>
  <div class="profile-security">
    <section v-if="isMobile" class="settings-mobile-list" aria-label="settings">
      <button type="button" class="settings-mobile-row" @click="showSecurityModal = true">
        <span>{{ t('安全设置') }}</span>
        <i aria-hidden="true" />
      </button>
      <button type="button" class="settings-mobile-row" @click="handleLogout">
        <span>{{ t('退出登录') }}</span>
        <i aria-hidden="true" />
      </button>
      <button type="button" class="settings-mobile-row" @click="router.push('/profile/about')">
        <span>{{ t('关于我们') }}</span>
        <i aria-hidden="true" />
      </button>
    </section>

    <ProfileSecurityModal v-model="showSecurityModal" />
  </div>
</template>

<style lang="scss" scoped>
.settings-mobile-list {
  overflow: hidden;
  border-radius: 12px;
  background: rgba(234, 241, 249, 0.72);
}

.settings-mobile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 46px;
  padding: 0 16px;
  border: none;
  border-bottom: 1px solid rgba(214, 224, 235, 0.42);
  background: transparent;
  color: #0b3462;
  font-size: 14px;
  font-weight: 500;
  text-align: left;

  &:last-child {
    border-bottom: none;
  }

  i {
    width: 8px;
    height: 8px;
    border-top: 1.5px solid rgba(11, 52, 98, 0.42);
    border-right: 1.5px solid rgba(11, 52, 98, 0.42);
    transform: rotate(45deg);
  }
}
</style>
