import { get, post, del } from './request';

/** 查询钱包余额 */
export async function fetchBalance() {
  return get('/wallet');
}

/** 查询锁定钱包分项 */
export async function fetchLockedWallet() {
  return get('/wallet/locked');
}

/** 账务汇总（总收入/总支出/净收益）
 * startAt/endAt 非空则按下单时间段统计；都空=钱包累计总额
 */
export async function fetchLedgerSummary(params = {}) {
  const query = {};
  if (params.startAt) query.startAt = params.startAt;
  if (params.endAt) query.endAt = params.endAt;
  return get('/ledger/summary', query);
}

/** 充值渠道列表 */
export async function fetchDepositChannels() {
  return get('/finance/deposit/channels');
}

/** 提交充值 */
export async function submitDeposit(channel, amount, options = {}) {
  return post('/finance/deposit/submit', {
    channel,
    amount,
    paymentProofUrl: options.paymentProofUrl,
    txHash: options.txHash,
  }, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
}

/** 充值订单列表 */
export async function fetchDepositList(params = {}) {
  return get('/finance/deposit/list', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    status: params.status,
    month: params.month,
  });
}

/** 充值订单详情 */
export async function fetchDepositDetail(id) {
  return get(`/finance/deposit/${id}`);
}

/** 取消充值 */
export async function cancelDeposit(id) {
  return del(`/finance/deposit/${id}`);
}

/** 上传充值凭证 */
export async function uploadDepositProof(depositOrderId, paymentProofUrl) {
  return post('/finance/deposit/upload-proof', { depositOrderId, paymentProofUrl });
}

/** 提现方式开关 */
export async function fetchWithdrawMethods() {
  return get('/finance/withdraw/methods');
}

/** 提交提现 */
export async function submitWithdraw(payload) {
  return post('/finance/withdraw/submit', payload, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
}

/** 提现订单列表
 * status 支持逗号分隔多值（对齐 WithdrawActivity）
 */
export async function fetchWithdrawList(params = {}) {
  const query = {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    month: params.month,
  };
  if (params.status) query.status = params.status;
  return get('/finance/withdraw/list', query);
}

/** 提现已打款总额（顶部合计）
 * 仅传 startAt / endAt，不传 status；展示 data.totalAmount
 */
export async function fetchWithdrawPaidTotal(params = {}) {
  const query = {};
  if (params.startAt) query.startAt = params.startAt;
  if (params.endAt) query.endAt = params.endAt;
  return get('/finance/withdraw/paid-total', query);
}

/** 取消提现 */
export async function cancelWithdraw(id) {
  return del(`/finance/withdraw/${id}`);
}

/** 资金流水 */
export async function fetchRecords(params = {}) {
  const res = await get('/ledger', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    types: params.types,
    startAt: params.startAt,
    endAt: params.endAt,
  });
  const page = res.data || {};
  const records = (page.records || []).map((r) => ({
    id: r.id,
    type: mapLedgerType(r.type),
    typeLabel: r.typeLabel || r.type,
    amount: `${Number(r.amount) >= 0 ? '+' : ''}${formatMoney(r.amount)}`,
    time: r.createdAt ? formatDateTime(r.createdAt) : '',
    status: r.status || 'completed',
    statusTone: 'completed',
    desc: r.matchLabel || r.remark || '',
    _raw: r,
  }));
  return { code: 200, data: records, total: page.total };
}

/** 会员互转：POST /wallet/transfer（toAccount / amount / withdrawPassword） */
export async function transfer(payload) {
  return post('/wallet/transfer', {
    toAccount: payload.toAccount,
    amount: payload.amount,
    withdrawPassword: payload.withdrawPassword,
  }, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
}

/** 划转记录 */
export async function fetchTransferRecords(params = {}) {
  return get('/wallet/transfer/records', {
    // 后端约定空类型等同 all，这里显式传值便于筛选状态与请求一致。
    type: params.type || 'all',
    month: params.month,
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
  });
}

function mapLedgerType(type) {
  const map = {
    DEPOSIT: 'deposit',
    WITHDRAW: 'withdraw',
    BET: 'trade',
    PAYOUT: 'trade',
    TRANSFER_OUT: 'withdraw',
    TRANSFER_IN: 'deposit',
    FEE: 'trade',
    REFUND: 'deposit',
  };
  return map[type] || 'trade';
}

function formatMoney(val) {
  if (val == null) return '0.00';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '';
  }
}
