<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const amount = ref('');
const balance = ref('10,000.00');
</script>

<template>
  <div class="withdraw-page">
    <div class="withdraw-page__inner">
      <h2 class="page-title">{{ t('提领') }}</h2>

      <div class="withdraw-form card-default">
        <div class="balance-info">
          <span class="balance-label">{{ t('可用余额') }}</span>
          <span class="balance-value">{{ balance }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('提领金额') }}</label>
          <div class="form-input-wrap">
            <input
              v-model="amount"
              type="number"
              class="form-input"
              :placeholder="t('请输入提领金额')"
            />
          </div>
        </div>

        <button class="btn btn--primary submit-btn">
          {{ t('提交') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.withdraw-page {
  @include container;
  padding-top: $spacing-xl;
  padding-bottom: $spacing-4xl;

  &__inner {
    @include web-only {
      max-width: $web-content-max;
      margin: 0 auto;
    }
  }
}

.page-title {
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-xl;
}

.withdraw-form {
  padding: $spacing-3xl;
  border-radius: $radius-lg;
}

.balance-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-lg;
  background: rgba(28, 123, 255, 0.06);
  border-radius: $radius-md;
  margin-bottom: $spacing-xl;
}

.balance-label {
  font-size: $font-size-md;
  color: var(--theme-text-1);
}

.balance-value {
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--theme-primary);
  font-family: $font-family-num;
}

.form-group {
  margin-bottom: $spacing-3xl;
}

.form-label {
  display: block;
  font-size: $font-size-md;
  color: var(--theme-text);
  margin-bottom: $spacing-sm;
  font-weight: 500;
}

.form-input {
  width: 100%;
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
  width: 100%;
  height: 48px;
}
</style>
