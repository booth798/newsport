<script setup>
/**
 * 在线客服聊天页面（对齐 Android OnlineServiceActivity）。
 *
 * 使用独立 /kf 模块的 HTTP + WebSocket 协议，
 * 替代原先的工单 REST API + 轮询方案。
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useUserStore } from '@/store/modules/user';
import { useAppStore } from '@/store/modules/app';
import {
  useCustomerService,
  MessageDirection,
  ContentType,
  SendState,
} from '@/hooks/useCustomerService';
import { KfConnectionState } from '@/hooks/useKfWebSocket';
import BaseModal from '@/components/BaseModal.vue';
import iconBackUrl from '@/assets/images/common/icon_back.svg?url';
import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();
const { isLoggedIn } = storeToRefs(userStore);

const {
  messages,
  connectionState,
  errorMessage,
  kfName,
  kfAvatar,
  isInitializing,
  isConnected,
  connect,
  disconnect,
  retryConnect,
  sendText,
  sendImage,
  retryMessage,
  sendReadReceipt,
} = useCustomerService();

/* ─── 输入状态 ─── */
const inputText = ref('');
const isSending = computed(() => false); // 发送为异步非阻塞，无需 loading
const canSend = computed(
  () => inputText.value.trim() && isConnected.value,
);

/* ─── 消息列表滚动 ─── */
const messagesEndRef = ref(null);
const chatBodyRef = ref(null);
// 图片选择 input
const imageInputRef = ref(null);

function scrollToBottom() {
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
}

// 新消息到达时自动滚到底部
watch(
  () => messages.value.length,
  () => {
    nextTick(scrollToBottom);
  },
);

/* ─── 客服头像，优先展示服务端返回的，否则使用默认 ─── */
const displayKfAvatar = computed(() => kfAvatar.value || avatarDefaultUrl);
const displayKfName = computed(() => kfName.value || t('在线客服'));

/* ─── 连接状态文案 ─── */
const connectionLabel = computed(() => {
  switch (connectionState.value) {
    case KfConnectionState.CONNECTING:
      return t('正在连接客服');
    case KfConnectionState.RECONNECTING:
      return t('正在重新连接');
    case KfConnectionState.FAILED:
      return errorMessage.value || t('连接失败');
    default:
      return '';
  }
});

const showConnectionBanner = computed(
  () =>
    connectionState.value === KfConnectionState.CONNECTING ||
    connectionState.value === KfConnectionState.RECONNECTING ||
    connectionState.value === KfConnectionState.FAILED,
);

/* ─── 发送消息 ─── */
function handleSend() {
  const text = inputText.value.trim();
  if (!text) return;
  sendText(text);
  inputText.value = '';
  nextTick(scrollToBottom);
}

/* ─── 图片上传 ─── */
function openImagePicker() {
  imageInputRef.value?.click();
}

async function handleImageSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  await sendImage(file);
  // 重置 input 以允许再次选择相同文件
  event.target.value = '';
  nextTick(scrollToBottom);
}

/* ─── 消息失败重试 ─── */
function handleRetry(msg) {
  retryMessage(msg.clientTempId);
}

/* ─── 格式化时间 ─── */
function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  } catch {
    return '';
  }
}

/* ─── 判断消息类型 ─── */
function isSelf(msg) {
  return msg.direction === MessageDirection.TO_OPERATOR;
}

function isSystem(msg) {
  return msg.direction === MessageDirection.SYSTEM;
}

function isFailed(msg) {
  return msg.sendState === SendState.FAILED;
}

function isUploading(msg) {
  return msg.sendState === SendState.UPLOADING || msg.sendState === SendState.SENDING;
}

/* ─── 退出确认弹窗 ─── */
const showExitConfirm = ref(false);

function goBack() {
  showExitConfirm.value = true;
}

function cancelExit() {
  showExitConfirm.value = false;
}

function confirmExit() {
  showExitConfirm.value = false;
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push('/');
}

/* ─── 聊天区滚动时发送已读回执 ─── */
function handleChatScroll() {
  const el = chatBodyRef.value;
  if (!el) return;
  // 接近底部时发送已读
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  if (nearBottom) {
    sendReadReceipt();
  }
}

