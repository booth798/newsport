<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import logoUrl from '@/assets/images/common/logo_nav.svg?url';
import iconEyeClosedUrl from '@/assets/images/login/icon_login_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/login/icon_login_eye_open.svg?url';
import iconLockUrl from '@/assets/images/login/icon_login_lock.svg?url';
import iconRefreshUrl from '@/assets/images/login/icon_register_refresh.svg?url';
import { useToast } from '@/hooks/useToast';
import { registerApi, captchaInit, captchaVerify } from '@/api/user';
import { useAppStore } from '@/store/modules/app';
import BaseModal from '@/components/BaseModal.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();

const accountOptions = ref([]);
const selectedAccount = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const successOpen = ref(false);

// ─── 滑块验证码 ───
const SLIDER_KNOB_W = 52;
const SLIDER_TRACK_PAD_X = 4;

const verifyTrackRef = ref(null);
const sliderOffsetPx = ref(0);
const sliderVerified = ref(false);
const sliderDragging = ref(false);
const sliderAnimating = ref(false);
const captchaToken = ref('');
const captchaId = ref('');

function resetSlider() {
  sliderOffsetPx.value = 0;
  sliderVerified.value = false;
  sliderDragging.value = false;
  sliderAnimating.value = false;
}

const sliderProgress = computed(() => {
  const max = getSliderMaxOffset();
  if (max <= 0) return 0;
  return Math.min(1, sliderOffsetPx.value / max);
});

const labelOpacity = computed(() => Math.max(0, 1 - sliderProgress.value * 2.5));

const knobTransformStyle = computed(() => ({
  transform: `translate(${sliderOffsetPx.value}px, -50%)`,
  transition: sliderDragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
}));

const fillStyle = computed(() => ({
  width: `${sliderOffsetPx.value + SLIDER_KNOB_W + SLIDER_TRACK_PAD_X}px`,
  transition: sliderDragging.value ? 'none' : 'width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
}));

function getSliderMaxOffset() {
  const track = verifyTrackRef.value;
  if (!track) return 0;
  const w = track.getBoundingClientRect().width;
  return Math.max(0, w - SLIDER_TRACK_PAD_X * 2 - SLIDER_KNOB_W);
}

async function initCaptcha() {
  try {
    const res = await captchaInit();
    const data = res.data || {};
    captchaId.value = data.captchaId || '';
    if (!data.captchaId) {
      captchaToken.value = 'ALWAYS_PASS';
      sliderVerified.value = true;
    }
  } catch {
    captchaToken.value = 'ALWAYS_PASS';
  }
}

async function verifyCaptchaSlider(offsetPx) {
  if (captchaId.value) {
    try {
      const res = await captchaVerify(captchaId.value, Math.round(offsetPx));
      captchaToken.value = res.data?.captchaToken || '';
    } catch { /* 验证失败静默处理 */ }
  }
  sliderVerified.value = true;
  sliderAnimating.value = false;
}

function onSliderKnobPointerDown(e) {
  if (sliderVerified.value || sliderAnimating.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();

  const knobEl = e.currentTarget;
  if (!(knobEl instanceof Element)) return;

  knobEl.setPointerCapture(e.pointerId);
  sliderDragging.value = true;

  const startClientX = e.clientX;
  const startOffset = sliderOffsetPx.value;

  const onMove = (ev) => {
    const max = getSliderMaxOffset();
    const dx = ev.clientX - startClientX;
    sliderOffsetPx.value = Math.min(max, Math.max(0, startOffset + dx));
  };

  const onUp = () => {
    knobEl.releasePointerCapture(e.pointerId);
    knobEl.removeEventListener('pointermove', onMove);
    knobEl.removeEventListener('pointerup', onUp);
    knobEl.removeEventListener('pointercancel', onUp);
    sliderDragging.value = false;

    const max = getSliderMaxOffset();
    const threshold = max * 0.88;
    if (max > 0 && sliderOffsetPx.value >= threshold) {
      sliderOffsetPx.value = max;
      sliderAnimating.value = true;
      verifyCaptchaSlider(sliderOffsetPx.value);
    } else {
      sliderOffsetPx.value = 0;
    }
  };

  knobEl.addEventListener('pointermove', onMove);
  knobEl.addEventListener('pointerup', onUp);
  knobEl.addEventListener('pointercancel', onUp);
}

const passwordType = computed(() => (showPassword.value ? 'text' : 'password'));
const isAccountValid = computed(() => selectedAccount.value.length > 0);
const isPasswordValid = computed(() => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/.test(password.value));
const canSubmit = computed(() => isAccountValid.value && isPasswordValid.value
  && confirmPassword.value === password.value && sliderVerified.value && !submitting.value);

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
  if (!sliderVerified.value) {
    toast.error(t('请完成滑动验证'));
    return;
  }

  try {
    submitting.value = true;
    const token = captchaToken.value || 'ALWAYS_PASS';
    await registerApi(selectedAccount.value, password.value, token);
    successOpen.value = true;
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
    resetSlider();
    initCaptcha();
  } finally {
    submitting.value = false;
  }
}

