/**
 * 客服业务协调 composable（对齐 Android OnlineServiceCoordinator）。
 *
 * 串联 HTTP 初始化 → WebSocket 连接 → 消息收发 → 发送状态机。
 * Web 端不做 Room 本地持久化，消息仅保留在内存中；
 * 离线消息依赖 CONNECT 帧的 lastMessageId 由服务端补发。
 */
import { ref, reactive, computed, onBeforeUnmount } from 'vue';
import { useUserStore } from '@/store/modules/user';
import { useAppStore } from '@/store/modules/app';
import {
  generateVisitorToken,
  resolveKfBase,
  resolveEntryLinkCode,
  resolveKfUserAvatarUrl,
  kfInitVisitor,
  kfGetConfig,
  kfUploadImage,
  buildKfWebSocketUrl,
  buildKfImageUrl,
} from '@/api/kf';
import { SITE_CONFIG } from '@/config/site';
import { useKfWebSocket, KfConnectionState } from './useKfWebSocket';

const __DEV__ = import.meta.env.DEV;

/* ─── 常量（对齐 Android Coordinator companion） ─── */
const MESSAGE_ACK_TIMEOUT_MS = 15_000;
const AUTO_REPLY_INTERVAL_MS = 10 * 60 * 1_000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp'];

// 访客身份：未登录时也允许连接客服（对齐 Android SportsOnlineServiceHost 的 guest 分支）。
// 用持久化到 localStorage 的稳定随机 id 充当浏览器「设备指纹」，
// 保证同一浏览器多次进入客服复用同一访客身份（历史消息可续接）。
const KF_GUEST_ID_KEY = 'mysport:kf-guest-id';

function resolveGuestKey() {
  let id = '';
  try {
    id = localStorage.getItem(KF_GUEST_ID_KEY) || '';
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(KF_GUEST_ID_KEY, id);
    }
  } catch {
    // localStorage 不可用时退化为本次会话内的临时 id
    id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  return `guest:${id}`;
}

/* ─── 消息方向 & 内容类型 & 发送状态（对齐 Android 枚举） ─── */
export const MessageDirection = Object.freeze({
  TO_OPERATOR: 'TO_OPERATOR',
  FROM_OPERATOR: 'FROM_OPERATOR',
  SYSTEM: 'SYSTEM',
});

export const ContentType = Object.freeze({
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  LINK: 'LINK',
  SYSTEM: 'SYSTEM',
  UNKNOWN: 'UNKNOWN',
});

export const SendState = Object.freeze({
  UPLOADING: 'UPLOADING',
  SENDING: 'SENDING',
  SUBMITTED: 'SUBMITTED',
  SENT: 'SENT',
  FAILED: 'FAILED',
  RECEIVED: 'RECEIVED',
});

let tempIdCounter = 0;
function generateTempId() {
  return `tmp_${Date.now()}_${++tempIdCounter}`;
}

/**
 * @returns 客服协调器的响应式状态与操作方法
 */