/* ─── 初始化：进入页面自动连接 ─── */
onMounted(() => {
  // 客服页为独立整屏（bare + guestPreview），进入时关闭可能残留的登录相关弹窗，避免遮挡聊天界面。
  appStore.closeLoginModal();
  appStore.closeLoginConfirm();
  if (isLoggedIn.value) {
    connect();
  }
});
</script>

<template>
  <div class="service-page">
    <!-- 顶栏 -->
    <header class="service-topbar">
      <button type="button" class="service-topbar__back" :aria-label="t('返回')" @click="goBack">
        <img :src="iconBackUrl" alt="" />
      </button>
      <span class="service-topbar__avatar" aria-hidden="true">
        <img :src="displayKfAvatar" alt="" />
      </span>
      <h1 class="service-topbar__title">{{ displayKfName }}</h1>
    </header>

    <div class="service-page__inner">
      <section class="service-chat" aria-label="service-chat">
        <!-- 连接状态提示条 -->
        <div v-if="showConnectionBanner" class="service-connection-banner">
          <template v-if="connectionState === KfConnectionState.FAILED">
            <span>{{ connectionLabel }}</span>
            <button type="button" class="service-connection-banner__retry" @click="retryConnect">
              {{ t('重试') }}
            </button>
          </template>
          <template v-else>
            <div class="service-spinner service-spinner--sm" />
            <span>{{ connectionLabel }}…</span>
          </template>
        </div>

        <!-- 聊天消息区域 -->
        <div
          ref="chatBodyRef"
          class="service-chat__body"
          @scroll="handleChatScroll"
        >
          <!-- 初始化 loading -->
          <div v-if="isInitializing && messages.length === 0" class="service-state">
            <div class="service-spinner" />
            <span>{{ t('加载中') }}</span>
          </div>

          <div v-else class="service-messages">
            <!-- 欢迎语（固定在顶部） -->
            <div class="service-chat__welcome">
              <span class="service-chat__welcome-avatar" aria-hidden="true">
                <img :src="displayKfAvatar" alt="" />
              </span>
              <p>{{ t('智能客服助手为您服务') }}</p>
            </div>

            <!-- 消息列表 -->
            <template v-for="msg in messages" :key="msg.clientTempId">
              <!-- 系统消息 -->
              <div v-if="isSystem(msg)" class="service-msg service-msg--system">
                <span class="service-msg__system-text">{{ msg.text }}</span>
              </div>

              <!-- 普通消息 -->
              <div
                v-else
                class="service-msg"
                :class="{ 'service-msg--self': isSelf(msg) }"
              >
                <!-- 客服头像（非自己的消息才显示） -->
                <span v-if="!isSelf(msg)" class="service-msg__avatar" aria-hidden="true">
                  <img :src="displayKfAvatar" alt="" />
                </span>

                <div class="service-msg__content">
                  <div class="service-msg__bubble">
                    <!-- 文本消息 -->
                    <p v-if="msg.contentType === ContentType.TEXT" class="service-msg__text">
                      {{ msg.text }}
                    </p>

                    <!-- 图片消息 -->
                    <div v-else-if="msg.contentType === ContentType.IMAGE" class="service-msg__image-wrap">
                      <img
                        v-if="msg.imageUrl"
                        :src="msg.imageUrl"
                        class="service-msg__image"
                        alt=""
                        loading="lazy"
                      />
                      <!-- 上传中遮罩 -->
                      <div v-if="isUploading(msg)" class="service-msg__image-overlay">
                        <div class="service-spinner service-spinner--sm" />
                      </div>
                    </div>

                    <!-- 链接消息 -->
                    <a
                      v-else-if="msg.contentType === ContentType.LINK && msg.linkUrl"
                      :href="msg.linkUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="service-msg__link"
                    >
                      {{ msg.text || msg.linkUrl }}
                    </a>

                    <!-- 其他类型 fallback -->
                    <p v-else class="service-msg__text">{{ msg.text }}</p>
                  </div>

                  <!-- 时间 + 发送状态 -->
                  <div class="service-msg__meta">
                    <span class="service-msg__time">{{ formatTime(msg.createdAt) }}</span>
                    <!-- 发送失败标记 & 重试按钮 -->
                    <button
                      v-if="isSelf(msg) && isFailed(msg)"
                      type="button"
                      class="service-msg__retry"
                      :title="msg.errorMessage || t('发送失败')"
                      @click="handleRetry(msg)"
                    >
                      !
                    </button>
                  </div>
                </div>

                <!-- 自己的头像 -->
                <span v-if="isSelf(msg)" class="service-msg__avatar service-msg__avatar--self" aria-hidden="true">
                  <span></span>
                </span>
              </div>
            </template>

            <div ref="messagesEndRef" />
          </div>
        </div>

        <!-- 底部输入区 -->
        <footer class="service-chat__footer">
          <!-- 图片上传按钮 -->
          <button
            type="button"
            class="service-image-btn"
            :disabled="!isConnected"
            :title="t('发送图片')"
            @click="openImagePicker"
          >
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M3 16l4.5-4.5a1 1 0 011.4 0L13 15.5l2-2a1 1 0 011.4 0L21 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <input
            ref="imageInputRef"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/bmp,image/webp"
            class="service-image-input"
            @change="handleImageSelected"
          />

          <textarea
            v-model="inputText"
            class="service-reply-input"
            :placeholder="isConnected ? t('请输入消息...') : t('客服连接中，请稍候...')"
            :disabled="!isConnected"
            maxlength="2000"
            rows="2"
            @keydown.enter.exact.prevent="handleSend"
          />
          <button
            type="button"
            class="btn btn--primary service-reply-btn"
            :disabled="!canSend"
            @click="handleSend"
          >
            {{ t('发送') }}
          </button>
        </footer>
      </section>
    </div>

    <!-- 退出确认弹窗 -->
    <BaseModal
      :model-value="showExitConfirm"
      :title="t('提示')"
      :show-close="false"
      @update:model-value="cancelExit"
    >
      <div class="service-exit-dialog__body">
        <span class="service-exit-dialog__info" aria-hidden="true">i</span>
        <p>{{ t('是否结束对话') }}</p>
      </div>
      <div class="service-exit-dialog__actions">
        <button type="button" class="service-exit-dialog__btn--cancel" @click="cancelExit">
          {{ t('取消') }}
        </button>
        <button type="button" class="service-exit-dialog__btn--confirm" @click="confirmExit">
          {{ t('确定') }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.service-page {
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  background: var(--theme-bg);
  color: #173b61;
  box-sizing: border-box;

  @include web-only {
    padding: 30px 30px 20px;
  }

  @include mobile-only {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    padding: 0 8px 35px;
  }
}

.service-statusbar {
  display: none;

  @include mobile-only {
    height: 43px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 17px 0 24px;
    color: #111827;
    font-family: $font-family-num, $font-family-base;
    box-sizing: border-box;
  }
}

.service-statusbar__time {
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
}

.service-statusbar__icons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.service-statusbar__signal {
  width: 17px;
  height: 12px;
  background:
    linear-gradient(to top, #111827 0 35%, transparent 35%) 0 6px / 3px 6px no-repeat,
    linear-gradient(to top, #111827 0 55%, transparent 55%) 5px 4px / 3px 8px no-repeat,
    linear-gradient(to top, #111827 0 75%, transparent 75%) 10px 2px / 3px 10px no-repeat,
    linear-gradient(to top, #111827 0 100%, transparent 100%) 15px 0 / 3px 12px no-repeat;
}

.service-statusbar__wifi {
  position: relative;
  width: 15px;
  height: 11px;
  border: 3px solid #111827;
  border-bottom: 0;
  border-left-color: transparent;
  border-right-color: transparent;
  border-radius: 14px 14px 0 0;

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

.service-statusbar__battery {
  position: relative;
  width: 22px;
  height: 11px;
  border: 2px solid #111827;
  border-radius: 4px;

  &::before {
    content: '';
    position: absolute;
    right: -5px;
    top: 3px;
    width: 3px;
    height: 5px;
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

.service-topbar {
  position: relative;
  display: flex;
  align-items: center;
  background: linear-gradient(90deg, #63b7ff 0%, #0d6cfb 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
  color: #fff;

  @include web-only {
    width: min(100%, 1380px);
    height: 80px;
    margin: 0 auto 20px;
    padding: 0 36px;
    border-radius: 40px;
  }

  @include mobile-only {
    width: 100%;
    height: 44px;
    margin: 8px 0 23px;
    padding: 0 14px;
    border-radius: 24px;
  }
}

.service-topbar__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;

  @include web-only {
    width: 44px;
    height: 44px;
  }

  @include mobile-only {
    width: 32px;
    height: 32px;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    filter: brightness(0) invert(1);
  }
}

.service-topbar__avatar {
  position: absolute;
  left: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: #fff;
  transform: translateX(-84px);

  @include web-only {
    width: 48px;
    height: 48px;
  }

  @include mobile-only {
    width: 42px;
    height: 42px;
    transform: translateX(-42px);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.service-topbar__title {
  position: absolute;
  left: 50%;
  margin: 0;
  color: #fff;
  font-weight: 500;
  letter-spacing: 0;
  transform: translateX(-10px);

  @include web-only {
    font-size: 24px;
  }

  @include mobile-only {
    font-size: 17px;
    transform: translateX(5px);
  }
}

.service-page__inner {
  margin: 0 auto;

  @include web-only {
    display: flex;
    justify-content: center;
    width: min(100%, 800px);
  }

  @include mobile-only {
    width: 100%;
    flex: 1;
    min-height: 0;
  }
}

/* ─── 连接状态提示条 ─── */

.service-connection-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 8px 16px;
  font-size: 13px;
  color: #fff;
  background: rgba(245, 124, 0, 0.9);
  text-align: center;

  @include web-only {
    border-radius: 48px 48px 0 0;
  }
}

.service-connection-banner__retry {
  padding: 2px 12px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}

/* ─── 通用状态 ─── */

.service-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  min-height: 160px;
  color: var(--theme-text-1);
  font-size: $font-size-md;
}

.service-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: service-spin 0.8s linear infinite;
}

.service-spinner--sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

@keyframes service-spin {
  to { transform: rotate(360deg); }
}

/* ─── 聊天区 ─── */

.service-chat {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  background: rgba(243, 249, 255, 0.58);

  @include web-only {
    width: 800px;
    height: calc(100dvh - 150px);
    min-height: 720px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 48px;
    box-shadow: 0 12px 30px rgba(21, 58, 119, 0.1);
  }

  @include mobile-only {
    height: 100%;
    border-radius: 0;
    background: transparent;
  }
}

.service-chat__body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  @include web-only {
    padding: 40px 34px 20px;
  }

  @include mobile-only {
    padding: 0 0 16px;
  }
}

.service-messages {
  display: flex;
  flex-direction: column;
  gap: 24px;

  @include mobile-only {
    gap: 16px;
  }
}

.service-chat__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
  gap: 0;
  margin-bottom: 14px;

  @include mobile-only {
    margin-top: 0;
    margin-bottom: 4px;
  }

  p {
    margin: -4px 0 0;
    padding: 12px 36px;
    border-radius: 24px;
    background: #fff;
    color: #171e24;
    font-size: 16px;
    line-height: 1.25;
    box-shadow: 0 2px 6px rgba(21, 58, 119, 0.04);

    @include mobile-only {
      padding: 9px 18px;
      border-radius: 18px;
      font-size: 12px;
    }
  }
}

.service-chat__welcome-avatar {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 50%;
  background: #fff;

  @include mobile-only {
    width: 42px;
    height: 42px;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* ─── 消息气泡 ─── */

.service-msg {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  justify-content: flex-start;

  @include mobile-only {
    gap: 8px;
  }
}

.service-msg--self {
  justify-content: flex-end;
}

.service-msg--system {
  justify-content: center;
}

.service-msg__system-text {
  padding: 4px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.05);
  color: #8e9aaa;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.service-msg__avatar {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  overflow: hidden;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(21, 58, 119, 0.08);

  @include mobile-only {
    width: 35px;
    height: 35px;
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
}

.service-msg__avatar--self {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9f0f8;

  span {
    width: 18px;
    height: 22px;
    border-radius: 50% 50% 44% 44%;
    background:
      radial-gradient(circle at 50% 28%, #171e24 0 3px, transparent 3px),
      linear-gradient(#f0b9a1 0 34%, #e7a78d 34% 58%, transparent 58%),
      linear-gradient(135deg, transparent 0 43%, #0d6cfb 43% 57%, transparent 57%);
  }
}

.service-msg__content {
  display: flex;
  flex-direction: column;
  max-width: min(520px, 76%);

  @include mobile-only {
    max-width: 248px;
  }
}

.service-msg__bubble {
  padding: 14px 18px;
  border-radius: 18px;
  background: #fff;
  color: #171e24;
  box-shadow: 0 2px 8px rgba(21, 58, 119, 0.04);
  word-break: break-word;

  .service-msg--self & {
    background: #1f7cff;
    color: #fff;
  }

  @include mobile-only {
    padding: 9px 12px;
    border-radius: 8px;
  }
}

.service-msg__text {
  margin: 0;
  color: inherit;
  font-size: 16px;
  line-height: 1.45;

  @include mobile-only {
    font-size: 12px;
    line-height: 1.5;
  }
}

.service-msg__image-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  line-height: 0;
}

.service-msg__image {
  display: block;
  max-width: 200px;
  max-height: 300px;
  border-radius: 8px;
  object-fit: contain;

  @include mobile-only {
    max-width: 160px;
    max-height: 240px;
  }
}

.service-msg__image-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
}

.service-msg__link {
  color: #1f7cff;
  text-decoration: underline;
  word-break: break-all;
  font-size: 14px;

  .service-msg--self & {
    color: #fff;
  }
}

.service-msg__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;

  .service-msg--self & {
    justify-content: flex-end;
  }
}

.service-msg__time {
  color: rgba(11, 52, 98, 0.42);
  font-size: 11px;

  .service-msg--self & {
    color: rgba(11, 52, 98, 0.35);
  }
}

.service-msg__retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f44336;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

/* ─── 底部输入区 ─── */

.service-chat__footer {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: #fff;
  flex-shrink: 0;
  box-sizing: border-box;

  @include web-only {
    min-height: 156px;
    margin: 0 34px 20px;
    padding: 24px 18px 18px;
    border-radius: 18px;
  }

  @include mobile-only {
    min-height: 86px;
    padding: 13px 10px 10px 16px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 14px;
  }
}

.service-image-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #5d7899;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.04);
    color: #1f7cff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @include mobile-only {
    width: 36px;
    height: 36px;
  }
}

.service-image-input {
  display: none;
}

.service-reply-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 58px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--theme-text);
  font-size: $font-size-md;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  resize: none;

  &::placeholder {
    color: rgba(23, 59, 97, 0.28);
  }
}

.service-reply-btn {
  flex-shrink: 0;
  height: 34px;
  min-width: 58px;
  padding: 0 18px;
  border-radius: $radius-pill;
  font-size: $font-size-md;

  @include mobile-only {
    height: 36px;
    min-width: 62px;
    font-size: 14px;
  }
}

/* ─── 退出确认弹窗 ─── */

.service-exit-dialog__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 70px;
  border-radius: 12px;
  background: #fff;
  color: #0b3462;
  font-size: 16px;
  font-weight: 700;

  p {
    margin: 0;
  }
}

.service-exit-dialog__info {
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
}

.service-exit-dialog__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;

  button {
    height: 44px;
    border-radius: 22px;
    font-size: 18px;
    font-weight: 400;
    cursor: pointer;
  }
}

.service-exit-dialog__btn--cancel {
  border: 1px solid #fff;
  color: #fff;
}

.service-exit-dialog__btn--confirm {
  background: #fff;
  color: var(--theme-primary);
}
</style>
