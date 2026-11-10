<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import logoUrl from '@/assets/images/common/logo_nav.png?url';
import iconEyeClosedUrl from '@/assets/images/login/icon_login_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/login/icon_login_eye_open.svg?url';
import iconLockUrl from '@/assets/images/login/icon_login_lock.svg?url';
import iconRefreshUrl from '@/assets/images/login/icon_register_refresh.svg?url';
import { useToast } from '@/hooks/useToast';
import { registerApi } from '@/api/user';
import { useAppStore } from '@/store/modules/app';
import RegisterSuccessModal from '@/components/RegisterSuccessModal.vue';
import {
  captureRegisterAttributionFromQuery,
  clearRegisterAgentCode,
  getRegisterAttributionOptions,
} from '@/utils/registerAttribution';
import {
  validateLoginPassword,
} from '@/constants/loginPassword';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();

// 独立注册页：立即捕获 ?ac=，避免仅依赖路由守卫时序
captureRegisterAttributionFromQuery(route.query);

const accountOptions = ref([]);
const selectedAccount = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const successOpen = ref(false);
/** 注册成功弹窗展示用的账号/密码快照 */
const registeredAccount = ref('');
const registeredPassword = ref('');

const passwordType = computed(() => (showPassword.value ? 'text' : 'password'));
const isAccountValid = computed(() => selectedAccount.value.length > 0);
/** 注册密码：6-12 位须含字母和数字（允许特殊字符），且不能包含账号（大小写不敏感） */
const isPasswordValid = computed(() => (
  validateLoginPassword(password.value, selectedAccount.value).ok
));
/** 后端已取消滑块验证，表单合法即可提交 */
const canSubmit = computed(() => isAccountValid.value && isPasswordValid.value
  && confirmPassword.value === password.value && !submitting.value);

function makeAccount() {
  const suffix = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  return `Y${suffix}`;
}

function shuffleAccounts() {
  const next = new Set();
  while (next.size < 8) next.add(makeAccount());
  accountOptions.value = [...next];
  selectedAccount.value = accountOptions.value[0];
}

async function submitRegister() {
  if (!canSubmit.value) return;

  const passwordCheck = validateLoginPassword(password.value, selectedAccount.value);
  if (!passwordCheck.ok) {
    toast.error(t(passwordCheck.messageKey));
    return;
  }

  try {
    submitting.value = true;
    // 带上链接代理码 agentCode（?ac=），否则无法归属下级
    await registerApi(
      selectedAccount.value,
      password.value,
      getRegisterAttributionOptions(),
    );
    clearRegisterAgentCode();
    registeredAccount.value = selectedAccount.value;
    registeredPassword.value = password.value;
    successOpen.value = true;
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}

async function openLogin() {
  successOpen.value = false;
  registeredAccount.value = '';
  registeredPassword.value = '';
  await router.replace('/');
  appStore.openLoginModal();
}

shuffleAccounts();
</script>

<template>
  <div class="register-page">
    <div class="register-phone">
      <header class="register-title">
        <img class="register-title__logo" :src="logoUrl" alt="Ladbrokes" />
        <h1>{{ t('注册会员') }}</h1>
      </header>

      <section class="register-card" :aria-label="t('注册会员')">
        <h2 class="register-card__title">{{ t('注册会员') }}</h2>
        <form class="register-form" @submit.prevent="submitRegister">
          <div class="register-account">
            <div class="register-account__label">
              <span>{{ t('账号') }}</span>
              <button type="button" @click="shuffleAccounts">
                {{ t('换一批') }}
                <img :src="iconRefreshUrl" width="12" height="12" alt="" />
              </button>
            </div>
            <div class="register-account__options">
              <button
                v-for="account in accountOptions"
                :key="account"
                type="button"
                :class="{ active: selectedAccount === account }"
                @click="selectedAccount = account"
              >
                {{ account }}
              </button>
            </div>
          </div>

          <label class="register-field">
            <span class="register-field__label">{{ t('登录密码') }}</span>
            <img class="register-lock" :src="iconLockUrl" width="28" height="28" alt="" />
            <input
              v-model="password"
              class="register-field__input"
              :type="passwordType"
              maxlength="12"
              :placeholder="t('注册密码占位')"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="register-eye"
              :aria-label="showPassword ? t('隐藏密码') : t('显示密码')"
              @click="showPassword = !showPassword"
            >
              <img :src="showPassword ? iconEyeOpenUrl : iconEyeClosedUrl" width="28" height="28" alt="" />
            </button>
          </label>

          <label class="register-field" :class="{ 'register-field--error': confirmPassword && confirmPassword !== password }">
            <span class="register-field__label">{{ t('确认登录密码') }}</span>
            <img class="register-lock" :src="iconLockUrl" width="28" height="28" alt="" />
            <input
              v-model="confirmPassword"
              class="register-field__input"
              :type="passwordType"
              maxlength="12"
              :placeholder="t('再次输入相同密码')"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="register-eye"
              :aria-label="showPassword ? t('隐藏密码') : t('显示密码')"
              @click="showPassword = !showPassword"
            >
              <img :src="showPassword ? iconEyeOpenUrl : iconEyeClosedUrl" width="28" height="28" alt="" />
            </button>
          </label>

          <button class="register-submit" type="submit" :disabled="!canSubmit">
            {{ submitting ? t('提交中...') : t('注册') }}
          </button>
          <p class="register-login-link">
            {{ t('已有账号？') }}
            <button type="button" @click="openLogin">{{ t('去登录') }}</button>
          </p>
        </form>
      </section>
    </div>

    <RegisterSuccessModal
      v-model="successOpen"
      :account="registeredAccount"
      :password="registeredPassword"
      @confirm="openLogin"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.register-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--theme-bg);
  display: flex;
  justify-content: center;
  color: var(--theme-text);
  font-family: $font-family-base;
}

