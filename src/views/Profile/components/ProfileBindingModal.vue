<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { addBankCard, addWallet, fetchBanks } from '@/api/user';
import { useToast } from '@/hooks/useToast';
import BaseInput from '@/components/BaseInput.vue';
import BaseModal from '@/components/BaseModal.vue';
import iconTipsUrl from '@/assets/images/common/icon_tips.svg?url';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // 打开时默认选中的标签：'bank' 银行卡 / 'wallet' 区块链
  initialTab: { type: String, default: 'bank' },
});

const emit = defineEmits(['update:modelValue', 'saved']);
const { t } = useI18n();
const toast = useToast();

const WALLET_OPTIONS = ['TRC20', 'ERC20'];

const activeTab = ref('bank');
const holderName = ref('');
/** 选中银行的 code，提交绑卡时传 bankCode */
const bankCode = ref('');
const banks = ref([]);
const banksLoading = ref(false);
const banksError = ref(false);
const bankAccount = ref('');
const walletType = ref('');
const walletAddress = ref('');
const walletConfirmAddress = ref('');
const selectOpen = ref(false);
const submitting = ref(false);

const options = computed(() => (activeTab.value === 'bank' ? banks.value : WALLET_OPTIONS));
const selectedBank = computed(() => banks.value.find((item) => item.code === bankCode.value) || null);
const selectedValue = computed(() => (
  activeTab.value === 'bank' ? (selectedBank.value?.name || '') : walletType.value
));
const selectPlaceholder = computed(() => activeTab.value === 'bank' ? t('请选择银行') : t('请选择钱包类型'));

/** 进绑卡时拉一次后台银行列表，展示 name、提交 code */
async function loadBanks() {
  banksLoading.value = true;
  banksError.value = false;
  try {
    const res = await fetchBanks();
    const list = Array.isArray(res?.data) ? res.data : [];
    banks.value = list.filter((item) => item?.code && item?.name);
    if (bankCode.value && !banks.value.some((item) => item.code === bankCode.value)) {
      bankCode.value = '';
    }
  } catch {
    banksError.value = true;
    banks.value = [];
  } finally {
    banksLoading.value = false;
  }
}

function resetForm() {
  holderName.value = '';
  bankCode.value = '';
  bankAccount.value = '';
  walletType.value = '';
  walletAddress.value = '';
  walletConfirmAddress.value = '';
  selectOpen.value = false;
}

function switchTab(tab) {
  activeTab.value = tab;
  selectOpen.value = false;
  if (tab === 'bank') loadBanks();
}

function selectOption(option) {
  if (activeTab.value === 'bank') bankCode.value = option?.code || '';
  else walletType.value = option || '';
  selectOpen.value = false;
}

function close() {
  emit('update:modelValue', false);
}

async function submitBankCard() {
  if (!holderName.value.trim()) { toast.error(t('请输入持卡人姓名')); return; }
  if (!bankCode.value) { toast.error(t('请选择银行')); return; }
  // 卡号对齐 BankCardBindReq：15-19 位数字；确认卡号与卡号一致
  const accountNo = bankAccount.value.trim();
  if (!/^\d{15,19}$/.test(accountNo)) { toast.error(t('请输入有效卡号')); return; }

  const res = await addBankCard({
    holderName: holderName.value.trim(),
    accountNo,
    accountNoConfirm: accountNo,
    bankCode: bankCode.value,
  });
  return res.data;
}

async function submitWallet() {
  if (!walletType.value) { toast.error(t('请选择钱包类型')); return; }
  if (!walletAddress.value.trim()) { toast.error(t('请输入钱包地址')); return; }
  if (!walletConfirmAddress.value.trim()) { toast.error(t('请再次输入钱包地址')); return; }
  if (walletAddress.value.trim() !== walletConfirmAddress.value.trim()) {
    toast.error(t('两次钱包地址输入不一致'));
    return;
  }

  const res = await addWallet({
    chainType: walletType.value,
    address: walletAddress.value.trim(),
    // 二次确认字段传确认框值，并附带安卓同款 alias 空串
    addressConfirm: walletConfirmAddress.value.trim(),
    alias: '',
  });
  return res.data;
}

