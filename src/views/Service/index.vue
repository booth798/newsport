<script setup>
/**
 * 在线客服聊天页面（对齐 Android OnlineServiceActivity）。
 *
 * 使用独立 /kf 模块的 HTTP + WebSocket 协议，
 * 替代原先的工单 REST API + 轮询方案。
 */
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { storeToRefs } from 'pinia';
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
import iconDialogInfoUrl from '@/assets/images/common/icon_dialog_info.svg?url';
import iconEmojiUrl from '@/assets/images/service/icon_emoji.png';
import {
  SERVICE_EMOTICON_ITEMS,
  SERVICE_EMOTICON_PATTERN,
  parseServiceEmoticonSegments,
  createServiceEmoticonImage,
  serializeServiceEmoticonEditor,
  renderServiceEmoticonEditor,
  getServiceEmoticonCaretOffset,
  setServiceEmoticonCaretOffset,
} from '@/constants/serviceEmoticons';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const { isLoggedIn, loggedInAvatarUrl } = storeToRefs(userStore);

const {
  messages,
  connectionState,
  errorMessage,
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

/* ─── 表情面板（对齐安卓：输入框显示图，发送仍为 {中文}） ─── */
const INPUT_MAX_LENGTH = 2000;
const EMOTICONS = SERVICE_EMOTICON_ITEMS;
const showEmojiPanel = ref(false);
const emojiBtnRef = ref(null);
const emojiPanelRef = ref(null);
const replyInputRef = ref(null);
let applyingEditorSpans = false;
/** 点表情面板前保留输入区选区，避免插入跑到末尾 */
let savedEditorRange = null;

const inputPlaceholder = computed(() => (
  isConnected.value ? t('请输入消息...') : t('客服连接中，请稍候...')
));
const inputEmpty = computed(() => !inputText.value.trim());

function saveEditorSelection() {
  const el = replyInputRef.value;
  const sel = window.getSelection();
  if (!el || !sel || sel.rangeCount === 0) return;
  if (el.contains(sel.anchorNode)) {
    savedEditorRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreEditorSelection() {
  const el = replyInputRef.value;
  const sel = window.getSelection();
  if (!el || !sel || !savedEditorRange) return false;
  try {
    sel.removeAllRanges();
    sel.addRange(savedEditorRange);
    return true;
  } catch {
    return false;
  }
}

function toggleEmojiPanel() {
  if (!isConnected.value) return;
  showEmojiPanel.value = !showEmojiPanel.value;
}

function closeEmojiPanel() {
  showEmojiPanel.value = false;
}

/** 同步 contenteditable → 发送用占位符文本 */
function syncInputFromEditor() {
  const el = replyInputRef.value;
  if (!el) return '';
  const text = serializeServiceEmoticonEditor(el);
  inputText.value = text;
  return text;
}

/** 文本节点里若出现完整占位符，转成图片（对齐安卓 afterTextChanged applySpans） */
function applyEditorEmoticonSpans() {
  const el = replyInputRef.value;
  if (!el || applyingEditorSpans) return;
  const text = serializeServiceEmoticonEditor(el);
  SERVICE_EMOTICON_PATTERN.lastIndex = 0;
  if (!SERVICE_EMOTICON_PATTERN.test(text)) return;

  let hasPlainCode = false;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    SERVICE_EMOTICON_PATTERN.lastIndex = 0;
    if (SERVICE_EMOTICON_PATTERN.test(node.nodeValue || '')) {
      hasPlainCode = true;
      break;
    }
    node = walker.nextNode();
  }
  if (!hasPlainCode) return;

  applyingEditorSpans = true;
  const caret = getServiceEmoticonCaretOffset(el);
  renderServiceEmoticonEditor(el, text);
  setServiceEmoticonCaretOffset(el, caret);
  applyingEditorSpans = false;
}

function onEditorInput() {
  const el = replyInputRef.value;
  if (!el) return;
  let text = serializeServiceEmoticonEditor(el);
  if (text.length > INPUT_MAX_LENGTH) {
    text = text.slice(0, INPUT_MAX_LENGTH);
    applyingEditorSpans = true;
    renderServiceEmoticonEditor(el, text);
    setServiceEmoticonCaretOffset(el, text.length);
    applyingEditorSpans = false;
  }
  inputText.value = text;
  applyEditorEmoticonSpans();
  syncInputFromEditor();
}

function onEditorPaste(event) {
  event.preventDefault();
  const el = replyInputRef.value;
  if (!el || !isConnected.value) return;
  const pasted = (event.clipboardData || window.clipboardData)?.getData('text') || '';
  if (!pasted) return;
  const cur = serializeServiceEmoticonEditor(el);
  const caret = getServiceEmoticonCaretOffset(el);
  const next = `${cur.slice(0, caret)}${pasted}${cur.slice(caret)}`.slice(0, INPUT_MAX_LENGTH);
  applyingEditorSpans = true;
  renderServiceEmoticonEditor(el, next);
  setServiceEmoticonCaretOffset(el, Math.min(caret + pasted.length, next.length));
  applyingEditorSpans = false;
  inputText.value = next;
}

function clearEditor() {
  const el = replyInputRef.value;
  if (el) el.innerHTML = '';
  inputText.value = '';
}

/** 插入表情图片（对齐安卓 insert + ImageSpan） */
function insertEmoji(code) {
  const el = replyInputRef.value;
  const img = createServiceEmoticonImage(code);
  if (!el || !img || !isConnected.value) return;

  const cur = serializeServiceEmoticonEditor(el);
  if (cur.length + code.length > INPUT_MAX_LENGTH) return;

  el.focus();
  restoreEditorSelection();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    savedEditorRange = range.cloneRange();
  } else {
    el.appendChild(img);
    const range = document.createRange();
    range.setStartAfter(img);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
    savedEditorRange = range.cloneRange();
  }
  syncInputFromEditor();
}

/** 气泡文本拆成文本/表情片段（对齐安卓 ImageSpan 渲染） */
function emoticonSegments(text) {
  return parseServiceEmoticonSegments(text);
}

// 点击面板与表情按钮以外区域时关闭表情面板
function handleDocumentClick(e) {
  if (!showEmojiPanel.value) return;
  const panel = emojiPanelRef.value;
  const btn = emojiBtnRef.value;
  if (panel && panel.contains(e.target)) return;
  if (btn && btn.contains(e.target)) return;
  closeEmojiPanel();
}

watch(showEmojiPanel, (open) => {
  if (open) document.addEventListener('click', handleDocumentClick);
  else document.removeEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

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
/** 登录用户自己的消息头像；未登录用默认图 */
const displaySelfAvatar = computed(() => {
  if (isLoggedIn.value && loggedInAvatarUrl.value) return loggedInAvatarUrl.value;
  return avatarDefaultUrl;
});
// 顶栏标题固定为「人工客服」，不跟接口下发的客服昵称变化
const displayKfName = computed(() => t('人工客服'));

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
  const text = syncInputFromEditor().trim();
  if (!text) return;
  sendText(text);
  clearEditor();
  closeEmojiPanel();
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
  // 未登录也自动连接客服（访客身份，对齐 Android guest 分支）
  connect();
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
              <p>{{ t('人工客服为您服务') }}</p>
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
                      <template v-for="(seg, segIdx) in emoticonSegments(msg.text)" :key="segIdx">
                        <img
                          v-if="seg.type === 'emoji'"
                          class="service-msg__emoticon"
                          :src="seg.src"
                          :alt="seg.code"
                          draggable="false"
                        />
                        <template v-else>{{ seg.text }}</template>
                      </template>
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
                    <!-- 时间 + 发送状态（放在消息气泡内） -->
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
                </div>

                <!-- 自己的头像：登录显示个人头像 -->
                <span v-if="isSelf(msg)" class="service-msg__avatar service-msg__avatar--self" aria-hidden="true">
                  <img :src="displaySelfAvatar" alt="" />
                </span>
              </div>
            </template>

            <div ref="messagesEndRef" />
          </div>
        </div>

        <!-- 底部输入区 -->
        <footer class="service-chat__footer">
          <input
            ref="imageInputRef"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/bmp,image/webp"
            class="service-image-input"
            @change="handleImageSelected"
          />

          <div class="service-reply-composer">
            <!-- contenteditable：对齐安卓 EditText + ImageSpan，输入区显示表情图 -->
            <div
              ref="replyInputRef"
              class="service-reply-input"
              :class="{ 'service-reply-input--disabled': !isConnected }"
              :contenteditable="isConnected ? 'true' : 'false'"
              role="textbox"
              aria-multiline="true"
              :data-placeholder="inputPlaceholder"
              :data-empty="inputEmpty ? 'true' : 'false'"
              @input="onEditorInput"
              @paste="onEditorPaste"
              @blur="saveEditorSelection"
              @keyup="saveEditorSelection"
              @mouseup="saveEditorSelection"
              @keydown.enter.exact.prevent="handleSend"
            />

            <div class="service-reply-toolbar">
              <!-- 表情面板：8 列网格，占位符插入（对齐安卓） -->
              <div v-if="showEmojiPanel" ref="emojiPanelRef" class="service-emoji-panel">
                <button
                  v-for="item in EMOTICONS"
                  :key="item.code"
                  type="button"
                  class="service-emoji-panel__item"
                  :title="item.code"
                  :aria-label="item.code"
                  @click="insertEmoji(item.code)"
                >
                  <img :src="item.src" :alt="item.code" draggable="false" />
                </button>
              </div>

              <button
                ref="emojiBtnRef"
                type="button"
                class="service-emoji-btn"
                :class="{ 'service-emoji-btn--active': showEmojiPanel }"
                :disabled="!isConnected"
                :title="t('表情')"
                :aria-label="t('表情')"
                @click="toggleEmojiPanel"
              >
                <img :src="iconEmojiUrl" width="24" height="24" alt="" />
              </button>

              <!-- 图片上传按钮 -->
              <button
                type="button"
                class="service-image-btn"
                :disabled="!isConnected"
                :title="t('发送图片')"
                :aria-label="t('发送图片')"
                @click="openImagePicker"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M19.9746 3.41016C20.9918 3.41016 21.8165 4.23491 21.8164 5.25195V18.75C21.8164 19.7671 20.9918 20.5917 19.9746 20.5918H4.02148C3.00432 20.5918 2.17969 19.7673 2.17969 18.75V5.25195C2.17969 4.23479 3.00444 3.41016 4.02148 3.41016H19.9746ZM15.8291 11.8018C14.3576 11.8018 12.6575 13.1378 11.0137 14.4297C9.39313 15.7037 7.86225 16.9062 6.43262 16.9062C5.20695 16.9062 4.14315 16.3591 3.40723 15.8379V18.751C3.40726 18.9138 3.47178 19.0704 3.58691 19.1855C3.70193 19.3004 3.85794 19.3651 4.02051 19.3652H19.9756C20.1381 19.3651 20.2942 19.3004 20.4092 19.1855C20.5243 19.0704 20.5888 18.9138 20.5889 18.751V14.1377L20.5791 14.1465C20.5461 14.1091 18.4588 11.8018 15.8291 11.8018ZM4.02051 4.6377C3.85784 4.63786 3.70197 4.70238 3.58691 4.81738C3.47185 4.9324 3.40745 5.0883 3.40723 5.25098V14.2471C3.81657 14.6427 5.02327 15.6787 6.43262 15.6787C7.43755 15.6785 8.86984 14.5524 10.2549 13.4639C12.0628 12.0429 13.9328 10.5732 15.8291 10.5732C17.8856 10.5733 19.5999 11.6672 20.5889 12.4785V5.25098C20.5888 5.08832 20.5242 4.93242 20.4092 4.81738C20.2942 4.70237 20.1382 4.63783 19.9756 4.6377H4.02051ZM7.27148 6.88672C8.63589 6.88672 9.74217 7.99291 9.74219 9.35742C9.74219 10.7219 8.6359 11.8281 7.27148 11.8281C5.90697 11.8281 4.80078 10.7219 4.80078 9.35742C4.80078 7.99292 5.90698 6.88673 7.27148 6.88672ZM7.28027 8.12012C6.60117 8.12032 6.05078 8.67133 6.05078 9.35059C6.05079 10.0298 6.60118 10.5809 7.28027 10.5811C7.95954 10.5811 8.51073 10.03 8.51074 9.35059C8.51074 8.6712 7.95977 8.12012 7.28027 8.12012Z" fill="#0B3462"/>
                </svg>
              </button>

              <button
                type="button"
                class="btn btn--primary service-reply-btn"
                :disabled="!canSend"
                @click="handleSend"
              >
                {{ t('发送') }}
              </button>
            </div>
          </div>
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
        <span class="service-exit-dialog__info" aria-hidden="true">
          <img :src="iconDialogInfoUrl" width="20" height="20" alt="" />
        </span>
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
  background: #e9f0f8;
  overflow: hidden;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
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
  white-space: pre-wrap;

  @include mobile-only {
    font-size: 12px;
    line-height: 1.5;
  }
}

/* 气泡内表情图：对齐安卓 MESSAGE_FACE_SIZE_DP=16 */
.service-msg__emoticon {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin: 0 1px;
  vertical-align: -3px;
  object-fit: contain;
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
    color: rgba(255, 255, 255, 0.72);
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
  align-items: stretch;
  background: var(--surface-card);
  flex-shrink: 0;
  box-sizing: border-box;

  @include web-only {
    min-height: 156px;
    margin: 0 34px 20px;
    padding: 24px 18px 18px;
    border-radius: 18px;
    background: #FFFFFF;
  }

  @include mobile-only {
    min-height: 86px;
    padding: 13px 10px 10px 16px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 14px;
  }
}

.service-reply-composer {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.service-reply-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
}

/* ─── 表情面板（对齐安卓 8 列网格 + PNG） ─── */

.service-emoji-panel {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  width: min(360px, 100%);
  max-height: 260px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid rgba(21, 58, 119, 0.12);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(21, 58, 119, 0.16);
  box-sizing: border-box;
}

.service-emoji-panel__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  padding: 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  box-sizing: border-box;

  img {
    display: block;
    width: 28px;
    height: 28px;
    object-fit: contain;
    pointer-events: none;
  }

  &:hover {
    background: rgba(31, 124, 255, 0.1);
  }
}

.service-emoji-btn {
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
  cursor: pointer;
  transition: background 0.2s;

  img {
    display: block;
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.04);
  }

  &--active {
    background: rgba(31, 124, 255, 0.12);
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
  min-height: 44px;
  max-height: 96px;
  overflow-y: auto;
  padding: 0 0 0 2px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--theme-text);
  font-size: $font-size-md;
  line-height: 1.45;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;

  &[data-empty='true']::before {
    content: attr(data-placeholder);
    color: rgba(23, 59, 97, 0.28);
    pointer-events: none;
  }

  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  // 输入框内表情：对齐安卓 INPUT_FACE_SIZE_DP=22
  :deep(.service-reply-input__emoticon) {
    display: inline-block;
    width: 22px;
    height: 22px;
    margin: 0 1px;
    vertical-align: -5px;
    object-fit: contain;
  }

  @include mobile-only {
    &[data-empty='true']::before {
      color: #c2c5cc;
    }
  }
}

.service-reply-btn {
  flex-shrink: 0;
  margin-left: auto;
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

  p {
    margin: 0;
    // 与登录确认弹窗文案一致：16px / Regular / #0B3462
    color: #0b3462;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.4;
  }
}

.service-exit-dialog__info {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;

  img {
    display: block;
    width: 20px;
    height: 20px;
  }
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
