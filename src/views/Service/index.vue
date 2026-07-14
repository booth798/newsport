<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { fetchTickets, createTicket, fetchTicketMessages, replyTicket } from '@/api/cs';
import BaseModal from '@/components/BaseModal.vue';
import iconBackUrl from '@/assets/images/common/icon_back.svg?url';
import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';

const { t } = useI18n();
const router = useRouter();

const STATUS_MAP = {
  OPEN: { label: '进行中', cls: 'service-status--open' },
  RESOLVED: { label: '已解决', cls: 'service-status--resolved' },
  CLOSED: { label: '已关闭', cls: 'service-status--closed' },
};

const CATEGORIES = [
  { value: 'GENERAL', label: '综合咨询' },
  { value: 'DEPOSIT', label: '充值问题' },
  { value: 'WITHDRAW', label: '提现问题' },
  { value: 'ACCOUNT', label: '账户问题' },
  { value: 'OTHER', label: '其他' },
];

// --- 工单列表 ---
const tickets = ref([]);
const listLoading = ref(true);
const listError = ref('');

// --- 当前工单详情 ---
const activeTicketId = ref(null);
const messages = ref([]);
const msgLoading = ref(false);
const msgError = ref('');
const replyContent = ref('');
const replySending = ref(false);
const messagesEndRef = ref(null);

// --- 新建工单 ---
const showCreateForm = ref(false);
const createForm = ref({ subject: '', category: 'GENERAL', content: '' });
const createSubmitting = ref(false);

const activeTicket = computed(() =>
  tickets.value.find((tk) => tk.id === activeTicketId.value) || null,
);

const activeTitle = computed(() => ticketSubject(activeTicket.value) || t('在线客服'));
const displayMessages = computed(() => messages.value);
const canReply = computed(() =>
  !activeTicket.value || activeTicket.value.status === 'OPEN',
);

function ticketSubject(ticket) {
  return ticket?.subjectKey ? t(ticket.subjectKey) : ticket?.subject || '';
}

function ticketCategory(ticket) {
  return ticket?.categoryKey ? t(ticket.categoryKey) : ticket?.category || '';
}

function messageContent(message) {
  return message?.contentKey ? t(message.contentKey) : message?.content || '';
}

let pollTimer = null;

async function loadTickets() {
  listLoading.value = true;
  listError.value = '';
  try {
    const res = await fetchTickets(50);
    tickets.value = res.data || [];
    activeTicketId.value = tickets.value[0]?.id ?? null;
    if (activeTicketId.value) await loadMessages(activeTicketId.value);
  } catch {
    listError.value = t('加载失败');
  } finally {
    listLoading.value = false;
  }
}

async function selectTicket(ticket) {
  activeTicketId.value = ticket.id;
  showCreateForm.value = false;
  await loadMessages(ticket.id);
}

async function loadMessages(ticketId) {
  msgLoading.value = true;
  msgError.value = '';
  try {
    const res = await fetchTicketMessages(ticketId);
    messages.value = res.data || [];
    await nextTick();
    scrollToBottom();
  } catch {
    messages.value = [];
    msgError.value = t('加载失败');
  } finally {
    msgLoading.value = false;
  }
}

function scrollToBottom() {
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
}

async function handleReply() {
  const content = replyContent.value.trim();
  if (!content || !activeTicketId.value) return;
  replySending.value = true;
  try {
    await replyTicket(activeTicketId.value, content, []);
    replyContent.value = '';
    await loadMessages(activeTicketId.value);
  } catch {
    /* 发送失败，内容保留在输入框 */
  } finally {
    replySending.value = false;
  }
}

function openCreateForm() {
  showCreateForm.value = true;
  activeTicketId.value = null;
  createForm.value = { subject: '', category: 'GENERAL', content: '' };
}

function cancelCreate() {
  showCreateForm.value = false;
}

async function submitCreate() {
  const { subject, category, content } = createForm.value;
  if (!subject.trim() || !content.trim()) return;
  createSubmitting.value = true;
  try {
    await createTicket({ subject: subject.trim(), category, priority: 'NORMAL', content: content.trim() });
    showCreateForm.value = false;
    await loadTickets();
  } catch {
    /* 创建失败 */
  } finally {
    createSubmitting.value = false;
  }
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '';
  }
}

