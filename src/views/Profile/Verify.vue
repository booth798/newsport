<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';
import { submitVerification, fetchKycStatus } from '@/api/user';

const { t } = useI18n();
const toast = useToast();

const status = ref('loading');
const realName = ref('');
const idNumber = ref('');
const submitting = ref(false);

onMounted(async () => {
  try {
    const res = await fetchKycStatus();
    const kyc = res.data || {};
    if (kyc.status === 'APPROVED' || kyc.status === 'approved') {
      status.value = 'verified';
      realName.value = kyc.realName || '';
    } else if (kyc.status === 'PENDING' || kyc.status === 'pending') {
      status.value = 'pending';
    } else {
      status.value = 'unverified';
    }
  } catch {
    status.value = 'unverified';
  }
});

const ID_REG = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;

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
    await submitVerification({
      idType: 'mainland_id',
      realName: realName.value.trim(),
      idCardNo: idNumber.value.trim(),
    });
    // 对齐安卓：提交后进入审核中，而非直接视为已通过
    status.value = 'pending';
    toast.success(t('实名认证已提交'));
  } catch (error) {
    toast.error(error?.message || t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="profile-verify">
    <h3 class="section-title">{{ t('实名认证') }}</h3>

    <div v-if="status === 'loading'" class="verify-status">
      <span>{{ t('正在加载') }}...</span>
    </div>

    <div v-else-if="status === 'verified'" class="verify-status verify-status--success">
      <span class="verify-status__icon">✓</span>
      <span>{{ t('已通过') }}</span>
    </div>

    <div v-else-if="status === 'pending'" class="verify-status verify-status--pending">
      <span class="verify-status__icon verify-status__icon--pending">⏳</span>
      <span>{{ t('审核中') }}</span>
    </div>

    <template v-else>
      <div class="verify-form">
        <div class="form-group">
          <label class="form-label">{{ t('真实姓名') }}</label>
          <input
            v-model="realName"
            class="form-input"
            :placeholder="t('请输入真实姓名')"
          />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('身份证号') }}</label>
          <input
            v-model="idNumber"
            class="form-input"
            :placeholder="t('请输入身份证号')"
          />
        </div>

        <button class="btn btn--primary submit-btn" :disabled="submitting" @click="handleSubmit">
          {{ submitting ? t('加载中') : t('提交') }}
        </button>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-3xl;
}

.verify-status {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xl;
  border-radius: $radius-md;
  font-size: $font-size-base;

  &--success {
    background: rgba(34, 197, 94, 0.08);
    color: #16a34a;
  }

  &--pending {
    background: rgba(245, 158, 11, 0.08);
    color: #d97706;
  }

  &__icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #16a34a;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-sm;

    &--pending {
      background: #d97706;
    }
  }
}

.verify-form {
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

.submit-btn {
  height: 48px;
  width: 200px;
  margin-top: $spacing-lg;

  @include mobile-only {
    width: 100%;
  }
}
</style>
