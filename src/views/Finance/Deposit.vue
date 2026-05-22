<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';

const { t } = useI18n();
const toast = useToast();
const amount = ref('');
const submitting = ref(false);
const quickAmounts = [100, 300, 500, 1000, 3000, 5000];

const selectAmount = (val) => {
  amount.value = String(val);
};

function handleSubmit() {
  const val = Number(amount.value);
  if (!amount.value.trim()) {
    toast.error(t('请输入金额'));
    return;
  }
  if (!Number.isFinite(val) || val <= 0) {
    toast.error(t('金额必须大于零'));
    return;
  }
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    toast.success(t('操作成功'));
    amount.value = '';
  }, 800);
}
</script>

<template>
  <div class="deposit-page">
    <div class="deposit-page__inner">
      <h2 class="page-title">{{ t('充值') }}</h2>

      <div class="deposit-form card-default">
        <div class="form-group">
          <label class="form-label">{{ t('充值金额') }}</label>
          <div class="form-input-wrap">
            <input
              v-model="amount"
              type="number"
              class="form-input"
              :placeholder="t('请输入充值金额')"
            />
          </div>
        </div>

        <div class="quick-amounts">
          <button
            v-for="val in quickAmounts"
            :key="val"
            class="quick-amount-btn"
            :class="{ active: amount === String(val) }"
            @click="selectAmount(val)"
          >
            {{ val }}
          </button>
        </div>

        <button class="btn btn--primary submit-btn" :disabled="submitting" @click="handleSubmit">
          {{ submitting ? t('加载中') : t('提交') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.deposit-page {
  padding-top: 0;
  padding-bottom: $spacing-xl;
}

.page-title {
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-xl;
}

.deposit-form {
  padding: $spacing-3xl;
  border-radius: $radius-lg;
}

.form-group {
  margin-bottom: $spacing-xl;
}

.form-label {
  display: block;
  font-size: $font-size-md;
  color: var(--theme-text);
  margin-bottom: $spacing-sm;
  font-weight: 500;
}

.form-input-wrap {
  position: relative;
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

.quick-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-md;
  margin-bottom: $spacing-3xl;

  @include mobile-only {
    grid-template-columns: repeat(2, 1fr);
  }
}

.quick-amount-btn {
  height: 44px;
  border-radius: $radius-md;
  border: 1.5px solid var(--theme-divider);
  font-size: $font-size-base;
  color: var(--theme-text);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;

  &:hover,
  &.active {
    border-color: var(--theme-primary);
    color: var(--theme-primary);
    background: rgba(28, 123, 255, 0.06);
  }
}

.submit-btn {
  width: 100%;
  height: 48px;
}
</style>