// --- 退出确认弹窗（参考安卓端：点返回先弹"是否结束对话"） ---
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

function startPoll() {
  pollTimer = setInterval(() => {
    if (activeTicketId.value) loadMessages(activeTicketId.value);
  }, 30000);
}

onMounted(() => {
  loadTickets();
  startPoll();
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <div class="service-page">
    <div class="service-statusbar" aria-hidden="true">
      <span class="service-statusbar__time">9:41</span>
      <span class="service-statusbar__icons">
        <span class="service-statusbar__signal"></span>
        <span class="service-statusbar__wifi"></span>
        <span class="service-statusbar__battery"></span>
      </span>
    </div>

    <header class="service-topbar">
      <button type="button" class="service-topbar__back" :aria-label="t('返回')" @click="goBack">
        <img :src="iconBackUrl" alt="" />
      </button>
      <span class="service-topbar__avatar" aria-hidden="true">
        <img :src="avatarDefaultUrl" alt="" />
      </span>
      <h1 class="service-topbar__title">{{ t('在线客服') }}</h1>
    </header>

    <div class="service-page__inner">
      <section class="service-chat" aria-label="service-chat">
        <div class="service-chat__body">
          <div v-if="listLoading || msgLoading" class="service-state">
            <div class="service-spinner" />
            <span>{{ t('加载中') }}</span>
          </div>

          <div v-else class="service-messages">
            <div class="service-chat__welcome">
              <span class="service-chat__welcome-avatar" aria-hidden="true">
                <img :src="avatarDefaultUrl" alt="" />
              </span>
              <p>{{ t('智能客服助手为您服务') }}</p>
            </div>

            <div
              v-for="msg in displayMessages"
              :key="msg.id"
              class="service-msg"
              :class="{ 'service-msg--self': msg.sender === 'CUSTOMER' }"
            >
              <span v-if="msg.sender !== 'CUSTOMER'" class="service-msg__avatar" aria-hidden="true">
                <img :src="avatarDefaultUrl" alt="" />
              </span>
              <div class="service-msg__bubble">
                <p class="service-msg__text">{{ messageContent(msg) }}</p>
                <span class="service-msg__time">{{ formatTime(msg.createdAt) }}</span>
              </div>
              <span v-if="msg.sender === 'CUSTOMER'" class="service-msg__avatar service-msg__avatar--self" aria-hidden="true">
                <span></span>
              </span>
            </div>
            <div ref="messagesEndRef" />
          </div>
        </div>

        <footer class="service-chat__footer">
          <textarea
            v-model="replyContent"
            class="service-reply-input"
            :placeholder="canReply ? t('请输入消息...') : t('该工单已关闭，无法继续回复')"
            :disabled="!canReply"
            maxlength="2000"
            rows="2"
            @keydown.enter.ctrl.exact="handleReply"
          />
          <button
            type="button"
            class="btn btn--primary service-reply-btn"
            :disabled="replySending || !replyContent.trim() || !canReply"
            @click="handleReply"
          >
            {{ replySending ? t('发送中') : t('发送') }}
          </button>
        </footer>
      </section>
    </div>

    <!-- 退出确认弹窗：参考安卓端，点返回时弹出"是否结束对话" -->
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

// --- 工单列表 ---

.service-list {
  box-sizing: border-box;
  background: var(--surface-card);
  border-radius: $radius-lg;
  overflow: hidden;

  @include web-only {
    position: sticky;
    top: 10px;
    flex: 0 0 340px;
    max-height: calc(100dvh - 20px);
    overflow-y: auto;
  }

  @include mobile-only {
    width: 100%;
    max-height: 260px;
    overflow-y: auto;
  }
}

.service-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg $spacing-lg $spacing-md;
  border-bottom: 1px solid var(--theme-divider);
}

.service-list__title {
  margin: 0;
  color: var(--theme-text);

  @include web-only {
    font-size: $font-size-lg;
  }

  @include mobile-only {
    font-size: $font-size-base;
  }
}

.service-list__create {
  flex-shrink: 0;
  height: 32px;
  padding: 0 $spacing-md;
  border-radius: $radius-pill;
  font-size: $font-size-sm;
}

.service-ticket-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.service-ticket-item {
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid var(--theme-divider);
  cursor: pointer;
  transition: background 0.18s ease;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: rgba(28, 123, 255, 0.04);
  }
}

