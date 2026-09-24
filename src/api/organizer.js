import client from './client';

export const getOrganizerDashboardApi = async () => {
  const res = await client.get('/organizer/dashboard');
  return res.data;
};

export const getOrganizerEventsApi = async (params = {}) => {
  const res = await client.get('/events/organizer/mine', { params });
  return res.data;
};

export const createEventApi = async (eventData) => {
  const res = await client.post('/events', eventData);
  return res.data;
};

export const updateEventApi = async (id, eventData) => {
  const res = await client.put(`/events/${id}`, eventData);
  return res.data;
};

export const publishEventApi = async (id) => {
  const res = await client.patch(`/events/${id}/publish`);
  return res.data;
};

export const unpublishEventApi = async (id) => {
  const res = await client.patch(`/events/${id}/unpublish`);
  return res.data;
};

export const deleteEventApi = async (id) => {
  const res = await client.delete(`/events/${id}`);
  return res.data;
};

export const getWalletBalanceApi = async () => {
  const res = await client.get('/organizer/wallet/balance');
  return res.data;
};

export const getWalletTransactionsApi = async (params = {}) => {
  const res = await client.get('/organizer/wallet/transactions', { params });
  return res.data;
};

export const getWithdrawalsApi = async () => {
  const res = await client.get('/organizer/wallet/withdrawals');
  return res.data;
};

export const requestWithdrawalApi = async (withdrawalData) => {
  const res = await client.post('/organizer/wallet/withdrawals', withdrawalData);
  return res.data;
};

export const getAttendeesApi = async (eventId) => {
  const res = await client.get(`/organizer/attendees/${eventId}`);
  return res.data;
};

export default {
  getOrganizerDashboardApi,
  getOrganizerEventsApi,
  createEventApi,
  updateEventApi,
  publishEventApi,
  unpublishEventApi,
  deleteEventApi,
  getWalletBalanceApi,
  getWalletTransactionsApi,
  getWithdrawalsApi,
  requestWithdrawalApi,
  getAttendeesApi,
};
