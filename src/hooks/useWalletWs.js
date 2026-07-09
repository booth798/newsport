import { ref, watch, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/store/modules/app';
import { useWebSocket } from './useWebSocket';
import { fetchWsTicket, buildWsUrl } from '@/api/ws';

/**
 * 钱包/派奖 WebSocket 通道
 * 接收 type=payout 推送，触发余额刷新 + 到账通知
 *
 * @param {object} [opts]
 * @param {(msg: { orderId, marketId, period, winningScore, amount, ts }) => void} [opts.onPayout] 派奖回调
 * @returns {{ wsStatus: import('vue').Ref<string>, lastPayout: import('vue').Ref<object|null> }}
 */
export function useWalletWs(opts = {}) {
  const { onPayout } = opts;

  const appStore = useAppStore();
  const { isLoggedIn } = storeToRefs(appStore);

  const wsStatus = ref('disconnected');
  const lastPayout = ref(null);

  let wsControls = null;

  function getCustomerId() {
    const c = appStore.customer;
    return c?.id || c?.customerId || c?.customerNo || null;
  }

  function handleMessage(msg) {
    if (msg.type === 'payout') {
      lastPayout.value = msg;
      refreshBalance();
      onPayout?.(msg);
    }
  }

  async function refreshBalance() {
    try {
      const { fetchProfileOverview } = await import('@/api/user');
      const res = await fetchProfileOverview();
      const data = res.data || {};
      appStore.updateProfile({
        balance: data.balance || undefined,
      });
    } catch { /* non-critical */ }
  }

  async function connect() {
    disconnect();

    const customerId = getCustomerId();
    if (!customerId) return;

    let ticket = null;
    try {
      ticket = await fetchWsTicket();
    } catch { /* 降级到 token */ }

    const urlFactory = () => buildWsUrl(`/ws/wallet/${customerId}`, ticket);

    wsControls = useWebSocket(urlFactory, {
      onMessage: handleMessage,
      onOpen: () => { wsStatus.value = 'connected'; },
      onClose: () => { wsStatus.value = 'disconnected'; },
      onError: () => { wsStatus.value = 'disconnected'; },
      heartbeatMs: 25000,
      autoConnect: false,
    });

    wsStatus.value = 'connecting';
    wsControls.connect();
  }

  function disconnect() {
    if (wsControls) {
      wsControls.close();
      wsControls = null;
    }
    wsStatus.value = 'disconnected';
  }

  watch(
    () => isLoggedIn.value,
    (loggedIn) => {
      if (loggedIn) {
        connect();
      } else {
        disconnect();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(disconnect);

  return { wsStatus, lastPayout, connect, disconnect };
}