.service-ticket-item--active {
  background: rgba(28, 123, 255, 0.08);
}

.service-ticket-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
}

.service-ticket-item__subject {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--theme-text);
  font-weight: 600;

  @include web-only {
    font-size: $font-size-md;
  }

  @include mobile-only {
    font-size: $font-size-sm;
  }
}

.service-ticket-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing-xs;
  color: var(--theme-text-1);
  font-size: $font-size-sm;
}

// --- 状态标签 ---

.service-status {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 $spacing-sm;
  border-radius: $radius-pill;
  font-size: $font-size-sm;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.service-status--open {
  background: rgba(28, 123, 255, 0.12);
  color: var(--theme-primary);
}

.service-status--resolved {
  background: rgba(46, 125, 50, 0.12);
  color: #2e7d32;
}

.service-status--closed {
  background: rgba(158, 158, 158, 0.12);
  color: #9e9e9e;
}

// --- 通用状态 ---

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

.service-state--error {
  color: var(--auxiliary-2);
}

.service-state__retry {
  height: 32px;
  padding: 0 $spacing-lg;
  border-radius: $radius-pill;
  font-size: $font-size-sm;
}

.service-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: service-spin 0.8s linear infinite;
}

@keyframes service-spin {
  to { transform: rotate(360deg); }
}

// --- 右侧详情 ---

.service-detail {
  min-width: 0;

  @include web-only {
    flex: 1;
  }

  @include mobile-only {
    width: 100%;
  }
}

.service-empty-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  border-radius: $radius-lg;
  color: var(--theme-text-1);
  font-size: $font-size-md;
}

// --- 新建工单表单 ---

.service-create {
  border-radius: $radius-lg;

  @include web-only {
    padding: $spacing-2xl;
  }

  @include mobile-only {
    padding: $spacing-lg;
  }
}

.service-create__title {
  margin: 0 0 $spacing-xl;
  color: var(--theme-text);
  font-size: $font-size-lg;
}

.service-form-group {
  margin-bottom: $spacing-lg;
}

.service-form-label {
  display: block;
  margin-bottom: $spacing-xs;
  color: var(--theme-text);
  font-size: $font-size-md;
  font-weight: 600;
}

.service-form-input,
.service-form-textarea {
  display: block;
  width: 100%;
  padding: $spacing-sm $spacing-md;
  border: 1px solid var(--theme-divider);
  border-radius: $radius-sm;
  background: var(--theme-bg);
  color: var(--theme-text);
  font-size: $font-size-md;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.18s ease;
  font-family: inherit;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.service-form-textarea {
  resize: vertical;
  min-height: 80px;
}

.service-create__actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-md;
  margin-top: $spacing-xl;
}

.service-create__cancel {
  height: 36px;
  padding: 0 $spacing-lg;
  border-radius: $radius-pill;
  border: 1px solid var(--theme-divider);
  background: transparent;
  color: var(--theme-text);
  font-size: $font-size-md;
  cursor: pointer;
}

// --- 聊天区 ---

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

.service-msg__avatar {
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

.service-msg__bubble {
  max-width: min(520px, 76%);
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
    max-width: 248px;
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

.service-msg__time {
  display: inline-block;
  margin-left: 18px;
  color: rgba(11, 52, 98, 0.42);
  font-size: 12px;
  text-align: right;

  .service-msg--self & {
    color: rgba(255, 255, 255, 0.72);
  }
}

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

.service-chat__closed {
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid var(--theme-divider);
  color: var(--theme-text-1);
  font-size: $font-size-sm;
  text-align: center;
  flex-shrink: 0;
}

// --- 退出确认弹窗（与 AppCustomerServiceConfirm 保持一致） ---

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
