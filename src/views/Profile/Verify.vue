<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const status = ref('unverified');
const realName = ref('');
const idNumber = ref('');
</script>

<template>
  <div class="profile-verify">
    <h3 class="section-title">{{ t('实名认证') }}</h3>

    <div v-if="status === 'verified'" class="verify-status verify-status--success">
      <span class="verify-status__icon">✓</span>
      <span>{{ t('已通过') }}</span>
    </div>

    <template v-else>
      <div class="verify-form">
        <div class="form-group">
          <label class="form-label">{{ t('真实姓名') }}</label>
          <input
            v-model="realName"
            class="form-input"
            :placeholder="t('请输入真实姓名')"
          />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('身份证号') }}</label>
          <input
            v-model="idNumber"
            class="form-input"
            :placeholder="t('请输入身份证号')"
          />
        </div>

        <button class="btn btn--primary submit-btn">
          {{ t('提交') }}
        </button>
      </div>
    </template>
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

.verify-status {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xl;
  border-radius: $radius-md;
  font-size: $font-size-base;

  &--success {
    background: rgba(34, 197, 94, 0.08);
    color: #16a34a;
  }

  &__icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #16a34a;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-sm;
  }
}

.verify-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.form-label {
  font-size: $font-size-md;
  color: var(--theme-text);
  font-weight: 500;
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

  &::placeholder {
    color: var(--theme-text-1);
  }
}

.submit-btn {
  height: 48px;
  width: 200px;
  margin-top: $spacing-lg;

  @include mobile-only {
    width: 100%;
  }
}
</style>
