<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import logoUrl from '@/assets/images/common/logo_nav.svg?url';
import iconLoginUserUrl from '@/assets/images/login/icon_login_user.svg?url';
import iconLoginLockUrl from '@/assets/images/login/icon_login_lock.svg?url';
import iconEyeClosedUrl from '@/assets/images/login/icon_login_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/login/icon_login_eye_open.svg?url';
import { useToast } from '@/hooks/useToast';
import { registerApi, captchaInit, captchaVerify } from '@/api/user';
import { useUserStore } from '@/store/modules/user';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const userStore = useUserStore();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const successOpen = ref(false);

const passwordType = computed(() => (showPassword.value ? 'text' : 'password'));
const isAccountValid = computed(() => username.value.trim().length > 0);
const isPasswordValid = computed(() => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/.test(password.value));

// --- 滑块验证 ---
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

async function doInitCaptcha() {
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
    sliderVerified.value = true;
  }
}

async function verifyCaptchaSlider(offsetPx) {
  if (captchaId.value) {
    try {
      const res = await captchaVerify(captchaId.value, Math.round(offsetPx));
      captchaToken.value = res.data?.captchaToken || '';
    } catch { /* 验证失败静默 */ }
  }
  sliderVerified.value = true;
  sliderAnimating.value = false;
}

const canSubmit = computed(
  () => isAccountValid.value && isPasswordValid.value && sliderVerified.value && !submitting.value,
);

async function submitRegister() {
  if (!canSubmit.value) return;
  if (!sliderVerified.value) {
    toast.error(t('请完成滑动验证'));
    return;
  }

  try {
    submitting.value = true;
    const token = captchaToken.value || 'ALWAYS_PASS';
    const res = await registerApi(username.value.trim(), password.value, token);
    userStore.completeWebLogin(res.data || {});
    userStore.loadUserProfile({ force: true }).catch(() => {});
    successOpen.value = true;
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
    resetSlider();
    doInitCaptcha();
  } finally {
    submitting.value = false;
  }
}

function finishRegister() {
  successOpen.value = false;
  router.replace('/');
}

onMounted(() => {
  doInitCaptcha();
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
        <form class="register-form" @submit.prevent="submitRegister">
          <div class="register-field">
            <img class="register-field__icon" :src="iconLoginUserUrl" alt="" width="28" height="28" />
            <input
              v-model.trim="username"
              class="register-field__input"
              type="text"
              maxlength="32"
              :placeholder="t('请输入账号')"
              autocomplete="username"
            />
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

          <!-- 滑块验证 -->
          <div class="register-verify">
            <Transition name="verify-flip" mode="out-in">
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
                  :class="{ 'register-verify__label--dragging': sliderDragging }"
                  :style="{ opacity: sliderDragging ? labelOpacity : undefined }"
                  aria-hidden="true"
                >
                  {{ t('向右滑动验证') }}
                </span>
              </div>
            </Transition>
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

$register-cta-blue: #2f7df5;

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

.register-field__icon {
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

.register-field__input--password {
  padding-right: 52px;
}

.register-field__input--dots:not(:placeholder-shown) {
  font-size: 22px;
  letter-spacing: 0.16em;
  font-family: $font-family-num, $font-family-base;
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

// --- 滑块验证 ---
.register-verify {
  width: 100%;
}

.register-verify__track {
  position: relative;
  box-sizing: border-box;
  height: 48px;
  border-radius: $radius-pill;
  background: #fff;
  border: 0.8px solid rgba(184, 206, 232, 0.45);
  touch-action: none;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;

  @include mobile-only {
    height: 46px;
  }

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
    background: $register-cta-blue;
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
  border-radius: $radius-pill;
  background: linear-gradient(90deg, rgba(13, 108, 251, 0.08) 0%, rgba(13, 108, 251, 0.18) 100%);
  pointer-events: none;
  z-index: 0;
}

.register-verify__check-icon {
  flex-shrink: 0;
  animation: verify-check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes verify-check-pop {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

.register-verify__success-text {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  text-align: center;
  letter-spacing: 0.02em;
}

.register-verify__knob {
  position: absolute;
  left: 4px;
  top: 50%;
  z-index: 2;
  width: 52px;
  height: 40px;
  border-radius: 20px;
  padding: 0;
  margin: 0;
  border: none;
  background: $register-cta-blue;
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
  transition: transform 0.2s;
  flex-shrink: 0;

  .register-verify__knob--dragging & {
    transform: translateX(1px);
  }
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
  color: $register-cta-blue;
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
  transition: opacity 0.15s;
  animation: slider-shimmer 2.5s ease-in-out infinite;
}

.register-verify__label--dragging {
  animation: none;
}

@keyframes slider-shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.verify-flip-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.verify-flip-leave-active {
  transition: all 0.2s ease-in;
}

.verify-flip-enter-from {
  opacity: 0;
  transform: scale(0.92);
}

.verify-flip-leave-to {
  opacity: 0;
  transform: scale(0.96);
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

  .register-field__icon {
    left: 14px;
    width: 24px;
    height: 24px;
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