.register-phone {
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 13px 11px 22px;
  box-sizing: border-box;
  background: var(--theme-bg);
}

.register-title {
  position: relative;
  height: 60px;
  margin: 6px 0 10px;
  border: 0;
  border-radius: 34px;
  background: var(--theme-primary);
  display: flex;
  align-items: center;
  justify-content: center;

  h1 {
    margin: 0;
    font-size: 23px;
    line-height: 1;
    font-weight: 500;
    color: var(--theme-text);
    letter-spacing: 0;
  }
}

.register-title__logo {
  display: none;
}

.register-card {
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
  padding: 51px 20px 24px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 16px;
  background: var(--surface-card);
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.register-field {
  position: relative;
  display: flex;
  align-items: center;
  height: 52px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(var(--theme-shadow-rgb), 0.03);
}

.register-field__input {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: inherit;
  background: transparent;
  box-sizing: border-box;
  padding: 0 16px 0 52px;
  outline: 0;
  color: var(--theme-text);
  font-family: $font-family-base;
  font-size: 17px;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 0;

  &::placeholder {
    color: rgba(var(--theme-text-rgb), 0.36);
    font-weight: 400;
  }

  @include mobile-only {
    font-size: 14px;
  }
}

.register-eye {
  position: absolute;
  right: 11px;
  top: 50%;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  cursor: pointer;

  img {
    display: block;
    width: 28px;
    height: 28px;
  }
}

.register-submit {
  height: 50px;
  margin-top: 21px;
  border: 0;
  border-radius: 28px;
  background: var(--theme-primary);
  color: #fff;
  font-size: 23px;
  font-weight: 700;
  line-height: 1;
  box-shadow: var(--shadow-primary-btn);
  transition: background-color 0.18s ease;
  cursor: pointer;

  &:disabled {
    background: #F9797B;
    color: #fff;
    opacity: 1;
    box-shadow: none;
    cursor: not-allowed;
  }
}

.register-login-link {
  margin: 0;
  color: var(--theme-text-muted);
  font-size: 13px;
  text-align: center;

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--theme-text-muted);
    cursor: pointer;
  }
}

@include web-only {
  .register-page {
    align-items: flex-start;
    padding: 0;
  }

  .register-phone {
    max-width: none;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 0 0 20px;
  }

  .register-title {
    width: min(100%, 1320px);
    height: 80px;
    margin: 30px auto 20px;
    border-radius: 40px;
    background: var(--theme-primary);
    border-color: var(--theme-primary);
  }

  .register-title__logo {
    position: absolute;
    left: 38px;
    top: 50%;
    display: block;
    width: 132px;
    height: 36px;
    object-fit: contain;
    transform: translateY(-50%);
  }

  .register-title h1 {
    font-size: 24px;
    color: var(--auxiliary-1);
  }

  .register-card {
    width: 800px;
    min-height: 874px;
    margin: 0 auto;
    padding: 80px 200px 44px;
    border-radius: 48px;
    background: var(--surface-card);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.28),
      0 12px 30px rgba(var(--theme-shadow-rgb), 0.08);
  }

  .register-form {
    gap: 20px;
  }

  .register-field {
    height: 50px;
    border-radius: 14px;
  }

  .register-field__input {
    padding-left: 48px;
    font-size: 16px;
  }

  .register-eye {
    width: 36px;
    height: 36px;
  }

  .register-eye img {
    width: 24px;
    height: 24px;
  }

  .register-submit {
    height: 48px;
    margin-top: 12px;
    border-radius: 24px;
    font-size: 17px;
  }
}

