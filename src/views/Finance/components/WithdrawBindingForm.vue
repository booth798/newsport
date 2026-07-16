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
import { addBankCard, addWallet } from '@/api/user';
import { useToast } from '@/hooks/useToast';

const BANK_OPTIONS = ['中国银行', '中国工商银行', '中国农业银行', '中国建设银行', '交通银行', '招商银行'];
const WALLET_OPTIONS = ['TRC20', 'ERC20'];

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  type: { type: String, validator: (value) => ['bank', 'wallet'].includes(value), required: true },
});

const emit = defineEmits(['update:modelValue', 'saved']);
const { t } = useI18n();
const toast = useToast();
const holderName = ref('');
const bankName = ref('');
const bankAccount = ref('');
const branchName = ref('');
const walletType = ref('');
const walletAddress = ref('');
const walletConfirmAddress = ref('');
const selectOpen = ref(false);
const submitting = ref(false);

const isBank = computed(() => props.type === 'bank');
const options = computed(() => (isBank.value ? BANK_OPTIONS : WALLET_OPTIONS));
const selectedValue = computed(() => (isBank.value ? bankName.value : walletType.value));
const selectPlaceholder = computed(() => (isBank.value ? t('请选择银行') : t('请选择钱包类型')));

function resetForm() {
  holderName.value = '';
  bankName.value = '';
  bankAccount.value = '';
  branchName.value = '';
  walletType.value = '';
  walletAddress.value = '';
  walletConfirmAddress.value = '';
  selectOpen.value = false;
}

function close() {
  emit('update:modelValue', false);
}

function selectOption(option) {
  if (isBank.value) bankName.value = option;
  else walletType.value = option;
  selectOpen.value = false;
}

async function submitBankCard() {
  if (!holderName.value.trim()) { toast.error(t('请输入持卡人姓名')); return null; }
  if (!bankName.value) { toast.error(t('请选择银行')); return null; }
  // 卡号对齐 OpenAPI BankCardBindReq：15-19 位数字
  if (!/^\d{15,19}$/.test(bankAccount.value.trim())) { toast.error(t('请输入有效卡号')); return null; }
  if (!branchName.value.trim()) { toast.error(t('请输入支行名称')); return null; }

  const response = await addBankCard({
    holderName: holderName.value.trim(),
    accountNo: bankAccount.value.trim(),
    accountNoConfirm: bankAccount.value.trim(),
    bankName: bankName.value,
    // 字段名对齐安卓 / OpenAPI：branch（非 branchName）
    branch: branchName.value.trim(),
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
    if (visible) resetForm();
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
              <div v-if="selectOpen" class="binding-select__options"><button v-for="option in options" :key="option"
                  type="button" @click="selectOption(option)">{{ t(option) }}</button></div>
            </div>
          </div>
          <label class="binding-field"><span>{{ t('银行帐户') }} <b>*</b></span>
            <BaseInput v-model="bankAccount" inputmode="numeric" :placeholder="t('请输入银行账户')" />
          </label>
          <label class="binding-field"><span>{{ t('支行名称') }} <b>*</b></span>
            <BaseInput v-model="branchName" :placeholder="t('请输入支行名称')" />
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
  color: #fb5c0d;
  font-size: 14px;
  font-weight: 400;
}

.binding-form__tip img {
  width: 16px;
  height: 16px;
}

.binding-form__tip span {
  padding-left: 20px;
  color: rgba(11, 52, 98, 0.5);
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
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;
}

.binding-field b {
  color: #ff2d2d;
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
  color: rgba(11, 52, 98, 0.5);
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
  border: 1px solid #dce9f8;
  border-radius: 0 0 14px 14px;
  background: #fff;
  box-shadow: 0 6px 12px rgba(11, 52, 98, 0.14);
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
