import { ref, onBeforeUnmount } from 'vue';

/**
 * 通用 WebSocket composable
 * 支持：自动鉴权（ticket 优先）、心跳保活、指数退避重连、连接状态暴露
 *
 * @param {() => string} urlFactory  返回完整 wss:// URL（含 ticket/token 参数）的函数
 * @param {object} [opts]
 * @param {(data: any) => void} [opts.onMessage]    收到消息回调（已 JSON.parse）
 * @param {() => void}          [opts.onOpen]       连接建立回调
 * @param {() => void}          [opts.onClose]      连接关闭回调
 * @param {(err: Event) => void}[opts.onError]      错误回调
 * @param {number}              [opts.heartbeatMs]  心跳间隔（默认 25000ms）
 * @param {number}              [opts.maxRetries]   最大重连次数（默认 Infinity）
 * @param {number}              [opts.maxBackoff]   重连退避上限（默认 30000ms）
 * @param {boolean}             [opts.autoConnect]  创建后自动连接（默认 true）
 */
export function useWebSocket(urlFactory, opts = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    heartbeatMs = 25000,
    maxRetries = Infinity,
    maxBackoff = 30000,
    autoConnect = true,
  } = opts;

  const status = ref('disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const retryCount = ref(0);

  let ws = null;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let intentionalClose = false;

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = window.setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send('PING');
      }
    }, heartbeatMs);
  }

  function stopHeartbeat() {
    if (heartbeatTimer != null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function getBackoff() {
    const base = Math.min(1000 * Math.pow(2, retryCount.value), maxBackoff);
    const jitter = Math.random() * 1000;
    return base + jitter;
  }

  function scheduleReconnect() {
    if (intentionalClose) return;
    if (retryCount.value >= maxRetries) return;

    const delay = getBackoff();
    if (import.meta.env.DEV) {
      console.log(`%c[WS] 重连 #${retryCount.value + 1}，${(delay / 1000).toFixed(1)}s 后`, 'color:#ff9800');
    }
    reconnectTimer = window.setTimeout(() => {
      retryCount.value++;
      connect();
    }, delay);
  }

  function connect() {
    close();
    intentionalClose = false;

    const url = typeof urlFactory === 'function' ? urlFactory() : urlFactory;
    if (!url) {
      status.value = 'disconnected';
      return;
    }

    status.value = 'connecting';

    try {
      ws = new WebSocket(url);
    } catch {
      status.value = 'disconnected';
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      status.value = 'connected';
      retryCount.value = 0;
      startHeartbeat();
      onOpen?.();
    };

    ws.onmessage = (event) => {
      const raw = event.data;
      if (raw === 'PONG') return;

      try {
        const parsed = JSON.parse(raw);
        onMessage?.(parsed);
      } catch {
        if (import.meta.env.DEV) {
          console.warn('[WS] 无法解析消息:', raw);
        }
      }
    };

    ws.onclose = () => {
      status.value = 'disconnected';
      stopHeartbeat();
      onClose?.();
      scheduleReconnect();
    };

    ws.onerror = (e) => {
      onError?.(e);
    };
  }

  function close() {
    intentionalClose = true;
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopHeartbeat();
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.onopen = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      ws = null;
    }
    status.value = 'disconnected';
  }

  function send(data) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  if (autoConnect) {
    connect();
  }

  onBeforeUnmount(close);

  return { status, retryCount, connect, close, send };
}
