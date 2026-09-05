import { get, post, del } from './request';
import { isWithinOrderCancelWindow } from '@/constants/orderCancel';

const IDEMPOTENCY_STORAGE_KEY = 'mysport:idempotency';

function getIdempotencyStore() {
  try {
    return JSON.parse(localStorage.getItem(IDEMPOTENCY_STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveIdempotencyStore(store) {
  localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(store));
}

async function hashKey(operation, fingerprint) {
  const input = `${operation}|${fingerprint}`;
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return 'v2_' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getOrCreateIdempotencyKey(operation, fingerprint) {
  const store = getIdempotencyStore();
  const storageKey = await hashKey(operation, fingerprint);
  if (store[storageKey]) return { key: store[storageKey], storageKey };
  const key = crypto.randomUUID();
  store[storageKey] = key;
  saveIdempotencyStore(store);
  return { key, storageKey };
}

function completeIdempotencyKey(storageKey) {
  const store = getIdempotencyStore();
  delete store[storageKey];
  saveIdempotencyStore(store);
}

async function idempotentPost(url, body, operation) {
  const fingerprint = JSON.stringify(body);
  const { key, storageKey } = await getOrCreateIdempotencyKey(operation, fingerprint);
  const res = await post(url, body, { headers: { 'Idempotency-Key': key } });
  completeIdempotencyKey(storageKey);
  return res;
}

/**
 * 我的订单列表 GET /orders
 * 参数对齐 OrderListReq：pageNum / pageSize / status[] / matchId / period / startAt / endAt …
 * status 为数组时展开为 ?status=WON&status=LOST（与文档一致）
 */
export async function fetchOrderList(params = {}) {
  return get('/orders', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    status: params.status,
    matchId: params.matchId,
    period: params.period,
    account: params.account,
    orderNo: params.orderNo,
    // 按下单时间段筛选（与 ledger/summary 共用）
    startAt: params.startAt,
    endAt: params.endAt,
    // 兼容旧调用；文档未列 marketId 时传了也会被后端忽略
    marketId: params.marketId,
  });
}

/** 订单详情 */
export async function fetchOrderDetail(id) {
  return get(`/orders/${id}`);
}

/** 即时下注（返回已解包的 order 对象） */
export async function submitBuyOrder(payload) {
  const body = {
    marketId: payload.marketId,
    score: payload.score,
    amount: payload.amount,
    expectedYield: payload.expectedYield,
    deviceFp: payload.deviceFp,
  };
  const res = await idempotentPost('/orders/instant', body, 'order_instant');
  return unwrapOrderResult(res);
}

/** 预约买入（返回已解包的 order 对象） */
export async function submitPendingOrder(payload) {
  const body = {
    marketId: payload.marketId,
    score: payload.score,
    amount: payload.amount,
    yieldMin: payload.yieldMin,
    yieldMax: payload.yieldMax,
    validUntil: payload.validUntil,
    deviceFp: payload.deviceFp,
  };
  const res = await idempotentPost('/orders/pending', body, 'order_pending');
  return unwrapOrderResult(res);
}

function unwrapOrderResult(res) {
  const raw = res.data;
  if (!raw) return res;
  if (raw.order) {
    return {
      ...res,
      data: raw.order,
      matchedImmediately: raw.matchedImmediately,
      walletBalance: raw.walletBalance,
      walletFrozen: raw.walletFrozen,
    };
  }
  return res;
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
  const placedAt = o.placedAt || o.createdAt || '';
  const status = String(o.status || '').toUpperCase();
  // 处理中订单：下单 10 分钟内可撤
  const processing = ['PENDING_MATCH', 'PLACED', 'PENDING', 'CREATED'].includes(status);
  return {
    ...o,
    orderNo: o.orderNo || o.id,
    league: o.leagueShortName || o.leagueName || '',
    leagueIcon: o.leagueLogoUrl || '',
    homeTeam: o.homeTeamShortName || o.homeTeamName || '',
    awayTeam: o.awayTeamShortName || o.awayTeamName || '',
    homeTeamLogo: o.homeTeamLogoUrl || '',
    awayTeamLogo: o.awayTeamLogoUrl || '',
    matchLabel: [o.leagueName, `${o.homeTeamName} vs ${o.awayTeamName}`]
      .filter(Boolean)
      .join(' '),
    amountFormatted: formatMoney(o.amount),
    tradeAmountFormatted: formatMoney(o.amount),
    yieldPercent: o.yieldAtBuy,
    statusKey: o.statusLabel || o.status || '',
    tradeTime: placedAt,
    profitFormatted: formatMoney(o.estimatedPayout ?? o.payout),
    canCancel: processing && isWithinOrderCancelWindow(placedAt),
  };
}

function formatMoney(val) {
  if (val == null) return '0.00';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