/* 注册成功弹窗样式已收敛到 RegisterSuccessModal */

// 注册页新稿：账号候选 + 双密码确认。
.register-card__title {
  margin: 0 0 28px;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  text-align: center;
}

.register-account__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 500;

  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--theme-primary);
    font-size: 12px;
    cursor: pointer;

    img {
      display: block;
      flex-shrink: 0;
    }
  }
}

.register-account__options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  button {
    height: 36px;
    padding: 0 4px;
    border: 1px solid var(--theme-divider);
    border-radius: 16px;
    background: #fff;
    color: var(--theme-text-muted);
    font-family: $font-family-num, $font-family-base;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;

    &:hover,
    &.active {
      border-color: var(--theme-primary);
      background: var(--surface-tint);
      color: var(--theme-primary);
    }

    &:focus-visible {
      outline: 2px solid rgba(var(--theme-primary-rgb), 0.28);
      outline-offset: 2px;
    }
  }
}

.register-form {
  gap: 20px;
}

.register-field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: auto;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.register-field__label {
  margin-bottom: 8px;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
}

.register-field__input {
  height: 48px;
  flex: 0 0 48px;
  padding: 0 48px 0 40px;
  border: 1px solid var(--theme-divider);
  border-radius: 12px;
  background: #fff;
  font-size: 14px;
  transition: border-color 0.18s ease, color 0.18s ease;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.register-field--error .register-field__input {
  border-color: #ef4c43;
  color: #ef4c43;
}

.register-eye {
  top: auto;
  right: 8px;
  bottom: 6px;
  transform: none;
}

.register-lock {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 1;
  display: block;
  width: 28px;
  height: 28px;
  pointer-events: none;
}

.register-submit {
  height: 48px;
  margin-top: 4px;
  font-size: 16px;
  font-weight: 500;
}

@include mobile-only {
  .register-phone {
    max-width: 430px;
    padding: calc(env(safe-area-inset-top, 0px) + 6px) 8px calc(env(safe-area-inset-bottom, 0px) + 8px);
  }

  .register-title {
    height: 48px;
    margin: 0 0 8px;
    background: var(--theme-primary);
    border-color: var(--theme-primary);
  }

  .register-title__logo {
    display: block;
    width: 110px;
    height: 30px;
    object-fit: contain;
  }

  .register-title h1 {
    display: none;
  }

  .register-card {
    min-height: calc(100dvh - 70px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    padding: 16px 16px 28px;
    border: 0;
    border-radius: 16px;
  }

  .register-card__title {
    display: block;
    margin-bottom: 20px;
  }

  .register-form {
    gap: 16px;
  }

  .register-account__options {
    gap: 8px;

    button {
      height: 32px;
      font-size: 14px;
    }
  }

  .register-field__input {
    height: 52px;
    flex-basis: 52px;
    padding-left: 40px;
    border-radius: 16px;
    // 保留全局 16px 输入字号以避免 iOS 聚焦缩放，占位文案按稿图显示。
    &::placeholder {
      font-size: 14px;
    }
  }

  .register-lock {
    left: 12px;
    bottom: 16px;
    width: 16px;
    height: 20px;
  }

  .register-eye img {
    width: 20px;
    height: 20px;
  }

  .register-eye {
    bottom: 8px;
  }

  .register-submit {
    width: 100%;
    height: 44px;
    margin-top: 4px;
    font-size: 18px;
    box-shadow: none;
  }

  .register-login-link {
    margin-top: 4px;
  }
}

@include web-only {
  .register-page,
  .register-phone {
    background: var(--theme-bg);
  }

  .register-title {
    width: calc(100% - 60px);
    max-width: 1860px;
    height: 80px;
    margin: 30px auto 20px;
  }

  .register-card {
    width: 800px;
    min-height: 874px;
    padding: 40px;
    border-radius: 48px;
  }

  .register-form {
    width: 400px;
    margin: 0 auto;
    gap: 12px;
  }

  .register-account__options {
    gap: 10px;

    button {
      height: 52px;
      border-radius: 16px;
      color: rgba(var(--theme-text-rgb), 0.5);
      font-size: 16px;
      font-weight: 400;
      line-height: 1;
      letter-spacing: 0;
    }
  }

  .register-field__input {
    height: 52px;
    flex-basis: 52px;
    padding-left: 40px;
    border-radius: 16px;
    font-size: 16px;
  }

  .register-lock {
    left: 10px;
    bottom: 12px;
  }

  .register-eye {
    right: 12px;
    bottom: 8px;
  }

  .register-submit {
    margin-top: 18px;
  }

  .register-card__title {
    display: none;
  }

  .register-title h1 {
    font-size: 18px;
    font-weight: 400;
  }
}
</style>
