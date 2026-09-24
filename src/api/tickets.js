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
  const res = await client.get(`/tickets/verify/${code}`);
  return res.data;
};

export const checkInTicketApi = async (code) => {
  const res = await client.post(`/tickets/verify/${code}/check-in`);
  return res.data;
};

export default {
  getMyTicketsApi,
  getTicketDetailsApi,
  transferTicketApi,
  verifyTicketApi,
  checkInTicketApi,
};
