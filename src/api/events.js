import client from './client';

export const getEventsApi = async (params = {}) => {
  const res = await client.get('/events', { params });
  return res.data;
};

export const getEventByIdApi = async (id) => {
  const res = await client.get(`/events/${id}`);
  return res.data;
};

export const getCategoriesApi = async () => {
  const res = await client.get('/categories');
  return res.data;
};

export default { getEventsApi, getEventByIdApi, getCategoriesApi };
