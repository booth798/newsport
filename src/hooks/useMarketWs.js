import { ref, watch, onBeforeUnmount } from 'vue';
import { useWebSocket } from './useWebSocket';
import { fetchWsTicket, buildWsUrl } from '@/api/ws';
import { fetchPoolYields } from '@/api/match';

const POLL_INTERVAL = 10000;

/**
 * 行情/赔率 WebSocket 通道
 * 接收 type=yields 增量推送，就地合并到 yields map
 *
 * @param {import('vue').Ref<string|null>} marketIdRef 当前 marketId（响应式）
 * @returns {{
 *   yields: import('vue').Ref<Record<string, string>>,
 *   wsStatus: import('vue').Ref<string>,
 *   getYield: (score: string) => string|null,
 * }}
 */
export function useMarketWs(marketIdRef) {
  const yields = ref({});
  const wsStatus = ref('disconnected');

  let wsControls = null;
  let pollTimer = null;
  let currentMarketId = null;

  function getYield(score) {
    return yields.value[score] ?? null;
  }

  function handleMessage(msg) {
    if (msg.marketId != null && String(msg.marketId) !== String(currentMarketId)) return;

    if (msg.type === 'yields' && msg.data && typeof msg.data === 'object') {
      const update = {};
      for (const [key, val] of Object.entries(msg.data)) {
        update[key] = typeof val === 'object' ? val : val;
      }
      yields.value = { ...yields.value, ...update };
      return;
    }

    if (msg.score && (msg.yieldPct != null || msg.poolAmount != null || msg.suspended != null)) {
      yields.value = {
        ...yields.value,
        [msg.score]: {
          yieldPct: msg.yieldPct,
          poolAmount: msg.poolAmount,
          feeRate: msg.feeRate,
          suspended: msg.suspended,
        },
      };
    }
  }

  async function connectWs(marketId) {
    disconnect();
    if (!marketId) return;

    currentMarketId = marketId;
    yields.value = {};

    let ticket = null;
    try {
      ticket = await fetchWsTicket();
    } catch { /* 降级到 token */ }

    if (currentMarketId !== marketId) return;

    const urlFactory = () => buildWsUrl(`/ws/market/${marketId}`, ticket);

    let wsOpenedOnce = false;

    wsControls = useWebSocket(urlFactory, {
      onMessage: handleMessage,
      onOpen: () => {
        wsOpenedOnce = true;
        wsStatus.value = 'connected';
        stopPolling();
      },
      onClose: () => {
        wsStatus.value = 'disconnected';
        if (currentMarketId === marketId) startPolling(marketId);
      },
      onError: () => {
        wsStatus.value = 'disconnected';
        if (!wsOpenedOnce && currentMarketId === marketId) startPolling(marketId);
      },
      heartbeatMs: 25000,
      autoConnect: false,
    });

    wsStatus.value = 'connecting';
    wsControls.connect();
  }

  async function pollYields(marketId) {
    if (!marketId) return;
    try {
      const res = await fetchPoolYields(marketId);
      const data = res.data;
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          const map = {};
          for (const item of data) {
            if (item.score && item.yieldPct != null) {
              map[item.score] = String(item.yieldPct);
            }
          }
          yields.value = { ...yields.value, ...map };
        } else {
          yields.value = { ...yields.value, ...data };
        }
      }
    } catch { /* 静默 */ }
  }

  function startPolling(marketId) {
    stopPolling();
    if (wsStatus.value === 'connected') return;
    pollYields(marketId);
    pollTimer = window.setInterval(() => pollYields(marketId), POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer != null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function disconnect() {
    stopPolling();
    if (wsControls) {
      wsControls.close();
      wsControls = null;
    }
    wsStatus.value = 'disconnected';
    currentMarketId = null;
  }

  watch(
    () => marketIdRef.value,
    (newId) => {
      if (newId) {
        connectWs(newId);
      } else {
        disconnect();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(disconnect);

  return { yields, wsStatus, getYield, disconnect };
}
