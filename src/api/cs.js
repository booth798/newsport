import { get, post } from './request';

/** 查询我的工单列表 */
export async function fetchTickets(limit) {
  return get('/cs/tickets', { limit });
}

/** 创建客服工单 */
export async function createTicket({ subject, category, priority, content }) {
  return post('/cs/tickets', { subject, category, priority, content });
}

/** 查询工单消息列表 */
export async function fetchTicketMessages(ticketId) {
  return get(`/cs/tickets/${ticketId}/messages`);
}

/** 客户回复工单 */
export async function replyTicket(ticketId, content, attachments) {
  return post(`/cs/tickets/${ticketId}/reply`, { content, attachments });
}