async function handleSubmit() {
  if (submitting.value) return;
  try {
    submitting.value = true;
    const binding = activeTab.value === 'bank' ? await submitBankCard() : await submitWallet();
    if (!binding) return;
    toast.success(t('操作成功'));
    emit('saved', binding);
    resetForm();
    close();
  } catch (error) {
    toast.error(error?.message || t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    activeTab.value = props.initialTab === 'wallet' ? 'wallet' : 'bank';
    resetForm();
    if (activeTab.value === 'bank') loadBanks();
  },
);
</script>

<template>
  <BaseModal
    :model-value="props.modelValue"
    :title="t('绑定信息-提现')"
    :button-text="submitting ? t('加载中') : t('确认')"
    :action-disabled="submitting"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="handleSubmit"
  >
    <div class="profile-binding-modal">
      <div class="profile-binding-modal__tabs">
        <button type="button" :class="{ 'btn--primary active': activeTab === 'bank' }" @click="switchTab('bank')">
          {{ t('银行卡') }}
        </button>
        <button type="button" :class="{ 'btn--primary active': activeTab === 'wallet' }" @click="switchTab('wallet')">
          {{ t('区块链') }}
        </button>
      </div>

      <div class="profile-binding-modal__form">
        <div class="profile-binding-modal__tip">
          <strong><img :src="iconTipsUrl" alt="" />{{ t('温馨提示') }}</strong>
          <template v-if="activeTab === 'bank'">
            <span>{{ t('银行卡绑定温馨提示') }}</span>
          </template>
          <template v-else>
            <span>{{ t('区块链绑定提示1') }}</span>
            <span>{{ t('区块链绑定提示2') }}</span>
            <span>{{ t('区块链绑定提示3') }}</span>
          </template>
        </div>

        <template v-if="activeTab === 'bank'">
          <label class="profile-binding-modal__field">
            <span>{{ t('银行户名') }} <b>*</b></span>
            <BaseInput v-model="holderName" :placeholder="t('请输入姓名')" />
          </label>
          <div class="profile-binding-modal__field">
            <span>{{ t('银行名称') }} <b>*</b></span>
            <div class="profile-binding-modal__select" :class="{ open: selectOpen }">
              <button type="button" class="profile-binding-modal__select-trigger" @click="selectOpen = !selectOpen">
                <span :class="{ placeholder: !selectedValue }">{{ selectedValue || selectPlaceholder }}</span>
                <i aria-hidden="true" />
              </button>
              <div v-if="selectOpen" class="profile-binding-modal__options">
                <template v-if="activeTab === 'bank'">
                  <button v-if="banksLoading" type="button" class="placeholder" disabled>{{ t('加载中') }}</button>
                  <button v-else-if="banksError" type="button" @click.stop="loadBanks">{{ t('加载失败') }}，{{ t('重试') }}</button>
                  <button v-else-if="!banks.length" type="button" class="placeholder" disabled>{{ t('暂无数据') }}</button>
                  <template v-else>
                    <button
                      v-for="bank in banks"
                      :key="bank.code"
                      type="button"
                      @click="selectOption(bank)"
                    >{{ bank.name }}</button>
                  </template>
                </template>
                <template v-else>
                  <button type="button" class="placeholder" @click="selectOption('')">{{ selectPlaceholder }}</button>
                  <button v-for="option in options" :key="option" type="button" @click="selectOption(option)">{{ option }}</button>
                </template>
              </div>
            </div>
          </div>
          <label class="profile-binding-modal__field">
            <span>{{ t('银行帐户') }} <b>*</b></span>
            <BaseInput v-model="bankAccount" inputmode="numeric" :placeholder="t('请输入银行账户')" />
          </label>
        </template>

        <template v-else>
          <div class="profile-binding-modal__field">
            <span>{{ t('钱包类型') }} <b>*</b></span>
            <div class="profile-binding-modal__select" :class="{ open: selectOpen }">
              <button type="button" class="profile-binding-modal__select-trigger" @click="selectOpen = !selectOpen">
                <span :class="{ placeholder: !selectedValue }">{{ selectedValue || selectPlaceholder }}</span>
                <i aria-hidden="true" />
              </button>
              <div v-if="selectOpen" class="profile-binding-modal__options">
                <button type="button" class="placeholder" @click="selectOption('')">{{ selectPlaceholder }}</button>
                <button v-for="option in options" :key="option" type="button" @click="selectOption(option)">{{ option }}</button>
              </div>
            </div>
          </div>
          <label class="profile-binding-modal__field">
            <span>{{ t('钱包地址') }} <b>*</b></span>
            <BaseInput v-model="walletAddress" :placeholder="t('请输入钱包地址')" />
          </label>
          <label class="profile-binding-modal__field">
            <span>{{ t('确认钱包地址') }} <b>*</b></span>
            <BaseInput v-model="walletConfirmAddress" :placeholder="t('请再次输入钱包地址')" />
          </label>
        </template>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-binding-modal__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  height: 48px;
  padding: 6px 8px;
  border-radius: 30px;
  background: #eaf1f9;

  button {
    border-radius: 32px;
    color: var(--theme-primary);
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;

    &.active { color: #fff; }
  }
}

.profile-binding-modal__form {
  margin-top: 10px;
  padding: 18px 16px 8px;
  border-radius: 20px;
  background: #fff;
}

.profile-binding-modal__tip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(251, 92, 13, 0.1);

  strong {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #fb5c0d;
    font-size: 14px;
    font-weight: 400;
  }

  img { width: 16px; height: 16px; }
  span { padding-left: 20px; color: rgba(11, 52, 98, 0.5); font-size: 12px; }
}

