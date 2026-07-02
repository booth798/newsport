<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';
import { addBankCard, fetchBindings, removeBinding } from '@/api/user';

const { t } = useI18n();
const toast = useToast();

const cards = ref([]);
const loading = ref(true);
const showForm = ref(false);
const cardName = ref('');
const cardNumber = ref('');
const bankName = ref('');
const submitting = ref(false);

onMounted(async () => {
  try {
    const res = await fetchBindings();
    const list = res.data || [];
    cards.value = list.filter((b) => b.type === 'BANK_CARD' || b.type === 'BANK');
  } catch { /* keep empty */ }
  finally { loading.value = false; }
});

async function handleRemove(card) {
  try {
    await removeBinding('bank-card', card.id);
    cards.value = cards.value.filter((c) => c.id !== card.id);
    toast.success(t('操作成功'));
  } catch {
    toast.error(t('提交失败，请重试'));
  }
}

async function handleAdd() {
  if (!cardName.value.trim()) {
    toast.error(t('请输入持卡人姓名'));
    return;
  }
  if (!cardNumber.value.trim() || cardNumber.value.trim().length < 13) {
    toast.error(t('请输入有效卡号'));
    return;
  }
  if (!bankName.value.trim()) {
    toast.error(t('请输入开户银行'));
    return;
  }
  try {
    submitting.value = true;
    const res = await addBankCard({
      holderName: cardName.value,
      cardNumber: cardNumber.value,
      bankName: bankName.value,
    });
    cards.value.push(res.data);
    toast.success(t('操作成功'));
    showForm.value = false;
    cardName.value = '';
    cardNumber.value = '';
    bankName.value = '';
  } catch {
    toast.error(t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="profile-bank">
    <h3 class="section-title">{{ t('银行卡') }}</h3>

    <div class="bind-tabs">
      <RouterLink to="/profile/bank-card" class="bind-tab active">{{ t('银行卡') }}</RouterLink>
      <RouterLink to="/profile/blockchain" class="bind-tab">{{ t('区块链') }}</RouterLink>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <div v-else-if="cards.length > 0" class="card-list">
      <div v-for="card in cards" :key="card.id" class="card-item">
        <div class="card-item__info">
          <span class="card-item__bank">{{ card.bankName || card.name }}</span>
          <span class="card-item__number">{{ card.maskedNumber || card.cardNumber || card.accountNo }}</span>
        </div>
        <button type="button" class="card-item__delete" @click="handleRemove(card)">{{ t('解绑') }}</button>
      </div>
    </div>

    <div v-if="showForm" class="bank-form">
      <div class="form-group">
        <label class="form-label">{{ t('持卡人姓名') }}</label>
        <input v-model="cardName" class="form-input" :placeholder="t('请输入持卡人姓名')" />
      </div>
      <div class="form-group">
        <label class="form-label">{{ t('卡号') }}</label>
        <input v-model="cardNumber" class="form-input" inputmode="numeric" :placeholder="t('请输入卡号')" />
      </div>
      <div class="form-group">
        <label class="form-label">{{ t('开户银行') }}</label>
        <input v-model="bankName" class="form-input" :placeholder="t('请输入开户银行')" />
      </div>
      <div class="bank-form__actions">
        <button type="button" class="btn bank-form__cancel" @click="showForm = false">{{ t('取消') }}</button>
        <button class="btn btn--primary bank-form__submit" :disabled="submitting" @click="handleAdd">
          {{ submitting ? t('提交中...') : t('提交') }}
        </button>
      </div>
    </div>

    <div v-else class="add-area">
      <button class="btn btn--primary add-btn" @click="showForm = true">+ {{ t('银行卡') }}</button>
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

.card-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;
}

.card-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg $spacing-xl;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;

  &__info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__bank {
    font-size: $font-size-md;
    font-weight: 600;
    color: var(--theme-text);
  }

  &__number {
    font-family: $font-family-num;
    font-size: $font-size-md;
    color: var(--theme-text-1);
  }

  &__delete {
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

.bank-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;

  &__actions {
    display: flex;
    gap: $spacing-md;
  }

  &__cancel {
    flex: 1;
    height: 44px;
    background: var(--auxiliary-1);
    color: var(--theme-text);
    border: 1.5px solid var(--theme-divider);
    border-radius: $radius-md;
  }

  &__submit {
    flex: 1;
    height: 44px;
  }
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

.add-area {
  text-align: center;
  padding: 40px 0;
}

.add-btn {
  height: 44px;
  padding: 0 32px;
}
</style>
