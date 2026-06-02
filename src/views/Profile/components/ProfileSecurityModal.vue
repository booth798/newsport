<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { changePassword } from '@/api/user';
import { useToast } from '@/hooks/useToast';

import ProfileSheetShell from '@/views/Profile/components/ProfileSheetShell.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const toast = useToast();

const activeTab = ref('login');
const submitting = ref(false);

const loginCurrent = ref('');
const loginNew = ref('');
const loginConfirm = ref('');
const withdrawCurrent = ref('');
const withdrawNew = ref('');
const withdrawConfirm = ref('');

const showLoginCurrent = ref(false);
const showLoginNew = ref(false);
const showLoginConfirm = ref(false);
const showWithdrawCurrent = ref(false);
const showWithdrawNew = ref(false);
const showWithdrawConfirm = ref(false);

function resetForm() {
  loginCurrent.value = '';
  loginNew.value = '';
  loginConfirm.value = '';
  withdrawCurrent.value = '';
  withdrawNew.value = '';
  withdrawConfirm.value = '';
  showLoginCurrent.value = false;
  showLoginNew.value = false;
  showLoginConfirm.value = false;
  showWithdrawCurrent.value = false;
  showWithdrawNew.value = false;
  showWithdrawConfirm.value = false;
}

function switchTab(tab) {
  activeTab.value = tab;
  resetForm();
}

async function handleSave() {
  const isLogin = activeTab.value === 'login';
  const current = isLogin ? loginCurrent.value : withdrawCurrent.value;
  const newPwd = isLogin ? loginNew.value : withdrawNew.value;
  const confirm = isLogin ? loginConfirm.value : withdrawConfirm.value;
  const minLen = isLogin ? 6 : 6;
  const maxLen = isLogin ? 12 : 20;

  if (!current.trim()) {
    toast.error(isLogin ? t('请输入旧登录密码') : t('请输入旧提现密码'));
    return;
  }
  if (!newPwd.trim()) {
    toast.error(isLogin ? t('请输入新密码') : t('请输入新提现密码'));
    return;
  }
  if (newPwd.length < minLen || newPwd.length > maxLen) {
    toast.error(isLogin ? t('登录密码长度提示') : t('提现密码长度提示'));
    return;
  }
  if (!confirm.trim()) {
    toast.error(isLogin ? t('请确认新密码') : t('请确认提现密码'));
    return;
  }
  if (newPwd !== confirm) {
    toast.error(t('两次密码输入不一致'));
    return;
  }

  try {
    submitting.value = true;
    await changePassword(activeTab.value, current, newPwd);
    toast.success(t('操作成功'));
    resetForm();
    emit('update:modelValue', false);
  } catch {
    toast.error(t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeTab.value = 'login';
      resetForm();
    }
  },
);
</script>

