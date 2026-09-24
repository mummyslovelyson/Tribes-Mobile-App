import client from './client';

// Mobile Admin Dashboard & Analytics
export const getAdminDashboardApi = async () => {
  const res = await client.get('/admin/dashboard');
  return res.data;
};

// Event Moderation
export const getAdminEventsApi = async (params = {}) => {
  const res = await client.get('/admin/events', { params });
  return res.data;
};

export const approveEventApi = async (id) => {
  const res = await client.post(`/admin/events/${id}/approve`);
  return res.data;
};

export const rejectEventApi = async (id, reason = 'Did not meet platform guidelines') => {
  const res = await client.post(`/admin/events/${id}/reject`, { reason });
  return res.data;
};

export const toggleFeatureEventApi = async (id, featured) => {
  const res = await client.post(`/admin/events/${id}/feature`, { featured });
  return res.data;
};

export const suspendEventApi = async (id) => {
  const res = await client.post(`/admin/events/${id}/suspend`);
  return res.data;
};

export const unsuspendEventApi = async (id) => {
  const res = await client.post(`/admin/events/${id}/unsuspend`);
  return res.data;
};

// User & Organizer Moderation
export const getAdminUsersApi = async (params = {}) => {
  const res = await client.get('/admin/users', { params });
  return res.data;
};

export const approveOrganizerApi = async (id) => {
  const res = await client.post(`/admin/organizers/${id}/approve`);
  return res.data;
};

export const rejectOrganizerApi = async (id, reason = 'Incomplete documentation') => {
  const res = await client.post(`/admin/organizers/${id}/reject`, { reason });
  return res.data;
};

export const verifyUserApi = async (id) => {
  const res = await client.post(`/admin/users/${id}/verify`);
  return res.data;
};

export const suspendUserApi = async (id, reason = 'Terms violation') => {
  const res = await client.post(`/admin/users/${id}/suspend`, { reason });
  return res.data;
};

export const unsuspendUserApi = async (id) => {
  const res = await client.post(`/admin/users/${id}/unsuspend`);
  return res.data;
};

// Withdrawals & Financial Payouts (Web Platform)
export const getWithdrawalsApi = async (params = {}) => {
  const res = await client.get('/admin/withdrawals', { params });
  return res.data;
};

export const approveWithdrawalApi = async (id, data = {}) => {
  const res = await client.put(`/admin/withdrawals/${id}/approve`, data);
  return res.data;
};

export const rejectWithdrawalApi = async (id, data = {}) => {
  const res = await client.put(`/admin/withdrawals/${id}/reject`, data);
  return res.data;
};

// Mobile App Remote Config & Banners from mobile app
export const getMobileAppAdminConfigApi = async () => {
  const res = await client.get('/admin/mobile-app');
  return res.data;
};

export const updateMobileAppSettingsApi = async (settings) => {
  const res = await client.put('/admin/mobile-app/settings', settings);
  return res.data;
};

export const createMobileBannerApi = async (banner) => {
  const res = await client.post('/admin/mobile-app/banners', banner);
  return res.data;
};

export const deleteMobileBannerApi = async (id) => {
  const res = await client.delete(`/admin/mobile-app/banners/${id}`);
  return res.data;
};

