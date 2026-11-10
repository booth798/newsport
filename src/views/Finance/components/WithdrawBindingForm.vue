<script setup>
/**
 * 新增收款方式统一使用公共弹窗，按传入类型展示银行卡或区块链表单。
 * 保存成功后将新绑定项回传父页面刷新并选中。
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseInput from '@/components/BaseInput.vue';
import BaseModal from '@/components/BaseModal.vue';
import iconTipsUrl from '@/assets/images/common/icon_tips.svg?url';
import { addBankCard, addWallet, fetchBanks } from '@/api/user';
import { useToast } from '@/hooks/useToast';

const WALLET_OPTIONS = ['TRC20', 'ERC20'];

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  type: { type: String, validator: (value) => ['bank', 'wallet'].includes(value), required: true },
});

const emit = defineEmits(['update:modelValue', 'saved']);
const { t } = useI18n();
const toast = useToast();
const holderName = ref('');
/** 选中银行 code，提交时传 bankCode */
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

const isBank = computed(() => props.type === 'bank');
const options = computed(() => (isBank.value ? banks.value : WALLET_OPTIONS));
const selectedBank = computed(() => banks.value.find((item) => item.code === bankCode.value) || null);
const selectedValue = computed(() => (isBank.value ? (selectedBank.value?.name || '') : walletType.value));
const selectPlaceholder = computed(() => (isBank.value ? t('请选择银行') : t('请选择钱包类型')));

/** 打开绑卡弹层时拉后台银行列表 */
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

function close() {
  emit('update:modelValue', false);
}

function selectOption(option) {
  if (isBank.value) bankCode.value = option?.code || '';
  else walletType.value = option || '';
  selectOpen.value = false;
}

async function submitBankCard() {
  if (!holderName.value.trim()) { toast.error(t('请输入持卡人姓名')); return null; }
  if (!bankCode.value) { toast.error(t('请选择银行')); return null; }
  // 卡号 15-19 位数字；确认卡号与卡号一致
  const accountNo = bankAccount.value.trim();
  if (!/^\d{15,19}$/.test(accountNo)) { toast.error(t('请输入有效卡号')); return null; }

  const response = await addBankCard({
    holderName: holderName.value.trim(),
    accountNo,
    accountNoConfirm: accountNo,
    bankCode: bankCode.value,
  });
  return response?.data;
}

async function submitWallet() {
  if (!walletType.value) { toast.error(t('请选择钱包类型')); return null; }
  if (!walletAddress.value.trim()) { toast.error(t('请输入钱包地址')); return null; }
  if (!walletConfirmAddress.value.trim()) { toast.error(t('请再次输入钱包地址')); return null; }
  if (walletAddress.value.trim() !== walletConfirmAddress.value.trim()) {
    toast.error(t('两次钱包地址输入不一致'));
    return null;
  }

  const response = await addWallet({
    chainType: walletType.value,
    address: walletAddress.value.trim(),
    addressConfirm: walletConfirmAddress.value.trim(),
    alias: '',
  });
  return response?.data;
}

async function submit() {
  if (submitting.value) return;
  try {
    submitting.value = true;
    const binding = isBank.value ? await submitBankCard() : await submitWallet();
    if (!binding) return;
    toast.success(t('操作成功'));
    emit('saved', binding);
    close();
  } catch (error) {
    toast.error(error?.message || t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm();
      if (isBank.value) loadBanks();
    }
  },
);
</script>

