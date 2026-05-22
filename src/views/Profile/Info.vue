<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/store/modules/app';
import { useToast } from '@/hooks/useToast';

const { t } = useI18n();
const toast = useToast();
const appStore = useAppStore();
const { loggedInUserId } = storeToRefs(appStore);

const nickname = ref(loggedInUserId.value || 'User_888');
const phone = ref('138****8888');
const submitting = ref(false);
const displayInitial = computed(() => (nickname.value.charAt(0) || 'U').toUpperCase());

function handleSave() {
  if (!nickname.value.trim()) {
    toast.error(t('请输入昵称'));
    return;
  }
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    toast.success(t('操作成功'));
  }, 600);
}
</script>

<template>
  <div class="profile-info">
    <h3 class="section-title">{{ t('个人资料') }}</h3>

    <div class="info-form">
      <div class="info-row">
        <span class="info-label">{{ t('头像') }}</span>
        <div class="info-avatar">
          <div class="info-avatar__placeholder">{{ displayInitial }}</div>
        </div>
      </div>

      <div class="info-row">
        <span class="info-label">{{ t('昵称') }}</span>
        <input v-model="nickname" class="info-input" />
      </div>

      <div class="info-row">
        <span class="info-label">{{ t('手机号') }}</span>
        <span class="info-value">{{ phone }}</span>
      </div>
    </div>

    <button class="btn btn--primary save-btn" :disabled="submitting" @click="handleSave">
      {{ submitting ? t('加载中') : t('保存') }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-3xl;
}

.info-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
  margin-bottom: $spacing-3xl;
}

.info-row {
  display: flex;
  align-items: center;
  padding-bottom: $spacing-lg;
  border-bottom: 1px solid var(--theme-divider);
}

.info-label {
  width: 100px;
  font-size: $font-size-md;
  color: var(--theme-text-1);
  flex-shrink: 0;
}

.info-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: $font-size-base;
  color: var(--theme-text);
  background: transparent;
  padding: 8px 0;
}

.info-value {
  font-size: $font-size-base;
  color: var(--theme-text);
}

.info-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;

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

.save-btn {
  height: 48px;
  width: 200px;

  @include mobile-only {
    width: 100%;
  }
}
</style>