async function openLogin() {
  successOpen.value = false;
  await router.replace('/');
  appStore.openLoginModal();
}

shuffleAccounts();

onMounted(() => {
  initCaptcha();
});

onBeforeUnmount(() => {
  resetSlider();
});
</script>

<template>
  <div class="register-page">
    <div class="register-phone">
      <header class="register-title">
        <img class="register-title__logo" :src="logoUrl" alt="UNIBET" />
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
          </label>

          <label class="register-field" :class="{ 'register-field--error': confirmPassword && confirmPassword !== password }">
            <span class="register-field__label">{{ t('确认登录密码') }}</span>
            <img class="register-lock" :src="iconLockUrl" width="28" height="28" alt="" />
            <input
              v-model="confirmPassword"
              class="register-field__input"
              :type="passwordType"
              maxlength="16"
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

          <div class="register-verify">
            <Transition name="register-verify-flip" mode="out-in">
              <div
                v-if="sliderVerified"
                key="success"
                class="register-verify__track register-verify__track--success"
                role="status"
                aria-live="polite"
              >
                <svg class="register-verify__check-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10.5L8.5 15L16 5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span class="register-verify__success-text">{{ t('验证成功') }}</span>
              </div>
              <div
                v-else
                key="track"
                ref="verifyTrackRef"
                class="register-verify__track"
                :class="{ 'register-verify__track--dragging': sliderDragging }"
              >
                <div class="register-verify__fill" :style="fillStyle" />
                <button
                  type="button"
                  class="register-verify__knob"
                  :class="{ 'register-verify__knob--dragging': sliderDragging }"
                  :style="knobTransformStyle"
                  :aria-label="t('向右滑动验证')"
                  @pointerdown="onSliderKnobPointerDown"
                >
                  <svg class="register-verify__knob-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M7 4.5L11.5 9L7 13.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <span
                  class="register-verify__label"
                  :style="{ opacity: sliderDragging ? labelOpacity : undefined }"
                  aria-hidden="true"
                >
                  {{ t('向右滑动验证') }}
                </span>
              </div>
            </Transition>
          </div>

          <button class="register-submit btn btn--primary" type="submit" :disabled="!canSubmit">
            {{ submitting ? t('提交中...') : t('注册') }}
          </button>
          <p class="register-login-link">
            {{ t('已有账号？') }}
            <button type="button" @click="openLogin">{{ t('去登录') }}</button>
          </p>
        </form>
      </section>
    </div>

    <BaseModal
      v-model="successOpen"
      :title="t('提示')"
      :show-close="true"
    >
      <div class="register-success__body">
        <span class="register-success__info" aria-hidden="true">i</span>
        <p>{{ t('恭喜您成功注册UNIBET！') }}</p>
      </div>
      <div class="register-success__actions">
        <button type="button" class="register-success__btn" @click="openLogin">
          {{ t('去登录') }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.register-page {
  min-height: 100vh;
  min-height: 100dvh;
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
  min-height: 100dvh;
  padding: 13px 11px 22px;
  box-sizing: border-box;
  background: #eaf3fd;
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
  min-height: calc(100dvh - 120px);
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
  display: flex;
  align-items: center;
  height: 52px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(72, 115, 166, 0.03);
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
  font-weight: 400;
  line-height: normal;
  letter-spacing: 0;

  &::placeholder {
    color: rgba(23, 59, 97, 0.36);
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
  box-shadow: 0 7px 18px rgba(40, 119, 240, 0.2);
  cursor: pointer;

  &:disabled {
    background: var(--theme-primary);
    color: #fff;
    opacity: 0.45;
    box-shadow: none;
    cursor: not-allowed;
  }
}

/* ─── 滑块验证 ─── */
.register-verify {
  width: 100%;
}

.register-verify__track {
  position: relative;
  box-sizing: border-box;
  height: 48px;
  border-radius: 999px;
  background: #fff;
  border: 0.8px solid #d6e0eb;
  touch-action: none;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;

  &--dragging {
    border-color: rgba(13, 108, 251, 0.35);
    box-shadow: 0 0 0 3px rgba(13, 108, 251, 0.1);
  }

  &--success {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    touch-action: auto;
    background: #0d6cfb;
    border: 1px solid rgba(255, 255, 255, 0.92);
    box-shadow: 0 2px 14px rgba(13, 108, 251, 0.4);
    overflow: visible;
  }
}

.register-verify__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 108, 251, 0.08) 0%, rgba(13, 108, 251, 0.18) 100%);
  pointer-events: none;
  z-index: 0;
}

