<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { fetchUserProfile, submitVerification } from '@/api/user';
import { useToast } from '@/hooks/useToast';

import ProfileSheetShell from '@/views/Profile/components/ProfileSheetShell.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const ID_REG = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;

const { t } = useI18n();
const toast = useToast();

const status = ref('unverified');
const realName = ref('');
const idNumber = ref('');
const verifiedName = ref('');
const verifiedIdNumber = ref('');
const submitting = ref(false);
const loading = ref(false);

const isVerified = computed(() => status.value === 'verified');

const maskedName = computed(() => {
  const name = verifiedName.value;
  if (!name) return '—';
  if (name.length <= 1) return `${name}*`;
  return `${name.charAt(0)}*`;
});

const maskedIdNumber = computed(() => {
  const id = verifiedIdNumber.value;
  if (!id || id.length < 8) return id || '—';
  return `${id.slice(0, 6)}********${id.slice(-4)}`;
});

async function loadVerifyStatus() {
  try {
    loading.value = true;
    const res = await fetchUserProfile();
    const data = res.data || {};
    if (data.verifyStatus === 'verified') {
      status.value = 'verified';
      verifiedName.value = data.realName || '李雷';
      verifiedIdNumber.value = data.idNumber || '410237198012043927';
    } else {
      status.value = 'unverified';
      realName.value = '';
      idNumber.value = '';
    }
  } catch {
    /* keep current state */
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (!realName.value.trim()) {
    toast.error(t('请输入真实姓名'));
    return;
  }
  if (!idNumber.value.trim()) {
    toast.error(t('请输入身份证号'));
    return;
  }
  if (!ID_REG.test(idNumber.value.trim())) {
    toast.error(t('身份证号格式不正确'));
    return;
  }

  try {
    submitting.value = true;
    await submitVerification(realName.value, idNumber.value);
    verifiedName.value = realName.value.trim();
    verifiedIdNumber.value = idNumber.value.trim();
    status.value = 'verified';
    toast.success(t('操作成功'));
  } catch {
    toast.error(t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadVerifyStatus();
  },
);
</script>

<template>
  <ProfileSheetShell
    :model-value="modelValue"
    :title="t('实名认证')"
    :aria-label="t('实名认证')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="loading" class="verify-loading">
      <div class="verify-loading__spinner" />
    </div>

    <template v-else>
      <div v-if="isVerified" class="verify-success card-default">
        <span class="verify-success__icon" aria-hidden="true">✓</span>
        <div>
          <p class="verify-success__title">{{ t('已通过实名认证') }}</p>
          <p class="verify-success__desc">{{ t('实名认证已通过不可修改') }}</p>
        </div>
      </div>

      <div v-else class="verify-tip card-default">
        <div class="verify-tip__head">
          <span class="verify-tip__icon" aria-hidden="true">!</span>
          <span class="verify-tip__label">{{ t('温馨提示') }}</span>
        </div>
        <ul class="verify-tip__list">
          <li>{{ t('实名认证提示1') }}</li>
          <li>{{ t('实名认证提示2') }}</li>
          <li>{{ t('实名认证提示3') }}</li>
        </ul>
      </div>

      <div class="verify-form card-default">
        <div class="verify-form__group">
          <label class="verify-form__label">
            {{ t('真实姓名') }}
            <span class="verify-form__required">*</span>
          </label>
          <div v-if="isVerified" class="verify-form__value">{{ maskedName }}</div>
          <div v-else class="verify-form__input-wrap card-primary">
            <input
              v-model="realName"
              class="verify-form__input"
              type="text"
              :placeholder="t('请填写真实姓名')"
            />
          </div>
        </div>

        <div class="verify-form__group">
          <label class="verify-form__label">
            {{ t('身份证号码') }}
            <span class="verify-form__required">*</span>
          </label>
          <div v-if="isVerified" class="verify-form__value">{{ maskedIdNumber }}</div>
          <div v-else class="verify-form__input-wrap card-primary">
            <input
              v-model="idNumber"
              class="verify-form__input"
              type="text"
              maxlength="18"
              :placeholder="t('请填写真实身份证号码')"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-if="!isVerified && !loading" #footer>
      <button
        type="button"
        class="btn btn--default-1 verify-submit"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? t('加载中') : t('提交认证') }}
      </button>
    </template>
  </ProfileSheetShell>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.verify-loading {
  display: flex;
  justify-content: center;
  padding: 32px 0;

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: verify-spin 0.8s linear infinite;
  }
}

.verify-success {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(232, 244, 255, 0.95);

  &__icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--theme-primary);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    margin: 0 0 2px;
    font-size: 14px;
    font-weight: 600;
    color: var(--theme-primary);
  }

  &__desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(11, 52, 98, 0.55);
  }
}

.verify-tip {
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 243, 230, 0.95);

  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  &__icon {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f59e0b;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__label {
    font-size: 14px;
    font-weight: 600;
    color: #d97706;
  }

  &__list {
    margin: 0;
    padding: 0 0 0 16px;
    font-size: 12px;
    line-height: 1.6;
    color: rgba(11, 52, 98, 0.65);
  }
}

.verify-form {
  padding: 12px;
  border-radius: 12px;

  &__group {
    &:not(:last-child) {
      margin-bottom: 12px;
    }
  }

  &__label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: rgba(11, 52, 98, 0.72);
  }

  &__required {
    color: #ef4444;
    margin-left: 2px;
  }

  &__value {
    min-height: 48px;
    padding: 0 12px;
    border-radius: 16px;
    background: rgba(234, 241, 249, 0.9);
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 500;
    color: #0b3462;
  }

  &__input-wrap {
    padding: 0 12px;
    border-radius: 16px;
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  &__input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 16px;
    font-weight: 500;
    color: #0b3462;
    outline: none;
    padding: 12px 0;
    box-sizing: border-box;

    &::placeholder {
      color: rgba(11, 52, 98, 0.35);
      font-weight: 400;
    }
  }
}

.verify-submit {
  width: 100%;
  min-height: 48px;
  flex-shrink: 0;
  font-weight: 600;
  box-shadow: var(--shadow-card);
}

@keyframes verify-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
