<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';
import { storeToRefs } from 'pinia';

import { changePassword } from '@/api/user';
import { useToast } from '@/hooks/useToast';
import { useUserStore } from '@/store/modules/user';
import BaseInput from '@/components/BaseInput.vue';
import BaseModal from '@/components/BaseModal.vue';
import iconEyeClosedUrl from '@/assets/images/common/icon_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/common/icon_eye_open.svg?url';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const toast = useToast();
const appStore = useAppStore();
const userStore = useUserStore();
const { userProfile } = storeToRefs(userStore);
const withdrawPasswordSet = computed(() => userProfile.value?.withdrawPasswordSet === true);

const activeSection = ref('login');
const submitting = ref(false);
const passwordVisibility = ref({
  loginCurrent: false,
  loginNew: false,
  loginConfirm: false,
  withdrawCurrent: false,
  withdrawNew: false,
  withdrawConfirm: false,
});
const loginCurrent = ref('');
const loginNew = ref('');
const loginConfirm = ref('');
const withdrawCurrent = ref('');
const withdrawNew = ref('');
const withdrawConfirm = ref('');

function resetForm() {
  loginCurrent.value = '';
  loginNew.value = '';
  loginConfirm.value = '';
  withdrawCurrent.value = '';
  withdrawNew.value = '';
  withdrawConfirm.value = '';
  Object.keys(passwordVisibility.value).forEach((field) => {
    passwordVisibility.value[field] = false;
  });
}

function close() {
  emit('update:modelValue', false);
}

function togglePasswordVisible(field) {
  passwordVisibility.value[field] = !passwordVisibility.value[field];
}

function passwordInputType(field) {
  return passwordVisibility.value[field] ? 'text' : 'password';
}

function passwordIcon(field) {
  return passwordVisibility.value[field] ? iconEyeOpenUrl : iconEyeClosedUrl;
}