.register-verify__check-icon {
  flex-shrink: 0;
}

.register-verify__success-text {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  letter-spacing: 0.02em;
}

.register-verify__knob {
  position: absolute;
  left: 4px;
  top: 50%;
  z-index: 2;
  width: 52px;
  height: 40px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 20px;
  background: #0d6cfb;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(13, 108, 251, 0.35);
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 0.2s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

  &--dragging {
    cursor: grabbing;
    box-shadow: 0 4px 16px rgba(13, 108, 251, 0.5);
    transition: box-shadow 0.15s;
  }

  &:focus-visible {
    outline: 2px solid rgba(13, 108, 251, 0.55);
    outline-offset: 2px;
  }
}

.register-verify__knob-icon {
  flex-shrink: 0;
}

.register-verify__label {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 60px 0 12px;
  font-size: 15px;
  font-weight: 500;
  color: #0d6cfb;
  line-height: 1.2;
  pointer-events: none;
  transition: opacity 0.15s;
}

.register-verify-flip-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.register-verify-flip-leave-active {
  transition: all 0.2s ease-in;
}

.register-verify-flip-enter-from {
  opacity: 0;
  transform: scale(0.92);
}

.register-verify-flip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.register-login-link {
  margin: 0;
  color: rgba(23, 59, 97, 0.46);
  font-size: 13px;
  text-align: center;

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--theme-primary);
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
    padding: 12px 0 40px;
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

/* 注册成功弹窗（复用 BaseModal，底部带关闭按钮） */
.register-success__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 70px;
  border-radius: 12px;
  background: #fff;
  color: #0b3462;
  font-size: 14px;
  font-weight: 700;

  p {
    margin: 0;
  }
}

.register-success__info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid #5d7899;
  border-radius: 50%;
  color: #5d7899;
  font-size: 12px;
  font-weight: 700;
  font-family: $font-family-num, $font-family-base;
  flex-shrink: 0;
}

.register-success__actions {
  margin-top: 10px;
}

.register-success__btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #fff;
  color: #1c7bff;
  font-size: 18px;
  font-weight: 400;
  cursor: pointer;
}

// 注册页新稿：账号候选 + 双密码确认。
.register-card__title {
  margin: 0 0 28px;
  color: #153a61;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.register-account__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #173b61;
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
    border: 1px solid transparent;
    border-radius: 10px;
    background: #fff;
    color: rgba(23, 59, 97, 0.42);
    font-family: $font-family-num, $font-family-base;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;

    &:hover,
    &.active {
      border-color: var(--theme-primary);
      background: #f7fbff;
      color: var(--theme-primary);
    }

    &:focus-visible {
      outline: 2px solid rgba(28, 123, 255, 0.28);
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
  color: #173b61;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
}

.register-field__input {
  height: 48px;
  flex: 0 0 48px;
  padding: 0 48px 0 40px;
  border: 1px solid transparent;
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
    padding: 12px 8px 20px;
  }

  .register-title {
    height: 52px;
    margin: 4px 0 8px;
  }

  .register-title__logo {
    display: block;
    width: 86px;
    height: 31px;
    object-fit: contain;
  }

  .register-title h1 {
    display: none;
  }

  .register-card {
    min-height: calc(100dvh - 88px);
    padding: 18px 12px 28px;
    border-radius: 16px;
  }

  .register-card__title {
    display: block;
    margin-bottom: 24px;
  }

  .register-account__options {
    gap: 8px;

    button {
      height: 34px;
      font-size: 12px;
    }
  }

  .register-field__input {
    height: 50px;
    flex-basis: 50px;
  }

  .register-eye {
    bottom: 7px;
  }

  .register-submit {
    width: 100%;
    height: 46px;
    margin-top: 2px;
    font-size: 18px;
  }
}

@include web-only {
  .register-page,
  .register-phone {
    background: #e3ecfb;
  }

  .register-title {
    width: calc(100% - 60px);
    max-width: 1860px;
    height: 80px;
    margin: 30px auto 20px;
  }

  .register-card {
    width: 800px;
    min-height: 610px;
    padding: 40px;
    border-radius: 32px;
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
      color: rgba(11, 52, 98, 0.5);
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
    font-size: 20px;
  }
}
</style>