<template>
  <BaseModal :model-value="props.modelValue" :title="t('绑定信息-提现')" :button-text="submitting ? t('加载中') : t('确认')"
    :action-disabled="submitting" @update:model-value="emit('update:modelValue', $event)" @confirm="submit">
    <div class="binding-modal">
      <div class="binding-form">
        <div class="binding-form__tip">
          <strong><img :src="iconTipsUrl" alt="" />{{ t('温馨提示') }}</strong>
          <span v-if="isBank">{{ t('银行卡绑定温馨提示') }}</span>
          <template v-else><span>{{ t('区块链绑定提示1') }}</span><span>{{ t('区块链绑定提示2') }}</span><span>{{ t('区块链绑定提示3')
              }}</span></template>
        </div>
        <template v-if="isBank">
          <label class="binding-field"><span>{{ t('银行户名') }} <b>*</b></span>
            <BaseInput v-model="holderName" :placeholder="t('请输入姓名')" />
          </label>
          <div class="binding-field"><span>{{ t('银行名称') }} <b>*</b></span>
            <div class="binding-select" :class="{ open: selectOpen }"><button type="button"
                @click="selectOpen = !selectOpen"><span :class="{ placeholder: !selectedValue }">{{ selectedValue ||
                  selectPlaceholder }}</span><i aria-hidden="true" /></button>
              <div v-if="selectOpen" class="binding-select__options">
                <button v-if="banksLoading" type="button" disabled>{{ t('加载中') }}</button>
                <button v-else-if="banksError" type="button" @click.stop="loadBanks">{{ t('加载失败') }}，{{ t('重试') }}</button>
                <button v-else-if="!banks.length" type="button" disabled>{{ t('暂无数据') }}</button>
                <template v-else>
                  <button
                    v-for="bank in banks"
                    :key="bank.code"
                    type="button"
                    @click="selectOption(bank)"
                  >{{ bank.name }}</button>
                </template>
              </div>
            </div>
          </div>
          <label class="binding-field"><span>{{ t('银行帐户') }} <b>*</b></span>
            <BaseInput v-model="bankAccount" inputmode="numeric" :placeholder="t('请输入银行账户')" />
          </label>
        </template>
        <template v-else>
          <div class="binding-field"><span>{{ t('钱包类型') }} <b>*</b></span>
            <div class="binding-select" :class="{ open: selectOpen }"><button type="button"
                @click="selectOpen = !selectOpen"><span :class="{ placeholder: !selectedValue }">{{ selectedValue ||
                  selectPlaceholder }}</span><i aria-hidden="true" /></button>
              <div v-if="selectOpen" class="binding-select__options"><button v-for="option in options" :key="option"
                  type="button" @click="selectOption(option)">{{ option }}</button></div>
            </div>
          </div>
          <label class="binding-field"><span>{{ t('钱包地址') }} <b>*</b></span>
            <BaseInput v-model="walletAddress" :placeholder="t('请输入钱包地址')" />
          </label>
          <label class="binding-field"><span>{{ t('确认钱包地址') }} <b>*</b></span>
            <BaseInput v-model="walletConfirmAddress" :placeholder="t('请再次输入钱包地址')" />
          </label>
        </template>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.binding-modal {
  padding-top: 2px;
}

.binding-form {
  padding: 16px;
  border-radius: 20px;
  background: #fff;
}

.binding-modal .binding-form {
  margin-top: 2px;
}

.binding-form__tip {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(251, 92, 13, 0.1);
}

.binding-form__tip strong {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--auxiliary-3);
  font-size: 14px;
  font-weight: 400;
}

.binding-form__tip img {
  width: 16px;
  height: 16px;
}

.binding-form__tip span {
  padding-left: 20px;
  color: rgba(var(--theme-text-rgb), 0.5);
  font-size: 12px;
}

.binding-field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 13px;
}

.binding-field>span {
  color: rgba(var(--theme-text-rgb), 0.5);
  font-size: 14px;
}

.binding-field b {
  color: var(--auxiliary-2);
  font-weight: 400;
}

.binding-select {
  position: relative;
  z-index: 2;
}

.binding-select.open {
  z-index: 5;
}

.binding-select>button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--theme-divider);
  border-radius: 12px;
  background: #fff;
  color: var(--theme-text);
  font-size: 14px;
  text-align: left;
}

.binding-select .placeholder {
  color: rgba(var(--theme-text-rgb), 0.5);
}

.binding-select i {
  width: 8px;
  height: 8px;
  border-right: 1.5px solid var(--theme-primary);
  border-bottom: 1.5px solid var(--theme-primary);
  transform: rotate(45deg);
}

.binding-select__options {
  position: absolute;
  top: calc(100% - 1px);
  right: 0;
  left: 0;
  max-height: 190px;
  overflow-y: auto;
  border: 1px solid var(--surface-brand);
  border-radius: 0 0 14px 14px;
  background: #fff;
  box-shadow: 0 6px 12px rgba(var(--theme-text-rgb), 0.14);
}

.binding-select__options button {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  background: #fff;
  color: var(--theme-text);
  text-align: left;
}

.binding-form__submit {
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  border-radius: 24px;
}

@include web-only {
  .binding-form {
    padding: 18px 16px 8px;
  }

  .binding-field>span,
  .binding-select>button,
  .binding-select__options button {
    font-size: 16px;
  }
}
@include mobile-only {
  .binding-field>span,
  .binding-select>button,
  .binding-select__options button {
    font-size: 14px;
  }
}
</style>
