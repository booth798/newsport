<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';

const { t } = useI18n();
const toast = useToast();

const wallets = ref([]);
const walletType = ref('');
const walletAddress = ref('');
const submitting = ref(false);

function handleSubmit() {
  if (!walletType.value) {
    toast.error(t('请选择钱包类型'));
    return;
  }
  if (!walletAddress.value.trim()) {
    toast.error(t('请输入钱包地址'));
    return;
  }
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    wallets.value.push({ type: walletType.value, address: walletAddress.value.trim() });
    toast.success(t('操作成功'));
    walletType.value = '';
    walletAddress.value = '';
  }, 800);
}
</script>

<template>
  <div class="profile-blockchain">
    <h3 class="section-title">{{ t('区块链') }}</h3>

    <div class="bind-tabs">
      <RouterLink to="/profile/bank-card" class="bind-tab">{{ t('银行卡') }}</RouterLink>
      <RouterLink to="/profile/blockchain" class="bind-tab active">{{ t('区块链') }}</RouterLink>
    </div>

    <div v-if="wallets.length === 0" class="bind-form">
      <div class="form-group">
        <label class="form-label">{{ t('钱包类型') }}</label>
        <select v-model="walletType" class="form-select">
          <option value="">{{ t('钱包类型') }}</option>
          <option value="trc20">TRC20</option>
          <option value="erc20">ERC20</option>
          <option value="bep20">BEP20</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('钱包地址') }}</label>
        <input
          v-model="walletAddress"
          class="form-input"
          :placeholder="t('钱包地址')"
        />
      </div>

      <button class="btn btn--primary submit-btn" :disabled="submitting" @click="handleSubmit">
        {{ submitting ? t('加载中') : t('提交') }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-xl;
}

.bind-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-3xl;
}

.bind-tab {
  padding: 8px 20px;
  border-radius: $radius-pill;
  font-size: $font-size-md;
  color: var(--theme-text);
  border: 1.5px solid var(--theme-divider);
  transition: all 0.2s;
  background: transparent;

  &:hover,
  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

.bind-form {
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

.form-input,
.form-select {
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

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230B3462' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
}

.submit-btn {
  height: 48px;
  width: 200px;
  margin-top: $spacing-sm;

  @include mobile-only {
    width: 100%;
  }
}
</style>