async function handleSave() {
  const current = activeSection.value === 'login' ? loginCurrent.value : withdrawCurrent.value;
  const newPassword = activeSection.value === 'login' ? loginNew.value : withdrawNew.value;
  const confirm = activeSection.value === 'login' ? loginConfirm.value : withdrawConfirm.value;

  if ((activeSection.value === 'login' || withdrawPasswordSet.value) && !current.trim()) {
    toast.error(t('请输入当前密码'));
    return;
  }
  if (!newPassword.trim()) { toast.error(t('请输入新密码')); return; }
  if (newPassword.length < 6) { toast.error(t('密码长度至少6位')); return; }
  if (!confirm.trim()) { toast.error(t('请确认新密码')); return; }
  if (newPassword !== confirm) { toast.error(t('两次密码输入不一致')); return; }

  try {
    submitting.value = true;
    await changePassword(activeSection.value, current, newPassword);
    if (activeSection.value === 'withdraw') {
      userStore.updateUserProfile({ withdrawPasswordSet: true });
    }
    toast.success(t('操作成功'));
    resetForm();
    close();
    if (activeSection.value === 'login') {
      // 登录密码变更后当前凭证失效，清理会话并要求使用新密码重新登录。
      userStore.clearWebLogin();
      appStore.openLoginModal();
    }
  } catch (e){
    toast.error(e.message);
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  async (visible) => {
    if (visible) {
      // 打开弹窗前确保读取到提现密码设置状态，避免首次设置误展示旧密码输入框。
      try {
        await userStore.loadUserProfile();
      } catch {
        // 保留当前表单；请求失败时不阻断用户修改登录密码。
      }
      activeSection.value = 'login';
      resetForm();
    }
  },
);
</script>

<template>
  <BaseModal
    :model-value="props.modelValue"
    :title="t('安全设置')"
    :button-text="submitting ? t('加载中') : t('确认修改')"
    :action-disabled="submitting"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="handleSave"
  >
    <div class="profile-security-modal">
      <div class="profile-security-modal__tabs">
        <button type="button" :class="{ 'btn--primary active': activeSection === 'login' }" @click="activeSection = 'login'">
          {{ t('修改登入密码') }}
        </button>
        <button type="button" :class="{ 'btn--primary active': activeSection === 'withdraw' }" @click="activeSection = 'withdraw'">
          {{ t('修改提现密码') }}
        </button>
      </div>

      <div class="profile-security-modal__form">
        <div class="profile-security-modal__tip">
          <strong><img src="@/assets/images/common/icon_tips.svg" >{{ t('温馨提示') }}</strong>
          <span>{{ t(activeSection === 'login' ? '登录密码规则1' : '提现密码规则1') }}</span>
          <span>{{ t(activeSection === 'login' ? '登录密码规则2' : '提现密码规则2') }}</span>
          <span>{{ t(activeSection === 'login' ? '登录密码规则3' : '提现密码规则3') }}</span>
        </div>

        <template v-if="activeSection === 'login'">
          <label class="profile-security-modal__field">
            <span>{{ t('旧密码') }} <b>*</b></span>
            <BaseInput v-model="loginCurrent" :type="passwordInputType('loginCurrent')" :placeholder="t('请输入旧登录密码')">
              <template #suffix><img class="eye-icon" :aria-label="t('显示密码')" :src="passwordIcon('loginCurrent')" @click="togglePasswordVisible('loginCurrent')" /></template>
            </BaseInput>
          </label>
          <label class="profile-security-modal__field">
            <span>{{ t('新密码') }} <b>*</b></span>
            <BaseInput v-model="loginNew" :type="passwordInputType('loginNew')" :placeholder="t('请输入新密码占位')">
              <template #suffix><img class="eye-icon" :aria-label="t('显示密码')" :src="passwordIcon('loginNew')" @click="togglePasswordVisible('loginNew')" /></template>
            </BaseInput>
          </label>
          <label class="profile-security-modal__field">
            <span>{{ t('确认密码') }} <b>*</b></span>
            <BaseInput v-model="loginConfirm" :type="passwordInputType('loginConfirm')" :placeholder="t('请再次输入新密码')">
              <template #suffix><img class="eye-icon" :aria-label="t('显示密码')" :src="passwordIcon('loginConfirm')" @click="togglePasswordVisible('loginConfirm')" /></template>
            </BaseInput>
          </label>
        </template>

        <template v-else>
          <label v-if="withdrawPasswordSet" class="profile-security-modal__field">
            <span>{{ t('旧提现密码') }} <b>*</b></span>
            <BaseInput v-model="withdrawCurrent" :type="passwordInputType('withdrawCurrent')" :placeholder="t('请输入旧提现密码')">
              <template #suffix><img class="eye-icon" :aria-label="t('显示密码')" :src="passwordIcon('withdrawCurrent')" @click="togglePasswordVisible('withdrawCurrent')" /></template>
            </BaseInput>
          </label>
          <label class="profile-security-modal__field">
            <span>{{ t('新提现密码') }} <b>*</b></span>
            <BaseInput v-model="withdrawNew" :type="passwordInputType('withdrawNew')" :placeholder="t('请输入新提现密码占位')">
              <template #suffix><img class="eye-icon" :aria-label="t('显示密码')" :src="passwordIcon('withdrawNew')" @click="togglePasswordVisible('withdrawNew')" /></template>
            </BaseInput>
          </label>
          <label class="profile-security-modal__field">
            <span>{{ t('确认提现密码') }} <b>*</b></span>
            <BaseInput v-model="withdrawConfirm" :type="passwordInputType('withdrawConfirm')" :placeholder="t('请再次输入提现密码')">
              <template #suffix><img class="eye-icon" :aria-label="t('显示密码')" :src="passwordIcon('withdrawConfirm')" @click="togglePasswordVisible('withdrawConfirm')" /></template>
            </BaseInput>
          </label>
        </template>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;
.profile-security-modal__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  height: 48px;
  padding: 6px 8px;
  border-radius: 30px;
  background: #EAF1F9;

  button {
    border-radius: 32px;
    color: var(--theme-primary);
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;

    &.active {
      color: #fff;
    }
  }
}

.profile-security-modal__form {
  margin-top: 10px;
  padding: 18px 20px;
  border-radius: 24px;
  background: #fff;
}

.profile-security-modal__tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  padding: 9px 16px;
  border-radius: 16px;
  background: #FB5C0D1A;

  strong {
    color: #fb5c0d;
    font-size: 14px;
    font-weight: 400;
    display: flex;
    align-items: center;
    gap: 4px;
    img {
      width: 16px;
      height: 16px;
    }
    @include web-only {
      font-size: 14px;
    }
    @include mobile-only {
      font-size: 12px;
    }
  }
  span {
    font-size: 12px;
    padding-left: 20px;
    color: #0B346280;
  }
}

.profile-security-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;

  > span:first-child {
    color: #0B346280;
    font-weight: 400;
    @include web-only {
      font-size: 16px;
    }
    @include mobile-only {
      font-size: 14px;
    }
  }

  b {
    color: #ff2d2d;
    font-weight: 400;
  }
}

.profile-security-modal__field .eye-icon {
  width: 28px;
  height: 28px;
  cursor: pointer;
}

</style>
