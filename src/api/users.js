import client from './client';

export const getProfileApi = async () => {
  const res = await client.get('/users/profile');
  return res.data;
};

export const updateProfileApi = async (data) => {
  const res = await client.put('/users/profile', data);
  return res.data;
};

export const getFavoritesApi = async (params = {}) => {
  const res = await client.get('/users/favorites', { params });
  return res.data;
};

export const toggleFavoriteApi = async (eventId) => {
  const res = await client.post('/users/favorites/toggle', { eventId });
  return res.data;
};

export const getNotificationsApi = async (params = {}) => {
  const res = await client.get('/users/notifications', { params });
  return res.data;
};

export const markNotificationReadApi = async (id) => {
  const res = await client.put(`/users/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsReadApi = async () => {
  const res = await client.put('/users/notifications/read-all');
  return res.data;
};

export const deleteNotificationApi = async (id) => {
  const res = await client.delete(`/users/notifications/${id}`);
  return res.data;
};

export const getFollowingApi = async (params = {}) => {
  const res = await client.get('/users/following', { params });
  return res.data;
};

export default {
  getProfileApi,
  updateProfileApi,
  getFavoritesApi,
  toggleFavoriteApi,
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
  getFollowingApi,
};
