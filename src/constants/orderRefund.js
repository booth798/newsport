/**
 * 已退款订单 refundReason → 角标 i18n key。
 * 文案与后端约定一致；no_winner 仍用「已退款」。
 */
const REFUND_REASON_STATUS_KEY = {
  postponed: '比赛延期，已退款',
  abandoned: '比赛中断，已退款',
  cancelled: '比赛取消，已退款',
  abnormal: '比赛异常，已退款',
  no_winner: '已退款',
};

/**
 * 已退款时按 refundReason 取展示文案 key。
 * 缺字段或未识别原因回退「已退款」。
 * @param {string|null|undefined} refundReason
 * @returns {string}
 */
export function resolveRefundStatusKey(refundReason) {
  const key = String(refundReason || '').trim().toLowerCase();
  return REFUND_REASON_STATUS_KEY[key] || '已退款';
}
