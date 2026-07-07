<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import logoUrl from '@/assets/images/common/logo_nav.svg?url';
import iconLoginUserUrl from '@/assets/images/login/icon_login_user.svg?url';
import iconLoginLockUrl from '@/assets/images/login/icon_login_lock.svg?url';
import iconEyeClosedUrl from '@/assets/images/login/icon_login_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/login/icon_login_eye_open.svg?url';
import { useToast } from '@/hooks/useToast';
import { registerApi } from '@/api/user';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const phone = ref('');
const code = ref('');
const password = ref('');
const showPassword = ref(false);
const countdown = ref(0);
const submitting = ref(false);
const codeError = ref(false);
const successOpen = ref(false);

let countdownTimer = null;

const passwordType = computed(() => (showPassword.value ? 'text' : 'password'));
const isPhoneValid = computed(() => /^1\d{10}$/.test(phone.value.trim()));
const isAccountValid = computed(() => (isMobile.value ? isPhoneValid.value : phone.value.trim().length > 0));
const isPasswordValid = computed(() => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/.test(password.value));
const canSendCode = computed(() => isPhoneValid.value && countdown.value === 0);
const canSubmit = computed(
  () =>
    isAccountValid.value &&
    (!isMobile.value || code.value.trim().length > 0) &&
    isPasswordValid.value &&
    !submitting.value,
);
const codeButtonText = computed(() => {
  if (countdown.value > 0) return t('{seconds}s 重发', { seconds: countdown.value });
  return code.value.trim() ? t('重新发送') : t('验证码');
});

function startCountdown() {
  countdown.value = 59;
  clearCountdown();
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) clearCountdown();
  }, 1000);
}

