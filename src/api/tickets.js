import client from './client';

export const getMyTicketsApi = async (params = {}) => {
  const res = await client.get('/tickets/me', { params });
  return res.data;
};

export const getTicketDetailsApi = async (id) => {
  const res = await client.get(`/tickets/${id}`);
  return res.data;
};

export const transferTicketApi = async (ticketId, transferData) => {
  const res = await client.post(`/tickets/${ticketId}/transfer`, transferData);
  return res.data;
};

export const verifyTicketApi = async (code) => {
  const safeCode = encodeURIComponent(String(code || '').trim());
  const res = await client.get(`/tickets/verify/${safeCode}`);
  return res.data;
};

export const checkInTicketApi = async (code) => {
  const safeCode = encodeURIComponent(String(code || '').trim());
  const res = await client.post(`/tickets/verify/${safeCode}/check-in`);
  return res.data;
};

export const deleteTicketApi = async (ticketId, force = false) => {
  const res = await client.delete(`/tickets/${ticketId}`, {
    params: force ? { force: true } : {},
  });
  return res.data;
};

export const clearOldTicketsApi = async () => {
  const res = await client.post('/tickets/clear-old');
  return res.data;
};

export const getCheckInStatsApi = async (params = {}) => {
  const res = await client.get('/tickets/check-in/stats', { params });
  return res.data;
};

export default {
  getMyTicketsApi,
  getTicketDetailsApi,
  transferTicketApi,
  verifyTicketApi,
  checkInTicketApi,
  getCheckInStatsApi,
  deleteTicketApi,
  clearOldTicketsApi,
};
