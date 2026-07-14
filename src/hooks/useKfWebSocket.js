/**
 * /kf WebSocket 连接管理 hook（对齐 Android OnlineServiceWebSocketManager）。
 *
 * 职责：建立/断开连接、心跳、帧收发、指数退避重连。
 * 帧格式：JSON { type, token, ... }
 *
 * 不负责业务逻辑（初始化、消息落库等），由 useCustomerService 调用。
 */
import { ref, shallowRef } from 'vue';

/* ─── 连接状态枚举（对齐 OnlineServiceConnectionState） ─── */
export const KfConnectionState = Object.freeze({
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED',
});

/* ─── 常量（对齐 Android Coordinator companion） ─── */
const HEARTBEAT_INTERVAL_MS = 20_000;
const CONNECT_BIND_TIMEOUT_MS = 15_000;
const MAX_RECONNECT_ATTEMPTS = 6;
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

const __DEV__ = import.meta.env.DEV;

/**
 * @param {Object} options
 * @param {(frame: {type: string, json: object}) => void} options.onFrame - 收到服务端帧回调
 * @param {(state: string) => void} [options.onStateChange] - 连接状态变化回调
 */
export function useKfWebSocket({ onFrame, onStateChange }) {
  const state = ref(KfConnectionState.IDLE);
  /** @type {import('vue').ShallowRef<WebSocket|null>} */
  const socket = shallowRef(null);

  let heartbeatTimer = null;
  let bindTimeoutTimer = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let pendingConnectPayload = null;
  let pendingUrl = null;
  // 标记是否已收到 BIND_SUCCESS，用于区分首次连接与重连
  let hasBoundSuccessfully = false;

  function setState(newState) {
    if (state.value === newState) return;
    state.value = newState;
    onStateChange?.(newState);
  }

  /* ─── 心跳 ─── */

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      send('{"type":"HEARTBEAT"}');
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  /* ─── CONNECT 绑定超时 ─── */

  function startBindTimeout() {
    clearBindTimeout();
    bindTimeoutTimer = setTimeout(() => {
      if (__DEV__) console.warn('[KF-WS] BIND_SUCCESS 超时（15s）');
      // 超时视为连接失败，进入重连
      closeSocket();
      setState(KfConnectionState.RECONNECTING);
      scheduleReconnect();
    }, CONNECT_BIND_TIMEOUT_MS);
  }

  function clearBindTimeout() {
    if (bindTimeoutTimer) {
      clearTimeout(bindTimeoutTimer);
      bindTimeoutTimer = null;
    }
  }

  /* ─── WebSocket 生命周期 ─── */

  /**
   * 建立 WebSocket 连接并发送 CONNECT 帧。
   * @param {string} url - wss:// 地址
   * @param {string} connectPayload - JSON 字符串 CONNECT 帧
   */
  function connect(url, connectPayload) {
    // 先断开已有连接
    closeSocket();
    clearReconnect();

    pendingUrl = url;
    pendingConnectPayload = connectPayload;
    setState(KfConnectionState.CONNECTING);

    if (__DEV__) console.log('[KF-WS] 正在连接', url);

    const ws = new WebSocket(url);
    socket.value = ws;

    ws.onopen = () => {
      if (ws !== socket.value) return;
      if (__DEV__) console.log('[KF-WS] 连接已打开，发送 CONNECT 帧');
      ws.send(connectPayload);
      startBindTimeout();
    };

    ws.onmessage = (event) => {
      if (ws !== socket.value) return;
      try {
        const json = JSON.parse(event.data);
        const type = (json.type || '').toUpperCase();
        if (!type) return;

        if (type === 'BIND_SUCCESS') {
          clearBindTimeout();
          hasBoundSuccessfully = true;
          reconnectAttempts = 0;
          setState(KfConnectionState.CONNECTED);
          startHeartbeat();
          if (__DEV__) console.log('[KF-WS] 绑定成功');
        }

        onFrame({ type, json });
      } catch (e) {
        if (__DEV__) console.warn('[KF-WS] 帧解析失败', e);
      }
    };

    ws.onclose = (event) => {
      if (ws !== socket.value) return;
      stopHeartbeat();
      clearBindTimeout();
      if (__DEV__) console.log('[KF-WS] 连接关闭', event.code, event.reason);
      // 非主动断开时尝试重连
      if (state.value !== KfConnectionState.IDLE && state.value !== KfConnectionState.FAILED) {
        setState(KfConnectionState.RECONNECTING);
        scheduleReconnect();
      }
    };

    ws.onerror = (event) => {
      if (__DEV__) console.error('[KF-WS] 连接错误', event);
    };
  }

  /**
   * 发送 JSON 帧字符串，返回是否成功入队。
   * @param {string} payload - JSON 字符串
   * @returns {boolean}
   */
  function send(payload) {
    const ws = socket.value;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(payload);
      return true;
    } catch {
      return false;
    }
  }

  /* ─── 重连 ─── */

  function scheduleReconnect() {
    if (reconnectTimer) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (__DEV__) console.warn('[KF-WS] 重连次数已达上限');
      setState(KfConnectionState.FAILED);
      return;
    }
    const delay = RECONNECT_DELAYS_MS[reconnectAttempts] ?? RECONNECT_DELAYS_MS[RECONNECT_DELAYS_MS.length - 1];
    reconnectAttempts++;
    if (__DEV__) console.log(`[KF-WS] 第 ${reconnectAttempts} 次重连，${delay}ms 后执行`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (pendingUrl && pendingConnectPayload) {
        connect(pendingUrl, pendingConnectPayload);
      }
    }, delay);
  }

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  /* ─── 关闭 & 销毁 ─── */

  function closeSocket() {
    stopHeartbeat();
    clearBindTimeout();
    const ws = socket.value;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      socket.value = null;
    }
  }

  /**
   * 主动断开连接，保留历史消息。对齐 Android disconnectWhenPageClosed。
   */
  function disconnect() {
    closeSocket();
    clearReconnect();
    hasBoundSuccessfully = false;
    reconnectAttempts = 0;
    setState(KfConnectionState.IDLE);
  }

  /**
   * 标记连接为失败状态。
   */
  function fail() {
    closeSocket();
    clearReconnect();
    setState(KfConnectionState.FAILED);
  }

  /**
   * 重置重连计数器，手动触发重连（如用户点击「重试」）。
   */
  function retryConnect() {
    reconnectAttempts = 0;
    if (pendingUrl && pendingConnectPayload) {
      connect(pendingUrl, pendingConnectPayload);
    }
  }

  return {
    /** 当前连接状态 */
    state,
    /** 发送 JSON 帧 */
    send,
    /** 建立连接 */
    connect,
    /** 主动断开 */
    disconnect,
    /** 标记失败 */
    fail,
    /** 手动重试 */
    retryConnect,
  };
}