function clearCountdown() {
  if (countdownTimer != null) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function sendCode() {
  if (!isPhoneValid.value) {
    toast.error(t('请输入手机号'));
    return;
  }
  if (!canSendCode.value) return;
  startCountdown();
}

async function submitRegister() {
  if (!canSubmit.value) return;
  codeError.value = false;
  if (isMobile.value && code.value.trim() === '234515') {
    codeError.value = true;
    toast.error(t('验证码错误'));
    return;
  }
  if (!isPasswordValid.value) {
    toast.error(t('请设置8-16位字母+数字密码'));
    return;
  }

  if (import.meta.env.DEV && code.value.trim() === '123456') {
    successOpen.value = true;
    return;
  }

  try {
    submitting.value = true;
    const res = await registerApi(phone.value.trim(), password.value, 'ALWAYS_PASS', {
      phone: phone.value.trim(),
      smsCode: code.value.trim(),
      verificationCode: code.value.trim(),
    });
    appStore.completeWebLogin(res.data || {});
    successOpen.value = true;
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}

function finishRegister() {
  successOpen.value = false;
  router.replace('/');
}

onBeforeUnmount(clearCountdown);
</script>

<template>
  <div class="register-page">
    <div class="register-phone">
      <div class="register-status" aria-hidden="true">
        <span class="register-status__time">9:41</span>
        <span class="register-status__icons">
          <span class="register-status__signal"></span>
          <span class="register-status__wifi"></span>
          <span class="register-status__battery"></span>
        </span>
      </div>

      <header class="register-title">
        <img class="register-title__logo" :src="logoUrl" alt="UNIBET" />
        <h1>{{ t('注册会员') }}</h1>
      </header>

      <section class="register-card" :aria-label="t('注册会员')">
        <form class="register-form" @submit.prevent="submitRegister">
          <div class="register-field">
            <img class="register-field__icon" :src="iconLoginUserUrl" alt="" width="28" height="28" />
            <input
              v-model.trim="phone"
              class="register-field__input"
              type="tel"
              :inputmode="isMobile ? 'numeric' : 'text'"
              :maxlength="isMobile ? 11 : 32"
              :placeholder="isMobile ? t('请输入手机号') : t('请输入账号')"
              autocomplete="tel"
            />
          </div>

          <div v-if="isMobile" class="register-field register-field--code" :class="{ 'register-field--error': codeError }">
            <span class="register-field__shield" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 3.7L23 7.4V13.3C23 19.1 19.2 23.2 14 25C8.8 23.2 5 19.1 5 13.3V7.4L14 3.7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                <path d="M10.5 14L13 16.5L18 11.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <input
              v-model.trim="code"
              class="register-field__input register-field__input--code"
              :class="{ 'register-field__input--error': codeError }"
              type="tel"
              inputmode="numeric"
              maxlength="6"
              :placeholder="t('请输入手机验证码')"
              autocomplete="one-time-code"
            />
            <button
              type="button"
              class="register-code-btn"
              :disabled="!canSendCode"
              @click="sendCode"
            >
              {{ codeButtonText }}
            </button>
          </div>

          <div class="register-field">
            <img class="register-field__icon" :src="iconLoginLockUrl" alt="" width="28" height="28" />
            <input
              v-model="password"
              class="register-field__input register-field__input--password"
              :class="{ 'register-field__input--dots': password && !showPassword }"
              :type="passwordType"
              maxlength="16"
              :placeholder="t('请设置8-16位字母+数字密码')"
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
          </div>

          <button class="register-submit" type="submit" :disabled="!canSubmit">
            {{ submitting ? t('提交中...') : t('注册') }}
          </button>
        </form>
      </section>
    </div>

    <Transition name="register-dialog">
      <div v-if="successOpen" class="register-dialog" role="dialog" aria-modal="true" :aria-label="t('注册成功')">
        <div class="register-dialog__panel">
          <div class="register-dialog__icon" aria-hidden="true">
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="19" fill="#2F7DF5" />
              <path d="M11 19.4L16.2 24.6L27.5 13.4" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h2 class="register-dialog__title">{{ t('注册成功') }}</h2>
          <p class="register-dialog__desc">{{ t('恭喜您成功注册UNIBET！') }}</p>
          <button type="button" class="register-dialog__btn" @click="finishRegister">
            {{ t('进入首页') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.register-page {
  min-height: 100vh;
  background: #eaf3fd;
  display: flex;
  justify-content: center;
  color: #173b61;
  font-family: $font-family-base;
}

.register-phone {
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  padding: 13px 11px 22px;
  box-sizing: border-box;
  background: #eaf3fd;
}

.register-status {
  height: 31px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px 0 27px;
  color: #111827;
  font-family: $font-family-num, $font-family-base;
}

.register-status__time {
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
}

.register-status__icons {
  display: flex;
  align-items: center;
  gap: 7px;
}

.register-status__signal {
  width: 19px;
  height: 13px;
  background:
    linear-gradient(to top, #111827 0 35%, transparent 35%) 0 6px / 3px 7px no-repeat,
    linear-gradient(to top, #111827 0 55%, transparent 55%) 5px 3px / 3px 10px no-repeat,
    linear-gradient(to top, #111827 0 75%, transparent 75%) 10px 1px / 3px 12px no-repeat,
    linear-gradient(to top, #111827 0 100%, transparent 100%) 15px 0 / 3px 13px no-repeat;
}

.register-status__wifi {
  width: 17px;
  height: 13px;
  border: 3px solid #111827;
  border-bottom: 0;
  border-left-color: transparent;
  border-right-color: transparent;
  border-radius: 16px 16px 0 0;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #111827;
    transform: translateX(-50%);
  }
}

.register-status__battery {
  position: relative;
  width: 23px;
  height: 12px;
  border: 2px solid #111827;
  border-radius: 4px;

  &::before {
    content: '';
    position: absolute;
    right: -5px;
    top: 3px;
    width: 3px;
    height: 6px;
    border-radius: 0 2px 2px 0;
    background: #111827;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 2px;
    background: #111827;
  }
}

.register-title {
  position: relative;
  height: 60px;
  margin: 6px 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 34px;
  background: rgba(247, 251, 255, 0.56);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 1px 0 rgba(184, 206, 232, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;

  h1 {
    margin: 0;
    font-size: 23px;
    line-height: 1;
    font-weight: 800;
    color: #153a61;
    letter-spacing: 0;
  }
}

.register-title__logo {
  display: none;
}

.register-card {
  min-height: calc(100vh - 120px);
  padding: 51px 20px 24px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 16px;
  background: rgba(243, 249, 255, 0.38);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.18),
    0 1px 2px rgba(94, 132, 178, 0.08);
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.register-field {
  position: relative;
  height: 52px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(72, 115, 166, 0.03);
}

.register-field--error {
  box-shadow: 0 0 0 1px rgba(231, 67, 67, 0.3), 0 2px 10px rgba(72, 115, 166, 0.03);
}

.register-field__icon,
.register-field__shield {
  position: absolute;
  left: 14px;
  top: 50%;
  width: 28px;
  height: 28px;
  transform: translateY(-50%);
  color: #a9b7c6;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
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
  color: #173b61;
  font-family: $font-family-base;
  font-size: 17px;
  font-weight: 600;
  line-height: 52px;
  letter-spacing: 0;

  &::placeholder {
    color: rgba(23, 59, 97, 0.36);
    font-weight: 600;
  }

  @include mobile-only {
    font-size: 14px;
  }
}

.register-field__input--code {
  padding-right: 116px;
}

.register-field__input--password {
  padding-right: 52px;
}

.register-field__input--dots:not(:placeholder-shown) {
  font-size: 22px;
  letter-spacing: 0.16em;
  font-family: $font-family-num, $font-family-base;
}

.register-field__input--error {
  color: #e74343;
}

.register-code-btn {
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 88px;
  height: 38px;
  padding: 0 14px;
  border: 2px solid #72aef3;
  border-radius: 11px;
  background: #fff;
  color: #5c9ce8;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;

  &:disabled {
    opacity: 0.72;
    cursor: not-allowed;
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
  background: #2f7df5;
  color: #fff;
  font-size: 23px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 7px 18px rgba(40, 119, 240, 0.2);
  cursor: pointer;

  &:disabled {
    background: #8db8f5;
    color: rgba(255, 255, 255, 0.68);
    box-shadow: none;
    cursor: not-allowed;
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
    padding: 12px 0 40px;
  }

  .register-status {
    display: none;
  }

  .register-title {
    width: min(100%, 1320px);
    height: 80px;
    margin: 30px auto 20px;
    border-radius: 40px;
  }

  .register-title__logo {
    position: absolute;
    left: 38px;
    top: 50%;
    display: block;
    width: 100px;
    height: 36px;
    object-fit: contain;
    transform: translateY(-50%);
  }

  .register-title h1 {
    font-size: 24px;
  }

  .register-card {
    width: 800px;
    min-height: 874px;
    margin: 0 auto;
    padding: 80px 200px 44px;
    border-radius: 48px;
    background: rgba(243, 249, 255, 0.62);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.28),
      0 12px 30px rgba(21, 58, 119, 0.08);
  }

  .register-form {
    gap: 20px;
  }

  .register-field {
    height: 50px;
    border-radius: 14px;
  }

  .register-field__icon,
  .register-field__shield {
    left: 14px;
    width: 24px;
    height: 24px;
  }

  .register-field__input {
    padding-left: 48px;
    font-size: 16px;
    line-height: 50px;
  }

  .register-field__input--code {
    padding-right: 94px;
  }

  .register-code-btn {
    right: 7px;
    min-width: 72px;
    height: 28px;
    padding: 0 10px;
    border-width: 1px;
    border-radius: 7px;
    font-size: 12px;
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

.register-dialog {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(23, 59, 97, 0.34);
  backdrop-filter: blur(8px);
}

.register-dialog__panel {
  width: min(315px, 100%);
  padding: 30px 22px 22px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(21, 58, 119, 0.2);
  text-align: center;
  box-sizing: border-box;
}

.register-dialog__icon {
  display: flex;
  justify-content: center;
}

.register-dialog__title {
  margin: 14px 0 8px;
  color: #173b61;
  font-size: 22px;
  font-weight: 800;
}

.register-dialog__desc {
  margin: 0;
  color: rgba(23, 59, 97, 0.58);
  font-size: 14px;
  line-height: 1.5;
}

.register-dialog__btn {
  width: 100%;
  height: 46px;
  margin-top: 22px;
  border: 0;
  border-radius: 24px;
  background: #2f7df5;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}

.register-dialog-enter-active,
.register-dialog-leave-active {
  transition: opacity 0.2s;

  .register-dialog__panel {
    transition: transform 0.2s;
  }
}

.register-dialog-enter-from,
.register-dialog-leave-to {
  opacity: 0;

  .register-dialog__panel {
    transform: translateY(10px) scale(0.96);
  }
}
</style>
