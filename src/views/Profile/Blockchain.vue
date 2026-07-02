<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';
import { addWallet, fetchBindings, removeBinding } from '@/api/user';

const { t } = useI18n();
const toast = useToast();

const wallets = ref([]);
const loading = ref(true);
const walletType = ref('');
const walletAddress = ref('');
const submitting = ref(false);

const WALLET_TYPES = ['USDT-TRC20', 'USDT-ERC20', 'BTC', 'ETH'];

onMounted(async () => {
  try {
    const res = await fetchBindings();
    const list = res.data || [];
    wallets.value = list.filter((b) => b.type === 'CRYPTO' || b.type === 'BLOCKCHAIN');
  } catch { /* keep empty */ }
  finally { loading.value = false; }
});

async function handleSubmit() {
  if (!walletType.value) {
    toast.error(t('请选择钱包类型'));
    return;
  }
  if (!walletAddress.value.trim()) {
    toast.error(t('请输入钱包地址'));
    return;
  }
  try {
    submitting.value = true;
    const res = await addWallet({
      network: walletType.value,
      address: walletAddress.value.trim(),
    });
    wallets.value.push(res.data);
    toast.success(t('操作成功'));
    walletType.value = '';
    walletAddress.value = '';
  } catch {
    toast.error(t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}

async function handleRemove(wallet) {
  try {
    await removeBinding('crypto', wallet.id);
    wallets.value = wallets.value.filter((w) => w.id !== wallet.id);
    toast.success(t('操作成功'));
  } catch {
    toast.error(t('提交失败，请重试'));
  }
}
</script>

<template>
  <div class="profile-blockchain">
    <h3 class="section-title">{{ t('区块链') }}</h3>

    <div class="bind-tabs">
      <RouterLink to="/profile/bank-card" class="bind-tab">{{ t('银行卡') }}</RouterLink>
      <RouterLink to="/profile/blockchain" class="bind-tab active">{{ t('区块链') }}</RouterLink>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <div v-else-if="wallets.length > 0" class="wallet-list">
      <div v-for="w in wallets" :key="w.id" class="wallet-item">
        <div class="wallet-item__info">
          <span class="wallet-item__type">{{ (w.network || w.type || '').toUpperCase() }}</span>
          <span class="wallet-item__address">{{ w.address }}</span>
        </div>
        <button type="button" class="wallet-item__delete" @click="handleRemove(w)">{{ t('解绑') }}</button>
      </div>
    </div>

    <div class="bind-form">
      <div class="form-group">
        <label class="form-label">{{ t('钱包类型') }}</label>
        <select v-model="walletType" class="form-select">
          <option value="">{{ t('请选择') }}</option>
          <option v-for="wt in WALLET_TYPES" :key="wt" :value="wt">{{ wt }}</option>
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

.wallet-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  margin-bottom: $spacing-3xl;
}

.wallet-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;

  &__info {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    flex: 1;
    min-width: 0;
  }

  &__type {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: $radius-sm;
    background: var(--theme-primary);
    color: #fff;
    font-size: $font-size-sm;
    font-weight: 600;
  }

  &__address {
    font-family: $font-family-num;
    font-size: $font-size-sm;
    color: var(--theme-text);
    word-break: break-all;
    min-width: 0;
  }

  &__delete {
    flex-shrink: 0;
    padding: 4px 12px;
    border: 1px solid var(--auxiliary-2);
    border-radius: $radius-sm;
    background: transparent;
    color: var(--auxiliary-2);
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--auxiliary-2);
      color: #fff;
    }
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: 40px 0;
  color: var(--theme-text-1);
  font-size: $font-size-md;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
