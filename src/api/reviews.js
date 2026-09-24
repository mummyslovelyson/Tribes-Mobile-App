import client from './client';

export const getEventReviewsApi = async (eventId) => {
  const res = await client.get(`/users/reviews/${eventId}`);
  return res.data;
};

export const createEventReviewApi = async (eventId, { rating, comment }) => {
  const res = await client.post(`/users/reviews/${eventId}`, { rating, comment });
  return res.data;
};

export const deleteEventReviewApi = async (reviewId) => {
  const res = await client.delete(`/users/reviews/${reviewId}`);
  return res.data;
};

export default {
  getEventReviewsApi,
  createEventReviewApi,
  deleteEventReviewApi,
};
