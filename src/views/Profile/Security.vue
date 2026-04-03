<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const activeSection = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const resetForm = () => {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
};

const toggleSection = (section) => {
  activeSection.value = activeSection.value === section ? '' : section;
  resetForm();
};
</script>

<template>
  <div class="profile-security">
    <h3 class="section-title">{{ t('安全设置') }}</h3>

    <div class="security-list">
      <div class="security-item">
        <div class="security-item__header" @click="toggleSection('login')">
          <span class="security-item__label">{{ t('修改登入密码') }}</span>
          <span class="security-item__arrow" :class="{ open: activeSection === 'login' }">›</span>
        </div>
        <div v-if="activeSection === 'login'" class="security-item__form">
          <div class="form-group">
            <label class="form-label">{{ t('当前密码') }}</label>
            <input v-model="currentPassword" type="password" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('新密码') }}</label>
            <input v-model="newPassword" type="password" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('确认新密码') }}</label>
            <input v-model="confirmPassword" type="password" class="form-input" />
          </div>
          <button class="btn btn--primary save-btn">{{ t('保存') }}</button>
        </div>
      </div>

      <div class="security-item">
        <div class="security-item__header" @click="toggleSection('withdraw')">
          <span class="security-item__label">{{ t('修改提现密码') }}</span>
          <span class="security-item__arrow" :class="{ open: activeSection === 'withdraw' }">›</span>
        </div>
        <div v-if="activeSection === 'withdraw'" class="security-item__form">
          <div class="form-group">
            <label class="form-label">{{ t('当前密码') }}</label>
            <input v-model="currentPassword" type="password" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('新密码') }}</label>
            <input v-model="newPassword" type="password" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('确认新密码') }}</label>
            <input v-model="confirmPassword" type="password" class="form-input" />
          </div>
          <button class="btn btn--primary save-btn">{{ t('保存') }}</button>
        </div>
      </div>
    </div>
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

.security-list {
  display: flex;
  flex-direction: column;
}

.security-item {
  border-bottom: 1px solid var(--theme-divider);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-xl 0;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--theme-primary);
    }
  }

  &__label {
    font-size: $font-size-base;
    color: var(--theme-text);
  }

  &__arrow {
    font-size: 20px;
    color: var(--theme-text-1);
    transition: transform 0.2s;

    &.open {
      transform: rotate(90deg);
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
    padding-bottom: $spacing-xl;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.form-label {
  font-size: $font-size-md;
  color: var(--theme-text-1);
}

.form-input {
  height: 48px;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;
  padding: 0 $spacing-lg;
  font-size: $font-size-base;
  color: var(--theme-text);
  background: transparent;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.save-btn {
  height: 48px;
  width: 200px;
  margin-top: $spacing-sm;

  @include mobile-only {
    width: 100%;
  }
}
</style>
