/**
 * 提现记录：对齐 WithdrawActivity 筛选 / 状态展示规则。
 * status 传给列表接口时为逗号分隔多值。
 */

/** 全部状态（列表「全部」筛选） */
export const WITHDRAW_STATUS_ALL =
  'pending_review,approved,paying,paid,rejected,cancelled,failed';

/**
 * 顶部筛选选项
 * - 待审核：pending_review
 * - 提现中：approved,paying
 * - 已提现：paid（approved 归入提现中）
 * - 提现失败：rejected,cancelled,failed
 */
export const WITHDRAW_STATUS_FILTERS = [
  { value: 'all', label: '全部', status: WITHDRAW_STATUS_ALL },
  { value: 'pending', label: '待审核', status: 'pending_review' },
  { value: 'paying', label: '提现中', status: 'approved,paying' },
  { value: 'completed', label: '已提现', status: 'paid' },
  { value: 'failed', label: '提现失败', status: 'rejected,cancelled,failed' },
];

/** 按筛选 key 取接口 status 参数 */
export function resolveWithdrawFilterStatus(filterValue) {
  const hit = WITHDRAW_STATUS_FILTERS.find((item) => item.value === filterValue);
  return hit?.status || WITHDRAW_STATUS_ALL;
}

/**
 * 单条状态 → 展示文案与色调
 * pending_review → 待审核；approved / paying → 提现中；
 * paid → 已提现；rejected / cancelled / failed → 提现失败
 */
export function resolveWithdrawRecordStatus(status) {
  const raw = String(status || '').trim();
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();

  if (lower === 'pending_review' || upper === 'PENDING_REVIEW') {
    return { tone: 'pending', labelKey: '待审核' };
  }
  if (
    lower === 'paying'
    || lower === 'approved'
    || upper === 'PAYING'
    || upper === 'APPROVED'
  ) {
    return { tone: 'paying', labelKey: '提现中' };
  }
  if (
    lower === 'paid'
    || ['PAID', 'SUCCESS', 'COMPLETED', 'DONE', 'FINISHED'].includes(upper)
  ) {
    return { tone: 'completed', labelKey: '已提现' };
  }
  if (
    ['rejected', 'cancelled', 'canceled', 'failed'].includes(lower)
    || ['REJECTED', 'CANCELLED', 'CANCELED', 'FAILED', 'EXPIRED'].includes(upper)
  ) {
    return { tone: 'cancelled', labelKey: '提现失败' };
  }
  // 未知态兜底为待审核，避免空白徽章
  return { tone: 'pending', labelKey: '待审核' };
}

/**
 * 选中月份 → paid-total 的 [月初, 下月初) Asia/Shanghai 区间
 * @param {string} month yyyy-MM
 * @returns {{ startAt: string, endAt: string }}
 */
export function getWithdrawMonthRangeShanghai(month) {
  const matched = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(month || ''));
  const nowParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const pick = (parts, type) => parts.find((p) => p.type === type)?.value || '';
  const year = matched ? Number(matched[1]) : Number(pick(nowParts, 'year'));
  const mon = matched ? Number(matched[2]) : Number(pick(nowParts, 'month'));
  const pad = (n) => String(n).padStart(2, '0');
  const startAt = `${year}-${pad(mon)}-01T00:00:00+08:00`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const endAt = `${nextYear}-${pad(nextMon)}-01T00:00:00+08:00`;
  return { startAt, endAt };
}
