<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { submitWithdraw } from '@/api/finance';
import { useToast } from '@/hooks/useToast';

const { t } = useI18n();
const toast = useToast();

const submitting = ref(false);
const amount = ref('');
const withdrawPassword = ref('');

const bankInfo = ref({
  bankName: '中国银行',
  cardNumber: '6213 **** **** 6452',
  holderName: '',
  branch: '',
});

async function handleSubmit() {
  const val = Number(amount.value);
  if (!amount.value.trim()) {
    toast.error(t('请输入金额'));
    return;
  }
  if (!Number.isFinite(val) || val <= 0) {
    toast.error(t('金额必须大于零'));
    return;
  }
  if (!withdrawPassword.value.trim()) {
    toast.error(t('请输入提款密码'));
    return;
  }

  try {
    submitting.value = true;
    await submitWithdraw(val);
    toast.success(t('操作成功'));
  } catch {
    toast.error(t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="withdraw-page">
    <section class="withdraw-channel card-default">
      <button type="button" class="withdraw-channel__btn">{{ t('中国银联提款') }}</button>
    </section>

    <section class="bank-card" aria-label="bank-card">
      <div class="bank-card__header">
        <span class="bank-card__badge">中</span>
        <span class="bank-card__name">{{ t(bankInfo.bankName) }}</span>
        <span class="bank-card__status">{{ t('已启用') }}</span>
      </div>
      <div class="bank-card__number">{{ bankInfo.cardNumber }}</div>
    </section>

    <form class="withdraw-form card-default" @submit.prevent="handleSubmit">
      <div class="withdraw-form__notice">
        <span class="withdraw-form__notice-icon">!</span>
        <span>{{ t('注意事项') }}</span>
      </div>

      <label class="finance-field">
        <span class="finance-field__label">{{ t('银行名称') }}</span>
        <input class="finance-field__input" :value="t(bankInfo.bankName)" />
      </label>

      <label class="finance-field">
        <span class="finance-field__label">{{ t('银行账号') }}</span>
        <input class="finance-field__input" :value="bankInfo.cardNumber" />
      </label>

      <label class="finance-field">
        <span class="finance-field__label">{{ t('银行户名') }}</span>
        <input class="finance-field__input" :value="bankInfo.holderName" />
      </label>

      <label class="finance-field">
        <span class="finance-field__label">{{ t('开户支行') }}</span>
        <input class="finance-field__input" :value="bankInfo.branch" />
      </label>

      <label class="finance-field">
        <span class="finance-field__label">{{ t('提款金额') }}</span>
        <input v-model="amount" class="finance-field__input" inputmode="decimal" />
      </label>

      <label class="finance-field finance-field--password">
        <span class="finance-field__label">{{ t('提款密码') }}</span>
        <input v-model="withdrawPassword" class="finance-field__input" type="password" />
      </label>

      <a class="withdraw-form__forgot" href="#" @click.prevent>{{ t('忘记密码') }}</a>

      <button class="btn btn--primary withdraw-form__submit" type="submit" :disabled="submitting">
        {{ submitting ? t('提交中...') : t('送出提款申请') }}
      </button>
    </form>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.withdraw-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.withdraw-channel {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: $spacing-2xl;

  @include web-only {
    height: 92px;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    height: 84px;
    padding: 22px $spacing-lg;
  }
}

.withdraw-channel__btn {
  width: 100%;
  height: 44px;
  background: var(--surface-card);
  border: 1px solid var(--theme-primary);
  border-radius: $radius-pill;
  color: var(--theme-primary);
  font-size: 15px;
  cursor: pointer;
  box-shadow: var(--shadow-primary-btn);

  @include mobile-only {
    height: 44px;
    font-size: $font-size-lg;
  }
}

.bank-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  color: var(--auxiliary-1);
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.2) 0 1px, transparent 1px 44%),
    linear-gradient(90deg, rgba(28, 123, 255, 0.55), rgba(6, 25, 62, 0.98)),
    #092856;
  border: 1px solid var(--auxiliary-1);
  box-shadow: 0 3px 10px rgba(13, 37, 78, 0.2);

  @include web-only {
    border-radius: $radius-xl;
  }

  @include mobile-only {
    border-radius: $radius-lg;
  }
}

.bank-card {
  @include web-only {
    height: 200px;
    padding: $spacing-2xl $spacing-2xl 28px;
  }

  @include mobile-only {
    height: 174px;
    padding: 28px 22px 24px;
  }
}

.bank-card__header,
.bank-card__number {
  position: relative;
  z-index: 1;
}

.bank-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bank-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 3px solid var(--auxiliary-1);
  border-radius: 50%;
  background: #d8232a;
  color: var(--auxiliary-1);
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.bank-card__name {
  font-size: 22px;
  font-weight: 500;
}

.bank-card__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 66px;
  height: $spacing-2xl;
  margin-left: auto;
  border-radius: $radius-sm;
  background: rgba(28, 123, 255, 0.15);
  color: var(--auxiliary-1);
  font-size: $font-size-md;
  font-weight: 400;
}

.bank-card__number {
  font-family: $font-family-num, $font-family-base;
  font-weight: 700;
  letter-spacing: 1px;

  @include web-only {
    margin-top: 84px;
    font-size: 24px;
  }

  @include mobile-only {
    margin-top: 66px;
    font-size: $font-size-lg;
  }
}

.withdraw-form {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;

  @include web-only {
    padding: $spacing-2xl $spacing-2xl 30px;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    padding: $spacing-lg;
    border-radius: $radius-lg;
  }
}

.withdraw-form__notice {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  height: 38px;
  padding: 0 $spacing-xl;
  margin-bottom: 18px;
  box-sizing: border-box;
  border-radius: $radius-lg;
  background: rgba(251, 92, 13, 0.1);
  color: var(--auxiliary-3);
  font-size: $font-size-md;
  font-weight: 400;
}

.withdraw-form__notice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: $font-family-num, $font-family-base;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.withdraw-form__forgot {
  display: block;
  width: fit-content;
  margin: 0 0 30px auto;
  color: var(--theme-primary);
  font-weight: 500;
  text-decoration: none;

  @include mobile-only {
    font-size: $font-size-md;
  }

  @include web-only {
    font-size: $font-size-sm;
  }
}

.withdraw-form__submit {
  width: 100%;
  height: 44px;
  font-size: $font-size-lg;

  @include web-only {
    width: 300px;
    height: 48px;
    font-size: $font-size-lg;
    margin: 0 auto;
  }
}

.finance-field {
  display: flex;
  flex-direction: column;

  @include web-only {
    margin-bottom: $spacing-xl;
    gap: 10px;
  }

  @include mobile-only {
    margin-bottom: $spacing-lg;
    gap: 6px;
  }
}

.finance-field__label {
  color: var(--theme-text-1);
  font-weight: 400;

  @include web-only {
    font-size: $font-size-base;
  }

  @include mobile-only {
    font-size: $font-size-md;
  }
}

.finance-field__input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--theme-divider);
  border-radius: $radius-md;
  outline: none;
  background: var(--auxiliary-1);
  color: var(--theme-text);
  font-weight: 400;

  @include web-only {
    height: 52px;
    font-size: $font-size-base;
    padding: 0 $spacing-xl;
  }

  @include mobile-only {
    font-size: $font-size-md;
    height: 44px;
    padding: 0 14px;
  }
}

.finance-field__input:focus {
  border-color: var(--theme-primary);
  background: var(--surface-card);
}

.finance-field__input[readonly] {
  cursor: default;
}
</style>