<template>
  <ProfileSheetShell
    :model-value="modelValue"
    :title="t('安全设置')"
    :aria-label="t('安全设置')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="security-tabs">
      <button
        type="button"
        class="security-tabs__item"
        :class="{ 'security-tabs__item--active': activeTab === 'login' }"
        @click="switchTab('login')"
      >
        {{ t('修改登录密码') }}
      </button>
      <button
        type="button"
        class="security-tabs__item"
        :class="{ 'security-tabs__item--active': activeTab === 'withdraw' }"
        @click="switchTab('withdraw')"
      >
        {{ t('修改提现密码') }}
      </button>
    </div>

    <div class="security-tip card-default">
      <div class="security-tip__head">
        <span class="security-tip__icon" aria-hidden="true">!</span>
        <span class="security-tip__label">{{ t('温馨提示') }}</span>
      </div>
      <ul v-if="activeTab === 'login'" class="security-tip__list">
        <li>{{ t('登录密码规则1') }}</li>
        <li>{{ t('登录密码规则2') }}</li>
        <li>{{ t('登录密码规则3') }}</li>
      </ul>
      <ul v-else class="security-tip__list">
        <li>{{ t('提现密码规则1') }}</li>
        <li>{{ t('提现密码规则2') }}</li>
        <li>{{ t('提现密码规则3') }}</li>
      </ul>
    </div>

    <div class="security-form card-default">
      <template v-if="activeTab === 'login'">
        <div class="security-form__group">
          <label class="security-form__label">
            {{ t('旧密码') }}
            <span class="security-form__required">*</span>
          </label>
          <div class="security-form__input-wrap card-primary">
            <input
              v-model="loginCurrent"
              class="security-form__input"
              :type="showLoginCurrent ? 'text' : 'password'"
              :placeholder="t('请输入旧登录密码')"
            />
            <button
              type="button"
              class="security-form__toggle"
              :aria-label="showLoginCurrent ? t('隐藏密码') : t('显示密码')"
              @click="showLoginCurrent = !showLoginCurrent"
            >
              <svg v-if="showLoginCurrent" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 10s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" stroke-width="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 3l14 14M8.5 8.7A3.5 3.5 0 0 0 10 13.5a3.5 3.5 0 0 0 2.3-.9M6 6.3C4.2 7.4 2.9 8.9 2 10c0 0 2.5 5 8 5 1.4 0 2.7-.4 3.8-1M12.5 5.5C11.4 4.9 10.2 4.5 9 4.5 4.5 4.5 2 9.5 2 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div class="security-form__group">
          <label class="security-form__label">
            {{ t('新密码') }}
            <span class="security-form__required">*</span>
          </label>
          <div class="security-form__input-wrap card-primary">
            <input
              v-model="loginNew"
              class="security-form__input"
              :type="showLoginNew ? 'text' : 'password'"
              :placeholder="t('请输入新密码占位')"
            />
            <button
              type="button"
              class="security-form__toggle"
              :aria-label="showLoginNew ? t('隐藏密码') : t('显示密码')"
              @click="showLoginNew = !showLoginNew"
            >
              <svg v-if="showLoginNew" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 10s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" stroke-width="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 3l14 14M8.5 8.7A3.5 3.5 0 0 0 10 13.5a3.5 3.5 0 0 0 2.3-.9M6 6.3C4.2 7.4 2.9 8.9 2 10c0 0 2.5 5 8 5 1.4 0 2.7-.4 3.8-1M12.5 5.5C11.4 4.9 10.2 4.5 9 4.5 4.5 4.5 2 9.5 2 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div class="security-form__group">
          <label class="security-form__label">
            {{ t('确认密码') }}
            <span class="security-form__required">*</span>
          </label>
          <div class="security-form__input-wrap card-primary">
            <input
              v-model="loginConfirm"
              class="security-form__input"
              :type="showLoginConfirm ? 'text' : 'password'"
              :placeholder="t('请再次输入新密码')"
            />
            <button
              type="button"
              class="security-form__toggle"
              :aria-label="showLoginConfirm ? t('隐藏密码') : t('显示密码')"
              @click="showLoginConfirm = !showLoginConfirm"
            >
              <svg v-if="showLoginConfirm" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 10s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" stroke-width="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 3l14 14M8.5 8.7A3.5 3.5 0 0 0 10 13.5a3.5 3.5 0 0 0 2.3-.9M6 6.3C4.2 7.4 2.9 8.9 2 10c0 0 2.5 5 8 5 1.4 0 2.7-.4 3.8-1M12.5 5.5C11.4 4.9 10.2 4.5 9 4.5 4.5 4.5 2 9.5 2 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="security-form__group">
          <label class="security-form__label">
            {{ t('旧提现密码') }}
            <span class="security-form__required">*</span>
          </label>
          <div class="security-form__input-wrap card-primary">
            <input
              v-model="withdrawCurrent"
              class="security-form__input"
              :type="showWithdrawCurrent ? 'text' : 'password'"
              :placeholder="t('请输入旧提现密码')"
            />
            <button
              type="button"
              class="security-form__toggle"
              :aria-label="showWithdrawCurrent ? t('隐藏密码') : t('显示密码')"
              @click="showWithdrawCurrent = !showWithdrawCurrent"
            >
              <svg v-if="showWithdrawCurrent" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 10s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" stroke-width="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 3l14 14M8.5 8.7A3.5 3.5 0 0 0 10 13.5a3.5 3.5 0 0 0 2.3-.9M6 6.3C4.2 7.4 2.9 8.9 2 10c0 0 2.5 5 8 5 1.4 0 2.7-.4 3.8-1M12.5 5.5C11.4 4.9 10.2 4.5 9 4.5 4.5 4.5 2 9.5 2 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div class="security-form__group">
          <label class="security-form__label">
            {{ t('新提现密码') }}
            <span class="security-form__required">*</span>
          </label>
          <div class="security-form__input-wrap card-primary">
            <input
              v-model="withdrawNew"
              class="security-form__input"
              :type="showWithdrawNew ? 'text' : 'password'"
              :placeholder="t('请输入新提现密码占位')"
            />
            <button
              type="button"
              class="security-form__toggle"
              :aria-label="showWithdrawNew ? t('隐藏密码') : t('显示密码')"
              @click="showWithdrawNew = !showWithdrawNew"
            >
              <svg v-if="showWithdrawNew" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 10s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" stroke-width="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 3l14 14M8.5 8.7A3.5 3.5 0 0 0 10 13.5a3.5 3.5 0 0 0 2.3-.9M6 6.3C4.2 7.4 2.9 8.9 2 10c0 0 2.5 5 8 5 1.4 0 2.7-.4 3.8-1M12.5 5.5C11.4 4.9 10.2 4.5 9 4.5 4.5 4.5 2 9.5 2 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div class="security-form__group">
          <label class="security-form__label">
            {{ t('确认提现密码') }}
            <span class="security-form__required">*</span>
          </label>
          <div class="security-form__input-wrap card-primary">
            <input
              v-model="withdrawConfirm"
              class="security-form__input"
              :type="showWithdrawConfirm ? 'text' : 'password'"
              :placeholder="t('请再次输入提现密码')"
            />
            <button
              type="button"
              class="security-form__toggle"
              :aria-label="showWithdrawConfirm ? t('隐藏密码') : t('显示密码')"
              @click="showWithdrawConfirm = !showWithdrawConfirm"
            >
              <svg v-if="showWithdrawConfirm" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 10s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" stroke-width="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 3l14 14M8.5 8.7A3.5 3.5 0 0 0 10 13.5a3.5 3.5 0 0 0 2.3-.9M6 6.3C4.2 7.4 2.9 8.9 2 10c0 0 2.5 5 8 5 1.4 0 2.7-.4 3.8-1M12.5 5.5C11.4 4.9 10.2 4.5 9 4.5 4.5 4.5 2 9.5 2 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <button
        type="button"
        class="btn btn--default-1 security-submit"
        :disabled="submitting"
        @click="handleSave"
      >
        {{ submitting ? t('加载中') : t('确认修改') }}
      </button>
    </template>
  </ProfileSheetShell>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.security-tabs {
  display: flex;
  gap: 0;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;

  &__item {
    flex: 1;
    height: 36px;
    padding: 0 8px;
    border: none;
    border-radius: 999px;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition:
      background 0.2s ease,
      color 0.2s ease;

    &--active {
      background: #fff;
      color: var(--theme-primary);
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(11, 52, 98, 0.12);
    }
  }
}

.security-tip {
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

.security-form {
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

  &__input-wrap {
    padding: 0 12px;
    border-radius: 16px;
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__input {
    flex: 1;
    min-width: 0;
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

  &__toggle {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: transparent;
    color: rgba(11, 52, 98, 0.45);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      color: var(--theme-primary);
    }
  }
}

.security-submit {
  width: 100%;
  min-height: 48px;
  flex-shrink: 0;
  font-weight: 600;
  box-shadow: var(--shadow-card);
}
</style>