export function useCustomerService() {
  const userStore = useUserStore();
  const appStore = useAppStore();

  /* ─── 响应式状态 ─── */
  const messages = ref([]);
  const connectionState = ref(KfConnectionState.IDLE);
  const errorMessage = ref('');
  const kfName = ref('');
  const kfAvatar = ref('');
  const isInitializing = ref(false);

  /* ─── 内部状态 ─── */
  let visitorToken = null;
  let visitorAccount = null;
  let receiveId = null;
  let kfBase = null;
  let entryLinkCode = null;
  let lastMessageId = 0;
  let lastAutoReplyAt = 0;
  let lastPageClosedAt = 0;
  const ackTimeoutMap = new Map();
  let generation = 0; // 账号版本号

  /* ─── WebSocket ─── */
  const ws = useKfWebSocket({
    onFrame: handleFrame,
    onStateChange: (newState) => {
      connectionState.value = newState;
    },
  });

  /* ─── 帧构建器（对齐 OnlineServiceFrameParser） ─── */

  function buildFrame(type, extra = {}) {
    return JSON.stringify({ type, token: visitorToken, ...extra });
  }

  function buildMsgFrame(text, tempId) {
    return buildFrame('MSG', {
      receiveId,
      text,
      extend: { tempId },
    });
  }

  function buildImageFrame(remoteUrl, tempId) {
    return buildFrame('EXTEND', {
      receiveId,
      text: '',
      extend: { name: 'image', url: remoteUrl, tempId },
    });
  }

  function buildAutoReplyFrame() {
    return buildFrame('AUTO_REPLY', { receiveId });
  }

  function buildReadReceiptFrame(time) {
    return buildFrame('READ_RECEIPT', { receiveId, time, extend: {} });
  }

  function buildConnectFrame(account, userName, avatar) {
    // 对齐 mystock / 安卓 OnlineServiceFrameParser.connect：
    // account / userName / avatar 建连时传入，后台才显示真实账号昵称与头像
    const payload = {
      type: 'CONNECT',
      token: visitorToken,
      lastMessageId,
    };
    if (account) payload.account = account;
    if (userName) payload.userName = userName;
    if (avatar) payload.avatar = avatar;
    return JSON.stringify(payload);
  }

  /**
   * 组装 CONNECT 身份：登录传账号+昵称+公网头像；未登录走 guest。
   * 参考 mystock-web ensureAuthProfile。
   */
  async function resolveConnectIdentity() {
    const loggedIn = !!userStore.customerId;
    if (!loggedIn) {
      return {
        identityKey: resolveGuestKey(),
        account: 'guest',
        userName: '访客',
        avatar: '',
      };
    }

    try {
      await userStore.loadUserProfile();
    } catch {
      /* 失败仍用本地缓存 */
    }

    const profile = userStore.userProfile || userStore.customer || {};
    const account = String(
      profile.username
      || profile.customerNo
      || profile.memberId
      || userStore.customerId
      || '',
    ).trim();
    const userName = String(profile.nickname || profile.username || '').trim() || account;
    const rawAvatar = profile.avatarUrl || profile.avatar || userStore.loggedInAvatarUrl || '';
    const avatar = resolveKfUserAvatarUrl(rawAvatar);

    return {
      identityKey: String(userStore.customerId),
      account,
      userName,
      avatar,
    };
  }

  /* ─── 连接流程（对齐 ensureConnected） ─── */

  async function connect() {
    if (
      connectionState.value === KfConnectionState.CONNECTED ||
      connectionState.value === KfConnectionState.CONNECTING
    ) {
      return;
    }

    isInitializing.value = true;
    errorMessage.value = '';
    const gen = ++generation;

    try {
      const identity = await resolveConnectIdentity();
      if (gen !== generation) return;
      visitorAccount = identity.account;

      // 确保公开配置已加载
      await appStore.loadPublicConfig();
      if (gen !== generation) return;

      // 对齐 Android SportsOnlineServiceHost + resolveEntryLinkCode：
      // 1. kfBase：customer-service.url 的 origin，缺失时回退主 API 域名
      // 2. entryLinkCode：优先 customer-service.linkcode，兼容旧版从 URL 解析
      // 3. 解析失败时强制刷新一次公开配置再试
      // 4. 所有 HTTP 和 WebSocket 均直连 kfBase（不走本地代理）
      let csUrl = appStore.csUrl;
      let csLinkCode = appStore.csLinkCode;
      kfBase = resolveKfBase(csUrl, SITE_CONFIG.apiBaseUrl);
      entryLinkCode = resolveEntryLinkCode(csLinkCode, csUrl);

      // 兜底：配置为空或解析失败时，强制拉一次公开配置
      if (!kfBase || !entryLinkCode) {
        await appStore.loadPublicConfig({ force: true });
        if (gen !== generation) return;
        csUrl = appStore.csUrl;
        csLinkCode = appStore.csLinkCode;
        if (!kfBase) kfBase = resolveKfBase(csUrl, SITE_CONFIG.apiBaseUrl);
        if (!entryLinkCode) entryLinkCode = resolveEntryLinkCode(csLinkCode, csUrl);
      }

      if (!kfBase) {
        fail('在线客服地址尚未配置');
        return;
      }
      if (!entryLinkCode) {
        fail('在线客服入口 code 尚未获取，请稍后重试');
        return;
      }

      visitorToken = await generateVisitorToken(identity.identityKey);
      if (gen !== generation) return;

      if (__DEV__) {
        console.log('[KF] CONNECT 身份', {
          account: identity.account,
          userName: identity.userName,
          avatar: identity.avatar,
          token: `${visitorToken.slice(0, 12)}…`,
        });
      }

      // 1. init.json
      await kfInitVisitor(kfBase, visitorToken);
      if (gen !== generation) return;

      // 2. getConfig.json
      const config = await kfGetConfig(kfBase, visitorToken, entryLinkCode);
      if (gen !== generation) return;

      receiveId = config.linkCode?.trim();
      if (!receiveId) throw new Error('客服配置缺少 linkCode');

      kfName.value = config.kfName || '';
      // kfAvatar 是相对路径（如 /profile/upload/...），需拼接 kfBase 得到完整 URL
      kfAvatar.value = buildKfImageUrl(kfBase, config.kfAvatar) || '';

      if (__DEV__) console.log('[KF] 配置获取成功', { receiveId, kfName: kfName.value });

      // 3. 建立 WebSocket（带账号 / 昵称 / 公网头像）
      const wsUrl = buildKfWebSocketUrl(kfBase);
      const connectPayload = buildConnectFrame(
        identity.account,
        identity.userName,
        identity.avatar,
      );

      ws.connect(wsUrl, connectPayload);
    } catch (e) {
      if (gen !== generation) return;
      if (__DEV__) console.error('[KF] 连接失败', e);
      fail(e.message || '在线客服连接失败');
    } finally {
      if (gen === generation) {
        isInitializing.value = false;
      }
    }
  }

  function fail(msg) {
    errorMessage.value = msg;
    ws.fail();
    // 将所有 in-flight 消息标为失败
    messages.value.forEach((m) => {
      if (
        m.direction === MessageDirection.TO_OPERATOR &&
        m.sendState !== SendState.SENT &&
        m.sendState !== SendState.FAILED
      ) {
        m.sendState = SendState.FAILED;
        m.errorMessage = '客服连接失败，请点击重试';
      }
    });
    clearAllAckTimeouts();
  }

  /* ─── 帧处理（对齐 handleFrame） ─── */

  function handleFrame({ type, json }) {
    switch (type) {
      case 'BIND_SUCCESS':
        handleBindSuccess();
        break;
      case 'SET_OPERATOR':
        receiveId = json.operatorId || receiveId;
        break;
      case 'MSG':
      case 'EXTEND':
      case 'SYSTEM':
        handleIncomingMessage(type, json);
        break;
      case 'MSG_ACK':
        handleAck(json);
        break;
      case 'WITHDRAW_NOTICE':
        handleWithdraw(json);
        break;
      case 'ERROR': {
        const msg = json.message || '';
        if (msg.includes('not connected') || msg.includes('receiveId does not match')) {
          // 重启连接
          ws.disconnect();
          connect();
        } else {
          errorMessage.value = msg;
        }
        break;
      }
      default:
        break;
    }
  }

  function handleBindSuccess() {
    errorMessage.value = '';
    // 自动重发未完成消息
    retryInFlightMessages();
    // 检查是否需要发送欢迎语
    requestWelcomeMessageIfNeeded();
  }

  /**
   * 处理服务端推送的消息帧（对齐 saveIncomingFrame）。
   */
  function handleIncomingMessage(frameType, json) {
    const extend = typeof json.extend === 'string'
      ? tryParseJson(json.extend)
      : (json.extend || null);
    const text = json.text || extend?.text || '';
    const clientTempId = extend?.tempId || json.tempId;
    const serverMessageId = json.messageId;

    // 自己发送的消息回显，更新本地状态而不重复插入
    if (clientTempId) {
      const existing = messages.value.find((m) => m.clientTempId === clientTempId);
      if (existing) {
        existing.serverMessageId = serverMessageId;
        existing.sendState = SendState.SENT;
        existing.errorMessage = '';
        cancelAckTimeout(clientTempId);
        updateLastMessageId(serverMessageId);
        return;
      }
    }

    // 按 serverMessageId 去重
    if (serverMessageId && messages.value.some((m) => m.serverMessageId === serverMessageId)) {
      return;
    }

    const contentType = resolveContentType(frameType, extend);
    const direction = resolveDirection(frameType, json, extend);
    const createdAt = json.time || Date.now();

    const msg = reactive({
      clientTempId: clientTempId || generateTempId(),
      serverMessageId,
      direction,
      contentType,
      text,
      imageUrl: contentType === ContentType.IMAGE ? resolveImagePath(extend?.url) : null,
      linkUrl: extend?.url && contentType === ContentType.LINK ? extend.url : null,
      linkType: extend?.type || null,
      sendState: SendState.RECEIVED,
      errorMessage: '',
      createdAt,
    });

    messages.value.push(msg);

    // 推进离线消息游标
    if (
      direction !== MessageDirection.TO_OPERATOR &&
      serverMessageId
    ) {
      updateLastMessageId(serverMessageId);
    }
  }

  function resolveContentType(frameType, extend) {
    if (frameType === 'SYSTEM') return ContentType.SYSTEM;
    if (frameType === 'MSG') return ContentType.TEXT;
    if (extend?.name === 'image') return ContentType.IMAGE;
    if (extend?.name === 'link') return ContentType.LINK;
    return ContentType.UNKNOWN;
  }

  /**
   * 推断消息方向（对齐 Android resolveMessageDirection）。
   */
  function resolveDirection(frameType, json, extend) {
    if (frameType === 'SYSTEM') return MessageDirection.SYSTEM;

    // 检查显式方向字段
    const directionFields = ['direction', 'messageDirection', 'fromType', 'senderType', 'role'];
    for (const field of directionFields) {
      const val = (json[field] || extend?.[field] || '').toString().toLowerCase().trim();
      if (!val) continue;
      const outgoing = ['to_operator', 'out', 'outgoing', 'send', 'sent', 'mine', 'self', 'user', 'visitor', 'customer', 'youke'];
      const incoming = ['from_operator', 'in', 'incoming', 'receive', 'received', 'operator', 'kf', 'kefu', 'service', 'staff'];
      if (outgoing.includes(val)) return MessageDirection.TO_OPERATOR;
      if (incoming.includes(val)) return MessageDirection.FROM_OPERATOR;
    }

    // 按 sender/receiver 字段与本地身份匹配
    const senderFields = ['sender', 'senderId', 'from', 'fromId', 'token', 'account'];
    const visitorIds = [visitorToken, visitorAccount].filter(Boolean).map((s) => s.toLowerCase());

    for (const field of senderFields) {
      const val = (json[field] || extend?.[field] || '').toString().toLowerCase().trim();
      if (val && visitorIds.includes(val)) return MessageDirection.TO_OPERATOR;
      if (val && receiveId && val === receiveId.toLowerCase()) return MessageDirection.FROM_OPERATOR;
    }

    // 默认视为客服发来的消息
    return MessageDirection.FROM_OPERATOR;
  }

  function resolveImagePath(remotePath) {
    if (!remotePath) return null;
    return buildKfImageUrl(kfBase, remotePath);
  }

  function updateLastMessageId(id) {
    if (id && id > lastMessageId) {
      lastMessageId = id;
    }
  }

  /* ─── ACK 处理 ─── */

  function handleAck(json) {
    const extend = typeof json.extend === 'string' ? tryParseJson(json.extend) : (json.extend || null);
    const clientTempId = extend?.tempId || json.tempId;
    if (!clientTempId) return;

    const msg = messages.value.find((m) => m.clientTempId === clientTempId);
    if (msg) {
      msg.serverMessageId = extend?.messageId || json.messageId;
      msg.sendState = SendState.SENT;
      msg.errorMessage = '';
      cancelAckTimeout(clientTempId);
    }
  }

  function scheduleAckTimeout(clientTempId, gen) {
    cancelAckTimeout(clientTempId);
    const timer = setTimeout(() => {
      ackTimeoutMap.delete(clientTempId);
      if (gen !== generation) return;
      const msg = messages.value.find((m) => m.clientTempId === clientTempId);
      if (msg && msg.sendState === SendState.SUBMITTED) {
        msg.sendState = SendState.FAILED;
        msg.errorMessage = '消息发送超时，请重试';
      }
    }, MESSAGE_ACK_TIMEOUT_MS);
    ackTimeoutMap.set(clientTempId, timer);
  }

  function cancelAckTimeout(clientTempId) {
    const timer = ackTimeoutMap.get(clientTempId);
    if (timer) {
      clearTimeout(timer);
      ackTimeoutMap.delete(clientTempId);
    }
  }

  function clearAllAckTimeouts() {
    for (const timer of ackTimeoutMap.values()) {
      clearTimeout(timer);
    }
    ackTimeoutMap.clear();
  }

  /* ─── 撤回（对齐 handleWithdrawNotice） ─── */

  function handleWithdraw(json) {
    const extend = typeof json.extend === 'string' ? tryParseJson(json.extend) : (json.extend || null);
    const localIdFields = ['localId', 'serverLocalId', 'withdrawLocalId', 'targetLocalId'];
    const msgIdFields = ['targetMessageId', 'withdrawMessageId'];

    // 尝试按 localId 删除
    for (const field of localIdFields) {
      const val = extend?.[field] || json[field];
      if (val) {
        const idx = messages.value.findIndex((m) => m.serverLocalId === val);
        if (idx >= 0) {
          messages.value.splice(idx, 1);
          return;
        }
      }
    }

    // 按 serverMessageId 删除
    for (const field of msgIdFields) {
      const val = extend?.[field] || json[field];
      if (val) {
        const idx = messages.value.findIndex((m) => m.serverMessageId === val);
        if (idx >= 0) {
          messages.value.splice(idx, 1);
          return;
        }
      }
    }
  }

  /* ─── 欢迎语（对齐 requestWelcomeMessageIfNeeded） ─── */

  function requestWelcomeMessageIfNeeded() {
    const now = Date.now();
    if (lastAutoReplyAt && now - lastAutoReplyAt < AUTO_REPLY_INTERVAL_MS) return;
    if (lastPageClosedAt && now - lastPageClosedAt < AUTO_REPLY_INTERVAL_MS) return;

    const queued = ws.send(buildAutoReplyFrame());
    if (queued) {
      lastAutoReplyAt = now;
    }
  }

  /* ─── 重发未完成消息（对齐 retryInFlightOutgoingMessages） ─── */

  function retryInFlightMessages() {
    const recoverable = messages.value.filter(
      (m) =>
        m.direction === MessageDirection.TO_OPERATOR &&
        (m.sendState === SendState.SENDING ||
          m.sendState === SendState.SUBMITTED ||
          m.sendState === SendState.FAILED)
    );
    // 最多重发 20 条
    for (const msg of recoverable.slice(0, 20)) {
      retryMessage(msg.clientTempId);
    }
  }

  /* ─── 发送文本（对齐 sendText） ─── */

  function sendText(content) {
    const text = content?.trim();
    if (!text) return;

    const gen = generation;
    const isConnected = connectionState.value === KfConnectionState.CONNECTED;
    const tempId = generateTempId();

    const msg = reactive({
      clientTempId: tempId,
      serverMessageId: null,
      direction: MessageDirection.TO_OPERATOR,
      contentType: ContentType.TEXT,
      text,
      imageUrl: null,
      localImageUrl: null,
      sendState: isConnected ? SendState.SENDING : SendState.FAILED,
      errorMessage: isConnected ? '' : '客服当前未连接，请点击重试',
      createdAt: Date.now(),
    });
    messages.value.push(msg);

    if (!isConnected) return;

    const queued = ws.send(buildMsgFrame(text, tempId));
    msg.sendState = queued ? SendState.SUBMITTED : SendState.FAILED;
    if (!queued) msg.errorMessage = '消息发送失败，请重试';
    if (queued) scheduleAckTimeout(tempId, gen);
  }

  /* ─── 发送图片（对齐 sendImage） ─── */

  async function sendImage(file) {
    if (!file) return;

    // 校验格式与大小
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errorMessage.value = '仅支持 PNG、JPEG、GIF、BMP、WebP 格式图片';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      errorMessage.value = '图片大小不能超过 10MB';
      return;
    }

    const gen = generation;
    const isConnected = connectionState.value === KfConnectionState.CONNECTED;
    const tempId = generateTempId();
    // 创建本地预览 URL
    const localUrl = URL.createObjectURL(file);

    const msg = reactive({
      clientTempId: tempId,
      serverMessageId: null,
      direction: MessageDirection.TO_OPERATOR,
      contentType: ContentType.IMAGE,
      text: '',
      imageUrl: localUrl,
      localImageUrl: localUrl,
      remoteImagePath: null,
      sendState: isConnected ? SendState.UPLOADING : SendState.FAILED,
      errorMessage: isConnected ? '' : '客服当前未连接，请点击重试',
      createdAt: Date.now(),
    });
    messages.value.push(msg);

    if (!isConnected) return;

    try {
      // HTTP 上传图片
      const result = await kfUploadImage(kfBase, visitorToken, file);
      if (gen !== generation) return;

      msg.remoteImagePath = result.url;
      msg.imageUrl = resolveImagePath(result.url);
      msg.sendState = SendState.SENDING;

      // WebSocket 发送 EXTEND 帧
      const queued = ws.send(buildImageFrame(result.url, tempId));
      msg.sendState = queued ? SendState.SUBMITTED : SendState.FAILED;
      if (!queued) msg.errorMessage = '图片发送失败，请重试';
      if (queued) scheduleAckTimeout(tempId, gen);
    } catch (e) {
      if (gen !== generation) return;
      msg.sendState = SendState.FAILED;
      msg.errorMessage = e.message || '图片上传失败';
    }
  }

  /* ─── 重试单条消息（对齐 retry） ─── */

  function retryMessage(clientTempId) {
    if (connectionState.value !== KfConnectionState.CONNECTED) return false;
    const msg = messages.value.find((m) => m.clientTempId === clientTempId);
    if (!msg) return false;

    const gen = generation;
    msg.sendState = SendState.SENDING;
    msg.errorMessage = '';

    let queued = false;
    if (msg.contentType === ContentType.TEXT) {
      queued = ws.send(buildMsgFrame(msg.text, clientTempId));
    } else if (msg.contentType === ContentType.IMAGE) {
      if (msg.remoteImagePath) {
        // 已上传过，直接重发 EXTEND 帧
        queued = ws.send(buildImageFrame(msg.remoteImagePath, clientTempId));
      } else {
        // 需要重新上传（Web 端无法保留原始 File，标记失败提示重新选择）
        msg.sendState = SendState.FAILED;
        msg.errorMessage = '本地图片已失效，请重新选择';
        return false;
      }
    }

    msg.sendState = queued ? SendState.SUBMITTED : SendState.FAILED;
    if (!queued) msg.errorMessage = '消息发送失败，请重试';
    if (queued) scheduleAckTimeout(clientTempId, gen);
    return queued;
  }

  /* ─── 已读回执（对齐 markLatestVisibleMessageRead） ─── */

  function sendReadReceipt() {
    if (connectionState.value !== KfConnectionState.CONNECTED) return;
    const incoming = messages.value.filter(
      (m) => m.direction === MessageDirection.FROM_OPERATOR || m.direction === MessageDirection.SYSTEM
    );
    const latest = incoming[incoming.length - 1];
    if (!latest) return;
    ws.send(buildReadReceiptFrame(latest.createdAt));
  }

  /* ─── 手动重试连接 ─── */

  function retryConnect() {
    connect();
  }

  /* ─── 断开连接（对齐 disconnectWhenPageClosed） ─── */

  function disconnect() {
    lastPageClosedAt = Date.now();
    clearAllAckTimeouts();
    ws.disconnect();
  }

  /* ─── 生命周期清理 ─── */

  onBeforeUnmount(() => {
    disconnect();
  });

  /* ─── 工具函数 ─── */

  function tryParseJson(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  return {
    /** 消息列表（reactive 数组） */
    messages,
    /** 连接状态 */
    connectionState,
    /** 错误消息 */
    errorMessage,
    /** 客服名称 */
    kfName,
    /** 客服头像 */
    kfAvatar,
    /** 是否正在初始化（HTTP 阶段） */
    isInitializing,
    /** 是否已连接 */
    isConnected: computed(() => connectionState.value === KfConnectionState.CONNECTED),
    /** 建立连接 */
    connect,
    /** 断开连接 */
    disconnect,
    /** 手动重试连接 */
    retryConnect,
    /** 发送文本消息 */
    sendText,
    /** 发送图片消息 */
    sendImage,
    /** 重试失败消息 */
    retryMessage,
    /** 发送已读回执 */
    sendReadReceipt,
  };
}
