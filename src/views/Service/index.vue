<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

import { fetchTickets, createTicket, fetchTicketMessages, replyTicket } from '@/api/cs';

const { t } = useI18n();

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

const DEMO_TICKETS = [
  {
    id: 'demo-1',
    subjectKey: '充值到账咨询',
    categoryKey: '充值问题',
    status: 'OPEN',
    createdAt: '2026-07-07T09:41:00+08:00',
  },
  {
    id: 'demo-2',
    subjectKey: '提款资料确认',
    categoryKey: '提现问题',
    status: 'RESOLVED',
    createdAt: '2026-07-06T18:20:00+08:00',
  },
];

const DEMO_MESSAGES = {
  'demo-1': [
    {
      id: 'demo-msg-1',
      sender: 'CUSTOMER',
      contentKey: '您好我想确认充值到账时间',
      createdAt: '2026-07-07T09:41:00+08:00',
    },
    {
      id: 'demo-msg-2',
      sender: 'AGENT',
      contentKey: '充值到账时间回复',
      createdAt: '2026-07-07T09:42:00+08:00',
    },
  ],
  'demo-2': [
    {
      id: 'demo-msg-3',
      sender: 'AGENT',
      contentKey: '提款资料确认回复',
      createdAt: '2026-07-06T18:20:00+08:00',
    },
  ],
};

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

const canReply = computed(() =>
  activeTicket.value && activeTicket.value.status === 'OPEN',
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
  } catch {
    tickets.value = DEMO_TICKETS;
    activeTicketId.value = DEMO_TICKETS[0]?.id ?? null;
    messages.value = DEMO_MESSAGES[activeTicketId.value] || [];
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
    messages.value = DEMO_MESSAGES[ticketId] || [];
    await nextTick();
    scrollToBottom();
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
    <div class="service-page__inner">
      <!-- 工单列表 -->
      <aside class="service-list" aria-label="ticket-list">
        <div class="service-list__header">
          <h2 class="service-list__title">{{ t('在线客服') }}</h2>
          <button type="button" class="btn btn--primary service-list__create" @click="openCreateForm">
            {{ t('新建工单') }}
          </button>
        </div>

        <div v-if="listLoading" class="service-state">
          <div class="service-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>

        <div v-else-if="listError" class="service-state service-state--error">
          <span>{{ listError }}</span>
          <button type="button" class="btn btn--primary service-state__retry" @click="loadTickets">
            {{ t('重试') }}
          </button>
        </div>

        <div v-else-if="tickets.length === 0" class="service-state">
          <span>{{ t('暂无工单') }}</span>
        </div>

        <ul v-else class="service-ticket-list">
          <li
            v-for="ticket in tickets"
            :key="ticket.id"
            class="service-ticket-item"
            :class="{ 'service-ticket-item--active': ticket.id === activeTicketId }"
            @click="selectTicket(ticket)"
          >
            <div class="service-ticket-item__top">
              <span class="service-ticket-item__subject">{{ ticketSubject(ticket) }}</span>
              <span class="service-status" :class="STATUS_MAP[ticket.status]?.cls">
                {{ t(STATUS_MAP[ticket.status]?.label || ticket.status) }}
              </span>
            </div>
            <div class="service-ticket-item__meta">
              <span class="service-ticket-item__category">{{ ticketCategory(ticket) }}</span>
              <span class="service-ticket-item__time">{{ formatTime(ticket.createdAt) }}</span>
            </div>
          </li>
        </ul>
      </aside>

      <!-- 右侧详情 -->
      <main class="service-detail">
        <!-- 新建工单表单 -->
        <template v-if="showCreateForm">
          <div class="service-create card-default">
            <h3 class="service-create__title">{{ t('新建工单') }}</h3>
            <div class="service-form-group">
              <label class="service-form-label">{{ t('主题') }}</label>
              <input
                v-model="createForm.subject"
                type="text"
                class="service-form-input"
                :placeholder="t('请输入工单主题')"
                maxlength="100"
              />
            </div>
            <div class="service-form-group">
              <label class="service-form-label">{{ t('分类') }}</label>
              <select v-model="createForm.category" class="service-form-input">
                <option v-for="cat in CATEGORIES" :key="cat.value" :value="cat.value">
                  {{ t(cat.label) }}
                </option>
              </select>
            </div>
            <div class="service-form-group">
              <label class="service-form-label">{{ t('内容') }}</label>
              <textarea
                v-model="createForm.content"
                class="service-form-textarea"
                :placeholder="t('请详细描述您的问题')"
                rows="5"
                maxlength="2000"
              />
            </div>
            <div class="service-create__actions">
              <button type="button" class="btn service-create__cancel" @click="cancelCreate">
                {{ t('取消') }}
              </button>
              <button
                type="button"
                class="btn btn--primary"
                :disabled="createSubmitting || !createForm.subject.trim() || !createForm.content.trim()"
                @click="submitCreate"
              >
                {{ createSubmitting ? t('提交中') : t('提交') }}
              </button>
            </div>
          </div>
        </template>

        <!-- 未选择工单 -->
        <template v-else-if="!activeTicketId">
          <div class="service-empty-detail card-default">
            <span>{{ t('请选择一个工单查看详情') }}</span>
          </div>
        </template>

        <!-- 工单消息 -->
        <template v-else>
          <div class="service-chat card-default">
            <div class="service-chat__header">
              <h3 class="service-chat__title">{{ ticketSubject(activeTicket) }}</h3>
              <span class="service-status" :class="STATUS_MAP[activeTicket?.status]?.cls">
                {{ t(STATUS_MAP[activeTicket?.status]?.label || '') }}
              </span>
            </div>

            <div class="service-chat__body">
              <div v-if="msgLoading" class="service-state">
                <div class="service-spinner" />
                <span>{{ t('加载中') }}</span>
              </div>

              <div v-else-if="msgError" class="service-state service-state--error">
                <span>{{ msgError }}</span>
                <button type="button" class="btn btn--primary service-state__retry" @click="loadMessages(activeTicketId)">
                  {{ t('重试') }}
                </button>
              </div>

              <div v-else-if="messages.length === 0" class="service-state">
                <span>{{ t('暂无消息') }}</span>
              </div>

              <div v-else class="service-messages">
                <div
                  v-for="msg in messages"
                  :key="msg.id"
                  class="service-msg"
                  :class="{ 'service-msg--self': msg.sender === 'CUSTOMER' }"
                >
                  <div class="service-msg__bubble">
                    <p class="service-msg__text">{{ messageContent(msg) }}</p>
                    <span class="service-msg__time">{{ formatTime(msg.createdAt) }}</span>
                  </div>
                </div>
                <div ref="messagesEndRef" />
              </div>
            </div>

            <div v-if="canReply" class="service-chat__footer">
              <textarea
                v-model="replyContent"
                class="service-reply-input"
                :placeholder="t('输入回复内容')"
                rows="2"
                maxlength="2000"
                @keydown.enter.ctrl.exact="handleReply"
              />
              <button
                type="button"
                class="btn btn--primary service-reply-btn"
                :disabled="replySending || !replyContent.trim()"
                @click="handleReply"
              >
                {{ replySending ? t('发送中') : t('发送') }}
              </button>
            </div>

            <div v-else-if="activeTicket" class="service-chat__closed">
              {{ t('该工单已关闭，无法继续回复') }}
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.service-page {
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--theme-bg);

  @include web-only {
    padding: 10px 30px $spacing-2xl;
  }

  @include mobile-only {
    padding: 0 $spacing-sm $spacing-md;
  }
}

