import { get, post, del } from './request';

/** 我的订单列表 */
export async function fetchOrderList(params = {}) {
  return get('/orders', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    status: params.status,
    matchId: params.matchId,
    marketId: params.marketId,
    period: params.period,
  });
}

/** 订单详情 */
export async function fetchOrderDetail(id) {
  return get(`/orders/${id}`);
}

/** 即时下注 */
export async function submitBuyOrder(payload) {
  const res = await post('/orders/instant', {
    marketId: payload.marketId,
    score: payload.score,
    amount: payload.amount,
    expectedYield: payload.expectedYield,
    deviceFp: payload.deviceFp,
  });
  return res;
}

/** 预约买入 */
export async function submitPendingOrder(payload) {
  return post('/orders/pending', {
    marketId: payload.marketId,
    score: payload.score,
    amount: payload.amount,
    yieldMin: payload.yieldMin,
    yieldMax: payload.yieldMax,
    validUntil: payload.validUntil,
    deviceFp: payload.deviceFp,
  });
}

/** 撤单 */
export async function cancelOrder(id) {
  return del(`/orders/${id}`);
}

/** 预约买入额度 */
export async function fetchPendingQuota() {
  return get('/orders/pending-quota');
}

/** 获取已下单列表（适配旧组件） */
export async function fetchOrderedList(matchId, options = {}) {
  const res = await get('/orders', {
    matchId: matchId ? String(matchId) : undefined,
    status: ['PLACED', 'WON', 'LOST', 'REFUNDED'],
    pageNum: options.pageNum || 1,
    pageSize: options.pageSize || 20,
  });
  const records = res.data?.records || [];
  return { code: 200, data: records.map(normalizeOrder) };
}

/** 获取预约中列表（适配旧组件） */
export async function fetchScheduledList(matchId, options = {}) {
  const res = await get('/orders', {
    matchId: matchId ? String(matchId) : undefined,
    status: ['PENDING_MATCH'],
    pageNum: options.pageNum || 1,
    pageSize: options.pageSize || 20,
  });
  const records = res.data?.records || [];
  return { code: 200, data: records.map(normalizeOrder) };
}

function normalizeOrder(o) {
  return {
    ...o,
    orderNo: o.orderNo || o.id,
    matchLabel: [o.leagueName, `${o.homeTeamName} vs ${o.awayTeamName}`]
      .filter(Boolean)
      .join(' '),
    amountFormatted: formatMoney(o.amount),
    yieldPercent: o.yieldAtBuy,
    profitFormatted: formatMoney(o.estimatedPayout ?? o.payout),
  };
}

function formatMoney(val) {
  if (val == null) return '0.00';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
