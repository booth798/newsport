<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['submit']);
const { t } = useI18n();

const bindingTab = ref('bank');
const bankHolderName = ref('李*');
const bankName = ref('中国银行');
const bankAccount = ref('6213 **** **** 6452');
const bankBranch = ref('雨花区');
const walletType = ref('');
const walletAddress = ref('');
const walletConfirmAddress = ref('');
</script>

<template>
  <div class="profile-modal-tabs">
    <button type="button" :class="{ active: bindingTab === 'bank' }" @click="bindingTab = 'bank'">
      {{ t('银行卡') }}
    </button>
    <button type="button" :class="{ active: bindingTab === 'wallet' }" @click="bindingTab = 'wallet'">
      {{ t('区块链') }}
    </button>
  </div>

  <div class="profile-modal-card profile-form-card">
    <div class="profile-modal-notice profile-modal-notice--stack">
      <span>!</span>
      <div>
        <strong>{{ t('温馨提示') }}</strong>
        <p>{{ t(bindingTab === 'bank' ? '银行卡绑定温馨提示' : '区块链绑定温馨提示') }}</p>
      </div>
    </div>

    <template v-if="bindingTab === 'bank'">
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('银行户名') }} *</span>
        <input v-model="bankHolderName" class="profile-modal-input" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('银行名称') }} *</span>
        <input v-model="bankName" class="profile-modal-input" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('银行帐户') }} *</span>
        <input v-model="bankAccount" class="profile-modal-input" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('支行名称') }} *</span>
        <input v-model="bankBranch" class="profile-modal-input" />
      </label>
    </template>

    <template v-else>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('钱包类型') }} *</span>
        <select v-model="walletType" class="profile-modal-input profile-modal-select">
          <option value="">{{ t('请选择钱包类型') }}</option>
          <option value="TRC20">TRC20</option>
          <option value="ERC20">ERC20</option>
        </select>
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('钱包地址') }} *</span>
        <input v-model="walletAddress" class="profile-modal-input" :placeholder="t('请输入钱包地址')" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('确认钱包地址') }} *</span>
        <input v-model="walletConfirmAddress" class="profile-modal-input" :placeholder="t('请再次输入钱包地址')" />
      </label>
    </template>
  </div>

  <button type="button" class="profile-modal-submit" @click="emit('submit')">
    {{ t('确认') }}
  </button>
</template>