.service-page__inner {
  margin: 0 auto;

  @include web-only {
    display: flex;
    align-items: flex-start;
    gap: $spacing-xl;
    width: min(100%, 1200px);
  }

  @include mobile-only {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
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
    max-height: calc(100vh - 20px);
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
  border-radius: $radius-lg;
  overflow: hidden;

  @include web-only {
    min-height: 500px;
    max-height: calc(100vh - 20px);
  }

  @include mobile-only {
    min-height: 360px;
    max-height: calc(100vh - 340px);
  }
}

.service-chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  padding: $spacing-lg;
  border-bottom: 1px solid var(--theme-divider);
  flex-shrink: 0;
}

.service-chat__title {
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--theme-text);
  font-size: $font-size-base;
  font-weight: 700;
}

.service-chat__body {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-lg;
}

.service-messages {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.service-msg {
  display: flex;
  justify-content: flex-start;
}

.service-msg--self {
  justify-content: flex-end;
}

.service-msg__bubble {
  max-width: 70%;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  background: var(--theme-bg);
  word-break: break-word;

  .service-msg--self & {
    background: rgba(28, 123, 255, 0.1);
  }
}

.service-msg__text {
  margin: 0;
  color: var(--theme-text);
  font-size: $font-size-md;
  line-height: 1.6;
}

.service-msg__time {
  display: block;
  margin-top: $spacing-xs;
  color: var(--theme-text-1);
  font-size: $font-size-sm;
  text-align: right;
}

.service-chat__footer {
  display: flex;
  align-items: flex-end;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid var(--theme-divider);
  flex-shrink: 0;
}

.service-reply-input {
  flex: 1;
  min-height: 36px;
  max-height: 100px;
  padding: $spacing-sm $spacing-md;
  border: 1px solid var(--theme-divider);
  border-radius: $radius-sm;
  background: var(--theme-bg);
  color: var(--theme-text);
  font-size: $font-size-md;
  resize: none;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.service-reply-btn {
  flex-shrink: 0;
  height: 36px;
  padding: 0 $spacing-xl;
  border-radius: $radius-pill;
  font-size: $font-size-md;
}

.service-chat__closed {
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid var(--theme-divider);
  color: var(--theme-text-1);
  font-size: $font-size-sm;
  text-align: center;
  flex-shrink: 0;
}
</style>