.profile-binding-modal__field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;

  > span:first-child {
    color: rgba(11, 52, 98, 0.5);
    font-size: 14px;
    font-weight: 400;
  }

  b { color: #ff2d2d; font-weight: 400; }
}

.profile-binding-modal__select { position: relative; z-index: 2; }
.profile-binding-modal__select.open { z-index: 4; }

.profile-binding-modal__select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--theme-divider);
  border-radius: 12px;
  background: var(--auxiliary-1);
  color: var(--theme-text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;

  .placeholder { color: rgba(11, 52, 98, 0.5); }

  i {
    position: relative;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--theme-primary);
  }

  i::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 5px;
    width: 5px;
    height: 5px;
    border-right: 1.5px solid #fff;
    border-bottom: 1.5px solid #fff;
    transform: rotate(45deg);
  }
}

.profile-binding-modal__select.open .profile-binding-modal__select-trigger {
  border-color: var(--theme-primary);
}

.profile-binding-modal__select.open .profile-binding-modal__select-trigger i::after {
  top: 6px;
  transform: rotate(225deg);
}

.profile-binding-modal__options {
  position: absolute;
  top: calc(100% - 1px);
  left: 0;
  right: 0;
  z-index: 5;
  max-height: 210px;
  overflow-y: auto;
  border: 1px solid #dce9f8;
  border-radius: 0 0 16px 16px;
  background: #fff;
  box-shadow: 0 6px 12px rgba(11, 52, 98, 0.14);

  button {
    display: block;
    width: 100%;
    min-height: 48px;
    padding: 0 16px;
    border: 0;
    background: #fff;
    color: #0b3462;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }

  button:hover { background: #edf5ff; }
  button.placeholder { background: #edf5ff; color: rgba(11, 52, 98, 0.42); }
}

@include web-only {
  .profile-binding-modal__form { padding: 20px 16px 8px; }
  .profile-binding-modal__field > span:first-child,
  .profile-binding-modal__select-trigger,
  .profile-binding-modal__options button { font-size: 16px; }
}
</style>
